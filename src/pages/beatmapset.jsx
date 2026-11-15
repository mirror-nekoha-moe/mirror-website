import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaDownload, FaRegDotCircle, FaDrum, FaClock, FaMusic, FaPlay, FaPause, FaVolumeUp } from 'react-icons/fa';
import { MdPiano } from 'react-icons/md';
import { FaAppleWhole } from 'react-icons/fa6';

const STATUS_CLASSES = {
    ranked: 'bg-success',
    approved: 'bg-success',
    qualified: 'bg-secondary text-black',
    loved: 'cbg-pink-2',
    pending: 'cbg-grey',
    wip: 'cbg-grey',
    graveyard: 'cbg-dark-grey',
};

const STATUS_LABELS = {
    ranked: 'Ranked',
    approved: 'Approved',
    qualified: 'Qualified',
    loved: 'Loved',
    pending: 'Pending',
    wip: 'WIP',
    graveyard: 'Graveyard',
};

const MODE_LABELS = {
    osu: 'osu!',
    taiko: 'Taiko',
    fruits: 'Catch',
    mania: 'Mania'
};

function StatBar({ label, value, max = 10 }) {
    let pct = (value / max) * 100;
    if (pct > 100) {
        pct = 100;
    }

    return (
        <div className="d-flex align-items-center gap-2 mb-2 small">
            <div className="text-secondary text-end flex-shrink-0" style={{ width: 32 }}>{label}</div>
            <div className="progress flex-grow-1 bg-white bg-opacity-10" style={{ height: 8 }}>
                <div className="progress-bar bg-secondary" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex-shrink-0" style={{ width: 36 }}>{value.toFixed(1)}</div>
        </div>
    );
}

// blue for easy maps, goes to red around 8 stars
function starColor(sr) {
    let hue = 240 - sr * 30;
    if (hue < 0) {
        hue = 0;
    }
    return `hsl(${hue},90%,65%)`;
}

function toMb(bytes) {
    return (bytes / (1024 ** 2)).toFixed(2);
}

function yesNo(value) {
    if (value) {
        return 'Yes';
    }
    return 'No';
}

function fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDate(str) {
    if (!str) {
        return 'N/A';
    }
    const d = new Date(str);
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

// spoilerboxes in the osu! description html need js to open
function toggleSpoiler(e) {
    const link = e.target.closest('.js-spoilerbox__link');
    if (!link) {
        return;
    }
    e.preventDefault();
    link.closest('.js-spoilerbox').classList.toggle('bbcode-spoilerbox--open');
}

export default function BeatmapSet() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [selectedDiff, setSelectedDiff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [playing, setPlaying] = useState(false);
    // osu! previews are loud
    const [volume, setVolume] = useState(0.1);
    const audioRef = useRef(null);

    useEffect(() => {
        const fetchBeatmapset = async () => {
            setLoading(true);
            setError('');
            try {
                const beatmapsetId = Number(id);
                if (!Number.isInteger(beatmapsetId) || beatmapsetId <= 0) {
                    setError('Invalid beatmapset ID');
                    return;
                }
                const res = await axios.get(`/api/beatmapset/${beatmapsetId}`);
                res.data.beatmaps.sort((a, b) => b.difficulty_rating - a.difficulty_rating);
                setData(res.data);
                setSelectedDiff(res.data.beatmaps[0]);
            } catch {
                setError('Failed to load beatmapset');
            } finally {
                setLoading(false);
            }
        };
        fetchBeatmapset();
    }, [id]);

    const togglePreview = () => {
        const audio = audioRef.current;
        if (!audio) {
            return;
        }
        if (playing) {
            audio.pause();
            setPlaying(false);
        } else {
            audio.volume = volume;
            audio.play().catch(() => {});
            setPlaying(true);
        }
    };

    const handleVolume = (e) => {
        const value = parseFloat(e.target.value);
        setVolume(value);
        audioRef.current.volume = value;
    };

    if (loading) {
        return (
            <div className="search-loading-bar mt-0 rounded-0">
                <div className="search-loading-bar-value" />
            </div>
        );
    }
    if (error) {
        return <div className="mt-5 alert bg-danger">{error}</div>;
    }
    if (!data) {
        return null;
    }

    let previewUrl = data.preview_url;
    if (previewUrl && previewUrl.startsWith('//')) {
        previewUrl = `https:${previewUrl}`;
    }

    const coverUrl = `https://assets.ppy.sh/beatmaps/${data.id}/covers/cover.jpg`;
    const headerBackground = `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.82)), url('${coverUrl}')`;
    const statusClass = STATUS_CLASSES[data.status] ?? 'cbg-grey';
    const fileSizeMb = toMb(data.mirror?.file_size);
    const description = data.description?.description;

    return (
        <>
            <title>{`${data.artist} - ${data.title} | Nekoha`}</title>
            <meta name="description" content={`Download ${data.artist} - ${data.title} mapped by ${data.creator}`} />
            <link rel="canonical" href={`https://mirror.nekoha.moe/beatmapset/${data.id}`} />

            <div className="beatmapset-card-bg py-5" style={{ backgroundImage: headerBackground }}>
                <div className="container">
                    <div className="d-flex gap-4 align-items-end flex-wrap">
                        <img
                            src={`https://assets.ppy.sh/beatmaps/${data.id}/covers/list.jpg`}
                            alt={`${data.title} cover`}
                            width={100}
                            height={100}
                            className="rounded-2 flex-shrink-0 object-fit-cover shadow-lg"
                        />
                        <div className="flex-grow-1 overflow-hidden">
                            <span className={`badge rounded-pill mb-1 small fw-bold ${statusClass}`}>
                                {STATUS_LABELS[data.status] ?? data.status}
                            </span>
                            <h1 className="h2 map-title mb-0 fw-bold lh-sm">{data.title}</h1>
                            <div className="text-secondary small mb-1">{data.artist}</div>
                            <div className="small">
                                mapped by{' '}
                                <a className="fw-bold text-white link-blue" href={`https://osu.ppy.sh/users/${data.user_id}`} target="_blank">
                                    {data.creator}
                                </a>
                            </div>
                            <div className="d-flex align-items-center gap-3 mt-2 small">
                                {data.mirror?.mode_osu_count > 0 && (
                                    <span title="osu!" className="d-flex align-items-center gap-1">
                                        <FaRegDotCircle />{data.mirror.mode_osu_count}
                                    </span>
                                )}
                                {data.mirror?.mode_taiko_count > 0 && (
                                    <span title="Taiko" className="d-flex align-items-center gap-1">
                                        <FaDrum />{data.mirror.mode_taiko_count}
                                    </span>
                                )}
                                {data.mirror?.mode_fruits_count > 0 && (
                                    <span title="Catch" className="d-flex align-items-center gap-1">
                                        <FaAppleWhole />{data.mirror.mode_fruits_count}
                                    </span>
                                )}
                                {data.mirror?.mode_mania_count > 0 && (
                                    <span title="Mania" className="d-flex align-items-center gap-1">
                                        <MdPiano />{data.mirror.mode_mania_count}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                        {previewUrl && (
                            <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-2" onClick={togglePreview}>
                                {playing ? <FaPause size={11} /> : <FaPlay size={11} />}
                                <span>{playing ? 'Pause' : 'Preview'}</span>
                            </button>
                        )}
                        <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${data.id}`}>
                            <FaDownload /> Download {fileSizeMb} MB
                        </a>
                        {data.video && (
                            <a className="btn btn-sm btn-outline-success d-flex align-items-center gap-2" href={`/api/download/${data.id}?noVideo=1`} title="Download without video">
                                <FaDownload /> No Video
                            </a>
                        )}
                        <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${data.id}`}>
                            <FaDownload className="text-black" /> osu!direct
                        </a>
                        <a className="btn btn-sm cbg-pink-2" href={`https://osu.ppy.sh/beatmapsets/${data.id}`} target="_blank">
                            View on osu!
                        </a>
                    </div>
                </div>
            </div>

            <div className="container mt-4 mb-5">
                <div className="row g-4">
                    <div className="col-12 col-lg-7">
                        <div className="card card-body mb-3">
                            <div className="small fw-bold mb-2">Description</div>
                            {description ? (
                                <div
                                    className="bbcode-content overflow-auto"
                                    style={{ maxHeight: 320 }}
                                    onClick={toggleSpoiler}
                                    dangerouslySetInnerHTML={{ __html: description }}
                                />
                            ) : (
                                <p className="text-muted small mb-0">No description provided.</p>
                            )}
                        </div>
                        <div className="card card-body">
                            <div className="small fw-bold mb-2">Difficulties</div>
                            <div className="d-flex flex-column gap-1">
                                {data.beatmaps.map(diff => {
                                    let buttonClass = 'btn btn-dark-c1 d-flex align-items-center gap-2 text-start px-3 py-2';
                                    if (selectedDiff?.id === diff.id) {
                                        buttonClass += ' active';
                                    }
                                    return (
                                        <button key={diff.id} onClick={() => setSelectedDiff(diff)} className={buttonClass}>
                                            <span className="fw-bold" style={{ color: starColor(diff.difficulty_rating) }}>
                                                ★ {diff.difficulty_rating.toFixed(2)}
                                            </span>
                                            <span className="small flex-grow-1">{diff.version}</span>
                                            <span className="small text-secondary">{MODE_LABELS[diff.mode]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-5">
                        <div className="card card-body mb-3">
                            <div className="small fw-bold mb-2">Info</div>
                            <div className="d-flex flex-column gap-1 small">
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Beatmapset ID</span>
                                    <span>{data.id}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Submitted</span>
                                    <span>{fmtDate(data.submitted_date)}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Last Updated</span>
                                    <span>{fmtDate(data.last_updated)}</span>
                                </div>
                                {data.ranked_date && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">Ranked</span>
                                        <span>{fmtDate(data.ranked_date)}</span>
                                    </div>
                                )}
                                {data.deleted_at && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">Deleted</span>
                                        <span className="text-danger">{fmtDate(data.deleted_at)}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Favourites</span>
                                    <span>{data.favourite_count?.toLocaleString() ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Play Count</span>
                                    <span>{data.play_count?.toLocaleString() ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Difficulties</span>
                                    <span>{data.mirror?.beatmap_count}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">File Size</span>
                                    <span>{fileSizeMb} MB</span>
                                </div>
                                {data.bpm && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">BPM</span>
                                        <span>{data.bpm}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Genre</span>
                                    <span>{data.genre?.name ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Language</span>
                                    <span>{data.language?.name ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Has Video</span>
                                    <span>{yesNo(data.video)}</span>
                                </div>
                                <div className="d-flex justify-content-between gap-3">
                                    <span className="text-secondary">Storyboard</span>
                                    <span>{yesNo(data.storyboard)}</span>
                                </div>
                                {data.nsfw && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">NSFW</span>
                                        <span className="text-danger">Yes</span>
                                    </div>
                                )}
                                {data.source && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary flex-shrink-0">Source</span>
                                        <span className="text-end">{data.source}</span>
                                    </div>
                                )}
                            </div>
                            {data.tags && (
                                <div className="small mt-2">
                                    <div className="text-secondary mb-1">Tags</div>
                                    {data.tags.split(' ').filter(Boolean).map((tag, i) => (
                                        <span key={i} className="badge me-1 mb-1 bg-secondary text-black">{tag}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {selectedDiff && (
                            <div className="card card-body">
                                <div className="small fw-bold mb-1">{selectedDiff.version}</div>
                                <div className="small text-secondary mb-3">
                                    ★ {selectedDiff.difficulty_rating.toFixed(2)} · {MODE_LABELS[selectedDiff.mode]} · ID {selectedDiff.id}
                                </div>

                                <div className="d-flex flex-wrap gap-3 mb-3 small">
                                    <span className="d-flex align-items-center gap-1" title="Total length">
                                        <FaClock className="text-secondary" />{fmtTime(selectedDiff.total_length)}
                                    </span>
                                    {selectedDiff.hit_length !== selectedDiff.total_length && (
                                        <span className="d-flex align-items-center gap-1 text-secondary" title="Drain time">
                                            <FaClock />{fmtTime(selectedDiff.hit_length)}
                                        </span>
                                    )}
                                    <span className="d-flex align-items-center gap-1">
                                        <FaMusic className="text-secondary" />{selectedDiff.bpm} BPM
                                    </span>
                                    <span><span className="text-secondary">Combo</span> {selectedDiff.max_combo}x</span>
                                </div>

                                <StatBar label="CS" value={selectedDiff.cs} />
                                <StatBar label="AR" value={selectedDiff.ar} />
                                <StatBar label="OD" value={selectedDiff.accuracy} />
                                <StatBar label="HP" value={selectedDiff.drain} />
                                <StatBar label="SR" value={selectedDiff.difficulty_rating} />

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-wrap gap-3 small">
                                    <span><span className="text-secondary">Circles</span> {selectedDiff.count_circles}</span>
                                    <span><span className="text-secondary">Sliders</span> {selectedDiff.count_sliders}</span>
                                    <span><span className="text-secondary">Spinners</span> {selectedDiff.count_spinners}</span>
                                    <span><span className="text-secondary">Playcount</span> {selectedDiff.playcount?.toLocaleString()}</span>
                                    <span><span className="text-secondary">Passcount</span> {selectedDiff.passcount?.toLocaleString()}</span>
                                </div>

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-column gap-1 small">
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">Status</span>
                                        <span>{STATUS_LABELS[selectedDiff.status] ?? selectedDiff.status}</span>
                                    </div>
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">Last Updated</span>
                                        <span>{fmtDate(selectedDiff.last_updated)}</span>
                                    </div>
                                    {selectedDiff.deleted_at && (
                                        <div className="d-flex justify-content-between gap-3">
                                            <span className="text-secondary">Deleted</span>
                                            <span className="text-danger">{fmtDate(selectedDiff.deleted_at)}</span>
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary">Scoreable</span>
                                        <span>{yesNo(selectedDiff.is_scoreable)}</span>
                                    </div>
                                    {selectedDiff.convert && (
                                        <div className="d-flex justify-content-between gap-3">
                                            <span className="text-secondary">Convert</span>
                                            <span>Yes</span>
                                        </div>
                                    )}
                                    <div className="mt-1">
                                        <div className="text-secondary mb-1">MD5</div>
                                        <div className="font-monospace text-break opacity-50">{selectedDiff.checksum}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {previewUrl && (
                <audio ref={audioRef} src={previewUrl} preload="none" onEnded={() => setPlaying(false)} />
            )}
            {playing && (
                <div className="position-fixed bottom-0 start-0 end-0 bg-dark border-top border-secondary px-3 py-2 d-flex align-items-center gap-3" style={{ zIndex: 1050 }}>
                    <button className="btn btn-sm btn-outline-secondary flex-shrink-0 d-flex align-items-center" title="Pause preview" onClick={togglePreview}>
                        <FaPause size={12} />
                    </button>
                    <div className="flex-grow-1 small text-truncate">
                        <span className="text-white fw-semibold">{data.title}</span>
                        <span className="text-secondary ms-2">{data.artist}</span>
                    </div>
                    <FaVolumeUp className="text-secondary flex-shrink-0" size={13} />
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={volume}
                        onChange={handleVolume}
                        className="form-range flex-shrink-0"
                        style={{ width: 100 }}
                        title="Preview volume"
                    />
                    <span className="text-secondary small flex-shrink-0">{Math.round(volume * 100)}%</span>
                </div>
            )}
        </>
    );
}