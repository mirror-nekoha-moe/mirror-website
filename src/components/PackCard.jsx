import { useEffect, useRef, useState } from 'react';
import { FaDownload, FaLayerGroup } from 'react-icons/fa';
import {
    MODE_LABELS,
    observeOnce,
    unobserve,
    fetchPackDetail,
    peekPackDetail,
    packCover,
    packRuleset,
    packTypeLabel,
    packZipUrl,
    ppColor,
    formatCount,
    formatPp,
    formatDate,
    triggerDownload,
} from '../lib/packs.js';

const SPECTRUM_CEILING_PP = 1000;
const COLLAGE_TILES = 4;

export default function PackCard({ pack, onOpen }) {
    const [detail, setDetail] = useState(() => peekPackDetail(pack.tag));
    const [busy, setBusy] = useState(false);
    const bandRef = useRef(null);

    useEffect(() => {
        if (detail) return undefined;
        const node = bandRef.current;
        let active = true;

        observeOnce(node, () => {
            fetchPackDetail(pack.tag)
                .then(data => { if (active) setDetail(data); })
                .catch(() => {});
        });

        return () => {
            active = false;
            unobserve(node);
        };
    }, [pack.tag, detail]);

    useEffect(() => {
        if (!busy) return undefined;
        const timer = setTimeout(() => setBusy(false), 2500);
        return () => clearTimeout(timer);
    }, [busy]);

    const startDownload = () => {
        setBusy(true);
        triggerDownload(packZipUrl(pack.tag));
    };

    const sets = (detail && detail.beatmapsets) || [];
    const tiles = sets.slice(0, COLLAGE_TILES);
    const summary = pack.pp_summary;
    const minPp = summary ? summary.min_pp : null;
    const maxPp = summary ? summary.max_pp : null;

    const spanLo = minPp === null ? 0 : Math.min(100, (minPp / SPECTRUM_CEILING_PP) * 100);
    const spanHi = maxPp === null ? 0 : Math.min(100, (maxPp / SPECTRUM_CEILING_PP) * 100);

    return (
        <div className="pack-card border-beatmapcard rounded-4 border-4 beatmapset-card-hoverable h-100 d-flex flex-column">
            <button type="button" className="pack-card__open" onClick={onOpen}>
                <span className="pack-card__band" ref={bandRef}>
                    {tiles.length > 0 ? (
                        tiles.map(set => (
                            <span
                                key={set.id}
                                className="pack-card__tile"
                                style={{ backgroundImage: `url('${packCover(set.id, 'list')}')` }}
                            />
                        ))
                    ) : (
                        <span className="pack-card__tile pack-card__tile--empty" />
                    )}
                    <span className="pack-card__scrim" />
                    <span className="pack-card__mode">{MODE_LABELS[packRuleset(pack)]}</span>
                    <span className="pack-card__tag">{pack.tag}</span>
                </span>
                <span className="pack-card__title">{pack.name}</span>
            </button>

            <div className="pack-card__body">
                <div className="d-flex justify-content-between align-items-center gap-2 small">
                    <span className="text-truncate">
                        <span className="text-secondary">by </span>
                        {pack.author || 'Unknown'}
                    </span>
                    <span className="text-muted flex-shrink-0">{formatDate(pack.date)}</span>
                </div>

                <div className="pack-card__spectrum">
                    {summary && (
                        <span
                            className="pack-card__spectrum-fill"
                            style={{
                                left: `${spanLo}%`,
                                width: `${Math.max(spanHi - spanLo, 2)}%`,
                                background: `linear-gradient(90deg, ${ppColor(minPp)}, ${ppColor(maxPp)})`,
                            }}
                        />
                    )}
                </div>

                <div className="d-flex justify-content-between align-items-center gap-2 small">
                    <span className="pack-card__pp" style={{ color: ppColor(maxPp) }}>
                        {summary ? `${formatPp(minPp)}-${formatPp(maxPp)} pp` : 'No PP data'}
                    </span>
                    <span className="text-muted flex-shrink-0">
                        {formatCount(pack.beatmapset_count)} maps · {formatCount(pack.diff_count)} diffs
                    </span>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge rounded-pill text-bg-dark">{packTypeLabel(pack)}</span>
                    {pack.no_diff_reduction && (
                        <span className="badge rounded-pill text-bg-dark">no reduction</span>
                    )}
                </div>
            </div>

            <div className="pack-card__actions">
                <button type="button" className="btn btn-sm btn-dark-c1 d-flex align-items-center justify-content-center gap-2" onClick={onOpen}>
                    <FaLayerGroup size={11} />
                    <span>View maps</span>
                </button>
                <button type="button" className="btn btn-sm btn-success d-flex align-items-center justify-content-center gap-2" onClick={startDownload} disabled={busy}>
                    <FaDownload size={11} />
                    <span>{busy ? 'Starting...' : 'Download .zip'}</span>
                </button>
            </div>
        </div>
    );
}
