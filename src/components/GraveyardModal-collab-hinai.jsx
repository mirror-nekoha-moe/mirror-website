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

function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) return null;
    return `${(value / (1024 ** 2)).toFixed(2)} MB`;
}

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

    const handleClose = useCallback(() => onClose(), [onClose]);

    useEffect(() => {
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
