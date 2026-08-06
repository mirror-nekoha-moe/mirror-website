import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';
import MapperLink from './MapperLink-collab-hinai.jsx';
import { proxyImage } from '../lib/mirror-collab-hinai.js';
import {
    graveyardSet,
    graveyardDownloadUrl,
    modColor,
    ppColor,
    statusColor,
    modeLabel,
    formatPP,
    formatStars,
    formatLength,
    formatCount,
} from '../lib/graveyard-collab-hinai.js';

/**
 * Renders a byte count as megabytes with two decimals.
 *
 * Divides by `1024 ** 2`, so the figure is mebibytes even though the label reads "MB", which is the
 * usual convention for a download size.
 *
 * @param {number|string} bytes - Raw size from the collab API, coerced with `Number`.
 * @returns {string|null} A string such as `"4.21 MB"`, or `null` when the value is not a finite
 *   positive number. The modal's only call site guards on `set.file_size` being truthy rather than
 *   on this `null`, so a truthy but unparseable size would still reach the label as `"null"`.
 */
function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${(value / (1024 ** 2)).toFixed(2)} MB`;
}

/**
 * Full-set detail overlay for a graveyard card: difficulty tabs, the selected difficulty's
 * attributes, and its complete per-mod PP table.
 *
 * The header, the `.osz` download and the osu!direct link are all rendered from `seed`, the row the
 * user just clicked, so the modal is useful the instant it opens and stays useful when the set
 * fetch fails; that is why the error banner says the download still works instead of offering only
 * a retry. `retryKey` sits in the fetch effect's dependency list purely so the Retry button can
 * re-run the identical request.
 *
 * Difficulties are sorted ascending by star rating and the PP rows descending by PP, both on copies
 * (`slice()`) because the fetched payload is shared state. `selectedMd5` is seeded from the clicked
 * row, so selection resolves to that difficulty once the set lands, and falls back to the first
 * difficulty if that md5 is absent from the payload. Before the fetch resolves there are no
 * difficulties at all, so `selected` is `null` and the tabs and attribute grid do not render.
 *
 * While mounted the modal locks `document.body` scroll (restoring the exact previous value, not
 * hardcoding `''`), focuses the close button, and closes on Escape. Backdrop dismissal listens for
 * `mousedown` with `e.target === e.currentTarget`, so the press must both start and be on the
 * backdrop itself: a text selection dragged out of the dialog and released on the backdrop does not
 * close it.
 *
 * @param {object} props
 * @param {object} props.seed - The clicked search row, supplying `beatmapset_id`, `beatmap_md5`, `title`, `artist`, `creator`, `status`, `mode` and `cover` before the fetch resolves.
 * @param {string} props.activeMod - The page's mod lens; the matching row of the PP table is highlighted and tinted.
 * @param {() => void} props.onClose - Dismisses the modal.
 * @returns {JSX.Element} The modal overlay and dialog.
 */
export default function GraveyardModal({ seed, activeMod, onClose }) {
    const [set, setSet] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [selectedMd5, setSelectedMd5] = useState(seed.beatmap_md5);
    const closeRef = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError('');
        graveyardSet(seed.beatmapset_id, controller.signal)
            .then(payload => {
                setSet(payload.set || null);
                setLoading(false);
            })
            .catch(() => {
                if (controller.signal.aborted) return;
                setError('Could not load this set right now. You can still download it below.');
                setLoading(false);
            });
        return () => controller.abort();
    }, [seed.beatmapset_id, retryKey]);

    /**
     * Stable wrapper around the `onClose` prop. Memoised so the Escape-key effect below, which
     * depends on it, does not detach and reattach its document listener on every render.
     *
     * @returns {void}
     */
    const handleClose = useCallback(() => onClose(), [onClose]);

    useEffect(() => {
        /**
         * Document-level keydown handler that closes the modal on Escape. Bound to `document`
         * rather than the dialog so it fires no matter where focus currently sits.
         *
         * @param {KeyboardEvent} e - The keydown event.
         * @returns {void}
         */
        const onKeyDown = e => { if (e.key === 'Escape') handleClose(); };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (closeRef.current) closeRef.current.focus();
        return () => { document.body.style.overflow = previous; };
    }, []);

    const diffs = useMemo(() => {
        const list = (set && set.beatmaps) || [];
        return list.slice().sort((a, b) => Number(a.difficulty_rating) - Number(b.difficulty_rating));
    }, [set]);

    const selected = useMemo(
        () => diffs.find(d => d.beatmap_md5 === selectedMd5) || diffs[0] || null,
        [diffs, selectedMd5],
    );

    const ppRows = useMemo(() => {
        const rows = (selected && selected.pp) || [];
        return rows.slice().sort((a, b) => Number(b.pp) - Number(a.pp));
    }, [selected]);

    const cover = set && set.cover ? set.cover : seed.cover;

    return (
        <div className="gv-modal" onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="gv-modal__dialog cbg-dark rounded-3" role="dialog" aria-modal="true" aria-label={seed.title}>
                <div className="gv-modal__head">
                    {cover && <span className="gv-modal__cover" style={{ backgroundImage: `url('${proxyImage(cover)}')` }} />}
                    <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <span className="gv-modal__status" style={{ backgroundColor: statusColor(seed.status) }}>{seed.status}</span>
                            <span className="badge rounded-pill text-bg-dark">{modeLabel(seed.mode)}</span>
                            {set && set.download_disabled && (
                                <span className="badge rounded-pill text-bg-dark" title="Download-disabled on osu!, preserved by nekoha">
                                    collector preserved
                                </span>
                            )}
                        </div>
                        <h2 className="h5 mb-0 text-white text-truncate">{seed.title}</h2>
                        <div className="small text-secondary text-truncate">{seed.artist}</div>
                        <div className="small d-flex align-items-center gap-1 mt-1">
                            <span className="text-muted">mapped by</span>
                            <MapperLink name={seed.creator} avatar />
                        </div>
                    </div>
                    <button type="button" ref={closeRef} className="btn btn-sm btn-dark-c1 flex-shrink-0" onClick={handleClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="gv-modal__actions">
                    <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={graveyardDownloadUrl(seed.beatmapset_id)}>
                        <FaDownload size={11} />
                        <span>Download .osz{set && set.file_size ? ` (${formatBytes(set.file_size)})` : ''}</span>
                    </a>
                    <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${seed.beatmapset_id}`}>
                        <FaDownload size={11} color="black" />
                        <span>osu!direct</span>
                    </a>
                    <span className="small text-muted">set {seed.beatmapset_id}</span>
                </div>

                <div className="gv-modal__body">
                    {loading && (
                        <div className="search-loading-bar"><div className="search-loading-bar-value" /></div>
                    )}

                    {!loading && error && (
                        <div className="alert bg-danger d-flex justify-content-between align-items-center gap-3">
                            <span>{error}</span>
                            <button type="button" className="btn btn-sm btn-dark-c1" onClick={() => setRetryKey(k => k + 1)}>Retry</button>
                        </div>
                    )}

                    {!loading && !error && diffs.length > 0 && (
                        <>
                            <div className="gv-modal__diffs" role="tablist" aria-label="Difficulties">
                                {diffs.map(diff => {
                                    const active = selected && diff.beatmap_md5 === selected.beatmap_md5;
                                    const tint = ppColor(diff.difficulty_rating * 60);
                                    return (
                                        <button
                                            key={diff.beatmap_md5}
                                            type="button"
                                            role="tab"
                                            aria-selected={Boolean(active)}
                                            className={`gv-modal__diff ${active ? 'is-active' : ''}`}
                                            style={active ? { borderColor: tint, color: tint } : undefined}
                                            onClick={() => setSelectedMd5(diff.beatmap_md5)}
                                        >
                                            {formatStars(diff.difficulty_rating)}&#9733; {diff.version}
                                        </button>
                                    );
                                })}
                            </div>

                            {selected && (
                                <div className="gv-modal__attrs">
                                    {[
                                        ['AR', selected.ar], ['OD', selected.od], ['CS', selected.cs], ['HP', selected.hp],
                                        ['BPM', Math.round(Number(selected.bpm) || 0)],
                                        ['Combo', `${formatCount(selected.max_combo)}x`],
                                        ['Length', formatLength(selected.total_length)],
                                        ['Objects', formatCount(selected.total_objects)],
                                    ].map(([label, value]) => (
                                        <span key={label} className="gv-modal__attr">
                                            <span className="text-muted">{label}</span>
                                            <span className="text-white">{typeof value === 'number' ? Number(value).toFixed(1) : value}</span>
                                        </span>
                                    ))}
                                </div>
                            )}

                            {ppRows.length > 0 && (
                                <div className="gv-modal__table-wrap">
                                    <table className="gv-modal__table">
                                        <thead>
                                            <tr>
                                                <th>Mod</th><th>PP</th><th>Stars</th><th>AR</th><th>OD</th><th>CS</th><th>HP</th><th>BPM</th><th>Combo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {ppRows.map(row => {
                                                const isLens = row.mod === activeMod;
                                                const accent = modColor(row.mod);
                                                return (
                                                    <tr key={row.mod} className={isLens ? 'is-lens' : ''} style={isLens ? { backgroundColor: `${accent}14` } : undefined}>
                                                        <td style={{ color: accent, fontWeight: 700 }}>{row.mod}</td>
                                                        <td style={{ color: ppColor(row.pp), fontWeight: 800 }}>{formatPP(row.pp)}</td>
                                                        <td>{formatStars(row.stars)}</td>
                                                        <td>{Number(row.ar).toFixed(1)}</td>
                                                        <td>{Number(row.od).toFixed(1)}</td>
                                                        <td>{Number(row.cs).toFixed(1)}</td>
                                                        <td>{Number(row.hp).toFixed(1)}</td>
                                                        <td>{Math.round(Number(row.bpm) || 0)}</td>
                                                        <td>{formatCount(row.max_combo)}x</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
