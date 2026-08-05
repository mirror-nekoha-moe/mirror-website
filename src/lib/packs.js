import { MIRROR } from './mirror.js';

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

export function ppParams([lo, hi]) {
    const out = {};
    if (lo > 0) out.min_peak_pp = String(lo);
    if (hi < PP_MAX) out.max_peak_pp = String(hi);
    return out;
}

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

export function fetchPacks(query, signal) {
    return getJson(`${MIRROR}/v3/osu/packs?${query}`, signal);
}

export function fetchPackStats(signal) {
    return getJson(`${MIRROR}/v3/osu/packs/stats`, signal);
}

const detailCache = new Map();
const detailInFlight = new Map();

export function peekPackDetail(tag) {
    return detailCache.get(tag) || null;
}

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

export const packZipUrl = tag => `${MIRROR}/v3/osu/packs/${encodeURIComponent(tag)}/download`;

export function packRuleset(pack) {
    if (pack.ruleset_id !== null && pack.ruleset_id !== undefined) return pack.ruleset_id;
    const tag = String(pack.tag || '');
    const match = TAG_RULESET_PREFIX.find(entry => tag.startsWith(entry.prefix));
    return match ? match.ruleset : 0;
}

export function packTypeLabel(pack) {
    const type = String(pack.pack_type || '').toLowerCase();
    return PACK_TYPE_LABELS[type] || 'Standard';
}

export function ppColor(pp) {
    if (pp === null || pp === undefined) return '#636378';
    if (pp < 150) return '#88da20';
    if (pp < 300) return '#ffd700';
    if (pp < 500) return '#ff7043';
    return '#ff66ab';
}

export function diffStars(diff) {
    const rating = diff.difficulty_rating;
    if (rating !== null && rating !== undefined) return Number(rating);
    if (diff.stars === null || diff.stars === undefined) return null;
    return Number(diff.stars);
}

export function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

export function formatPp(value) {
    if (value === null || value === undefined) return '-';
    return Math.round(Number(value)).toLocaleString();
}

export function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

export function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${(value / (1024 ** 2)).toFixed(2)} MB`;
}

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

