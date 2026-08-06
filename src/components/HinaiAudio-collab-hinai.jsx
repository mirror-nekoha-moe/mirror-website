import { useEffect, useRef, useState } from 'react';
import { FaHeart, FaPause, FaPlay, FaRegHeart } from 'react-icons/fa';
import {
    audioUrl,
    compact,
    fetchAudioStatus,
    formatDuration,
    getBeatmapEngagement,
    getFavorite,
    getStoryboardEngagement,
    isFavorited,
    previewFallback,
    setFavorite,
    toggleArtLike,
    toggleStoryboardLike,
} from '../lib/hinai-collab-hinai.js';

let nowPlaying = null;

const POLL_MS = 6000;
const POLL_MAX = 8;

const KINDS = {
    music: {
        label: 'Favourite',
        onLabel: 'Favourited',
        read: getFavorite,
        titleOn: 'Remove from hinai music favourites',
        titleOff: 'Favourite this song on mirror.hinamizawa.ai',
    },
    art: {
        label: 'Like Art',
        onLabel: 'Liked Art',
        read: async setId => {
            const e = await getBeatmapEngagement(setId);
            return e ? { favorited: e.liked, count: e.likes } : null;
        },
        write: async setId => {
            const r = await toggleArtLike(setId);
            return { favorited: r.liked, count: r.count };
        },
        titleOn: 'Remove your art like on mirror.hinamizawa.ai',
        titleOff: 'Like this beatmap\u2019s artwork on mirror.hinamizawa.ai',
    },
    storyboard: {
        label: 'Like storyboard',
        onLabel: 'Liked storyboard',
        read: async setId => {
            const e = await getStoryboardEngagement(setId);
            return e ? { favorited: e.liked, count: e.likes } : null;
        },
        write: async setId => {
            const r = await toggleStoryboardLike(setId);
            return { favorited: r.liked, count: r.count };
        },
        titleOn: 'Remove your storyboard like on mirror.hinamizawa.ai',
        titleOff: 'Like this storyboard on mirror.hinamizawa.ai',
    },
};

export function FavoriteButton({ setId, kind = 'music', compactLabel = false }) {
    const spec = KINDS[kind] || KINDS.music;
    const [on, setOn] = useState(false);
    const [count, setCount] = useState(null);
    const [busy, setBusy] = useState(false);
    const [note, setNote] = useState('');

    useEffect(() => {
        let alive = true;
        setOn(kind === 'music' ? isFavorited(setId) : false);
        setCount(null);
        setNote('');

        spec.read(setId).then(res => {
            if (!alive || !res) return;
            setOn(res.favorited);
            setCount(res.count);
        });

        return () => {
            alive = false;
        };
    }, [setId, kind, spec]);

    const click = async e => {
        e.preventDefault();
        e.stopPropagation();
        if (busy) return;

        const next = !on;
        setBusy(true);
        setNote('');
        setOn(next);

        try {
            const res = spec.write ? await spec.write(setId) : await setFavorite(setId, next);
            setOn(res.favorited);
            setCount(res.count);
        } catch (err) {
            setOn(!next);
            setNote(err && err.retryAfter ? `Too fast, retry in ${err.retryAfter}s` : 'Could not save');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className={`hfav ${on ? 'hfav--on' : ''}`}
            onClick={click}
            disabled={busy}
            aria-pressed={on}
            title={note || (on ? spec.titleOn : spec.titleOff)}
        >
            {on ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
            {count != null && <span className="hfav__count">{compact(count)}</span>}
            {!compactLabel && <span className="hfav__label">{on ? spec.onLabel : spec.label}</span>}
        </button>
    );
}

export default function HinaiAudio({ setId, dense = false }) {
    const audioRef = useRef(null);
    const [src, setSrc] = useState(() => audioUrl(setId));
    const [playing, setPlaying] = useState(false);
    const [cur, setCur] = useState(0);
    const [dur, setDur] = useState(0);
    const [quality, setQuality] = useState(null);
    const [fullReady, setFullReady] = useState(false);
    const triedFallback = useRef(false);
    const hasPlayed = useRef(false);
    const dragging = useRef(false);

    useEffect(() => {
        setSrc(audioUrl(setId));
        triedFallback.current = false;
        hasPlayed.current = false;
        setPlaying(false);
        setCur(0);
        setDur(0);
        setQuality(null);
        setFullReady(false);

        if (dense) return undefined;

        const ctrl = new AbortController();
        fetchAudioStatus(setId, ctrl.signal).then(s => setQuality(s.cached ? 'full' : 'preview'));
        return () => ctrl.abort();
    }, [setId, dense]);

    useEffect(() => {
        if (quality !== 'preview' || fullReady) return undefined;

        let polls = 0;
        let cancelled = false;
        const ctrl = new AbortController();
        const timer = setInterval(() => {
            if (!hasPlayed.current) return;
            polls += 1;
            if (polls > POLL_MAX) {
                clearInterval(timer);
                return;
            }
            fetchAudioStatus(setId, ctrl.signal).then(s => {
                if (!cancelled && s.cached) {
                    setFullReady(true);
                    clearInterval(timer);
                }
            });
        }, POLL_MS);

        return () => {
            cancelled = true;
            ctrl.abort();
            clearInterval(timer);
        };
    }, [quality, fullReady, setId]);

    const upgrade = () => {
        setSrc(`${audioUrl(setId)}?full=1`);
        setQuality('full');
        setFullReady(false);
        setCur(0);
        setDur(0);
        requestAnimationFrame(() => {
            const a = audioRef.current;
            if (a) a.play().catch(() => {});
        });
    };

    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) a.play().catch(() => {});
        else a.pause();
    };

    const seekAt = (clientX, track) => {
        const a = audioRef.current;
        if (!a || !dur) return;
        const rect = track.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        a.currentTime = p * dur;
        setCur(a.currentTime);
    };

    const seekTo = t => {
        const a = audioRef.current;
        if (!a || !dur) return;
        const clamped = Math.min(dur, Math.max(0, t));
        a.currentTime = clamped;
        setCur(clamped);
    };

    const endDrag = e => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    const onKey = e => {
        switch (e.key) {
            case ' ':
            case 'Enter':
                e.preventDefault();
                toggle();
                break;
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault();
                seekTo(cur - 5);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault();
                seekTo(cur + 5);
                break;
            case 'Home':
                e.preventDefault();
                seekTo(0);
                break;
            case 'End':
                e.preventDefault();
                seekTo(dur);
                break;
            default:
                break;
        }
    };

    const pct = dur ? (cur / dur) * 100 : 0;
    const word = quality === 'full' ? 'full song' : 'preview';

    return (
        <div className={dense ? "haud haud--dense" : "haud"}>
            <button
                type="button"
                className="haud__play"
                onClick={toggle}
                aria-label={playing ? `Pause ${word}` : `Play ${word}`}
            >
                {playing ? <FaPause size={13} /> : <FaPlay size={13} />}
            </button>

            <div
                className="haud__track"
                role="slider"
                tabIndex={0}
                aria-label={`Seek ${word}`}
                aria-valuemin={0}
                aria-valuemax={Math.round(dur)}
                aria-valuenow={Math.round(cur)}
                onPointerDown={e => {
                    dragging.current = true;
                    e.currentTarget.setPointerCapture(e.pointerId);
                    seekAt(e.clientX, e.currentTarget);
                }}
                onPointerMove={e => {
                    if (dragging.current) seekAt(e.clientX, e.currentTarget);
                }}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onKeyDown={onKey}
            >
                <div className="haud__fill" style={{ width: `${pct}%` }} />
                <div className="haud__thumb" style={{ left: `${pct}%` }} />
            </div>

            <span className="haud__time">
                {formatDuration(cur)} / {formatDuration(dur)}
            </span>

            {fullReady ? (
                <button
                    type="button"
                    className="haud__upgrade"
                    onClick={upgrade}
                    title="The full song just finished caching on our mirror"
                >
                    Full song ready
                </button>
            ) : (
                quality && (
                    <span
                        className={`haud__quality ${quality === 'full' ? 'haud__quality--full' : ''}`}
                        title={
                            quality === 'full'
                                ? "Streamed from mirror.hinamizawa.ai's full-song cache"
                                : "osu!'s 30s preview: our mirror is extracting the full song now"
                        }
                    >
                        {quality === 'full' ? 'Full song' : '30s preview'}
                    </span>
                )
            )}

            <FavoriteButton setId={setId} compactLabel={dense} />

            <audio
                ref={audioRef}
                src={src}
                preload="none"
                onPlay={() => {
                    if (nowPlaying && nowPlaying !== audioRef.current) nowPlaying.pause();
                    nowPlaying = audioRef.current;
                    if (dense && !hasPlayed.current) {
                        fetchAudioStatus(setId).then(s => setQuality(s.cached ? 'full' : 'preview'));
                    }
                    hasPlayed.current = true;
                    setPlaying(true);
                }}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onTimeUpdate={e => {
                    if (!dragging.current) setCur(e.currentTarget.currentTime);
                }}
                onLoadedMetadata={e => setDur(e.currentTarget.duration || 0)}
                onError={() => {
                    if (!triedFallback.current) {
                        triedFallback.current = true;
                        setSrc(previewFallback(setId));
                        setQuality('preview');
                    }
                }}
            />
        </div>
    );
}
