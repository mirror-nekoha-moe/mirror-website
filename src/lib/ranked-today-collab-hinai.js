import { cover } from './mirror-collab-hinai.js';

const ENDPOINT = '/api/search?status=ranked&sort=ranked&order=desc&page=1';

const TRACK_MIN = 6;
const TRACK_MAX = 16;

let cached = null;
let inFlight = null;

const EMPTY = { items: [], mode: 'recent', todayCount: 0, newest: null };

function sameLocalDay(a, b) {
    return a.getFullYear() === b.getFullYear()
        && a.getMonth() === b.getMonth()
        && a.getDate() === b.getDate();
}

export function topStars(set) {
    const diffs = Array.isArray(set.beatmaps) ? set.beatmaps : [];
    let top = 0;
    for (const d of diffs) {
        const sr = Number(d.difficulty_rating);
        if (Number.isFinite(sr) && sr > top) top = sr;
    }
    return top;
}

export function starTier(stars) {
    if (stars < 2.0) return 1;
    if (stars < 2.7) return 2;
    if (stars < 4.0) return 3;
    if (stars < 5.3) return 4;
    if (stars < 6.5) return 5;
    return 6;
}

export function modeCounts(set) {
    const m = set.mirror || {};
    return [
        { key: 'osu', count: m.mode_osu_count ?? 0 },
        { key: 'taiko', count: m.mode_taiko_count ?? 0 },
        { key: 'fruits', count: m.mode_fruits_count ?? 0 },
        { key: 'mania', count: m.mode_mania_count ?? 0 },
    ];
}

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

export function peekRankedToday() {
    return cached;
}

const STATS_ENDPOINT = '/api/stats';

let statsCache = null;
let statsInFlight = null;

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

export function formatCount(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n.toLocaleString('en-US') : '-';
}

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
