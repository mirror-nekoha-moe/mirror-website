import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FaDownload, FaExternalLinkAlt, FaImage, FaTimes } from 'react-icons/fa';
import MapperLink from './MapperLink-collab-hinai.jsx';
import HinaiAudio, { FavoriteButton } from './HinaiAudio-collab-hinai.jsx';
import HinaiPpPanel from './HinaiPpPanel-collab-hinai.jsx';
import { HinaiSource, NekohaSource } from './CollabMark-collab-hinai.jsx';
import { cover as coverArt, fetchMirrorHealth } from '../lib/mirror-collab-hinai.js';
import {
    backgroundUrl,
    compact,
    downloadArtwork,
    coverUrl,
    fetchSetDetails,
    formatDuration,
    getBeatmapEngagement,
    josuUrl,
    peekSetDetails,
    recordBeatmapView,
    starColor,
    storyboardViewerUrl,
} from '../lib/hinai-collab-hinai.js';

const STATUS_LABELS = {
    ranked: 'Ranked',
    approved: 'Approved',
    qualified: 'Qualified',
    loved: 'Loved',
    pending: 'Pending',
    wip: 'WIP',
    graveyard: 'Graveyard',
};

const MODE_LABELS = { osu: 'osu!', taiko: 'Taiko', fruits: 'Catch', mania: 'Mania' };

function dayLabel(value) {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

function sortDiffs(list) {
    return (Array.isArray(list) ? list : [])
        .slice()
        .sort((a, b) => Number(a.difficulty_rating) - Number(b.difficulty_rating));
}

export default function HinaiInfoModal({ seed, onClose }) {
    const [set, setSet] = useState(() => peekSetDetails(seed.id) || seed);
    const [activeId, setActiveId] = useState(null);
    const [josuOpen, setJosuOpen] = useState(false);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [health, setHealth] = useState(null);
    const [engagement, setEngagement] = useState(null);
    const [artwork, setArtwork] = useState(null);
    const [artworkBusy, setArtworkBusy] = useState(null);
    const closeRef = useRef(null);

    const handleClose = useCallback(() => onClose(), [onClose]);

    useEffect(() => {
        const onKeyDown = e => {
            if (e.key === 'Escape') handleClose();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [handleClose]);

    useEffect(() => {
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        if (closeRef.current) closeRef.current.focus();
        return () => {
            document.body.style.overflow = previous;
        };
    }, []);

    useEffect(() => {
        let alive = true;
        fetchSetDetails(seed.id).then(full => {
            if (alive && full) setSet(prev => ({ ...prev, ...full }));
        });
        fetchMirrorHealth().then(next => {
            if (alive) setHealth(next);
        });
        recordBeatmapView(seed.id).then(() => getBeatmapEngagement(seed.id)).then(next => {
            if (alive) setEngagement(next);
        });
        return () => {
            alive = false;
        };
    }, [seed.id]);

    const diffs = useMemo(() => sortDiffs(set.beatmaps), [set]);

    useEffect(() => {
        if (!diffs.length) return;
        setActiveId(prev => (prev && diffs.some(d => d.id === prev) ? prev : diffs[diffs.length - 1].id));
    }, [diffs]);

    const active = diffs.find(d => d.id === activeId) || diffs[diffs.length - 1] || null;

    const grabArtwork = async (which, url, filename) => {
        if (artworkBusy) return;
        setArtworkBusy(which);
        setArtwork(null);
        const outcome = await downloadArtwork(url, filename);
        setArtworkBusy(null);
        setArtwork(outcome.kind === 'ok' ? null : outcome);
    };

    const arrowDiff = useCallback(
        dir => {
            if (!active || diffs.length < 2) return;
            const idx = diffs.findIndex(d => d.id === active.id);
            const next = Math.min(diffs.length - 1, Math.max(0, idx + dir));
            setActiveId(diffs[next].id);
        },
        [active, diffs],
    );

    useEffect(() => {
        const onKeyDown = e => {
            if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
            if (e.key === 'ArrowLeft') arrowDiff(-1);
            if (e.key === 'ArrowRight') arrowDiff(1);
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [arrowDiff]);

    const sizeMb = Number(set.mirror && set.mirror.file_size);
    const bpmText = active && active.is_variable_bpm && active.min_bpm && active.max_bpm
        ? `${Math.round(active.min_bpm)}-${Math.round(active.max_bpm)}`
        : Math.round(Number((active && active.bpm) || set.bpm) || 0);

    const statBars = active
        ? [
              ['CS', active.cs],
              ['AR', active.ar],
              ['OD', active.accuracy],
              ['HP', active.drain],
          ]
        : [];

    return (
        <div className="hinf" onMouseDown={e => { if (e.target === e.currentTarget) handleClose(); }}>
            <div className="hinf__dialog cbg-dark rounded-3" role="dialog" aria-modal="true" aria-label={set.title}>
                <div className="hinf__head">
                    <span className="hinf__cover" style={{ backgroundImage: `url('${coverArt(set.id, 'cover')}')` }} />
                    <div className="flex-grow-1 overflow-hidden">
                        <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                            <span className="badge rounded-pill text-bg-dark border">{STATUS_LABELS[set.status] || 'Unknown'}</span>
                            {active && <span className="badge rounded-pill text-bg-dark border">{MODE_LABELS[active.mode] || active.mode}</span>}
                            <span className="hinf__brand">hinai data</span>
                        </div>
                        <h2 className="h5 mb-0 text-white text-truncate">{set.title}</h2>
                        <div className="small text-secondary text-truncate">{set.artist}</div>
                        <div className="small d-flex align-items-center gap-1 mt-1">
                            <span className="text-muted">mapped by</span>
                            <MapperLink name={set.creator} avatar />
                        </div>
                    </div>
                    <button type="button" ref={closeRef} className="btn btn-sm btn-dark-c1 flex-shrink-0" onClick={handleClose} aria-label="Close">
                        <FaTimes />
                    </button>
                </div>

                <div className="hinf__body">
                    <div className="hinf__pills">
                        <span><b>{bpmText}</b> BPM</span>
                        {active && <span><b>{formatDuration(active.total_length)}</b> length</span>}
                        <span><b>{diffs.length}</b> diff{diffs.length === 1 ? '' : 's'}</span>
                        <span><b>{compact(set.play_count)}</b> plays</span>
                        <span><b>{compact(set.favourite_count)}</b> favs</span>
                        {Number.isFinite(sizeMb) && sizeMb > 0 && (
                            <span><b>{(sizeMb / 1024 ** 2).toFixed(1)}</b> MB</span>
                        )}
                        {set.genre && set.genre.name && <span className="hinf__pillmeta">{set.genre.name}</span>}
                        {set.language && set.language.name && <span className="hinf__pillmeta">{set.language.name}</span>}
                    </div>

                    <div className="hinf__engage">
                        <FavoriteButton setId={set.id} kind="map" />
                        {set.storyboard && <FavoriteButton setId={set.id} kind="storyboard" />}
                        {engagement && (
                            <span className="hinf__engagestats">
                                <span><b>{compact(engagement.views)}</b> views</span>
                                <span className="hinf__engagesep" aria-hidden="true" />
                                <span><b>{compact(engagement.uniqueViewers)}</b> visitors</span>
                                {engagement.artDownloads > 0 && (
                                    <>
                                        <span className="hinf__engagesep" aria-hidden="true" />
                                        <span
                                            title={`Cover ${engagement.coverDownloads} / Background ${engagement.bgDownloads}`}
                                        >
                                            <b>{compact(engagement.artDownloads)}</b> art downloads
                                        </span>
                                    </>
                                )}
                            </span>
                        )}
                    </div>

                    <HinaiAudio setId={set.id} />

                    {diffs.length > 0 && (
                        <div className="hinf__diffs" role="tablist" aria-label="Difficulties">
                            {diffs.map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active ? d.id === active.id : false}
                                    className={`hinf__diff ${active && d.id === active.id ? 'hinf__diff--on' : ''}`}
                                    style={{ '--tone': starColor(d.difficulty_rating) }}
                                    onClick={() => setActiveId(d.id)}
                                    title={`${d.version} - ${Number(d.difficulty_rating).toFixed(2)} stars`}
                                >
                                    <span className="hinf__diffstar">{Number(d.difficulty_rating).toFixed(2)}</span>
                                    <span className="hinf__diffname">{d.version}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {active && (
                        <>
                            <div className="hinf__bars">
                                {statBars.map(([k, v]) => (
                                    <div key={k} className="hinf__bar">
                                        <span className="hinf__bark">{k}</span>
                                        <span className="hinf__bartrack">
                                            <span className="hinf__barfill" style={{ width: `${Math.min(100, (Number(v) / 10) * 100)}%` }} />
                                        </span>
                                        <span className="hinf__barv">{Number(v).toFixed(1)}</span>
                                    </div>
                                ))}
                                <div className="hinf__bar">
                                    <span className="hinf__bark">Combo</span>
                                    <span className="hinf__barv">{active.max_combo ? `${active.max_combo}x` : '-'}</span>
                                </div>
                            </div>

                            <section className="hinf__section">
                                <h3 className="hinf__sectiontitle">Performance</h3>
                                <HinaiPpPanel
                                    beatmapId={active.id}
                                    mode={Number(active.mode_int) || 0}
                                    maxCombo={Number(active.max_combo) || 0}
                                />
                            </section>

                            <section className="hinf__section">
                                <button
                                    type="button"
                                    className="hinf__collapse"
                                    onClick={() => setJosuOpen(o => !o)}
                                    aria-expanded={josuOpen}
                                >
                                    <span className={`hinf__chev ${josuOpen ? 'hinf__chev--open' : ''}`}>&#9656;</span>
                                    josu web viewer
                                    <span className="hinf__beta">BETA</span>
                                    <span className="hinf__collapsecta">{josuOpen ? 'Collapse' : 'Try it'}</span>
                                </button>
                                {josuOpen && (
                                    <>
                                        <iframe
                                            className="hinf__josu"
                                            src={josuUrl(active.id)}
                                            title="josu beatmap viewer"
                                            allow="autoplay; screen-wake-lock"
                                            loading="lazy"
                                        />
                                        <div className="hinf__josufoot">
                                            <span><kbd>P</kbd> Play</span>
                                            <span><kbd>A</kbd> <kbd>D</kbd> Seek</span>
                                            <span><kbd>&larr;</kbd> <kbd>&rarr;</kbd> Difficulty</span>
                                        </div>
                                    </>
                                )}
                            </section>

                            <section className="hinf__section">
                                <button
                                    type="button"
                                    className="hinf__collapse"
                                    onClick={() => setAdvancedOpen(o => !o)}
                                    aria-expanded={advancedOpen}
                                >
                                    <span className={`hinf__chev ${advancedOpen ? 'hinf__chev--open' : ''}`}>&#9656;</span>
                                    Advanced details
                                </button>
                                {advancedOpen && (
                                    <div className="hinf__adv">
                                        <div className="hinf__advgrid">
                                            <span>Circles <b>{compact(active.count_circles)}</b></span>
                                            <span>Sliders <b>{compact(active.count_sliders)}</b></span>
                                            <span>Spinners <b>{compact(active.count_spinners)}</b></span>
                                            <span>Objects <b>{compact(active.total_objects)}</b></span>
                                            <span>Drain <b>{formatDuration(active.hit_length)}</b></span>
                                            {active.kiai_sections_count != null && <span>Kiai <b>{active.kiai_sections_count}</b></span>}
                                            {active.break_count != null && <span>Breaks <b>{active.break_count}</b></span>}
                                            {active.sv_changes_count != null && <span>SV changes <b>{compact(active.sv_changes_count)}</b></span>}
                                            {active.timing_points_count != null && <span>Timing points <b>{compact(active.timing_points_count)}</b></span>}
                                            <span>Playcount <b>{compact(active.playcount)}</b></span>
                                        </div>

                                        <div className="hinf__dates">
                                            {dayLabel(set.submitted_date) && <span><span className="hinf__datek">Submitted</span> {dayLabel(set.submitted_date)}</span>}
                                            {dayLabel(set.last_updated) && <span><span className="hinf__datek">Updated</span> {dayLabel(set.last_updated)}</span>}
                                            {dayLabel(set.ranked_date) && <span><span className="hinf__datek">Ranked</span> {dayLabel(set.ranked_date)}</span>}
                                        </div>

                                        <div className="hinf__difftable-wrap">
                                            <table className="hinf__difftable">
                                                <thead>
                                                    <tr>
                                                        <th>Difficulty</th>
                                                        <th>Mode</th>
                                                        <th className="hinf__num">Stars</th>
                                                        <th className="hinf__num">CS</th>
                                                        <th className="hinf__num">AR</th>
                                                        <th className="hinf__num">OD</th>
                                                        <th className="hinf__num">HP</th>
                                                        <th className="hinf__num">Combo</th>
                                                        <th className="hinf__num">Length</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {diffs.map(d => (
                                                        <tr
                                                            key={d.id}
                                                            className={active.id === d.id ? 'hinf__difftable-on' : ''}
                                                            role="button"
                                                            tabIndex={0}
                                                            onClick={() => setActiveId(d.id)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' || e.key === ' ') {
                                                                    e.preventDefault();
                                                                    setActiveId(d.id);
                                                                }
                                                            }}
                                                        >
                                                            <td className="hinf__difftable-name">
                                                                <span className="hinf__dot" style={{ backgroundColor: starColor(d.difficulty_rating) }} />
                                                                {d.version}
                                                            </td>
                                                            <td>{MODE_LABELS[d.mode] || d.mode}</td>
                                                            <td className="hinf__num" style={{ color: starColor(d.difficulty_rating) }}>
                                                                {Number(d.difficulty_rating).toFixed(2)}
                                                            </td>
                                                            <td className="hinf__num">{d.cs}</td>
                                                            <td className="hinf__num">{d.ar}</td>
                                                            <td className="hinf__num">{d.accuracy}</td>
                                                            <td className="hinf__num">{d.drain}</td>
                                                            <td className="hinf__num">{d.max_combo ? `${d.max_combo}x` : '-'}</td>
                                                            <td className="hinf__num">{formatDuration(d.total_length)}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {set.tags && <p className="hinf__tags">{set.tags}</p>}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    <div className="hinf__actions">
                        <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${set.id}`}>
                            <span>Download</span>
                            <FaDownload size={11} />
                        </a>
                        {set.video && (
                            <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${set.id}?noVideo=1`}>
                                <span>No Video</span>
                                <FaDownload size={11} />
                            </a>
                        )}
                        <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${set.id}`}>
                            <span>osu!direct</span>
                            <FaDownload size={11} color="black" />
                        </a>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                            onClick={() => grabArtwork('bg', backgroundUrl(set.id), `bg-${set.id}.jpg`)}
                            disabled={artworkBusy === 'bg'}
                            title="The real in-game background, extracted from the .osz by mirror.hinamizawa.ai"
                        >
                            <FaImage size={11} />
                            <span>{artworkBusy === 'bg' ? 'Getting...' : 'Background'}</span>
                        </button>
                        <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                            onClick={() => grabArtwork('cover', coverUrl(set.id), `cover-${set.id}.jpg`)}
                            disabled={artworkBusy === 'cover'}
                            title="Cover art, proxied through mirror.hinamizawa.ai"
                        >
                            <FaImage size={11} />
                            <span>{artworkBusy === 'cover' ? 'Getting...' : 'Cover'}</span>
                        </button>
                        {active && (
                            <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                                onClick={() =>
                                    window.open(josuUrl(active.id), 'josu-viewer', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no')
                                }
                                title="Pop this difficulty out into the josu viewer"
                            >
                                <span>josu</span>
                                <FaExternalLinkAlt size={10} />
                            </button>
                        )}
                        {set.storyboard && (
                            <a
                                className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2"
                                href={storyboardViewerUrl(set.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="Play this map's storyboard in our web storyboard player"
                            >
                                <span>Storyboard</span>
                                <FaExternalLinkAlt size={10} />
                            </a>
                        )}
                    </div>

                    {artwork && (
                        <div className={`hinf__artnote hinf__artnote--${artwork.kind}`} role="status">
                            <span className="hinf__artnote-text">
                                {artwork.kind === 'none'
                                    ? 'This beatmap ships no background image.'
                                    : artwork.message}
                                {artwork.kind === 'unavailable' && artwork.retryAfter
                                    ? ` Try again in ${artwork.retryAfter}s.`
                                    : ''}
                            </span>
                            {artwork.kind === 'none' && (
                                <button
                                    type="button"
                                    className="hinf__artnote-link"
                                    onClick={() => grabArtwork('cover', coverUrl(set.id), `cover-${set.id}.jpg`)}
                                >
                                    Use the cover instead
                                </button>
                            )}
                            {artwork.forensics && (
                                <a
                                    className="hinf__artnote-link hinf__artnote-link--why"
                                    href={artwork.forensics}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    title="Every hinai response carries its own request id: this opens the forensics record for THIS attempt"
                                >
                                    Why?
                                </a>
                            )}
                        </div>
                    )}

                    <div className="hinf__prov">
                        <span><span className="hinf__provk">Beatmap</span> <NekohaSource label="mirror.nekoha.moe" size={13} /></span>
                        <span className="hinf__provsep" />
                        <span>
                            <span className="hinf__provk">PP, audio, art</span>{' '}
                            <HinaiSource size={13} version={health && health.version} />
                        </span>
                        {health && health.engines && health.engines.rosu_pp && (
                            <>
                                <span className="hinf__provsep" />
                                <span><span className="hinf__provk">Engine</span> rosu-pp {health.engines.rosu_pp}</span>
                            </>
                        )}
                    </div>

                    <div className="hinf__keys">
                        <span><kbd>Esc</kbd> Close</span>
                        <span><kbd>&larr;</kbd> <kbd>&rarr;</kbd> Switch difficulty</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
