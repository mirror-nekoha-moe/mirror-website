import { MIRROR } from './mirror-collab-hinai.js';
import { getJson } from './http-collab-hinai.js';

const COLLAB = `${MIRROR}/api/v1/nekoha-collab`;
const UPSTREAM_LABEL = 'collab API';

export const PAGE_SIZE = 24;
export const PP_CAP = 2000;

export const PRIMARY_MODS = ['NM', 'HD', 'HR', 'DT', 'HDDT', 'HDHR', 'HRDT', 'HDHRDT'];

export const MOD_GROUPS = [
    { label: 'No Mod', mods: ['NM'] },
    { label: 'Single', mods: ['HD', 'HR', 'DT', 'FL', 'EZ', 'HT'] },
    { label: 'Double Time', mods: ['HDDT', 'HRDT', 'HDHRDT', 'DTFL', 'HDDTFL', 'HRDTFL', 'HDHRDTFL'] },
    { label: 'Half Time', mods: ['HDHT', 'HRHT', 'HDHRHT', 'HTFL', 'HDHTFL', 'HRHTFL', 'HDHRHTFL'] },
    { label: 'Hidden, HardRock, Flashlight', mods: ['HDHR', 'HRFL', 'HDFL', 'HDHRFL'] },
    { label: 'Easy', mods: ['EZHD', 'EZDT', 'EZFL', 'EZHDDT', 'EZHDFL', 'EZDTFL', 'EZHDDTFL', 'EZHT', 'EZHDHT', 'EZHTFL', 'EZHDHTFL'] },
];

export const MODES = [
    { key: 'all', label: 'All', value: null },
    { key: 'osu', label: 'osu!', value: 0 },
    { key: 'taiko', label: 'Taiko', value: 1 },
    { key: 'fruits', label: 'Catch', value: 2 },
    { key: 'mania', label: 'Mania', value: 3 },
];

export const STATUSES = [
    { key: 'graveyard', label: 'Graveyard' },
    { key: 'ranked', label: 'Ranked' },
    { key: 'loved', label: 'Loved' },
    { key: 'all', label: 'All' },
];

export const SORTS = [
    { key: 'pp_desc', label: 'PP' },
    { key: 'stars_desc', label: 'Stars' },
    { key: 'bpm_desc', label: 'BPM' },
    { key: 'length_desc', label: 'Length' },
];

export const PP_PRESETS = [
    { label: 'Any', range: [0, PP_CAP] },
    { label: 'Up to 300', range: [0, 300] },
    { label: '300-600', range: [300, 600] },
    { label: '600-1k', range: [600, 1000] },
    { label: '1k+', range: [1000, PP_CAP] },
];

export const MEME_RANGE = [PP_CAP, PP_CAP];

const STATUS_COLORS = {
    graveyard: '#8a7f85',
    ranked: '#66ccff',
    approved: '#66ff66',
    qualified: '#02b5c3',
    loved: '#ff66ab',
    pending: '#ffcc22',
    wip: '#ffcc22',
};

const MODE_LABELS = { 0: 'osu!', 1: 'Taiko', 2: 'Catch', 3: 'Mania' };

/**
 * Human label for an osu! ruleset id.
 *
 * Unknown or missing ids fall back to 'osu!' rather than an empty badge, so a
 * card never renders a blank mode chip when the API sends something unexpected.
 *
 * @param {number|string} mode - Ruleset id (0 osu!, 1 taiko, 2 catch, 3 mania).
 * @returns {string} Display label for the ruleset.
 */
export const modeLabel = mode => MODE_LABELS[mode] || 'osu!';
/**
 * Accent colour for a beatmap ranking status.
 *
 * The status is lowercased before lookup because the collab API is not
 * consistent about casing; anything unrecognised gets the muted graveyard grey.
 *
 * @param {string} status - Ranking status such as 'ranked', 'loved', 'graveyard'.
 * @returns {string} Hex colour string.
 */
export const statusColor = status => STATUS_COLORS[String(status).toLowerCase()] || '#8a7f85';

/**
 * Accent colour for a mod combination string.
 *
 * Matching is by substring on the uppercased name and the order of the checks
 * is the priority: for a combo like 'HDDT' the speed-changing mod wins over the
 * others, so a combo is always coloured by its most defining mod rather than by
 * whichever letters happen to come first.
 *
 * @param {string} mod - Mod acronym or combination, e.g. 'NM', 'HD', 'HDHRDT'.
 * @returns {string} Hex colour string.
 */
export function modColor(mod) {
    const name = String(mod || 'NM').toUpperCase();
    if (name.includes('DT')) return '#aa66ff';
    if (name.includes('HT')) return '#4a9eff';
    if (name.includes('HR')) return '#ff4444';
    if (name.includes('EZ')) return '#88da20';
    if (name.includes('FL')) return '#a855f7';
    if (name.includes('HD')) return '#ffcc22';
    return '#66ccff';
}

/**
 * Heat colour for a PP value, from green (tame) to pink (absurd).
 *
 * The guard is `Number.isFinite` on the coerced value, so `undefined`, `NaN`
 * and the infinities get the neutral grey. It deliberately does NOT catch
 * `null` or `''`: those coerce to 0 and come back green, reading as "low"
 * rather than "unknown", which is why call sites that can see a null pp
 * (see HinaiPpPanel's calc result) test for it before calling.
 *
 * @param {number|string} pp - Performance points value.
 * @returns {string} Hex colour string.
 */
export function ppColor(pp) {
    const value = Number(pp);
    if (!Number.isFinite(value)) return '#636378';
    if (value < 150) return '#88da20';
    if (value < 300) return '#ffd700';
    if (value < 500) return '#ff7043';
    return '#ff66ab';
}

/**
 * Compact PP label for card badges.
 *
 * Abbreviation only kicks in at 10,000 (not 1,000), so ordinary four-digit
 * graveyard PP values still print in full with thousands separators and only
 * the joke-tier numbers get shortened. Input that does not coerce to a finite
 * number renders as '-'; note `null` and `''` coerce to 0 and print as '0'.
 *
 * @param {number|string} pp - Performance points value.
 * @returns {string} Formatted PP, e.g. '412', '1,340', '12.5K', '3.1M'.
 */
export function formatPP(pp) {
    const value = Number(pp);
    if (!Number.isFinite(value)) return '-';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e4) return `${(value / 1e3).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
}

/**
 * Star-rating label, normally two decimals.
 *
 * The 100+ and 1000+ branches exist because aspire and broken graveyard maps
 * really do report nonsense star ratings; they are compressed rather than
 * allowed to blow out the badge width. Input that does not coerce to a finite
 * number renders as '-'; note `null` and `''` coerce to 0 and print as '0.00'.
 *
 * @param {number|string} stars - Star difficulty rating.
 * @returns {string} Formatted star rating, e.g. '5.42', '184', '2.3K'.
 */
export function formatStars(stars) {
    const value = Number(stars);
    if (!Number.isFinite(value)) return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (value >= 100) return value.toFixed(0);
    return value.toFixed(2);
}

/**
 * Drain/total length as m:ss.
 *
 * Zero and negative lengths are treated the same as unparseable input and
 * render as '-', since a zero-length map is missing data rather than a real
 * duration worth printing as '0:00'.
 *
 * @param {number|string} seconds - Length in seconds.
 * @returns {string} Length as 'm:ss', or '-' when unusable.
 */
export function formatLength(seconds) {
    const total = Number(seconds);
    if (!Number.isFinite(total) || total <= 0) return '-';
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Thousands-separated count for stat lines.
 *
 * Null, undefined and empty input collapse to 0 rather than NaN, because these
 * are result/hit counters where "nothing yet" is a legitimate answer.
 *
 * @param {number|string} value - Count to format.
 * @returns {string} Locale-formatted integer string.
 */
export function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

/**
 * Serialise the graveyard filter state into a collab-API query string.
 *
 * Four parameters are conditional rather than always sent. `q` is dropped when
 * the term is blank and `min_pp` is dropped when the floor is 0, so a default
 * search sends neither. The other two carry the real intent. `mode` is only sent
 * when the selected entry has a non-null ruleset value, so the 'all' pseudo-mode
 * means "send no mode filter" rather than mode 0. And `max_pp` is dropped
 * entirely when meme mode is on and the upper bound has reached the cap, which
 * is what turns the top of the slider from "at most 2000pp" into an open-ended
 * "above 2000pp" search; without that escape hatch the cap would hide every
 * joke map the mode exists to show.
 *
 * @param {object} filters - Current filter state.
 * @param {string} filters.mod - Mod acronym or combination to filter on.
 * @param {string} filters.status - Ranking status key from STATUSES.
 * @param {string} filters.sort - Sort key from SORTS.
 * @param {string} filters.mode - Ruleset key from MODES ('all' sends nothing).
 * @param {string} [filters.term] - Free-text search, trimmed and dropped if empty.
 * @param {number} filters.page - 1-based page index.
 * @param {number[]} filters.ppRange - Tuple of [minPp, maxPp].
 * @param {boolean} [filters.memeMode] - Whether the above-cap PP mode is active.
 * @returns {string} URL-encoded query string, without a leading '?'.
 */
export function buildSearchQuery({ mod, status, sort, mode, term, page, ppRange, memeMode }) {
    const params = new URLSearchParams();
    params.set('mods', mod);
    params.set('status', status);
    params.set('sort', sort);
    params.set('limit', String(PAGE_SIZE));
    params.set('page', String(page));

    const selected = MODES.find(m => m.key === mode);
    if (selected && selected.value !== null) params.set('mode', String(selected.value));

    const query = (term || '').trim();
    if (query) params.set('q', query);

    const [lo, hi] = ppRange;
    if (lo > 0) params.set('min_pp', String(lo));
    if (!(memeMode && hi >= PP_CAP)) params.set('max_pp', String(hi));

    return params.toString();
}

/**
 * Run a graveyard search against the collab API.
 *
 * @param {string} query - Query string from buildSearchQuery, without '?'.
 * @param {AbortSignal} [signal] - Signal used to cancel a superseded request.
 * @returns {Promise<any>} Parsed search results payload.
 */
export function searchGraveyard(query, signal) {
    return getJson(`${COLLAB}/search?${query}`, UPSTREAM_LABEL, signal);
}

/**
 * Fetch the collab index summary (corpus totals shown above the results).
 *
 * @param {AbortSignal} [signal] - Signal used to cancel a superseded request.
 * @returns {Promise<any>} Parsed stats payload.
 */
export function graveyardStats(signal) {
    return getJson(`${COLLAB}/stats`, UPSTREAM_LABEL, signal);
}

/**
 * Fetch the full per-set detail used by the graveyard modal.
 *
 * @param {number|string} setId - Beatmapset id.
 * @param {AbortSignal} [signal] - Signal used to cancel a superseded request.
 * @returns {Promise<any>} Parsed beatmapset detail payload.
 */
export function graveyardSet(setId, signal) {
    return getJson(`${COLLAB}/s/${setId}`, UPSTREAM_LABEL, signal);
}

/**
 * Download link for a graveyard set.
 *
 * Deliberately a same-origin relative path rather than a link at the hinai
 * mirror host: the .osz is served by nekoha's own download route, so the
 * collab UI never sends a visitor off-site to fetch a map.
 *
 * @param {number|string} setId - Beatmapset id.
 * @returns {string} Relative download URL.
 */
export const graveyardDownloadUrl = setId => `/api/download/${setId}`;
