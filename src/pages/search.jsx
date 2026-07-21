import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaDownload, FaRegDotCircle, FaDrum, FaFilter, FaChevronDown, FaChevronUp, FaPlay, FaPause, FaVolumeUp } from 'react-icons/fa';
import { MdPiano } from 'react-icons/md';
import { FaAppleWhole, FaCircleCheck } from 'react-icons/fa6';

const toHttps = url => url ? (url.startsWith('//') ? `https:${url}` : url) : null;

const STATUSES = ['ranked', 'approved', 'loved', 'qualified', 'pending', 'graveyard', 'wip'];
const STATUS_LABELS = { ranked: 'Ranked', approved: 'Approved', qualified: 'Qualified', loved: 'Loved', pending: 'Pending', wip: 'WIP', graveyard: 'Graveyard' };
const MODES = [
  { key: 'osu',    label: 'osu!' },
  { key: 'taiko',  label: 'Taiko' },
  { key: 'fruits', label: 'Catch' },
  { key: 'mania',  label: 'Mania' },
];

const SORT_OPTIONS = [
  { value: 'updated',    label: 'Last Updated' },
  { value: 'ranked',     label: 'Ranked Date' },
  { value: 'submitted',  label: 'Submitted Date' },
  { value: 'title',      label: 'Title' },
  { value: 'artist',     label: 'Artist' },
  { value: 'creator',    label: 'Creator' },
  { value: 'bpm',        label: 'BPM' },
  { value: 'favourites', label: 'Favourites' },
  { value: 'difficulty', label: 'Diff Count' },
];

const emptyFilters = () => ({
  status: [], mode: [],
  set_id: '', map_id: '',
  stars_min: '', stars_max: '',
  ar_min: '',    ar_max: '',
  cs_min: '',    cs_max: '',
  od_min: '',    od_max: '',
  hp_min: '',    hp_max: '',
  bpm_min: '',   bpm_max: '',
  length_min: '', length_max: '',
  video: '',
  sort: 'updated', order: 'desc',
});

function RangeRow({ label, keyMin, keyMax, filters, setFilters, step = '0.1' }) {
  return (
    <div className="col-6 col-md-4 col-lg-3">
      <label className="form-label small mb-1 text-secondary">{label}</label>
      <div className="d-flex gap-1">
        <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="Min" step={step} min="0" value={filters[keyMin]}
          onChange={e => setFilters(f => ({ ...f, [keyMin]: e.target.value }))} />
        <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary"
          placeholder="Max" step={step} min="0" value={filters[keyMax]}
          onChange={e => setFilters(f => ({ ...f, [keyMax]: e.target.value }))} />
      </div>
    </div>
  );
}

export default function BeatmapsetSearch() {
  const [query, setQuery]      = useState('');
  const [filters, setFilters]  = useState(emptyFilters());
  const [showFilters, setShow] = useState(false);
  const [results, setResults]  = useState([]);
  const [page, setPage]        = useState(1);
  const [hasMore, setHasMore]  = useState(true);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [playingId, setPlayingId] = useState(null);
  const [volume, setVolume]    = useState(0.1);
  const audioRef = useRef(null);

  // Refs to always have latest query/filters inside the IntersectionObserver callback
  const queryRef   = useRef(query);
  const filtersRef = useRef(filters);
  const pageRef    = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef(null);
  // Increment on every new search/reset to discard stale in-flight appends
  const genRef     = useRef(0);

  const buildParams = (pageNum, q, f) => {
    const p = { q, page: pageNum };
    if (f.set_id)         p.id         = f.set_id;
    if (f.map_id)         p.map_id     = f.map_id;
    if (f.status.length)  p.status     = f.status.join(',');
    if (f.mode.length)    p.mode       = f.mode.join(',');
    if (f.stars_min)      p.stars_min  = f.stars_min;
    if (f.stars_max)      p.stars_max  = f.stars_max;
    if (f.ar_min)         p.ar_min     = f.ar_min;
    if (f.ar_max)         p.ar_max     = f.ar_max;
    if (f.cs_min)         p.cs_min     = f.cs_min;
    if (f.cs_max)         p.cs_max     = f.cs_max;
    if (f.od_min)         p.od_min     = f.od_min;
    if (f.od_max)         p.od_max     = f.od_max;
    if (f.hp_min)         p.hp_min     = f.hp_min;
    if (f.hp_max)         p.hp_max     = f.hp_max;
    if (f.bpm_min)        p.bpm_min    = f.bpm_min;
    if (f.bpm_max)        p.bpm_max    = f.bpm_max;
    if (f.length_min)     p.length_min = f.length_min;
    if (f.length_max)     p.length_max = f.length_max;
    if (f.video)          p.video      = f.video;
    if (f.sort)           p.sort       = f.sort;
    if (f.order)          p.order      = f.order;
    return p;
  };

    const fetchPage = useCallback(async (pageNum, q, f, replace = false) => {
        if (loadingRef.current) return;
        const gen = genRef.current;
        loadingRef.current = true;
        setLoading(true);
        setError('');
        try {
            const params = buildParams(pageNum, q, f);
            const qs = new URLSearchParams(
                Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
            ).toString();
            const res = await fetch(`/api/search?${qs}`);
            if (!res.ok) throw new Error(`Request failed: ${res.status}`);
            const data = await res.json();
            // Discard if a newer search was started while this was in-flight
            if (gen !== genRef.current) return;
            const beatmapsets = data.beatmapsets;
            setResults(prev => replace ? beatmapsets : [...prev, ...beatmapsets]);
            const more = beatmapsets.length >= 100;
            setHasMore(more);
            hasMoreRef.current = more;
            pageRef.current = pageNum;
        } catch {
            if (gen === genRef.current) setError('Failed to fetch results');
        }
        setLoading(false);
        loadingRef.current = false;
    }, []);

    // Initial load
    useEffect(() => { fetchPage(1, '', emptyFilters(), true); }, []);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current && hasMoreRef.current) {
        fetchPage(pageRef.current + 1, queryRef.current, filtersRef.current, false);
      }
    }, { rootMargin: '200px' });
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [fetchPage]);

  const handleSearch = (e) => {
    e.preventDefault();
    genRef.current    += 1;   // invalidate any in-flight appends
    queryRef.current   = query;
    filtersRef.current = filters;
    pageRef.current    = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setPage(1);
    setResults([]);
    fetchPage(1, query, filters, true);
  };

  const handleReset = () => {
    const f = emptyFilters();
    genRef.current    += 1;   // invalidate any in-flight appends
    setFilters(f);
    setQuery('');
    queryRef.current   = '';
    filtersRef.current = f;
    pageRef.current    = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setResults([]);
    fetchPage(1, '', f, true);
  };

  const toggleStatus = s => setFilters(f => ({ ...f, status: f.status.includes(s) ? f.status.filter(x => x !== s) : [...f.status, s] }));
  const toggleMode   = m => setFilters(f => ({ ...f, mode:   f.mode.includes(m)   ? f.mode.filter(x => x !== m)   : [...f.mode,   m] }));

  // Keep refs in sync when state changes (for observer callback)
  useEffect(() => { queryRef.current   = query;   }, [query]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  const activeFilterCount = [
    filters.status.length, filters.mode.length,
    filters.set_id, filters.map_id,
    filters.stars_min, filters.stars_max,
    filters.ar_min, filters.ar_max, filters.cs_min, filters.cs_max,
    filters.od_min, filters.od_max, filters.hp_min, filters.hp_max,
    filters.bpm_min, filters.bpm_max, filters.length_min, filters.length_max,
    filters.video,
  ].filter(Boolean).length;

  const togglePreview = (set) => {
    const url = toHttps(set.preview_url);
    if (!url) return;
    const el = audioRef.current;
    if (playingId === set.id) {
      el.pause();
      setPlayingId(null);
    } else {
      el.src = url;
      el.volume = volume;
      el.play().catch(() => {});
      setPlayingId(set.id);
    }
  };

  const handleVolume = (v) => {
    const val = parseFloat(v);
    setVolume(val);
    if (audioRef.current) audioRef.current.volume = val;
  };

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.1;
    const onEnd = () => setPlayingId(null);
    el.addEventListener('ended', onEnd);
    return () => el.removeEventListener('ended', onEnd);
  }, []);

  return (
    <>
      <title>Search</title>
      <audio ref={audioRef} />
      <div className="container mt-4">
        <h2 className="mb-3">Beatmapset Search</h2>

        <form className="mb-2" onSubmit={handleSearch}>
          <div className="input-group gap-1">
            <input
              type="text"
              className="form-control bg-dark border-secondary rounded-0"
              placeholder="Search by title, artist, creator, tags..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
            <button className="btn btn-secondary rounded-0" type="submit">Search</button>
            <button type="button"
              className={`btn rounded-0 d-flex align-items-center gap-2 ${showFilters ? 'btn-secondary' : 'btn-secondary'}`}
              onClick={() => setShow(v => !v)}
            >
              <FaFilter />
              <span className="d-none d-sm-inline">Filters</span>
              {activeFilterCount > 0 && <span className="badge bg-dark">{activeFilterCount}</span>}
              {showFilters ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
            </button>
          </div>
        </form>

        {showFilters && (
          <div className="card bg-dark border-secondary mb-3 p-3">

            <div className="mb-3">
              <div className="small text-white mb-2">ID Lookup</div>
              <div className="row g-2">
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label small text-secondary mb-1">Beatmapset ID</label>
                  <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="e.g. 12345" min="0" value={filters.set_id}
                    onChange={e => setFilters(f => ({ ...f, set_id: e.target.value }))} />
                </div>
                <div className="col-6 col-md-4 col-lg-3">
                  <label className="form-label small text-secondary mb-1">Beatmap ID</label>
                  <input type="number" className="form-control form-control-sm bg-dark text-white border-secondary"
                    placeholder="e.g. 67890" min="0" value={filters.map_id}
                    onChange={e => setFilters(f => ({ ...f, map_id: e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-white mb-2">Status</div>
              <div className="d-flex flex-wrap gap-2">
                {STATUSES.map(s => (
                  <button key={s} type="button"
                    className={`${filters.status.includes(s) ? 'btn-secondary' : 'btn-outline-secondary'} btn btn-sm`}
                    onClick={() => toggleStatus(s)}
                  >{STATUS_LABELS[s]}</button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-white mb-2">Game Mode</div>
              <div className="d-flex flex-wrap gap-2">
                {MODES.map(m => (
                  <button key={m.key} type="button"
                    className={`btn btn-sm ${filters.mode.includes(m.key) ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => toggleMode(m.key)}
                  >{m.label}</button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-white mb-2">Video</div>
              <div className="d-flex flex-wrap gap-2">
                {[{ value: '', label: 'Any' }, { value: 'true', label: 'Has Video' }, { value: 'false', label: 'No Video' }].map(opt => (
                  <button key={opt.value} type="button"
                    className={`btn btn-sm ${filters.video === opt.value ? 'btn-secondary' : 'btn-outline-secondary'}`}
                    onClick={() => setFilters(f => ({ ...f, video: opt.value }))}
                  >{opt.label}</button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-white mb-2">Ranges</div>
              <div className="row g-2">
                <RangeRow label="Star Rating"  keyMin="stars_min"  keyMax="stars_max"  filters={filters} setFilters={setFilters} />
                <RangeRow label="BPM" keyMin="bpm_min" keyMax="bpm_max" filters={filters} setFilters={setFilters} step="1" />
                <RangeRow label="Length (sec)" keyMin="length_min" keyMax="length_max" filters={filters} setFilters={setFilters} step="1" />
                <RangeRow label="AR" keyMin="ar_min" keyMax="ar_max" filters={filters} setFilters={setFilters} />
                <RangeRow label="CS" keyMin="cs_min" keyMax="cs_max" filters={filters} setFilters={setFilters} />
                <RangeRow label="OD" keyMin="od_min" keyMax="od_max" filters={filters} setFilters={setFilters} />
                <RangeRow label="HP" keyMin="hp_min" keyMax="hp_max" filters={filters} setFilters={setFilters} />
              </div>
            </div>

            <div className="mb-3">
              <div className="small text-white mb-2">Sort</div>
              <div className="d-flex flex-wrap gap-2">
                <div>
                  <label className="form-label small text-secondary mb-1">Sort By</label>
                  <select className="form-select form-select-sm bg-dark text-white border-secondary"
                    value={filters.sort} onChange={e => setFilters(f => ({ ...f, sort: e.target.value }))}>
                    {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label small text-secondary mb-1">Order</label>
                  <select className="form-select form-select-sm bg-dark text-white border-secondary"
                    value={filters.order} onChange={e => setFilters(f => ({ ...f, order: e.target.value }))}>
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2">
              <button className="btn btn-sm btn-success" onClick={handleSearch}>Apply Filters</button>
              <button className="btn btn-sm btn-outline-danger" onClick={handleReset}>Reset All</button>
            </div>
          </div>
        )}

        {error && <div className="alert bg-danger">{error}</div>}
        <div className="row g-3 mb-3">
          {results.map(set => (
            <div className={`col-12 col-lg-6 ${!set.user_id ? 'missing-metadata' : ''}`} key={set.id}>
              <div className="border-beatmapcard rounded-4 border-4 p-3 beatmapset-card-bg beatmapset-card-hoverable position-relative"
                style={{ background: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url('https://assets.ppy.sh/beatmaps/${set.id}/covers/cover.jpg')` }}
              >
                <a href={`https://mirror.nekoha.moe/beatmapset/${set.id}`} className="stretched-link" aria-label={set.title} />
                <div className="fw-bold">
                  <span className="text-white map-title">{!set.user_id ? 'Processing Metadata...' : set.title}</span>
                </div>
                <div className="small d-flex align-items-center">
                  <div>by: <span className="text-secondary">{set.artist}</span></div>
                </div>
                <div className="small d-flex align-items-center">
                  <div>
                    <span>mapped by: </span>
                    <a className="text-decoration-none position-relative" style={{ zIndex: 2 }} href={`https://osu.ppy.sh/users/${set.user_id}`} target="_blank">
                      <span className="fw-bold text-white link-blue">{set.creator}</span>
                    </a>
                  </div>
                </div>
                <div className="small d-flex align-items-center gap-3">
                  <div>ID: <span className="text-secondary">{set.id}</span></div>
                  <div className="d-flex align-items-center gap-2">
                    <FaCircleCheck />
                    <span className="small">
                      {set.last_updated ? (() => {
                        const d = new Date(set.last_updated);
                        return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
                      })() : ''}
                    </span>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-3 mb-2">
                  <span title="osu!standard" className="d-flex align-items-center gap-1"><FaRegDotCircle /><span className="small">{set.mirror?.mode_osu_count ?? 0}</span></span>
                  <span title="osu!taiko" className="d-flex align-items-center gap-1"><FaDrum /><span className="small">{set.mirror?.mode_taiko_count ?? 0}</span></span>
                  <span title="osu!catch" className="d-flex align-items-center gap-1"><FaAppleWhole /><span className="small">{set.mirror?.mode_fruits_count ?? 0}</span></span>
                  <span title="osu!mania" className="d-flex align-items-center gap-1"><MdPiano /><span className="small">{set.mirror?.mode_mania_count ?? 0}</span></span>
                </div>
                <div className="d-flex align-items-center gap-2 position-relative" style={{ zIndex: 2 }}>
                  <span className="badge border rounded-pill text-bg-dark">{STATUS_LABELS[set.status] ?? 'Unknown'}</span>
                  {set.preview_url && (
                    <button
                      className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                      title={playingId === set.id ? 'Pause preview' : 'Play preview'}
                      onClick={e => { e.preventDefault(); e.stopPropagation(); togglePreview(set); }}
                    >
                      {playingId === set.id ? <FaPause size={11} /> : <FaPlay size={11} />}
                    </button>
                  )}
                  <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${set.id}`}>
                    <span>Download {(set.mirror?.file_size / (1024 ** 2)).toFixed(2)} MB</span>
                    <FaDownload color="white" />
                  </a>
                  {set.video && (
                    <a className="btn btn-sm btn-outline-success d-flex align-items-center gap-2" href={`/api/download/${set.id}?noVideo=1`} title="Download without video">
                      <span>No Video</span>
                      <FaDownload color="white" />
                    </a>
                  )}
                  <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${set.id}`}>
                    <span>osu!direct</span>
                    <FaDownload color="black" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {loading && (
          <div className="search-loading-bar mb-4">
            <div className="search-loading-bar-value" />
          </div>
        )}
        {!loading && !hasMore && results.length > 0 && (
          <p className="text-center text-secondary small mb-4">No more results</p>
        )}
      </div>

      {/* Floating audio player bar */}
      {playingId && (() => {
        const playing = results.find(r => r.id === playingId);
        return (
          <div className="position-fixed bottom-0 end-0 bg-dark border-top border-secondary px-3 py-2 d-flex align-items-center gap-3" style={{ zIndex: 1050 }}>
            <button
              className="btn btn-sm btn-outline-secondary flex-shrink-0 d-flex align-items-center"
              title="Pause preview"
              onClick={() => togglePreview(playing)}
            >
              <FaPause size={12} />
            </button>
            <div className="flex-grow-1 small text-truncate">
              <span className="text-white fw-semibold">{playing?.title}</span>
              {playing?.artist && <span className="text-secondary ms-2">{playing.artist}</span>}
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
        );
      })()}
    </>
  );
}
