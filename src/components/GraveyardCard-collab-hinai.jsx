import { useState } from 'react';
import { FaDownload, FaBolt, FaClock, FaMusic } from 'react-icons/fa';
import MapperLink from './MapperLink.jsx';
import { proxyImage } from '../lib/mirror.js';
import {
    modColor,
    ppColor,
    statusColor,
    modeLabel,
    formatPP,
    formatStars,
    formatLength,
    formatCount,
    graveyardDownloadUrl,
} from '../lib/graveyard-collab-hinai.js';

export default function GraveyardCard({ map, onOpen }) {
    const [coverFailed, setCoverFailed] = useState(false);
    const showCover = Boolean(map.cover) && !coverFailed;
    const accent = modColor(map.mod);

    return (
        <div className="gv-card border-beatmapcard rounded-4 border-4 beatmapset-card-hoverable h-100 d-flex flex-column">
            <button type="button" className="gv-card__open" onClick={onOpen}>
                <span className="gv-card__band">
                    {showCover ? (
                        <img
                            className="gv-card__cover"
                            src={proxyImage(map.cover)}
                            alt=""
                            loading="lazy"
                            onError={() => setCoverFailed(true)}
                        />
                    ) : (
                        <span className="gv-card__unmarked">no cover</span>
                    )}
                    <span className="gv-card__scrim" />
                    <span className="gv-card__band-top">
                        <span className="gv-card__status" style={{ backgroundColor: statusColor(map.status) }}>
                            {map.status}
                        </span>
                        <span className="gv-card__mode">{modeLabel(map.mode)}</span>
                    </span>
                    <span className="gv-card__title">{map.artist} - {map.title}</span>
                </span>
            </button>

            <div className="gv-card__body">
                <div className="d-flex align-items-center justify-content-between gap-2 small">
                    <span className="text-truncate text-secondary">{map.version}</span>
                    <span className="flex-shrink-0 d-inline-flex align-items-center gap-1">
                        <span className="text-muted">by</span>
                        <MapperLink name={map.creator} avatar />
                    </span>
                </div>

                <div className="gv-card__pp">
                    <span className="gv-card__mod" style={{ color: accent, borderColor: accent }}>
                        {map.mod}
                    </span>
                    <span className="gv-card__ppvalue" style={{ color: ppColor(map.pp) }}>
                        <FaBolt size={11} />
                        {formatPP(map.pp)}<span className="gv-card__unit">pp</span>
                    </span>
                    <span className="gv-card__stars">{formatStars(map.stars)}&#9733;</span>
                </div>

                <div className="d-flex flex-wrap align-items-center gap-3 small text-muted">
                    <span className="d-inline-flex align-items-center gap-1"><FaMusic size={10} />{Math.round(Number(map.bpm) || 0)} BPM</span>
                    <span className="d-inline-flex align-items-center gap-1"><FaClock size={10} />{formatLength(map.total_length)}</span>
                    <span>{formatCount(map.max_combo)}x</span>
                </div>
            </div>

            <div className="gv-card__actions">
                <button type="button" className="btn btn-sm btn-dark-c1" onClick={onOpen}>
                    View details
                </button>
                <a
                    className="btn btn-sm btn-success d-flex align-items-center justify-content-center gap-2"
                    href={graveyardDownloadUrl(map.beatmapset_id)}
                >
                    <FaDownload size={11} />
                    <span>Download</span>
                </a>
            </div>
        </div>
    );
}
