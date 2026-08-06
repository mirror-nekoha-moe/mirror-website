import { useEffect, useRef, useState } from 'react';
import { FaHeart, FaPause, FaPlay, FaRegHeart, FaVolumeDown, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';
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

const VOL_KEY = 'nk-haud-volume';
const VOL_STEP = 0.05;

const volSubs = new Set();
let volState = null;

/**
 * Clamps a raw volume figure into the 0..1 range and snaps it to two decimals.
 * The rounding is deliberate: pointer drags produce long floats, and quantising
 * to whole percent keeps the persisted value and the rendered `width: %` stable
 * instead of jittering by fractions of a pixel on every pointermove.
 *
 * @param {number} n - Unclamped volume, typically a fraction derived from a pointer position.
 * @returns {number} A value in [0, 1] rounded to the nearest 0.01.
 */
function clamp01(n) {
    return Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
}

/**
 * Returns the shared volume state, hydrating it from localStorage on first call.
 * The result is memoised in the module-level `volState` singleton so that every
 * player mounted on the page starts at the same level and only one storage read
 * ever happens. Any failure (SSR, disabled storage, corrupt JSON) falls back to
 * full volume and unmuted rather than propagating.
 *
 * @returns {{volume: number, muted: boolean}} The shared, mutable-by-replacement volume state.
 */
function readVolume() {
    if (volState) return volState;

    let volume = 1;
    let muted = false;
    try {
        const raw = window.localStorage.getItem(VOL_KEY);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Number.isFinite(parsed.volume)) volume = clamp01(parsed.volume);
        if (parsed && typeof parsed.muted === 'boolean') muted = parsed.muted;
    } catch {
        volume = 1;
        muted = false;
    }

    volState = { volume, muted };
    return volState;
}

/**
 * Serialises the volume state to localStorage under `VOL_KEY`, swallowing the
 * throw that private-browsing or a full quota produces so a failed write can
 * never break playback. The boolean is informational; the in-memory state is
 * updated by the caller regardless of whether persistence succeeded.
 *
 * @param {{volume: number, muted: boolean}} next - The state to store.
 * @returns {boolean} True when the write landed, false when storage rejected it.
 */
function persistVolume(next) {
    try {
        window.localStorage.setItem(VOL_KEY, JSON.stringify(next));
        return true;
    } catch {
        return false;
    }
}

/**
 * The single mutation point for volume across the whole page: clamps the level,
 * replaces the shared state with a fresh object (so subscribed React setters see
 * a new reference and re-render), persists it, then fans the new value out to
 * every mounted player. Volume is global rather than per-player on purpose,
 * since only one `<audio>` is ever unpaused at a time.
 *
 * @param {number} volume - Desired level, clamped into 0..1.
 * @param {boolean} muted - Desired mute flag, stored independently of the level.
 * @returns {void}
 */
function writeVolume(volume, muted) {
    const next = { volume: clamp01(volume), muted };
    volState = next;
    persistVolume(next);
    volSubs.forEach(fn => fn(next));
}

/**
 * Picks one of three speaker glyphs for the mute button. An explicit mute and a
 * level of exactly zero render identically, so the button always looks silent
 * when it sounds silent regardless of which of the two states produced it.
 *
 * @param {object} props - Component props.
 * @param {number} props.volume - Current level in 0..1.
 * @param {boolean} props.muted - Whether output is muted independently of the level.
 * @returns {JSX.Element} A 12px react-icons speaker glyph.
 */
function VolumeIcon({ volume, muted }) {
    if (muted || volume === 0) return <FaVolumeMute size={12} />;
    if (volume < 0.5) return <FaVolumeDown size={12} />;
    return <FaVolumeUp size={12} />;
}

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

/**
 * A heart toggle that drives one of three different engagement counters on the
 * hinai mirror, selected by `kind` through the `KINDS` spec table. The state is
 * optimistic: the heart flips immediately, then reconciles against whatever the
 * mirror returns, and reverts if the request fails.
 *
 * For `music` the mount effect seeds the heart synchronously from the local
 * favourite list, so it settles without waiting on the network; the state itself
 * still starts off, because that seed runs in an effect rather than in the
 * `useState` initialiser. The network read then reconciles it. The art and
 * storyboard kinds have no local mirror of that state and so stay off until
 * their own read resolves.
 *
 * @param {object} props - Component props.
 * @param {number|string} props.setId - The beatmap set id the engagement is recorded against.
 * @param {'music'|'art'|'storyboard'} [props.kind='music'] - Which counter to drive; an unknown value falls back to the music spec.
 * @param {boolean} [props.compactLabel=false] - When true the text label is dropped, leaving only the icon and count.
 * @returns {JSX.Element} The toggle button.
 */
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

    /**
     * Toggles the engagement for the current set. Stops the event so the button
     * can live inside a clickable card without also triggering it, flips the
     * heart optimistically, then trusts the server response for both the state
     * and the count. On failure the optimistic flip is undone and a short note
     * replaces the tooltip, surfacing the rate limiter's retry window when the
     * thrown error carries one.
     *
     * Kinds that declare a `write` use it; `music` has none and falls through to
     * `setFavorite`, which is also what maintains the local favourite list.
     *
     * @param {import('react').MouseEvent<HTMLButtonElement>} e - The click event.
     * @returns {Promise<void>} Resolves once the request settles and `busy` is cleared.
     */
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

/**
 * The mirror's inline song player: transport, seek bar, quality badge, volume
 * rail and a favourite button for one beatmap set.
 *
 * Three behaviours are worth knowing before editing it. Playback is exclusive
 * page-wide through the module-level `nowPlaying` handle, so starting any player
 * pauses whichever one was running. The source starts at the mirror's audio
 * endpoint and falls back exactly once to osu!'s 30 second preview if the
 * element errors, which is why `triedFallback` is a ref rather than state. And
 * when the mirror is still extracting the full song, a bounded poll watches for
 * the cache to fill and then offers an explicit upgrade button instead of
 * swapping the source out from under a playing track.
 *
 * @param {object} props - Component props.
 * @param {number|string} props.setId - Beatmap set id to stream.
 * @param {boolean} [props.dense=false] - Compact variant for list rows; it skips the upfront audio-status probe entirely and only asks once the user actually presses play, which keeps a long list of cards from firing a request per row.
 * @returns {JSX.Element} The player.
 */
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
    const volDragging = useRef(false);
    const [vol, setVol] = useState(readVolume);

    useEffect(() => {
        volSubs.add(setVol);
        return () => {
            volSubs.delete(setVol);
        };
    }, []);

    useEffect(() => {
        const a = audioRef.current;
        if (!a) return;
        a.volume = vol.volume;
        a.muted = vol.muted;
    }, [vol, src]);

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

    /**
     * Swaps the 30 second preview for the freshly cached full song. The `?full=1`
     * query is what makes the browser treat this as a different resource and
     * re-request it instead of reusing the cached preview response. Timeline
     * state is reset because the new media is a different length, and playback is
     * resumed on the next frame so React has committed the new `src` first;
     * an autoplay rejection is intentionally ignored.
     *
     * @returns {void}
     */
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

    /**
     * Plays or pauses the element. It deliberately does not touch `playing`,
     * because the element's own `onPlay`/`onPause` handlers own that state and
     * therefore stay correct even when playback is stopped by something else,
     * such as another player claiming `nowPlaying`. A rejected `play()` (autoplay
     * policy, or a source that never loaded) is swallowed.
     *
     * @returns {void}
     */
    const toggle = () => {
        const a = audioRef.current;
        if (!a) return;
        if (a.paused) a.play().catch(() => {});
        else a.pause();
    };

    /**
     * Seeks to the position a pointer is pointing at on the progress track. The
     * fraction is measured against the track's live bounding rect so it stays
     * correct while the page scrolls or the layout reflows mid-drag, and the
     * displayed time is pushed immediately rather than waiting for the next
     * `timeupdate`, which would otherwise make the thumb lag the cursor.
     * No-ops until metadata has given us a duration.
     *
     * @param {number} clientX - Viewport x coordinate of the pointer.
     * @param {HTMLElement} track - The progress track element the pointer is over.
     * @returns {void}
     */
    const seekAt = (clientX, track) => {
        const a = audioRef.current;
        if (!a || !dur) return;
        const rect = track.getBoundingClientRect();
        const p = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
        a.currentTime = p * dur;
        setCur(a.currentTime);
    };

    /**
     * Absolute seek clamped to the loaded duration, used by the keyboard
     * transport where an offset can easily run past either end of the track.
     * No-ops until metadata has given us a duration.
     *
     * @param {number} t - Target position in seconds; values outside 0..duration are clamped.
     * @returns {void}
     */
    const seekTo = t => {
        const a = audioRef.current;
        if (!a || !dur) return;
        const clamped = Math.min(dur, Math.max(0, t));
        a.currentTime = clamped;
        setCur(clamped);
    };

    /**
     * Ends a seek drag, handling both pointerup and pointercancel. Capture is
     * only released after checking we still hold it, because a cancel can arrive
     * after the browser has already released capture implicitly and
     * `releasePointerCapture` throws on an unheld pointer id.
     *
     * @param {import('react').PointerEvent<HTMLElement>} e - The terminating pointer event.
     * @returns {void}
     */
    const endDrag = e => {
        dragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    /**
     * Sets the shared volume from a pointer position on the volume rail. Landing
     * anywhere above zero force-unmutes, since dragging the rail is an unambiguous
     * request to hear something; dragging all the way down to zero instead leaves
     * the existing mute flag alone, so a muted player that gets scrubbed to
     * silence does not quietly unmute itself.
     *
     * @param {number} clientX - Viewport x coordinate of the pointer.
     * @param {HTMLElement} rail - The volume rail element the pointer is over.
     * @returns {void}
     */
    const setVolumeAt = (clientX, rail) => {
        const rect = rail.getBoundingClientRect();
        const next = clamp01((clientX - rect.left) / rect.width);
        writeVolume(next, next === 0 ? vol.muted : false);
    };

    /**
     * Steps the shared volume by one keyboard increment. A muted player is
     * treated as sitting at zero rather than at its stored level, so the first
     * press out of mute ramps up from silence instead of jumping back to the old
     * level; conversely, stepping down to zero mutes, keeping the icon, the rail
     * and the actual output in agreement.
     *
     * @param {number} delta - Signed step, normally plus or minus `VOL_STEP`.
     * @returns {void}
     */
    const nudgeVolume = delta => {
        const base = vol.muted ? 0 : vol.volume;
        const next = clamp01(base + delta);
        writeVolume(next, next === 0);
    };

    /**
     * Ends a volume-rail drag on pointerup or pointercancel, releasing capture
     * only if it is still held for the same reason as `endDrag`. Kept separate
     * from `endDrag` because the two rails track their drag state in different
     * refs and can be dragged independently.
     *
     * @param {import('react').PointerEvent<HTMLElement>} e - The terminating pointer event.
     * @returns {void}
     */
    const endVolDrag = e => {
        volDragging.current = false;
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
    };

    /**
     * Keyboard control for the volume rail, which is an ARIA slider and so is
     * expected to answer the arrow keys plus Home and End. Arrows step by
     * `VOL_STEP`, Home mutes at zero, End goes to full and unmutes, and M toggles
     * mute while preserving the stored level so it can be restored. Handled keys
     * call `preventDefault` to stop the arrows scrolling the page underneath;
     * anything else falls through untouched.
     *
     * @param {import('react').KeyboardEvent<HTMLElement>} e - The keydown event.
     * @returns {void}
     */
    const onVolKey = e => {
        switch (e.key) {
            case 'ArrowLeft':
            case 'ArrowDown':
                e.preventDefault();
                nudgeVolume(-VOL_STEP);
                break;
            case 'ArrowRight':
            case 'ArrowUp':
                e.preventDefault();
                nudgeVolume(VOL_STEP);
                break;
            case 'Home':
                e.preventDefault();
                writeVolume(0, true);
                break;
            case 'End':
                e.preventDefault();
                writeVolume(1, false);
                break;
            case 'm':
            case 'M':
                e.preventDefault();
                writeVolume(vol.volume, !vol.muted);
                break;
            default:
                break;
        }
    };

    /**
     * Keyboard transport for the seek track. Space and Enter toggle playback,
     * the arrows scrub five seconds either way, Home rewinds and End jumps to the
     * duration. Because the track is a focusable ARIA slider rather than a
     * button, Space would otherwise scroll the page, so every handled key calls
     * `preventDefault`. Seeks go through `seekTo`, which clamps them.
     *
     * @param {import('react').KeyboardEvent<HTMLElement>} e - The keydown event.
     * @returns {void}
     */
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

            <div className="haud__vol">
                <button
                    type="button"
                    className="haud__volbtn"
                    onClick={() => writeVolume(vol.volume, !vol.muted)}
                    aria-label={vol.muted ? 'Unmute' : 'Mute'}
                    title={vol.muted ? 'Unmute' : `Mute (${Math.round(vol.volume * 100)}%)`}
                >
                    <VolumeIcon volume={vol.volume} muted={vol.muted} />
                </button>

                <div
                    className="haud__volrail"
                    role="slider"
                    tabIndex={0}
                    aria-label="Volume"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round((vol.muted ? 0 : vol.volume) * 100)}
                    onPointerDown={e => {
                        volDragging.current = true;
                        e.currentTarget.setPointerCapture(e.pointerId);
                        setVolumeAt(e.clientX, e.currentTarget);
                    }}
                    onPointerMove={e => {
                        if (volDragging.current) setVolumeAt(e.clientX, e.currentTarget);
                    }}
                    onPointerUp={endVolDrag}
                    onPointerCancel={endVolDrag}
                    onKeyDown={onVolKey}
                >
                    <div
                        className="haud__volfill"
                        style={{ width: `${(vol.muted ? 0 : vol.volume) * 100}%` }}
                    />
                </div>
            </div>

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
