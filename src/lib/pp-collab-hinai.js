import { MIRROR } from './mirror-collab-hinai.js';

const BATCH_MAX = 100;
const COOLDOWN_MS = 15000;

const cache = new Map();
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

async function requestChunk(mode, ids) {
    const url = `${MIRROR}/v3/osu/pp/batch?ids=${ids.join(',')}&mode=${mode}&mods=NM`;
    try {
        const res = await fetch(url, { headers: { accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const rows = data && data.results ? data.results : {};

        for (const id of ids) {
            const row = rows[String(id)];
            const value = row ? Number(row.pp) : NaN;
            cache.set(ppKey(id, mode), Number.isFinite(value) ? value : null);
        }
        return true;
    } catch {
        coolUntil = Date.now() + COOLDOWN_MS;
        return false;
    } finally {
        for (const id of ids) inflight.delete(ppKey(id, mode));
    }
}

export async function fetchPp(targets) {
    if (Date.now() < coolUntil) return null;

    const waits = [];
    const byMode = new Map();

    for (const t of targets) {
        if (!t) continue;
        const key = ppKey(t.id, t.mode);
        if (cache.has(key)) continue;

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

    if (!waits.length) return null;

    const done = await Promise.all(waits);
    if (!done.some(Boolean)) return null;
    return new Map(cache);
}
