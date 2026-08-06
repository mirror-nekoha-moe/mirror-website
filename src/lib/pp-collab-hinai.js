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

/**
 * Builds the cache/lookup key for one difficulty under one game mode.
 * The mode is part of the key because the same beatmap id carries a different
 * pp value per mode, so keying on the id alone would cross-contaminate.
 *
 * @param {number|string} id - Beatmap (difficulty) id.
 * @param {number|string} mode - osu! mode int (0 std, 1 taiko, 2 catch, 3 mania).
 * @returns {string} Key in the form `mode:id`.
 */
export function ppKey(id, mode) {
    return `${mode}:${id}`;
}

/**
 * Picks the one difficulty that represents a whole set on a card: the highest
 * star rating, with ties broken toward the LOWEST beatmap id so repeated calls
 * on the same set always choose the same difficulty and the rendered pp never
 * flickers between two equally hard diffs. Entries whose id or star rating is
 * not a finite number are skipped outright.
 *
 * @param {{beatmaps?: Array<Object>}} set - Beatmap set as returned by the mirror search API.
 * @returns {{id: number, sr: number, mode: number, version: string}|null} The chosen
 *   difficulty, with mode defaulting to 0 and version to '' when those source fields
 *   are absent or malformed, or null when the set has no usable difficulty.
 */
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

/**
 * Timer-backed delay used to space out retry attempts.
 *
 * @param {number} ms - Milliseconds to wait.
 * @returns {Promise<void>} Resolves once the timer fires.
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Pins a key as "no answer yet" for MISS_TTL_MS so the next fetch skips it
 * instead of re-asking the mirror for a value it just failed to produce.
 * The delete-before-set is deliberate: it moves the key to the end of the Map's
 * insertion order, which is exactly what lets pruneMisses() evict oldest-first.
 *
 * @param {string} key - Key from ppKey().
 * @returns {void}
 */
function markMiss(key) {
    misses.delete(key);
    misses.set(key, Date.now() + MISS_TTL_MS);
}

/**
 * Records a final answer for a key and clears any miss pin, so from here on the
 * cached value wins and the key is never re-requested.
 *
 * @param {string} key - Key from ppKey().
 * @param {number|null} value - Resolved pp, or null when the mirror has confirmed
 *   it will never have a value for this map.
 * @returns {void}
 */
function settle(key, value) {
    misses.delete(key);
    cache.set(key, value);
}

/**
 * Reports whether a key is still inside its miss cooldown. Expired pins are
 * deleted on read, so this doubles as lazy cleanup between prune passes.
 *
 * @param {string} key - Key from ppKey().
 * @returns {boolean} True while the miss is still pinned.
 */
function missPinned(key) {
    const until = misses.get(key);
    if (until === undefined) return false;
    if (until > Date.now()) return true;

    misses.delete(key);
    return false;
}

/**
 * Drops every expired miss pin, then evicts oldest-inserted pins until the table
 * holds at most MISS_MAX entries. The hard cap matters because a long session
 * scrolling a large graveyard would otherwise grow the miss table without bound.
 *
 * @returns {void}
 */
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

/**
 * Builds the map handed back to React: every resolved value from the cache, plus
 * a null for every still-pinned miss. Consumers therefore read a number for a
 * known pp, null for "nothing to show right now", and undefined for "not looked
 * up yet". A fresh copy is returned each time so the internal cache is never
 * mutated by a caller and React sees a new reference.
 *
 * @returns {Map<string, number|null>} Snapshot keyed by ppKey().
 */
function snapshot() {
    const out = new Map(cache);
    const now = Date.now();

    for (const [key, until] of misses) {
        if (until > now) out.set(key, null);
    }

    return out;
}

/**
 * Applies one batch response to the cache, classifying every requested id into
 * one of three outcomes. A finite pp is cached outright. An id with no row at
 * all, or that the server explicitly listed as missing (queued for calculation),
 * is pinned as a retryable miss. An id that came back WITH a row but no usable
 * pp and was not listed as missing is settled as a permanent null, because the
 * server is telling us it answered and simply has no value.
 *
 * @param {number|string} mode - osu! mode int the batch was requested for.
 * @param {Array<number|string>} ids - Beatmap ids that were requested.
 * @param {Object<string, {pp?: number|string|null}>} rows - Server results keyed by id string.
 * @param {Array<number|string>|null} missing - Ids the server reports as unresolved, or
 *   null when the response carried no missing list, in which case every unresolved id
 *   is treated as retryable rather than absent.
 * @returns {void}
 */
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

/**
 * Derives a global cooldown from a throttled or failing response. Honours both
 * forms of `retry-after` (delta seconds, or an HTTP date), clamped into
 * [0, COOLDOWN_MAX_MS] so a wrong or hostile header cannot stall pp lookups for
 * hours, and falls back to COOLDOWN_MS when the header is absent or unparseable.
 *
 * @param {Response} res - The fetch response that triggered the backoff.
 * @returns {number} Milliseconds to stay cool for.
 */
function backoffMs(res) {
    const raw = res.headers.get('retry-after');
    if (!raw) return COOLDOWN_MS;

    const secs = Number(raw);
    if (Number.isFinite(secs)) return Math.min(Math.max(secs * 1000, 0), COOLDOWN_MAX_MS);

    const at = Date.parse(raw);
    if (Number.isFinite(at)) return Math.min(Math.max(at - Date.now(), 0), COOLDOWN_MAX_MS);

    return COOLDOWN_MS;
}

/**
 * Performs a single batch request, capped at TIMEOUT_MS by an AbortController.
 * It never throws: a network failure, an abort or malformed JSON all come back
 * as a retryable outcome, 429 and 5xx come back as a cooldown, and any other
 * non-ok status comes back flagged `fatal` since retrying a 4xx would just
 * repeat the same rejection.
 *
 * @param {string} url - Fully built batch URL.
 * @returns {Promise<{rows?: Object, missing?: Array|null, retry: boolean, cool: number, fatal?: boolean}>}
 *   `rows` is present only on success and is `{}` when the payload had no results;
 *   `retry` asks the caller to try again; `cool` is the cooldown to apply in ms;
 *   `fatal` marks a rejection no retry can fix, which the caller must pin so the
 *   same doomed batch is not re-sent on the next tick.
 */
async function attemptChunk(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            headers: { accept: 'application/json' },
            signal: ctrl.signal,
        });
        if (res.status === 429 || res.status >= 500) return { retry: false, cool: backoffMs(res) };
        if (!res.ok) return { retry: false, cool: 0, fatal: true };

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

/**
 * Drives one batch of ids to completion against `/v3/osu/pp/batch`, always with
 * mods=NM. It allows 1 + RETRY_DELAYS.length attempts and bails out early when
 * the failure is not retryable or when a cooldown started while it was retrying.
 * Any cooldown is folded into the module-wide coolUntil so every caller backs
 * off together. A fatal response (a 4xx no retry can fix) pins every id in the
 * batch as a miss on the way out, because a cooldown is deliberately not applied
 * to it and without a pin ppRetryAt would report "now" and re-send the same
 * doomed batch on the caller's very next tick. The finally block always clears
 * the inflight entries for these ids, otherwise a failed batch would leave those
 * keys permanently wedged behind a promise that will never be retried.
 *
 * @param {number|string} mode - osu! mode int for this batch.
 * @param {Array<number|string>} ids - Beatmap ids to resolve, already capped at BATCH_MAX.
 * @returns {Promise<boolean>} True when a response was applied to the cache, false when
 *   the batch gave up without settling any pp value, pinned misses included.
 */
async function requestChunk(mode, ids) {
    const url = `${MIRROR}/v3/osu/pp/batch?ids=${ids.join(',')}&mode=${mode}&mods=NM`;
    try {
        for (let attempt = 0; ; attempt += 1) {
            const out = await attemptChunk(url);

            if (out.rows) {
                settleChunk(mode, ids, out.rows, out.missing);
                return true;
            }

            if (out.fatal) {
                settleChunk(mode, ids, {}, null);
                return false;
            }

            if (out.cool > 0) coolUntil = Math.max(coolUntil, Date.now() + out.cool);
            if (!out.retry || attempt >= RETRY_DELAYS.length || Date.now() < coolUntil) return false;

            await sleep(RETRY_DELAYS[attempt]);
        }
    } finally {
        for (const id of ids) inflight.delete(ppKey(id, mode));
    }
}

/**
 * Answers "when is it worth asking again?" for the targets currently on screen,
 * so the page can arm a single timer instead of polling. Targets already in the
 * cache are settled and ignored; a pinned miss contributes its expiry; anything
 * else contributes now. The global cooldown acts as a floor on the result.
 *
 * @param {Iterable<{id: number|string, mode: number|string}|null>} targets - Difficulties in view.
 * @returns {number} Epoch ms of the earliest useful retry, or 0 when nothing is pending.
 */
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

/**
 * Resolves pp for the given difficulties and returns a fresh snapshot to render.
 * Work is de-duplicated three ways before any request goes out: already-cached
 * keys, pinned misses, and keys another caller already has in flight (whose
 * promise is simply awaited). What remains is bucketed by mode and sliced into
 * BATCH_MAX-sized requests.
 *
 * Returning null rather than a snapshot is the signal for the caller to keep
 * showing the map it already has; it happens when the global cooldown is active,
 * or when every batch failed to settle anything.
 *
 * @param {Iterable<{id: number|string, mode: number|string}|null>} targets - Difficulties to resolve.
 * @returns {Promise<Map<string, number|null>|null>} Snapshot keyed by ppKey(), or null
 *   when no progress was made.
 */
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
