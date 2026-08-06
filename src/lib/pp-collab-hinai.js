import { MIRROR } from './mirror-collab-hinai.js';

const BATCH_MAX = 100;
const COOLDOWN_MS = 15000;
const COOLDOWN_MAX_MS = 120000;
const TIMEOUT_MS = 15000;
const RETRY_DELAYS = [400, 1200];
const MISS_TTL_MS = 300000;
const MISS_MAX = 4000;

const cache = new Map();
const misses = new Map();
const inflight = new Map();
let coolUntil = 0;

export function ppKey(id, mode) {
    return `${mode}:${id}`;
}

export function hardestDiff(set) {
    const diffs = set && Array.isArray(set.beatmaps) ? set.beatmaps : [];
    let best = null;

    for (const d of diffs) {
        if (!d) continue;
        const id = Number(d.id);
        const sr = Number(d.difficulty_rating);
        if (!Number.isFinite(id) || !Number.isFinite(sr)) continue;
        if (best && (sr < best.sr || (sr === best.sr && id >= best.id))) continue;

        const mode = Number(d.mode_int);
        best = {
            id,
            sr,
            mode: Number.isFinite(mode) ? mode : 0,
            version: typeof d.version === 'string' ? d.version : '',
        };
    }

    return best;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function markMiss(key) {
    misses.delete(key);
    misses.set(key, Date.now() + MISS_TTL_MS);
}

function settle(key, value) {
    misses.delete(key);
    cache.set(key, value);
}

function missPinned(key) {
    const until = misses.get(key);
    if (until === undefined) return false;
    if (until > Date.now()) return true;

    misses.delete(key);
    return false;
}

function pruneMisses() {
    const now = Date.now();
    for (const [key, until] of misses) {
        if (until <= now) misses.delete(key);
    }

    while (misses.size > MISS_MAX) {
        const oldest = misses.keys().next();
        if (oldest.done) break;
        misses.delete(oldest.value);
    }
}

function snapshot() {
    const out = new Map(cache);
    const now = Date.now();

    for (const [key, until] of misses) {
        if (until > now) out.set(key, null);
    }

    return out;
}

function settleChunk(mode, ids, rows, missing) {
    const unresolved = missing ? new Set(missing.map(Number)) : null;

    for (const id of ids) {
        const key = ppKey(id, mode);
        const row = rows[String(id)];
        const raw = row ? row.pp : undefined;
        const value = raw === undefined || raw === null || raw === '' ? NaN : Number(raw);

        if (Number.isFinite(value)) settle(key, value);
        else if (!row || !unresolved || unresolved.has(Number(id))) markMiss(key);
        else settle(key, null);
    }
}

function backoffMs(res) {
    const raw = res.headers.get('retry-after');
    if (!raw) return COOLDOWN_MS;

    const secs = Number(raw);
    if (Number.isFinite(secs)) return Math.min(Math.max(secs * 1000, 0), COOLDOWN_MAX_MS);

    const at = Date.parse(raw);
    if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), COOLDOWN_MAX_MS);

    return COOLDOWN_MS;
}

async function attemptChunk(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            headers: { accept: 'application/json' },
            signal: ctrl.signal,
        });
        if (res.status === 429 || res.status >= 500) return { retry: false, cool: backoffMs(res) };
        if (!res.ok) return { retry: false, cool: 0 };

        const data = await res.json();
        return {
            rows: data && data.results ? data.results : {},
            missing: data && Array.isArray(data.missing) ? data.missing : null,
            retry: false,
            cool: 0,
        };
    } catch {
        return { retry: true, cool: 0 };
    } finally {
        clearTimeout(timer);
    }
}

async function requestChunk(mode, ids) {
    const url = `${MIRROR}/v3/osu/pp/batch?ids=${ids.join(',')}&mode=${mode}&mods=NM`;
    try {
        for (let attempt = 0; ; attempt += 1) {
            const out = await attemptChunk(url);

            if (out.rows) {
                settleChunk(mode, ids, out.rows, out.missing);
                return true;
            }

            if (out.cool > 0) coolUntil = Math.max(coolUntil, Date.now() + out.cool);
            if (!out.retry || attempt >= RETRY_DELAYS.length || Date.now() < coolUntil) return false;

            await sleep(RETRY_DELAYS[attempt]);
        }
    } finally {
        for (const id of ids) inflight.delete(ppKey(id, mode));
    }
}

export function ppRetryAt(targets) {
    const now = Date.now();
    let at = 0;

    for (const t of targets) {
        if (!t) continue;
        const key = ppKey(t.id, t.mode);
        if (cache.has(key)) continue;

        const until = misses.get(key);
        const when = until !== undefined && until > now ? until : now;
        if (at === 0 || when < at) at = when;
    }

    if (at === 0) return 0;
    return coolUntil > at ? coolUntil : at;
}

export async function fetchPp(targets) {
    if (Date.now() < coolUntil) return null;

    pruneMisses();

    const waits = [];
    const byMode = new Map();

    for (const t of targets) {
        if (!t) continue;
        const key = ppKey(t.id, t.mode);
        if (cache.has(key)) continue;
        if (missPinned(key)) continue;

        const running = inflight.get(key);
        if (running) {
            waits.push(running);
            continue;
        }

        const bucket = byMode.get(t.mode);
        if (bucket) bucket.push(t.id);
        else byMode.set(t.mode, [t.id]);
    }

    for (const [mode, ids] of byMode) {
        for (let i = 0; i < ids.length; i += BATCH_MAX) {
            const slice = ids.slice(i, i + BATCH_MAX);
            const job = requestChunk(mode, slice);
            for (const id of slice) inflight.set(ppKey(id, mode), job);
            waits.push(job);
        }
    }

    if (!waits.length) return snapshot();

    const done = await Promise.all(waits);
    if (!done.some(Boolean)) return null;
    return snapshot();
}
