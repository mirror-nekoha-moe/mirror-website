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

const GENRE_LABELS = {
    0: 'Any',
    1: 'Unspecified',
    2: 'Video Game',
    3: 'Anime',
    4: 'Rock',
    5: 'Pop',
    6: 'Other',
    7: 'Novelty',
    9: 'Hip Hop',
    10: 'Electronic',
    11: 'Metal',
    12: 'Classical',
    13: 'Folk',
    14: 'Jazz'
};

const LANGUAGE_LABELS = {
    0: 'Any',
    1: 'Unspecified',
    2: 'English',
    3: 'Japanese',
    4: 'Chinese',
    5: 'Instrumental',
    6: 'Korean',
    7: 'French',
    8: 'German',
    9: 'Swedish',
    10: 'Spanish',
    11: 'Italian',
    12: 'Russian',
    13: 'Polish',
    14: 'Other'
};

function StatBar({ label, value, max = 10 }) {
    const number = parseFloat(value);
    let pct = (number / max) * 100;
    if (pct > 100) {
        pct = 100;
    }

    return (
        <div className="row g-2 align-items-center mb-2 small">
            <div className="col-2 text-secondary text-end">{label}</div>
            <div className="col">
                <div className="progress cbg-dark-grey">
                    <div className="progress-bar bg-secondary" style={{ width: `${pct}%` }} />
                </div>
            </div>
            <div className="col-2">{number.toFixed(1)}</div>
        </div>
    );
}

function InfoRow({ label, children }) {
    return (
        <div className="d-flex justify-content-between gap-3">
            <span className="text-secondary flex-shrink-0">{label}</span>
            <span className="text-end">{children}</span>
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

export default function BeatmapSet() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [selectedDiff, setSelectedDiff] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [playing, setPlaying] = useState(false);
    const [volume, setVolume]   = useState(0.1);
    const audioRef = useRef(null);
    const descRef = useRef(null);

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
                const beatmaps = res.data.beatmaps.slice().sort((a, b) => b.difficulty_rating - a.difficulty_rating);
                setData({ ...res.data, beatmaps });
                setSelectedDiff(beatmaps[0]);
            } catch {
                setError('Failed to load beatmapset');
            } finally {
                setLoading(false);
            }
        };
        fetchBeatmapset();
    }, [id]);

    useEffect(() => {
        if (!descRef.current)
            return;
        descRef.current.querySelectorAll('.js-spoilerbox__link').forEach(link => {
            if (link._spoilerBound)
                return;
            link._spoilerBound = true;
            link.addEventListener('click', e => {
                e.preventDefault();
                link.closest('.js-spoilerbox').classList.toggle('bbcode-spoilerbox--open');
            });
        });
    }, [data]);

    const togglePreview = () => {
        const el = audioRef.current;
        if (!el || !el.src) {
            return;
        }
        if (playing) {
            el.pause();
            setPlaying(false);
        } else {
            el.play().catch(() => {});
            setPlaying(true);
        }
    };

    const handleVolume = (v) => {
        const val = parseFloat(v);
        setVolume(val);
        if (audioRef.current) {
            audioRef.current.volume = val;
        }
    };

    const handleCanPlay = (e) => {
        if (e.target) {
            e.target.volume = 0.1;
        }
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

    return (
        <>
            <title>{`${data.artist} - ${data.title} | Nekoha`}</title>
            <meta name="description" content={`Download ${data.artist} - ${data.title} mapped by ${data.creator}`} />
            <link rel="canonical" href={`https://mirror.nekoha.moe/beatmapset/${data.id}`} />
            {data.preview_url && (
                <audio
                    ref={audioRef}
                    src={previewUrl}
                    onEnded={() => setPlaying(false)}
                    onCanPlay={handleCanPlay}
                />
            )}
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
                                <a className="fw-bold text-white link-blue text-decoration-none"
                                    href={`https://osu.ppy.sh/users/${data.user_id}`} target="_blank">
                                    {data.creator}
                                </a>
                            </div>
                            <div className="d-flex align-items-center gap-3 mt-2">
                                {data.mirror?.mode_osu_count > 0 && <span title="osu!" className="d-flex align-items-center gap-1 small"><FaRegDotCircle />{data.mirror?.mode_osu_count}</span>}
                                {data.mirror?.mode_taiko_count > 0  && <span title="Taiko" className="d-flex align-items-center gap-1 small"><FaDrum />{data.mirror?.mode_taiko_count}</span>}
                                {data.mirror?.mode_fruits_count > 0 && <span title="Catch" className="d-flex align-items-center gap-1 small"><FaAppleWhole />{data.mirror?.mode_fruits_count}</span>}
                                {data.mirror?.mode_mania_count > 0  && <span title="Mania" className="d-flex align-items-center gap-1 small"><MdPiano />{data.mirror?.mode_mania_count}</span>}
                            </div>
                        </div>
                    </div>
                    <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
                        {data.preview_url && (
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
                        <a className="btn btn-sm cbg-pink-2 d-flex align-items-center gap-2"
                            href={`https://osu.ppy.sh/beatmapsets/${data.id}`} target="_blank">
                            View on osu!
                        </a>
                    </div>
                </div>
            </div>
            <div className="container mt-4 mb-5">
                <div className="row g-4">
                    <div className="col-12 col-lg-7">
                        <div className="cbg-dark rounded-3 p-3 mb-3">
                            <div className="small fw-bold mb-2">Description</div>
                            {data.description?.description ? (
                                <div
                                    ref={descRef}
                                    className="bbcode-content overflow-auto"
                                    style={{ maxHeight: 320 }}
                                    dangerouslySetInnerHTML={{ __html: data.description?.description }}
                                />
                            ) : (
                                <p className="text-muted small mb-0">No description provided.</p>
                            )}
                        </div>
                        <div className="cbg-dark rounded-3 p-3">
                            <div className="small fw-bold mb-2">Difficulties</div>
                            <div className="d-flex flex-column gap-1">
                                {data.beatmaps.map(diff => {
                                    const sr = parseFloat(diff.difficulty_rating);
                                    let buttonClass = 'btn btn-dark-c1 d-flex align-items-center gap-2 text-start w-100 px-3 py-2';
                                    if (selectedDiff?.id === diff.id) {
                                        buttonClass += ' active';
                                    }
                                    return (
                                        <button key={diff.id} onClick={() => setSelectedDiff(diff)} className={buttonClass}>
                                            <span className="fw-bold flex-shrink-0" style={{ color: starColor(sr) }}>★ {sr.toFixed(2)}</span>
                                            <span className="small flex-grow-1">{diff.version}</span>
                                            <span className="small text-secondary">{MODE_LABELS[diff.mode]}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className="col-12 col-lg-5">
                        <div className="cbg-dark rounded-3 p-3 mb-3">
                            <div className="small fw-bold mb-2">Info</div>
                            <div className="d-flex flex-column gap-1 small">
                                <InfoRow label="Beatmapset ID">{data.id}</InfoRow>
                                <InfoRow label="Submitted">{fmtDate(data.submitted_date)}</InfoRow>
                                <InfoRow label="Last Updated">{fmtDate(data.last_updated)}</InfoRow>
                                {data.ranked_date && <InfoRow label="Ranked">{fmtDate(data.ranked_date)}</InfoRow>}
                                {data.deleted_at && <InfoRow label="Deleted">{fmtDate(data.deleted_at)}</InfoRow>}
                                <InfoRow label="Favourites">{data.favourite_count?.toLocaleString() ?? '-'}</InfoRow>
                                <InfoRow label="Play Count">{data.play_count?.toLocaleString() ?? '-'}</InfoRow>
                                <InfoRow label="Difficulties">{data.mirror?.beatmap_count}</InfoRow>
                                <InfoRow label="File Size">{fileSizeMb} MB</InfoRow>
                                {data.bpm && <InfoRow label="BPM">{data.bpm}</InfoRow>}
                                {data.genre_id != null && <InfoRow label="Genre">{GENRE_LABELS[data.genre_id] ?? data.genre_id}</InfoRow>}
                                {data.language_id != null && <InfoRow label="Language">{LANGUAGE_LABELS[data.language_id] ?? data.language_id}</InfoRow>}
                                <InfoRow label="Has Video">{data.video ? 'Yes' : 'No'}</InfoRow>
                                <InfoRow label="Storyboard">{data.storyboard ? 'Yes' : 'No'}</InfoRow>
                                {data.nsfw && <InfoRow label="NSFW"><span className="text-danger">Yes</span></InfoRow>}
                                {data.source && <InfoRow label="Source">{data.source}</InfoRow>}
                                {data.tags && (
                                    <div className="mt-1">
                                        <div className="text-secondary mb-1">Tags</div>
                                        <div className="text-white text-break">
                                            {data.tags.split(' ').filter(Boolean).map((tag, i) => (
                                                <span key={i} className="badge me-1 mb-1 bg-secondary text-black">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedDiff && (
                            <div className="cbg-dark rounded-3 p-3">
                                <div className="small fw-bold mb-1">
                                    {selectedDiff.version}
                                </div>
                                <div className="small text-secondary mb-3">
                                    ★ {parseFloat(selectedDiff.difficulty_rating).toFixed(2)} · {MODE_LABELS[selectedDiff.mode]} · ID {selectedDiff.id}
                                </div>

                                <div className="d-flex flex-wrap gap-3 mb-3 small">
                                    <div className="d-flex align-items-center gap-1">
                                        <FaClock size={12} className="text-secondary" />
                                        <span title="Total length">{fmtTime(selectedDiff.total_length)}</span>
                                    </div>
                                    {selectedDiff.hit_length != null && selectedDiff.hit_length !== selectedDiff.total_length && (
                                        <div className="d-flex align-items-center gap-1 text-secondary" title="Drain time">
                                            <FaClock size={12} />
                                            <span>{fmtTime(selectedDiff.hit_length)}</span>
                                        </div>
                                    )}
                                    <div className="d-flex align-items-center gap-1">
                                        <FaMusic size={12} className="text-secondary" />
                                        <span>{selectedDiff.bpm} BPM</span>
                                    </div>
                                    <div>
                                        <span className="text-secondary">Combo </span>{selectedDiff.max_combo}x
                                    </div>
                                </div>

                                <StatBar label="CS" value={selectedDiff.cs} max={10} />
                                <StatBar label="AR" value={selectedDiff.ar} max={10} />
                                <StatBar label="OD" value={selectedDiff.accuracy} max={10} />
                                <StatBar label="HP" value={selectedDiff.drain} max={10} />
                                <StatBar label="SR" value={selectedDiff.difficulty_rating} max={10} />

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-wrap gap-3 small">
                                    <div><span className="text-secondary">Circles </span>{parseInt(selectedDiff.count_circles)}</div>
                                    <div><span className="text-secondary">Sliders </span>{parseInt(selectedDiff.count_sliders)}</div>
                                    <div><span className="text-secondary">Spinners </span>{parseInt(selectedDiff.count_spinners)}</div>
                                    <div><span className="text-secondary">Playcount </span>{selectedDiff.playcount?.toLocaleString()}</div>
                                    <div><span className="text-secondary">Passcount </span>{selectedDiff.passcount?.toLocaleString()}</div>
                                </div>

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-column gap-1 small">
                                    {selectedDiff.status && (
                                        <InfoRow label="Status">{STATUS_LABELS[selectedDiff.status] ?? selectedDiff.status}</InfoRow>
                                    )}
                                    {selectedDiff.last_updated && <InfoRow label="Last Updated">{fmtDate(selectedDiff.last_updated)}</InfoRow>}
                                    {selectedDiff.deleted_at && (
                                        <InfoRow label="Deleted"><span className="text-danger">{fmtDate(selectedDiff.deleted_at)}</span></InfoRow>
                                    )}
                                    <InfoRow label="Scoreable">{selectedDiff.is_scoreable ? 'Yes' : 'No'}</InfoRow>
                                    {selectedDiff.convert && <InfoRow label="Convert">Yes</InfoRow>}
                                    {selectedDiff.checksum && (
                                        <div className="mt-1">
                                            <div className="text-secondary mb-1">MD5</div>
                                            <div className="font-monospace text-white text-break opacity-50">
                                                {selectedDiff.checksum}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {playing && data?.preview_url && (
                <div className="position-fixed bottom-0 start-0 end-0 bg-dark border-top border-secondary px-3 py-2 d-flex align-items-center gap-3" style={{ zIndex: 1050 }}>
                    <button
                        className="btn btn-sm btn-outline-secondary flex-shrink-0 d-flex align-items-center"
                        title="Pause preview"
                        onClick={togglePreview}
                    >
                        <FaPause size={12} />
                    </button>
                    <div className="flex-grow-1 small text-truncate">
                        <span className="text-white fw-semibold">{data.title}</span>
                        {data.artist && <span className="text-secondary ms-2">{data.artist}</span>}
                    </div>
                    <FaVolumeUp className="text-secondary flex-shrink-0" size={13} />
                    <input
                        type="range" min="0" max="1" step="0.01"
                        value={volume}
                        onChange={e => handleVolume(e.target.value)}
                        className="form-range flex-shrink-0"
                        style={{ width: 100 }}
                        title={`Preview volume: ${Math.round(volume * 100)}%`}
                    />
                    <span className="text-secondary small flex-shrink-0">{Math.round(volume * 100)}%</span>
                </div>
            )}
        </>
    );
}