import { useCallback, useEffect, useRef, useState } from 'react';
import { FaChevronDown, FaChevronRight, FaDownload, FaTimes } from 'react-icons/fa';
import MapperLink from './MapperLink-collab-hinai.jsx';
import { cover, setDownloadUrl } from '../lib/mirror-collab-hinai.js';
import {
    MODE_LABELS,
    fetchPackDetail,
    peekPackDetail,
    packRuleset,
    packTypeLabel,
    packZipUrl,
    ppColor,
    diffStars,
    formatCount,
    formatPp,
    formatDate,
    triggerDownload,
} from '../lib/packs-collab-hinai.js';

function sortedDiffs(set) {
    const diffs = set.beatmaps_pp || [];
    return diffs.slice().sort((a, b) => {
        const left = a.pp === null || a.pp === undefined ? Infinity : a.pp;
        const right = b.pp === null || b.pp === undefined ? Infinity : b.pp;
        return left - right;
    });
}

export default function PackDetailModal({ pack, onClose }) {
    const cached = peekPackDetail(pack.tag);
    const [detail, setDetail] = useState(cached);
    const [loading, setLoading] = useState(!cached);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [expanded, setExpanded] = useState(null);
    const [busySets, setBusySets] = useState(() => []);
    const [zipBusy, setZipBusy] = useState(false);
    const closeRef = useRef(null);

    useEffect(() => {
        let active = true;
        if (peekPackDetail(pack.tag) && retryKey === 0) {
            setLoading(false);
            return () => { active = false; };
        }
        setLoading(true);
        setError('');
        fetchPackDetail(pack.tag)
            .then(data => {
                if (!active) return;
                setDetail(data);
                setLoading(false);
            })
            .catch(() => {
                if (!active) return;
                setError('Could not load this pack right now. You can still download it below.');
                setLoading(false);
            });
        return () => { active = false; };
    }, [pack.tag, retryKey]);

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

    useEffect(() => {
        if (busySets.length === 0) return undefined;
        const timer = setTimeout(() => setBusySets([]), 2000);
        return () => clearTimeout(timer);
    }, [busySets]);

    useEffect(() => {
        if (!zipBusy) return undefined;
        const timer = setTimeout(() => setZipBusy(false), 3000);
        return () => clearTimeout(timer);
    }, [zipBusy]);

    const downloadZip = () => {
        setZipBusy(true);
        triggerDownload(packZipUrl(pack.tag));
    };

    const downloadSet = id => {
        setBusySets(prev => (prev.includes(id) ? prev : prev.concat(id)));
        triggerDownload(setDownloadUrl(id));
    };

    const sets = (detail && detail.beatmapsets) || [];
    const summary = pack.pp_summary;

    return (
        <div className="pack-modal" onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="pack-modal__dialog cbg-dark rounded-3" role="dialog" aria-modal="true" aria-label={pack.name}>
                <div className="pack-modal__head">
                    <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge rounded-pill text-bg-dark">{pack.tag}</span>
                            <span className="badge rounded-pill text-bg-dark">{MODE_LABELS[packRuleset(pack)]}</span>
                            <span className="badge rounded-pill text-bg-dark">{packTypeLabel(pack)}</span>
                        </div>
                        <h2 className="h5 mb-1 text-white">{pack.name}</h2>
                        <div className="small text-secondary">
                            {pack.author || 'Unknown'}
                            {pack.date && <span className="text-muted"> · {formatDate(pack.date)}</span>}
                            {summary && (
                                <span style={{ color: ppColor(summary.max_pp) }}>
                                    {' · '}{formatPp(summary.min_pp)}-{formatPp(summary.max_pp)} pp
                                </span>
                            )}
                        </div>
                    </div>
                    <button type="button" ref={closeRef} className="btn btn-sm btn-dark-c1" onClick={handleClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="pack-modal__actions">
                    <button type="button" className="btn btn-sm btn-success d-flex align-items-center gap-2" onClick={downloadZip} disabled={zipBusy}>
                        <FaDownload size={11} />
                        <span>{zipBusy ? 'Starting...' : 'Download whole pack (.zip)'}</span>
                    </button>
                    <span className="small text-muted">or grab individual maps below</span>
                </div>

                <div className="pack-modal__body">
                    {loading && (
                        <div className="search-loading-bar">
                            <div className="search-loading-bar-value" />
                        </div>
                    )}

                    {!loading && error && (
                        <div className="alert bg-danger d-flex justify-content-between align-items-center gap-3">
                            <span>{error}</span>
                            <button type="button" className="btn btn-sm btn-dark-c1" onClick={() => setRetryKey(k => k + 1)}>
                                Retry
                            </button>
                        </div>
                    )}

                    {!loading && !error && sets.length === 0 && (
                        <p className="text-muted small mb-0">No beatmapsets listed for this pack.</p>
                    )}

                    {!loading && !error && sets.length > 0 && (
                        <ol className="pack-modal__list">
                            {sets.map(set => {
                                const open = expanded === set.id;
                                const diffs = sortedDiffs(set);
                                const setSummary = set.pp_summary || {};
                                return (
                                    <li key={set.id} className="pack-modal__row">
                                        <div className="pack-modal__row-head">
                                            <button
                                                type="button"
                                                className="pack-modal__row-open"
                                                onClick={() => setExpanded(open ? null : set.id)}
                                                aria-expanded={open}
                                            >
                                                <span className="pack-modal__chev">
                                                    {open ? <FaChevronDown size={10} /> : <FaChevronRight size={10} />}
                                                </span>
                                                <span
                                                    className="pack-modal__cover"
                                                    style={{ backgroundImage: `url('${cover(set.id, 'list')}')` }}
                                                />
                                                <span className="flex-grow-1 overflow-hidden">
                                                    <span className="d-block text-white text-truncate">{set.title || `Set ${set.id}`}</span>
                                                    <span className="d-block small text-secondary text-truncate">{set.artist}</span>
                                                </span>
                                            </button>

                                            <span className="pack-modal__meta small flex-shrink-0 text-end">
                                                {set.creator && (
                                                    <span className="d-flex justify-content-end text-truncate">
                                                        <MapperLink name={set.creator} avatar />
                                                    </span>
                                                )}
                                                {setSummary.max_pp !== undefined && setSummary.max_pp !== null && (
                                                    <span className="d-block" style={{ color: ppColor(setSummary.max_pp) }}>
                                                        {formatPp(setSummary.min_pp)}-{formatPp(setSummary.max_pp)} pp
                                                    </span>
                                                )}
                                                <span className="d-block text-muted">{formatCount(diffs.length)} diffs</span>
                                            </span>
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-success flex-shrink-0"
                                                onClick={() => downloadSet(set.id)}
                                                disabled={busySets.includes(set.id)}
                                                aria-label={`Download ${set.title || `set ${set.id}`}`}
                                            >
                                                <FaDownload size={11} />
                                            </button>
                                        </div>

                                        {open && diffs.length > 0 && (
                                            <ul className="pack-modal__diffs">
                                                {diffs.map(diff => {
                                                    const stars = diffStars(diff);
                                                    return (
                                                        <li key={diff.beatmap_id} className="pack-modal__diff">
                                                            <span className="pack-modal__diff-name text-truncate">{diff.version}</span>
                                                            <span className="text-secondary flex-shrink-0">
                                                                {stars === null ? '-' : `${stars.toFixed(2)}★`}
                                                            </span>
                                                            <span className="flex-shrink-0" style={{ color: ppColor(diff.pp) }}>
                                                                {formatPp(diff.pp)} pp
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </div>
            </div>
        </div>
    );
}
