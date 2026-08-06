import { ESTATE, MIRROR } from './mirror-collab-hinai.js';

export const JOSU = 'https://josu.hinamizawa.ai';
export const MIRROR_DOCS = 'https://mirror.hinamizawa.ai/docs';

export const josuUrl = beatmapId => `${JOSU}/?b=${beatmapId}`;
export const storyboardViewerUrl = setId => `${ESTATE}/osu/storyboards/${setId}/`;
export const audioUrl = setId => `${MIRROR}/v3/osu/music/audio/${setId}`;
export const previewFallback = setId => `https://b.ppy.sh/preview/${setId}.mp3`;
export const backgroundUrl = setId => `${MIRROR}/v3/osu/beatmaps/bg/${setId}?download=1`;
export const coverUrl = setId => `${MIRROR}/v3/osu/beatmaps/cover/${setId}?download=1`;
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

export function modsToWire(active) {
    return WIRE_ORDER.filter(m => active.has(m)).join('');
}

export function splitMods(key) {
    if (key === 'NM') return ['NM'];
    const out = [];
    for (let i = 0; i < key.length; i += 2) out.push(key.slice(i, i + 2));
    return out;
}

export function orderModKeys(table) {
    const present = new Set(Object.keys(table));
    const known = MOD_ORDER.filter(k => present.has(k));
    const extra = [...present].filter(k => !MOD_ORDER.includes(k)).sort();
    return [...known, ...extra];
}

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

export function formatDuration(seconds) {
    const s = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function compact(n) {
    const v = Number(n);
    if (!Number.isFinite(v)) return '-';
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e4) return `${(v / 1e3).toFixed(1)}K`;
    return v.toLocaleString();
}

function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

const detailCache = new Map();
const detailInflight = new Map();

export function peekSetDetails(setId) {
    return detailCache.get(setId) || null;
}

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

export async function fetchAudioStatus(setId, signal) {
    try {
        const res = await fetch(`${MIRROR}/v3/osu/music/audio/${setId}/status`, {
            headers: { accept: 'application/json' },
            signal,
        });
        if (!res.ok) return { cached: true, bytes: null };
        const data = await res.json();
        return { cached: data && data.status === 'cached', bytes: num(data && data.size_bytes) };
    } catch {
        return { cached: true, bytes: null };
    }
}

const FAV_STORE = 'nk-hinai-favs';

function readFavs() {
    try {
        const raw = window.localStorage.getItem(FAV_STORE);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? new Set(parsed) : new Set();
    } catch {
        return new Set();
    }
}

export function isFavorited(setId) {
    if (typeof window === 'undefined') return false;
    return readFavs().has(Number(setId));
}

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

export async function recordStoryboardView(setId) {
    try {
        await fetch(`${MIRROR}/v3/osu/storyboard/${setId}/view`, { method: 'POST' });
    } catch {
        return;
    }
}

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
            likes: num(data.like_count),
            liked: !!data.user_liked,
            coverDownloads: num(data.cover_downloads),
            bgDownloads: num(data.bg_downloads),
            artDownloads: num(data.art_downloads),
        };
    } catch {
        return null;
    }
}

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
    return { liked: !!data.liked, count: num(data.like_count) };
}

export async function recordBeatmapView(setId) {
    try {
        await fetch(`${MIRROR}/v3/osu/beatmaps/${setId}/view`, { method: 'POST' });
    } catch {
        return;
    }
}

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

export async function downloadArtwork(url, filename) {
    let res;
    try {
        res = await fetch(url, { headers: { accept: 'image/*, application/json' } });
    } catch {
        return { kind: 'unavailable', message: 'Network error. Check your connection and try again.' };
    }

    if (res.ok) {
        saveBlob(await res.blob(), filename);
        return { kind: 'ok' };
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
