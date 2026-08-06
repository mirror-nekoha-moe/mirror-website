import { cover } from './mirror-collab-hinai.js';

const ENDPOINT = '/api/search?status=ranked&sort=ranked&order=desc&page=1';

const TRACK_MIN = 6;
const TRACK_MAX = 16;

let cached = null;
let inFlight = null;

const EMPTY = { items: [], mode: 'recent', todayCount: 0, newest: null };

/**
 * Whether two dates fall on the same calendar day in the viewer's timezone.
 *
 * Compares the local Y/M/D components rather than differencing timestamps, so
 * "today" means the visitor's own day boundary and not a rolling 24 hours.
 *
 * @param {Date} a - First date.
 * @param {Date} b - Second date.
 * @returns {boolean} True when both land on the same local calendar day.
 */
function sameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

/**
 * Highest star rating across a beatmapset's difficulties.
 *
 * Non-finite ratings are skipped instead of poisoning the maximum, and a set
 * with no usable difficulties yields 0 so downstream tiering still works.
 *
 * @param {object} set - Beatmapset payload, optionally carrying `beatmaps`.
 * @returns {number} Highest finite difficulty_rating found, or 0.
 */
export function topStars(set) {
    const diffs = Array.isArray(set.beatmaps) ? set.beatmaps : [];
    let top = 0;
    for (const d of diffs) {
        const sr = Number(d.difficulty_rating);
        if (Number.isFinite(sr) && sr > top) top = sr;
    }
    return top;
}

/**
 * Bucket a star rating into one of six difficulty tiers.
 *
 * The thresholds mirror osu!'s own difficulty colour bands, so a tier number
 * can be pasted straight into a CSS class (`--t1` through `--t6`) and match
 * what players expect a map of that rating to look like.
 *
 * @param {number} stars - Star difficulty rating.
 * @returns {number} Tier from 1 (easiest) to 6 (6.5 stars and above).
 */
export function starTier(stars) {
    if (stars < 2.0) return 1;
    if (stars < 2.7) return 2;
    if (stars < 4.0) return 3;
    if (stars < 5.3) return 4;
    if (stars < 6.5) return 5;
    return 6;
}

/**
 * Per-ruleset difficulty counts for a set, read from the mirror's own columns.
 *
 * The counts come from the `mirror` sidecar object the index attaches rather
 * than from counting `beatmaps`, because the hero list is fed by a lightweight
 * search payload that does not always carry the full difficulty array. Every
 * ruleset is returned, including zeros; callers filter for the ones they want.
 *
 * @param {object} set - Beatmapset payload, optionally carrying `mirror`.
 * @returns {Array<{key: string, count: number}>} One entry per ruleset.
 */
export function modeCounts(set) {
    const m = set.mirror || {};
    return [
        { key: 'osu', count: m.mode_osu_count ?? 0 },
        { key: 'taiko', count: m.mode_taiko_count ?? 0 },
        { key: 'fruits', count: m.mode_fruits_count ?? 0 },
        { key: 'mania', count: m.mode_mania_count ?? 0 },
    ];
}

/**
 * Reduce a raw ranked-search payload into the compact hero track model.
 *
 * Sets missing an id, a ranked date or a mapper are dropped outright, since the
 * card cannot be rendered or credited without them. The result then picks one
 * of two presentations: if at least TRACK_MIN sets were ranked on the viewer's
 * own calendar day the track is billed as 'today' and shows only those,
 * otherwise it falls back to 'recent' over the whole page so the hero is never
 * left with two lonely cards on a quiet day. Either way the track is capped at
 * TRACK_MAX. `newest` is taken from the first entry, which assumes the caller
 * requested the feed already sorted newest-first.
 *
 * @param {object[]} sets - Beatmapset payloads from the ranked search endpoint.
 * @returns {{items: object[], mode: string, todayCount: number, newest: (string|null)}}
 *   Hero track model, or the shared EMPTY value when nothing is usable.
 */
function shape(sets) {
    const now = new Date();
    const dated = sets.filter(s => s && s.id && s.ranked_date && s.user_id);
    if (!dated.length) return EMPTY;

    const stamped = dated.map(s => ({
        id: s.id,
        title: s.title || '',
        artist: s.artist || '',
        creator: s.creator || '',
        rankedAt: s.ranked_date,
        today: sameLocalDay(new Date(s.ranked_date), now),
        stars: topStars(s),
        modes: modeCounts(s).filter(m => m.count > 0),
        art: cover(s.id, 'card@2x'),
    }));

    const today = stamped.filter(s => s.today);
    const mode = today.length >= TRACK_MIN ? 'today' : 'recent';
    const pool = mode === 'today' ? today : stamped;

    return {
        items: pool.slice(0, TRACK_MAX),
        mode,
        todayCount: today.length,
        newest: stamped[0].rankedAt,
    };
}

/**
 * Synchronously read the cached ranked-today track, if one has been fetched.
 *
 * Exists so a component can seed its initial state on mount and paint the hero
 * immediately on a repeat visit, instead of flashing empty for one frame while
 * the already-resolved promise from fetchRankedToday settles again.
 *
 * @returns {object|null} The cached track model, or null before the first fetch.
 */
export function peekRankedToday() {
    return cached;
}

const STATS_ENDPOINT = '/api/stats';

let statsCache = null;
let statsInFlight = null;

/**
 * Fetch the mirror index stats once per page load, de-duplicating concurrent calls.
 *
 * A resolved payload is memoised and an in-flight request is shared, so several
 * hero widgets mounting at once still cost a single request. A payload without
 * `beatmapset_count` is treated as no data at all (cached as null) because a
 * partial stats object would render a provenance line full of blanks. Failures
 * resolve to null rather than rejecting, and clear the in-flight slot so a later
 * mount can retry.
 *
 * @returns {Promise<object|null>} Stats payload, or null when unavailable.
 */
export function fetchIndexStats() {
    if (statsCache) return Promise.resolve(statsCache);
    if (statsInFlight) return statsInFlight;

    statsInFlight = fetch(STATS_ENDPOINT, { headers: { accept: 'application/json' } })
        .then(res => (res.ok ? res.json() : null))
        .then(payload => {
            statsCache = payload && payload.beatmapset_count ? payload : null;
            statsInFlight = null;
            return statsCache;
        })
        .catch(() => {
            statsInFlight = null;
            return null;
        });

    return statsInFlight;
}

/**
 * Thousands-separated count for the index stat line.
 *
 * The locale is pinned to 'en-US' rather than the visitor's, so the separators
 * in the stats strip stay stable regardless of browser locale. Input that does
 * not coerce to a finite number renders as '-' rather than collapsing to 0,
 * since a missing corpus figure must not be shown as an empty archive; `null`
 * and `''` are the exception, coercing to 0 and printing as '0'.
 *
 * @param {number|string} value - Count to format.
 * @returns {string} Formatted integer string, or '-'.
 */
export function formatCount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-US') : '-';
}

/**
 * Human-readable byte size using binary (1024-based) units.
 *
 * Precision drops from two decimals to none once the mantissa reaches 100, so
 * the label stays roughly the same width at every magnitude. Zero and negative
 * sizes render as '-' because they mean "not reported", not "empty archive".
 *
 * @param {number|string} value - Size in bytes.
 * @returns {string} Formatted size, e.g. '4.20 GiB', '512 MiB', or '-'.
 */
export function formatBytes(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return '-';
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
    let i = 0;
    let v = n;
    while (v >= 1024 && i < units.length - 1) {
        v /= 1024;
        i += 1;
    }
    return `${v.toFixed(v >= 100 ? 0 : 2)} ${units[i]}`;
}

/**
 * Fetch and shape the newest ranked sets once per page load.
 *
 * Same memoise-and-share pattern as fetchIndexStats: a shaped result is cached
 * and a concurrent call joins the in-flight promise. A non-ok response or a
 * payload without a `beatmapsets` array shapes an empty list rather than
 * throwing, and a network failure resolves to EMPTY without caching it, so the
 * hero degrades to nothing-to-show and a later mount can try again.
 *
 * @returns {Promise<{items: object[], mode: string, todayCount: number, newest: (string|null)}>}
 *   The hero track model.
 */
export function fetchRankedToday() {
    if (cached) return Promise.resolve(cached);
    if (inFlight) return inFlight;

    inFlight = fetch(ENDPOINT, { headers: { accept: 'application/json' } })
        .then(res => (res.ok ? res.json() : null))
        .then(payload => {
            const sets = payload && Array.isArray(payload.beatmapsets) ? payload.beatmapsets : [];
            cached = shape(sets);
            inFlight = null;
            return cached;
        })
        .catch(() => {
            inFlight = null;
            return EMPTY;
        });

    return inFlight;
}
