import { MIRROR } from './mirror-collab-hinai.js';

export const PP_MAX = 2000;
export const PP_STEP = 25;
export const PAGE_LIMIT = 60;

export const PP_PRESETS = [
    { label: 'Any PP', range: [0, PP_MAX] },
    { label: 'Up to 300', range: [0, 300] },
    { label: '300-500', range: [300, 500] },
    { label: '500-700', range: [500, 700] },
    { label: '700-1k', range: [700, 1000] },
    { label: '1k+', range: [1000, PP_MAX] },
];

export const MODES = [
    { key: 'all', label: 'All Modes', ruleset: null },
    { key: 'osu', label: 'osu!', ruleset: 0 },
    { key: 'taiko', label: 'Taiko', ruleset: 1 },
    { key: 'fruits', label: 'Catch', ruleset: 2 },
    { key: 'mania', label: 'Mania', ruleset: 3 },
];

export const PACK_TYPES = [
    { key: 'all', label: 'All' },
    { key: 'standard', label: 'Standard' },
    { key: 'featured', label: 'Featured Artist' },
    { key: 'tournament', label: 'Tournament' },
    { key: 'loved', label: 'Loved' },
    { key: 'chart', label: 'Spotlights' },
    { key: 'theme', label: 'Theme' },
    { key: 'artist', label: 'Artist/Album' },
];

export const MODE_LABELS = { 0: 'osu!', 1: 'Taiko', 2: 'Catch', 3: 'Mania' };

const TAG_RULESET_PREFIX = [
    { prefix: 'ST', ruleset: 1 },
    { prefix: 'SC', ruleset: 2 },
    { prefix: 'SM', ruleset: 3 },
];

const PACK_TYPE_LABELS = PACK_TYPES.reduce((acc, t) => {
    acc[t.key] = t.label;
    return acc;
}, {});

/**
 * Turns a `[lo, hi]` PP slider range into the mirror's `min_peak_pp` / `max_peak_pp` params.
 *
 * Bounds sitting on the ends of the slider are omitted rather than sent as `0` / `PP_MAX`.
 * That is deliberate: the packs endpoint treats the presence of either param as a "narrowing"
 * filter, and a narrowing query that matches nothing is answered as an honest empty list
 * instead of escalating to the osu! API. Sending a full-width range would therefore suppress
 * the upstream fallback for no reason.
 *
 * @param {[number, number]} range - Destructured as `[lo, hi]`, the inclusive PP-ceiling band.
 * @returns {{min_peak_pp?: string, max_peak_pp?: string}} Query params, each omitted when at its extreme.
 */
export function ppParams([lo, hi]) {
    const out = {};
    if (lo > 0) out.min_peak_pp = String(lo);
    if (hi < PP_MAX) out.max_peak_pp = String(hi);
    return out;
}

/**
 * Builds the querystring for `GET /v3/osu/packs` from the page's filter state.
 *
 * The search and browse branches are genuinely different requests, not cosmetic variants. A
 * non-blank `search` routes the mirror to its local text index, which returns one unpaginated
 * result set and emits no cursor, so passing `cursor` there would be meaningless and is
 * dropped. Browsing sends `type` unconditionally (the mirror reads `all` and `''` alike as
 * "no type predicate") and forwards the cursor the previous page handed back. Mode is only
 * sent for a concrete ruleset, never for the `all` pseudo-mode.
 *
 * @param {object} filters - Current filter state.
 * @param {string} filters.type - Pack type key from `PACK_TYPES` (`all` means unfiltered).
 * @param {string} filters.mode - Mode key from `MODES` (`all` means every ruleset).
 * @param {string} [filters.search] - Free-text query; trimmed, and blank means "browse".
 * @param {string|null} [filters.cursor] - Opaque `cursor_string` from the previous page.
 * @param {[number, number]} filters.ppRange - PP-ceiling band, passed through `ppParams`.
 * @returns {string} Encoded querystring, without a leading `?`.
 */
export function packsQuery({ type, mode, search, cursor, ppRange }) {
    const params = new URLSearchParams();
    const term = (search || '').trim();

    if (term) {
        params.set('search', term);
        if (type !== 'all') params.set('type', type);
    } else {
        params.set('type', type);
        if (cursor) params.set('cursor_string', cursor);
    }

    const selected = MODES.find(m => m.key === mode);
    if (selected && selected.ruleset !== null) params.set('mode', String(selected.ruleset));

    params.set('limit', String(PAGE_LIMIT));

    const bounds = ppParams(ppRange);
    Object.keys(bounds).forEach(key => params.set(key, bounds[key]));

    return params.toString();
}

/**
 * Shared JSON fetch helper for every mirror call in this module.
 *
 * The body is read as text and parsed by hand rather than via `res.json()` so that an HTML
 * error page slipping through with a 200 (a proxy interstitial, a Cloudflare challenge) fails
 * with a legible "non-JSON response" instead of a raw `SyntaxError` in the console.
 *
 * @param {string} url - Absolute URL to request.
 * @param {AbortSignal} [signal] - Optional abort signal; rejects with `AbortError` when fired.
 * @returns {Promise<any>} The parsed JSON body.
 * @throws {Error} On a non-2xx status, or when the body is not valid JSON.
 */
async function getJson(url, signal) {
    const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`request failed: ${res.status}`);
    const body = await res.text();
    try {
        return JSON.parse(body);
    } catch {
        throw new Error('mirror returned a non-JSON response');
    }
}

/**
 * Requests one page of beatmap packs from the mirror.
 *
 * @param {string} query - Encoded querystring, normally straight from `packsQuery`.
 * @param {AbortSignal} [signal] - Aborts the request when the filters change mid-flight.
 * @returns {Promise<{beatmap_packs?: object[], total?: number, cursor_string?: string}>} The pack page; `cursor_string` is absent on the last page.
 */
export function fetchPacks(query, signal) {
    return getJson(`${MIRROR}/v3/osu/packs?${query}`, signal);
}

/**
 * Requests the aggregate pack counters that back the packs hero banner.
 *
 * @param {AbortSignal} [signal] - Aborts the request on unmount.
 * @returns {Promise<object>} Corpus-wide pack statistics (totals, per-mode breakdown).
 */
export function fetchPackStats(signal) {
    return getJson(`${MIRROR}/v3/osu/packs/stats`, signal);
}

const detailCache = new Map();
const detailInFlight = new Map();

/**
 * Synchronous read of the pack-detail cache, for rendering a modal with no loading flash
 * when the pack was already hovered or opened once.
 *
 * @param {string} tag - Pack tag, e.g. `S1234` or `ST40`.
 * @returns {object|null} The cached detail payload, or `null` if not fetched yet.
 */
export function peekPackDetail(tag) {
    return detailCache.get(tag) || null;
}

/**
 * Fetches a pack's full difficulty listing, memoised per tag and de-duplicated in flight.
 *
 * A pack detail is a large, effectively immutable payload (every beatmap in the pack with its
 * PP and star rating), so it is cached for the lifetime of the page. Only successes are
 * cached; a failure clears the in-flight entry and rethrows, so the next open retries rather
 * than inheriting a permanent error. Note this takes no `AbortSignal` on purpose, since the
 * shared promise may be awaited by several callers and one of them unmounting must not
 * cancel it for the others.
 *
 * @param {string} tag - Pack tag, e.g. `S1234`.
 * @returns {Promise<object>} The pack detail payload, including its per-difficulty list.
 */
export function fetchPackDetail(tag) {
    const cached = detailCache.get(tag);
    if (cached) return Promise.resolve(cached);

    const pending = detailInFlight.get(tag);
    if (pending) return pending;

    const request = getJson(`${MIRROR}/v3/osu/packs/${encodeURIComponent(tag)}`)
        .then(data => {
            detailCache.set(tag, data);
            detailInFlight.delete(tag);
            return data;
        })
        .catch(err => {
            detailInFlight.delete(tag);
            throw err;
        });

    detailInFlight.set(tag, request);
    return request;
}

/**
 * Download URL for a whole pack archive.
 *
 * @param {string} tag - Pack tag, e.g. `S1234`.
 * @returns {string} Mirror URL that serves (or cascades out to) the pack zip.
 */
export const packZipUrl = tag => `${MIRROR}/v3/osu/packs/${encodeURIComponent(tag)}/download`;

/**
 * Resolves which ruleset a pack belongs to, falling back to its tag prefix.
 *
 * Older packs carry no `ruleset_id`, but osu! encodes the mode in the tag itself: `ST` taiko,
 * `SC` catch, `SM` mania. Anything else, including the plain `S` standard packs, is osu!
 * standard. The explicit `null`/`undefined` check rather than a truthiness test matters
 * because ruleset `0` is a real value.
 *
 * @param {{ruleset_id?: number|null, tag?: string}} pack - Pack record from the mirror.
 * @returns {number} Ruleset id: 0 osu!, 1 taiko, 2 catch, 3 mania.
 */
export function packRuleset(pack) {
    if (pack.ruleset_id !== null && pack.ruleset_id !== undefined) return pack.ruleset_id;
    const tag = String(pack.tag || '');
    const match = TAG_RULESET_PREFIX.find(entry => tag.startsWith(entry.prefix));
    return match ? match.ruleset : 0;
}

/**
 * Human label for a pack's category, resolved against the `PACK_TYPES` filter list.
 *
 * Unknown or missing types fall back to `Standard` rather than rendering a raw key, which
 * keeps a newly introduced upstream pack type from showing up as machine text on a card.
 *
 * @param {{pack_type?: string}} pack - Pack record from the mirror.
 * @returns {string} Display label, e.g. `Featured Artist`, `Spotlights`, `Standard`.
 */
export function packTypeLabel(pack) {
    const type = String(pack.pack_type || '').toLowerCase();
    return PACK_TYPE_LABELS[type] || 'Standard';
}

/**
 * Maps a PP value onto the difficulty-tier colour used by pack and difficulty chips.
 *
 * Buckets are green under 150, gold under 300, orange under 500, pink above. A missing value
 * gets the neutral grey rather than the lowest tier, so "not calculated" never reads as "easy".
 *
 * @param {number|null|undefined} pp - PP value, typically a map's peak or nomod PP.
 * @returns {string} Hex colour string.
 */
export function ppColor(pp) {
    if (pp === null || pp === undefined) return '#636378';
    if (pp < 150) return '#88da20';
    if (pp < 300) return '#ffd700';
    if (pp < 500) return '#ff7043';
    return '#ff66ab';
}

/**
 * Picks a star rating for a pack difficulty row, preferring osu!'s own number.
 *
 * Pack detail rows carry two ratings: `difficulty_rating` as published by osu!, and `stars`
 * as computed locally from the mirror's nomod star column. The official value wins when
 * present so the site agrees with what players see in game; the local one is the fallback for
 * maps osu! never rated. Both are explicitly `null`/`undefined` checked rather than
 * truthiness tested, since `0` is a legitimate rating for an unranked/unprocessed diff.
 *
 * @param {{difficulty_rating?: number|null, stars?: number|null}} diff - One difficulty row.
 * @returns {number|null} Star rating, or `null` when neither source has one.
 */
export function diffStars(diff) {
    const rating = diff.difficulty_rating;
    if (rating !== null && rating !== undefined) return Number(rating);
    if (diff.stars === null || diff.stars === undefined) return null;
    return Number(diff.stars);
}

/**
 * Formats a counter with locale thousands separators, treating anything falsy as zero.
 *
 * Note this collapses every falsy input (`null`, `undefined`, `NaN`, `''`) to `0` rather than
 * showing a placeholder, which is the right call for counters (a pack with no maps really is 0)
 * but is why PP uses `formatPp` instead. Only falsy values are rescued: a truthy but
 * unparseable string still formats as `NaN`. Nothing is rounded here either, unlike `formatPp`,
 * so a fractional input keeps its decimals.
 *
 * @param {number|string|null|undefined} value - Raw count, expected to be a whole number.
 * @returns {string} Localised number string, e.g. `1,234`.
 */
export function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

/**
 * Formats a PP value as a rounded, locale-separated integer.
 *
 * Unlike `formatCount`, a missing value renders as `-` rather than `0`, because an
 * uncalculated PP is not the same claim as a map worth zero PP.
 *
 * @param {number|string|null|undefined} value - Raw PP value.
 * @returns {string} Rounded localised PP, or `-` when absent.
 */
export function formatPp(value) {
    if (value === null || value === undefined) return '-';
    return Math.round(Number(value)).toLocaleString();
}

/**
 * Renders a date as `7 Mar 2024`, in the viewer's local timezone.
 *
 * Composed by hand instead of a single `toLocaleDateString` call so the day-month-year order
 * is fixed regardless of the visitor's locale, while the month name still comes from the
 * `en-US` short-month table. Falsy and unparseable input both yield an empty string, so a
 * missing timestamp renders as nothing rather than `Invalid Date`.
 *
 * @param {string|number|Date|null|undefined} value - Anything the `Date` constructor accepts.
 * @returns {string} Formatted date, or `''` when absent or unparseable.
 */
export function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

/**
 * Formats a byte count as megabytes, always in MB and always to two decimals.
 *
 * Returns `null` rather than a string for missing, non-numeric or non-positive sizes so
 * callers can drop the size chip entirely instead of printing `0.00 MB` for a pack whose
 * archive size the mirror has not measured yet. Uses MiB (1024^2) despite the `MB` label,
 * matching what the osu! client reports for a pack.
 *
 * @param {number|string|null|undefined} bytes - Size in bytes.
 * @returns {string|null} e.g. `123.45 MB`, or `null` when there is nothing meaningful to show.
 */
export function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${(value / (1024 ** 2)).toFixed(2)} MB`;
}

/**
 * Starts a download by synthesising a hidden anchor and clicking it.
 *
 * Done this way rather than `window.location` or `window.open` so a download does not navigate
 * the SPA away or trip a popup blocker; the anchor is removed immediately, since the browser
 * has already taken ownership of the navigation by the time `click()` returns. No `download`
 * attribute is set, so the filename comes from the server's `Content-Disposition`, which is
 * required anyway because these URLs are cross-origin. `noopener noreferrer` keeps the mirror
 * from receiving a referer or a handle on this window.
 *
 * @param {string} url - Download URL, e.g. from `packZipUrl` or `setDownloadUrl`.
 * @returns {void}
 */
export function triggerDownload(url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
}

