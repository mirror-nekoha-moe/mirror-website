import { ESTATE, MIRROR } from './mirror-collab-hinai.js';

export const JOSU = 'https://josu.hinamizawa.ai';
export const MIRROR_DOCS = 'https://mirror.hinamizawa.ai/docs';

/**
 * Builds the josu beatmap-viewer deep link for a single difficulty.
 * @param {number|string} beatmapId - Difficulty (beatmap) id, not the set id.
 * @returns {string} Absolute josu URL that opens that difficulty.
 */
export const josuUrl = beatmapId => `${JOSU}/?b=${beatmapId}`;
/**
 * Builds the hinamizawa.ai storyboard viewer URL for a beatmap set.
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} Absolute storyboard viewer URL (trailing slash is required by the estate routing).
 */
export const storyboardViewerUrl = setId => `${ESTATE}/osu/storyboards/${setId}/`;
/**
 * Builds the mirror audio stream URL for a set's song.
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} Mirror audio endpoint; serves the cached full track when available, a preview otherwise.
 */
export const audioUrl = setId => `${MIRROR}/v3/osu/music/audio/${setId}`;
/**
 * Last-resort audio source: osu!'s own 30s preview CDN, used when the mirror stream fails.
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} b.ppy.sh preview mp3 URL.
 */
export const previewFallback = setId => `https://b.ppy.sh/preview/${setId}.mp3`;
/**
 * Full-resolution background image URL carrying explicit download intent.
 * The `?download=1` marker is load-bearing: it is what the mirror counts as a real
 * artwork download, and it is deliberately excluded from the edge cache so the
 * counter sees every save instead of one request per CDN PoP.
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} Mirror background URL flagged as a download.
 */
export const backgroundUrl = setId => `${MIRROR}/v3/osu/beatmaps/bg/${setId}?download=1`;
/**
 * Cover image URL carrying explicit download intent (same counting contract as {@link backgroundUrl}).
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} Mirror cover URL flagged as a download.
 */
export const coverUrl = setId => `${MIRROR}/v3/osu/beatmaps/cover/${setId}?download=1`;
/**
 * Background image URL for on-page display only, i.e. the same asset without `?download=1`
 * so it stays edge-cacheable and does not inflate the artwork download counter.
 * @param {number|string} setId - Beatmap set id.
 * @returns {string} Mirror background URL for preview rendering.
 */
export const backgroundPreviewUrl = setId => `${MIRROR}/v3/osu/beatmaps/bg/${setId}`;

export const MOD_ORDER = [
    'NM', 'HD', 'HR', 'DT', 'FL', 'EZ',
    'HDHR', 'HDDT', 'HRDT', 'HDHRDT', 'HRFL', 'HDFL', 'DTFL', 'HDDTFL',
    'HDHRFL', 'HRDTFL', 'HDHRDTFL',
    'EZHD', 'EZDT', 'EZFL', 'EZHDDT', 'EZHDFL', 'EZDTFL', 'EZHDDTFL',
    'HT', 'HDHT', 'HRHT', 'HDHRHT', 'HTFL', 'HDHTFL', 'HRHTFL', 'HDHRHTFL',
    'EZHT', 'EZHDHT', 'EZHTFL', 'EZHDHTFL',
];

export const MOD_TONES = {
    NM: '#9aa4bd',
    HD: '#ffcc22',
    HR: '#ff5b5b',
    DT: '#8866ee',
    HT: '#66ccff',
    EZ: '#5fd38a',
    FL: '#c8cdd6',
};

export const EXCLUSIVE = { HR: 'EZ', EZ: 'HR', DT: 'HT', HT: 'DT' };
export const TOGGLE_MODS = ['HD', 'HR', 'DT', 'HT', 'EZ', 'FL'];
const WIRE_ORDER = ['EZ', 'HD', 'HR', 'HT', 'DT', 'FL'];

/**
 * Serialises a set of selected mod acronyms into the string the mirror's PP API expects.
 * Iterating WIRE_ORDER rather than the set is what makes the output canonical: the same
 * selection always produces the same string regardless of the order the user clicked,
 * so it is safe to use as a cache key.
 * @param {Set<string>} active - Selected two-letter mod acronyms (e.g. `HD`, `DT`).
 * @returns {string} Concatenated acronyms in wire order, empty string when nothing is selected.
 */
export function modsToWire(active) {
    return WIRE_ORDER.filter(m => active.has(m)).join('');
}

/**
 * Splits a packed mod key such as `HDHRDT` back into its two-letter acronyms.
 * Relies on every acronym being exactly two characters; the explicit `NM` branch
 * produces the same result the generic loop would, it just states the no-mod case outright.
 * @param {string} key - Packed mod key, or `NM` for no mods.
 * @returns {string[]} Individual mod acronyms in the order they appear in the key.
 */
export function splitMods(key) {
    if (key === 'NM') return ['NM'];
    const out = [];
    for (let i = 0; i < key.length; i += 2) out.push(key.slice(i, i + 2));
    return out;
}

/**
 * Orders the mod keys of a PP table for display: the curated MOD_ORDER first, then any
 * key the mirror returned that we do not know about, sorted alphabetically. Unknown keys
 * are appended rather than dropped so a new server-side mod combination still renders.
 * @param {Record<string, unknown>} table - PP table keyed by packed mod key.
 * @returns {string[]} Display-ordered mod keys.
 */
export function orderModKeys(table) {
    const present = new Set(Object.keys(table));
    const known = MOD_ORDER.filter(k => present.has(k));
    const extra = [...present].filter(k => !MOD_ORDER.includes(k)).sort();
    return [...known, ...extra];
}

/**
 * Maps a star rating onto the osu! difficulty-spectrum colour used across the site.
 * Buckets are the familiar easy/normal/hard/insane/expert/expert+ bands; anything
 * unparseable falls back to a neutral grey rather than throwing.
 * @param {number|string} stars - Star rating, possibly a string straight off the API.
 * @returns {string} Hex colour for that difficulty band.
 */
export function starColor(stars) {
    const s = Number(stars);
    if (!Number.isFinite(s)) return '#636378';
    if (s < 2) return '#88b300';
    if (s < 2.7) return '#66ccff';
    if (s < 4) return '#ffcc22';
    if (s < 5.3) return '#ff66ab';
    if (s < 6.5) return '#8866ee';
    return '#ff4444';
}

/**
 * Formats a track/drain length as `M:SS`. Non-numeric input and negatives collapse to `0:00`
 * so a missing length never renders as `NaN:NaN`. Minutes are not capped at 60, so a long
 * marathon map reads as e.g. `71:04`.
 * @param {number|string} seconds - Length in seconds.
 * @returns {string} Zero-padded `M:SS` string.
 */
export function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * Abbreviates a count for tight UI chips: millions as `1.2M`, ten-thousands as `12.3K`,
 * anything smaller with locale separators. The K threshold is 10,000 rather than 1,000
 * on purpose, so four-digit counts keep their full precision instead of degrading to `1.2K`.
 * @param {number|string} n - Raw count.
 * @returns {string} Abbreviated count, or `-` when the value is not a finite number.
 */
export function compact(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e4) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
}

/**
 * Coerces an API field to a finite number, or `null` when `Number()` cannot produce one.
 * Every API mapper below funnels numeric fields through this so the UI can branch on
 * `null` (render a dash) instead of having to guard against `NaN` or `undefined`.
 * Mind the coercion rules: an ABSENT key (`undefined`) and an unparseable string give null,
 * but a JSON `null` (and `''`, `false`, `[]`) coerces to `0`, so an explicitly null counter
 * reads as a real zero rather than as "unknown".
 * @param {unknown} v - Raw field value.
 * @returns {number|null} The finite number, or null.
 */
function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

const detailCache = new Map();
const detailInflight = new Map();

/**
 * Synchronous read of the set-details cache, for rendering a first paint without waiting
 * on the network (the modal seeds its state from this before firing the real fetch).
 * @param {number|string} setId - Beatmap set id, keyed exactly as passed to {@link fetchSetDetails}.
 * @returns {object|null} The cached set payload, or null on a miss.
 */
export function peekSetDetails(setId) {
    return detailCache.get(setId) || null;
}

/**
 * Fetches full details for a beatmap set, memoised and de-duplicated.
 * Three layers: a permanent success cache, an in-flight map so N concurrent callers share
 * one request, and a swallow-everything failure path that resolves to null instead of
 * rejecting. Failures are deliberately NOT cached, so a transient mirror error retries
 * on the next call while a success is never re-fetched for the page's lifetime.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<object|null>} The set payload, or null when the request failed or returned no `id`.
 */
export function fetchSetDetails(setId) {
    const hit = detailCache.get(setId);
    if (hit) return Promise.resolve(hit);

    const running = detailInflight.get(setId);
    if (running) return running;

    const job = fetch(`${MIRROR}/v3/osu/beatmaps/s/${setId}/details`, {
        headers: { accept: 'application/json' },
    })
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
            const set = data && data.id ? data : null;
            if (set) detailCache.set(setId, set);
            detailInflight.delete(setId);
            return set;
        })
        .catch(() => {
            detailInflight.delete(setId);
            return null;
        });

    detailInflight.set(setId, job);
    return job;
}

const ppAllCache = new Map();

/**
 * Loads the precomputed PP reference table (one entry per mod combination) for a difficulty.
 * Cached per `mode:beatmapId`; only successful, well-formed tables are stored, so an error
 * or a `success: false` body leaves the cache empty and the next call retries.
 * Unlike {@link fetchSetDetails} there is no in-flight de-duplication here, so simultaneous
 * callers for the same key will each issue a request.
 * @param {number|string} beatmapId - Difficulty (beatmap) id.
 * @param {number|string} mode - osu! ruleset id (0 std, 1 taiko, 2 catch, 3 mania).
 * @returns {Promise<Record<string, object>|null>} Mod-keyed PP table, or null on failure.
 */
export async function fetchPpAll(beatmapId, mode) {
    const key = `${mode}:${beatmapId}`;
    if (ppAllCache.has(key)) return ppAllCache.get(key);

    try {
        const res = await fetch(`${MIRROR}/v3/osu/pp/${beatmapId}/all?mode=${mode}`, {
            headers: { accept: 'application/json' },
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const table = data && data.success && data.mods ? data.mods : null;
        if (table) ppAllCache.set(key, table);
        return table;
    } catch {
        return null;
    }
}

/**
 * Runs a what-if PP calculation against the mirror for one difficulty and normalises the reply.
 * `combo` is only sent when positive, which is how the caller asks for an FC (the server then
 * assumes max combo). The `pp` field is accepted both as a bare number and as a `{ total }`
 * object because the mirror emits both shapes across its PP endpoints; any other shape
 * collapses to `0`, not null, because the unrecognised value still goes through `num`.
 * Difficulty attributes are flattened to camelCase. This endpoint computes them with rosu-pp
 * and normally sends every one, so they only come back null when `difficulty` is absent from
 * the response entirely (the DuckDB fast path that omits attributes backs `/pp/{id}/all`,
 * i.e. {@link fetchPpAll}, not this route).
 * @param {number|string} beatmapId - Difficulty (beatmap) id.
 * @param {{mode?: number|string, mods?: string, accuracy?: number|string, misses?: number|string, combo?: number}} opts - Query knobs; mode defaults to 0, mods to `NM`, accuracy to 100, misses to 0.
 * @param {AbortSignal} [signal] - Abort signal so a superseded keystroke can cancel in flight.
 * @returns {Promise<{pp: number|null, fcPp: number|null, stars: number|null, ar: number|null, od: number|null, cs: number|null, hp: number|null, maxCombo: number|null}|null>} Normalised result, or null when the server reported failure.
 * @throws {Error} With the HTTP status as its message when the response is not ok.
 */
export async function fetchPpCalc(beatmapId, opts, signal) {
    const qs = new URLSearchParams({
        mode: String(opts.mode ?? 0),
        mods: opts.mods || 'NM',
        accuracy: String(opts.accuracy ?? 100),
        misses: String(opts.misses ?? 0),
    });
    if (opts.combo > 0) qs.set('combo', String(opts.combo));

    const res = await fetch(`${MIRROR}/v3/osu/pp-calc/${beatmapId}?${qs.toString()}`, {
        headers: { accept: 'application/json' },
        signal,
    });
    if (!res.ok) throw new Error(String(res.status));

    const data = await res.json();
    if (!data || data.success === false) return null;

    const total =
        typeof data.pp === 'number'
            ? data.pp
            : data.pp && typeof data.pp.total === 'number'
              ? data.pp.total
              : null;
    const d = data.difficulty || {};

    return {
        pp: num(total),
        fcPp: num(data.fc_pp),
        stars: num(d.stars),
        ar: num(d.ar),
        od: num(d.od),
        cs: num(d.cs),
        hp: num(d.hp),
        maxCombo: num(d.max_combo),
    };
}

/**
 * Asks the mirror whether a set's full track is already cached, so the player can label
 * playback as full quality or a 30s preview and decide whether to keep polling.
 * Fails OPEN on genuine failures: a network error, a non-ok response, or a body that will not
 * parse all resolve to `{ cached: true }` rather than rejecting, so an unreachable status
 * endpoint degrades to "assume full" and never leaves a permanent "preview" badge on the UI.
 * An ABORT is deliberately not folded into that: it resolves `{ cached: false, aborted: true }`,
 * because a cancelled probe learned nothing and must not be reported as a cached track.
 * Callers still receive a value in every case and must guard their own state writes.
 * @param {number|string} setId - Beatmap set id.
 * @param {AbortSignal} [signal] - Abort signal for effect cleanup.
 * @returns {Promise<{cached: boolean, bytes: number|null, aborted?: boolean}>} Cache state, cached byte size when known, and `aborted` when the probe was cancelled.
 */
export async function fetchAudioStatus(setId, signal) {
    try {
        const res = await fetch(`${MIRROR}/v3/osu/music/audio/${setId}/status`, {
            headers: { accept: 'application/json' },
            signal,
        });
        if (!res.ok) return { cached: true, bytes: null };
        const data = await res.json();
        return { cached: data && data.status === 'cached', bytes: num(data && data.size_bytes) };
    } catch (err) {
        if (err && err.name === 'AbortError') return { cached: false, bytes: null, aborted: true };
        return { cached: true, bytes: null };
    }
}

const FAV_STORE = 'nk-hinai-favs';

/**
 * Reads the locally remembered favourite set ids out of localStorage.
 * Everything is defensive: a storage exception (private mode, blocked cookies) or a
 * payload that is not an array yields an empty set rather than throwing into a render.
 * This local list is a per-browser record and is expected to drift from the mirror's
 * aggregate favourite count, which counts every visitor.
 * @returns {Set<number>} Favourited beatmap set ids.
 */
function readFavs() {
    try {
        const raw = window.localStorage.getItem(FAV_STORE);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
        return new Set();
    }
}

/**
 * Synchronous check of whether this browser has favourited a set, used to seed the heart
 * button before any network call. Guards on `window` so it is safe during SSR/prerender.
 * @param {number|string} setId - Beatmap set id; coerced to a number to match how ids are stored.
 * @returns {boolean} True when the id is in this browser's favourite list.
 */
export function isFavorited(setId) {
    if (typeof window === 'undefined') return false;
    return readFavs().has(Number(setId));
}

/**
 * Adds or removes a set id in this browser's favourite list. Read-modify-write against
 * localStorage, and silently gives up if storage is unavailable, since a failed local
 * record must not break the server-side favourite that already succeeded.
 * @param {number|string} setId - Beatmap set id.
 * @param {boolean} on - True to remember the favourite, false to forget it.
 * @returns {void}
 */
function writeFav(setId, on) {
    try {
        const favs = readFavs();
        if (on) favs.add(Number(setId));
        else favs.delete(Number(setId));
        window.localStorage.setItem(FAV_STORE, JSON.stringify([...favs]));
    } catch {
        return;
    }
}

/**
 * Reads the server-side favourite state and total count for a set's song.
 * `favorited` is the mirror's own per-visitor answer, which is not necessarily the same as
 * this browser's localStorage record; the count is the global aggregate.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<{favorited: boolean, count: number|null}|null>} State, or null on any failure.
 */
export async function getFavorite(setId) {
    try {
        const res = await fetch(`${MIRROR}/v3/osu/music/song/${setId}/favorite`, {
            headers: { accept: 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return { favorited: !!data.favorited, count: num(data.favorite_count) };
    } catch {
        return null;
    }
}

/**
 * Loads view/like engagement for a set's storyboard.
 * Reads each counter through two possible field names (`art_likes` before `like_count`,
 * `user_art_liked` before `user_liked`) so the component keeps working across both the
 * older and the newer mirror response shapes. Errors resolve to null instead of throwing.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<{views: number|null, uniqueViewers: number|null, likes: number|null, liked: boolean}|null>} Engagement figures, or null on failure.
 */
export async function getStoryboardEngagement(setId) {
    try {
        const res = await fetch(`${MIRROR}/v3/osu/storyboard/${setId}/engagement`, {
            headers: { accept: 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            views: num(data.view_count),
            uniqueViewers: num(data.unique_viewers),
            likes: num(data.art_likes ?? data.like_count),
            liked: !!(data.user_art_liked ?? data.user_liked),
        };
    } catch {
        return null;
    }
}

/**
 * Toggles the visitor's like on a set's storyboard. Unlike the read helpers this one
 * deliberately THROWS, because the button drives an optimistic flip that has to be undone
 * on failure. A 429 is turned into an error carrying `retryAfter` (seconds, defaulting to 60)
 * so the UI can show the rate limiter's cooldown instead of a generic error.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<{liked: boolean, count: number|null}>} The server's post-toggle state.
 * @throws {Error} `rate-limited` with a `retryAfter` property on HTTP 429, otherwise an Error whose message is the status code.
 */
export async function toggleStoryboardLike(setId) {
    const res = await fetch(`${MIRROR}/v3/osu/storyboard/${setId}/like`, { method: 'POST' });
    if (res.status === 429) {
        const err = new Error('rate-limited');
        err.retryAfter = Number(res.headers.get('retry-after')) || 60;
        throw err;
    }
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return { liked: !!data.liked, count: num(data.art_likes ?? data.like_count) };
}

/**
 * Fire-and-forget view ping for a storyboard. The response body is ignored and every
 * failure is swallowed: analytics must never surface an error to the visitor.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<void>} Resolves once the request settles, successfully or not.
 */
export async function recordStoryboardView(setId) {
    try {
        await fetch(`${MIRROR}/v3/osu/storyboard/${setId}/view`, { method: 'POST' });
    } catch {
        return;
    }
}

/**
 * Loads engagement for a beatmap set: views, likes, and the artwork download tallies split
 * by cover, background, and combined. Same dual field-name tolerance as the storyboard
 * variant, and the same swallow-and-return-null failure policy.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<{views: number|null, uniqueViewers: number|null, likes: number|null, liked: boolean, coverDownloads: number|null, bgDownloads: number|null, artDownloads: number|null}|null>} Engagement figures, or null on failure.
 */
export async function getBeatmapEngagement(setId) {
    try {
        const res = await fetch(`${MIRROR}/v3/osu/beatmaps/${setId}/engagement`, {
            headers: { accept: 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        return {
            views: num(data.view_count),
            uniqueViewers: num(data.unique_viewers),
            likes: num(data.art_likes ?? data.like_count),
            liked: !!(data.user_art_liked ?? data.user_liked),
            coverDownloads: num(data.cover_downloads),
            bgDownloads: num(data.bg_downloads),
            artDownloads: num(data.art_downloads),
        };
    } catch {
        return null;
    }
}

/**
 * Toggles the visitor's like on a set's artwork, with a compatibility fallback: it tries the
 * newer `/art/like` route first and retries the legacy `/like` route on a 404, so the page
 * works against a mirror that has not been rolled forward yet. Throws like
 * {@link toggleStoryboardLike}, including the 429-to-`retryAfter` translation, because the
 * caller runs an optimistic flip that must be reverted.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<{liked: boolean, count: number|null}>} The server's post-toggle state.
 * @throws {Error} `rate-limited` with a `retryAfter` property on HTTP 429, otherwise an Error whose message is the status code.
 */
export async function toggleArtLike(setId) {
    let res = await fetch(`${MIRROR}/v3/osu/beatmaps/${setId}/art/like`, { method: 'POST' });
    if (res.status === 404) {
        res = await fetch(`${MIRROR}/v3/osu/beatmaps/${setId}/like`, { method: 'POST' });
    }
    if (res.status === 429) {
        const err = new Error('rate-limited');
        err.retryAfter = Number(res.headers.get('retry-after')) || 60;
        throw err;
    }
    if (!res.ok) throw new Error(String(res.status));
    const data = await res.json();
    return { liked: !!data.liked, count: num(data.art_likes ?? data.like_count) };
}

/**
 * Fire-and-forget view ping for a beatmap set; failures are swallowed on purpose.
 * @param {number|string} setId - Beatmap set id.
 * @returns {Promise<void>} Resolves once the request settles, successfully or not.
 */
export async function recordBeatmapView(setId) {
    try {
        await fetch(`${MIRROR}/v3/osu/beatmaps/${setId}/view`, { method: 'POST' });
    } catch {
        return;
    }
}

/**
 * Sets (rather than toggles) the favourite state of a set's song on the mirror, then mirrors
 * the result into this browser's localStorage list so {@link isFavorited} can answer instantly
 * on the next render. The local write only runs after a successful response, and it records the
 * REQUESTED `on` value, while the returned `favorited` comes from the server, so the two can
 * disagree if the server ever refuses the change without erroring.
 * @param {number|string} setId - Beatmap set id.
 * @param {boolean} on - Desired favourite state.
 * @returns {Promise<{favorited: boolean, count: number|null}>} The server's post-write state.
 * @throws {Error} `rate-limited` with a `retryAfter` property on HTTP 429, otherwise an Error whose message is the status code.
 */
export async function setFavorite(setId, on) {
    const res = await fetch(`${MIRROR}/v3/osu/music/song/${setId}/favorite`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ on }),
    });

    if (res.status === 429) {
        const err = new Error('rate-limited');
        err.retryAfter = Number(res.headers.get('retry-after')) || 60;
        throw err;
    }
    if (!res.ok) throw new Error(String(res.status));

    const data = await res.json();
    writeFav(setId, on);
    return { favorited: !!data.favorited, count: num(data.favorite_count) };
}

/**
 * Triggers a browser "save as" for an in-memory blob by synthesising a temporary anchor,
 * clicking it, and removing it again. The object URL is revoked on a 10s delay rather than
 * immediately, because revoking it in the same tick can race the browser's download start.
 * @param {Blob} blob - The bytes to hand to the download manager.
 * @param {string} filename - Suggested filename for the download.
 * @returns {void}
 */
function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Downloads a beatmap artwork through fetch and hands it to the browser as a file.
 * Going through fetch instead of a plain link is what lets the caller distinguish
 * "this set genuinely has no background" from "the mirror could not serve it right now":
 * a bare `<a download>` would just navigate and show the raw error.
 *
 * No HTTP outcome throws: every status, and a request that never lands, resolve a small
 * discriminated union instead. `ok` (the save was triggered), `none` (HTTP 404, the artwork
 * does not exist, possibly with a `fallback` URL the server suggested), or `unavailable`
 * (network error or any other non-ok status, with `retryAfter` seconds when the server sent
 * that header). The mirror's `x-hinai-forensics` header is passed through on whichever failure
 * kind actually carries a response, so a network error has none. The success branch is guarded
 * too: if reading the body or handing it to the download manager fails, that also resolves
 * `unavailable` rather than rejecting.
 * @param {string} url - Artwork URL, normally built by {@link backgroundUrl} or {@link coverUrl}.
 * @param {string} filename - Filename to save as.
 * @returns {Promise<{kind: 'ok'} | {kind: 'none', message: string, fallback?: string, forensics?: string} | {kind: 'unavailable', message: string, retryAfter?: number, forensics?: string}>} Outcome for the UI to render.
 */
export async function downloadArtwork(url, filename) {
    let res;
    try {
        res = await fetch(url, { headers: { accept: 'image/*, application/json' } });
    } catch {
        return { kind: 'unavailable', message: 'Network error. Check your connection and try again.' };
    }

    if (res.ok) {
        try {
            saveBlob(await res.blob(), filename);
            return { kind: 'ok' };
        } catch {
            return {
                kind: 'unavailable',
                message: 'Could not save the artwork. Please try again.',
                forensics: res.headers.get('x-hinai-forensics') || undefined,
            };
        }
    }

    let body = null;
    try {
        body = await res.json();
    } catch {
        body = null;
    }
    const forensics = res.headers.get('x-hinai-forensics') || undefined;

    if (res.status === 404) {
        return {
            kind: 'none',
            message: (body && body.error) || 'This beatmap has no background image.',
            fallback: body && body.fallback,
            forensics,
        };
    }

    return {
        kind: 'unavailable',
        message: (body && body.error) || `Could not fetch the artwork right now (HTTP ${res.status}).`,
        retryAfter: Number(res.headers.get('retry-after')) || undefined,
        forensics,
    };
}
