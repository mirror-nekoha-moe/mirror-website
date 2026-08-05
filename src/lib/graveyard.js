import { MIRROR } from './mirror.js';

const COLLAB = `${MIRROR}/api/v1/nekoha-collab`;

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

export const modeLabel = mode => MODE_LABELS[mode] || 'osu!';
export const statusColor = status => STATUS_COLORS[String(status).toLowerCase()] || '#8a7f85';

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

export function ppColor(pp) {
    const value = Number(pp);
    if (!Number.isFinite(value)) return '#636378';
    if (value < 150) return '#88da20';
    if (value < 300) return '#ffd700';
    if (value < 500) return '#ff7043';
    return '#ff66ab';
}

export function formatPP(pp) {
    const value = Number(pp);
    if (!Number.isFinite(value)) return '-';
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e4) return `${(value / 1e3).toFixed(1)}K`;
    return Math.round(value).toLocaleString();
}

export function formatStars(stars) {
    const value = Number(stars);
    if (!Number.isFinite(value)) return '-';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    if (value >= 100) return value.toFixed(0);
    return value.toFixed(2);
}

export function formatLength(seconds) {
    const total = Number(seconds);
    if (!Number.isFinite(total) || total <= 0) return '-';
    const m = Math.floor(total / 60);
    const s = Math.floor(total % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatCount(value) {
    return Number(value || 0).toLocaleString();
}

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

async function getJson(url, signal) {
    const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`request failed: ${res.status}`);
    const body = await res.text();
    try {
        return JSON.parse(body);
    } catch {
        throw new Error('collab API returned a non-JSON response');
    }
}

export function searchGraveyard(query, signal) {
    return getJson(`${COLLAB}/search?${query}`, signal);
}

export function graveyardStats(signal) {
    return getJson(`${COLLAB}/stats`, signal);
}

export function graveyardSet(setId, signal) {
    return getJson(`${COLLAB}/s/${setId}`, signal);
}

export const graveyardDownloadUrl = setId => `/api/download/${setId}`;
