import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { FaDownload, FaRegDotCircle, FaDrum, FaHeart, FaClock, FaMusic, FaPlay, FaPause, FaVolumeUp } from 'react-icons/fa';
import { SiOsu } from "react-icons/si";
import { MdPiano } from 'react-icons/md';
import { FaAppleWhole, FaCircleCheck } from 'react-icons/fa6';

const STATUS_COLORS = {
    ranked: '#b3ff66',
    approved: '#b3ff66',
    qualified: '#66ccff',
    loved: '#ff66ab',
    pending: '#aaaaaa',
    wip: '#aaaaaa',
    graveyard: '#666666',
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

function statBar({ label, value, max = 10 }) {
    const pct = Math.min(100, (parseFloat(value) / max) * 100);
    return (
        <div className="d-flex align-items-center gap-2 mb-2">
            <div className="text-secondary small text-end flex-shrink-0" style={{ width: 32 }}>{label}</div>
            <div className="flex-grow-1 rounded" style={{ height: 8, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div className="rounded" style={{ width: `${pct}%`, height: '100%', background: 'rgb(0,206,255)', transition: 'width 0.3s ease' }} />
            </div>
            <div className="small text-white flex-shrink-0" style={{ width: 36 }}>{parseFloat(value).toFixed(1)}</div>
        </div>
    );
}

function fmtTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtDate(str) {
    if (!str) return 'N/A';
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
                if (!/^\d+$/.test(id)) { setError('Invalid beatmapset ID'); return; }
                const res = await axios.get(`/api/beatmapset/${id}`);
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
        if (!el || !el.src) return;
        if (playing) { el.pause(); setPlaying(false); }
        else { el.play().catch(() => {}); setPlaying(true); }
    };

    const handleVolume = (v) => {
        const val = parseFloat(v);
        setVolume(val);
        if (audioRef.current) audioRef.current.volume = val;
    };

    if (loading) return (
        <div className="search-loading-bar mt-0 rounded-0">
            <div className="search-loading-bar-value" />
        </div>
    );
    if (error) return <div className="mt-5 alert bg-danger">{error}</div>;
    if (!data) return null;

    const coverUrl = `https://assets.ppy.sh/beatmaps/${data.id}/covers/cover.jpg`;
    const statusColor = STATUS_COLORS[data.status] ?? '#aaa';

    return (
        <>
            <title>{data.title} - Nekoha Mirror</title>
            {data.preview_url && (
                <audio
                    ref={audioRef}
                    src={data.preview_url.startsWith('//') ? `https:${data.preview_url}` : data.preview_url}
                    onEnded={() => setPlaying(false)}
                    onCanPlay={el => { if (el.target) el.target.volume = 0.1; }}
                />
            )}

            <div className="position-relative py-4"
                style={{ background: `linear-gradient(rgba(0,0,0,0.55), rgba(0,0,0,0.82)), url('${coverUrl}') center/cover no-repeat`, minHeight: 220 }}>
                <div className="container">
                    <div className="d-flex gap-4 align-items-end flex-wrap">
                        <img
                            src={`https://assets.ppy.sh/beatmaps/${data.id}/covers/list.jpg`}
                            alt="cover"
                            className="rounded-2 flex-shrink-0 object-fit-cover"
                            style={{ width: 100, height: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.6)' }}
                        />
                        <div className="flex-grow-1 overflow-hidden">
                            <span className="badge rounded-pill mb-1 small fw-bold"
                                style={{ background: statusColor, color: '#000' }}>
                                {STATUS_LABELS[data.status] ?? data.status}
                            </span>
                            <h2 className="map-title mb-0 fw-bold lh-sm">{data.title}</h2>
                            <div className="text-secondary small mb-1">{data.artist}</div>
                            <div className="small">
                                mapped by{' '}
                                <a className="fw-bold text-white link-blue text-decoration-none"
                                    href={`https://osu.ppy.sh/users/${data.user_id}`} target="_blank">
                                    {data.creator}
                                </a>
                            </div>
                            <div className="d-flex align-items-center gap-3 mt-2">
                                {data.mode_osu_count > 0 && <span title="osu!" className="d-flex align-items-center gap-1 small"><FaRegDotCircle />{data.mode_osu_count}</span>}
                                {data.mode_taiko_count > 0  && <span title="Taiko" className="d-flex align-items-center gap-1 small"><FaDrum />{data.mode_taiko_count}</span>}
                                {data.mode_fruits_count > 0 && <span title="Catch" className="d-flex align-items-center gap-1 small"><FaAppleWhole />{data.mode_fruits_count}</span>}
                                {data.mode_mania_count > 0  && <span title="Mania" className="d-flex align-items-center gap-1 small"><MdPiano />{data.mode_mania_count}</span>}
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
                            <FaDownload /> Download {(data.mirror?.file_size / (1024 ** 2)).toFixed(2)} MB
                        </a>
                        {data.video && (
                            <a className="btn btn-sm btn-outline-success d-flex align-items-center gap-2" href={`/api/download/${data.id}?noVideo=1`} title="Download without video">
                                <FaDownload /> No Video
                            </a>
                        )}
                        <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${data.id}`}>
                            <FaDownload color="black" /> osu!direct
                        </a>
                        <a className="btn btn-sm cbg-pink-2 d-flex align-items-center gap-2"
                            href={`https://osu.ppy.sh/beatmapsets/${data.id}`} target="_blank">
                            View on osu!
                        </a>
                    </div>
                </div>
            </div>

            <div className="container mt-4">
                <div className="row g-4">

                    <div className="col-12 col-lg-7">

                        <div className="cbg-dark rounded-3 p-3 mb-3">
                            <div className="small fw-bold mb-2">Description</div>
                            {data.description ? (
                                <div
                                    ref={descRef}
                                    className="bbcode-content overflow-auto"
                                    style={{ maxHeight: 320 }}
                                    dangerouslySetInnerHTML={{ __html: JSON.parse(data.description?.description).description }}
                                />
                            ) : (
                                <p className="text-muted small mb-0">No description provided.</p>
                            )}
                        </div>

                        <div className="cbg-dark rounded-3 p-3">
                            <div className="small fw-bold mb-2">Difficulties</div>
                            <div className="d-flex flex-column gap-1">
                                {data.beatmaps.map(diff => {
                                    const active = selectedDiff?.id === diff.id;
                                    const sr = parseFloat(diff.difficulty_rating);
                                    const hue = Math.min(240, Math.max(0, 240 - sr * 30));
                                    const starColor = `hsl(${hue},90%,65%)`;
                                    return (
                                        <button key={diff.id}
                                            onClick={() => setSelectedDiff(diff)}
                                            className="d-flex align-items-center gap-2 text-start w-100 border-0 rounded-2 px-3 py-2 text-white"
                                            style={{
                                                background: active ? 'rgba(0,206,255,0.15)' : 'rgba(255,255,255,0.04)',
                                                borderLeft: active ? '3px solid rgb(0,206,255)' : '3px solid transparent',
                                                transition: 'background 0.15s',
                                            }}
                                        >
                                            <span className="fw-bold flex-shrink-0" style={{ color: starColor, minWidth: 36 }}>★ {sr.toFixed(2)}</span>
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
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Beatmapset ID</span><span>{data.id}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Submitted</span><span>{fmtDate(data.submitted_date)}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Last Updated</span><span>{fmtDate(data.last_updated)}</span>
                                </div>
                                {data.ranked_date && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">Ranked</span><span>{fmtDate(data.ranked_date)}</span>
                                    </div>
                                )}
                                {data.deleted_at && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">Deleted</span><span>{fmtDate(data.deleted_at)}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Favourites</span><span>{data.favourite_count?.toLocaleString() ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Play Count</span><span>{data.play_count?.toLocaleString() ?? '-'}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Difficulties</span><span>{data.mirror?.beatmap_count}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">File Size</span><span>{(data.mirror?.file_size / (1024 ** 2)).toFixed(2)} MB</span>
                                </div>
                                {data.bpm && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">BPM</span><span>{data.bpm}</span>
                                    </div>
                                )}
                                {data.genre_id != null && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">Genre</span><span>{GENRE_LABELS[data.genre_id] ?? data.genre_id}</span>
                                    </div>
                                )}
                                {data.language_id != null && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">Language</span><span>{LANGUAGE_LABELS[data.language_id] ?? data.language_id}</span>
                                    </div>
                                )}
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Has Video</span>
                                    <span>{data.video ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <span className="text-secondary">Storyboard</span>
                                    <span>{data.storyboard ? 'Yes' : 'No'}</span>
                                </div>
                                {data.nsfw && (
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">NSFW</span><span className="text-danger">Yes</span>
                                    </div>
                                )}
                                {data.source && (
                                    <div className="d-flex justify-content-between gap-3">
                                        <span className="text-secondary flex-shrink-0">Source</span>
                                        <span className="text-end">{data.source}</span>
                                    </div>
                                )}
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

                                <statBar label="CS" value={selectedDiff.cs} max={10} />
                                <statBar label="AR" value={selectedDiff.ar} max={10} />
                                <statBar label="OD" value={selectedDiff.accuracy} max={10} />
                                <statBar label="HP" value={selectedDiff.drain} max={10} />
                                <statBar label="SR" value={selectedDiff.difficulty_rating} max={10} />

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-wrap gap-3 small">
                                    <div><span className="text-secondary">Circles </span>{parseInt(selectedDiff.count_circles)}</div>
                                    <div><span className="text-secondary">Sliders </span>{parseInt(selectedDiff.count_sliders)}</div>
                                    <div><span className="text-secondary">Spinners </span>{parseInt(selectedDiff.count_spinners)}</div>
                                    <div><span className="text-secondary">Playcount </span>{selectedDiff.playcount?.toLocaleString()}</div>
                                    <div><span className="text-secondary">Passcount </span>{selectedDiff.passcount?.toLocaleString()}</div>
                                </div>

                                <div className="border-top border-secondary mt-3 pt-3 d-flex flex-column gap-1 small">
                                    {selectedDiff.status && (
                                        <div className="d-flex justify-content-between">
                                            <span className="text-secondary">Status</span>
                                            <span>{selectedDiff.status.charAt(0).toUpperCase() + selectedDiff.status.slice(1)}</span>
                                        </div>
                                    )}
                                    {selectedDiff.last_updated && (
                                        <div className="d-flex justify-content-between">
                                            <span className="text-secondary">Last Updated</span>
                                            <span>{fmtDate(selectedDiff.last_updated)}</span>
                                        </div>
                                    )}
                                    {selectedDiff.deleted_at && (
                                        <div className="d-flex justify-content-between">
                                            <span className="text-secondary">Deleted</span>
                                            <span className="text-danger">{fmtDate(selectedDiff.deleted_at)}</span>
                                        </div>
                                    )}
                                    <div className="d-flex justify-content-between">
                                        <span className="text-secondary">Scoreable</span>
                                        <span>{selectedDiff.is_scoreable ? 'Yes' : 'No'}</span>
                                    </div>
                                    {selectedDiff.convert && (
                                        <div className="d-flex justify-content-between">
                                            <span className="text-secondary">Convert</span>
                                            <span>Yes</span>
                                        </div>
                                    )}
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
            <div className="mb-5" />

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