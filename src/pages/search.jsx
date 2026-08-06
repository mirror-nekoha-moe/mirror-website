import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaDownload, FaRegDotCircle, FaDrum, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { MdPiano } from 'react-icons/md';
import { FaAppleWhole, FaCircleCheck } from 'react-icons/fa6';
import MapperLink from '../components/MapperLink-collab-hinai.jsx';
import SearchHero from '../components/SearchHero-collab-hinai.jsx';
import { cover } from '../lib/mirror-collab-hinai.js';
import { fetchPp, hardestDiff, ppKey, ppRetryAt } from '../lib/pp-collab-hinai.js';
import { formatPP, ppColor } from '../lib/graveyard-collab-hinai.js';
import { starTier } from '../lib/ranked-today-collab-hinai.js';
import HinaiInfoModal from '../components/HinaiInfoModal-collab-hinai.jsx';
import HinaiAudio from '../components/HinaiAudio-collab-hinai.jsx';

const HINAI_MARK = '/assets/collab-hinai/hinai-logo.png';

const PP_RETRY_MS = [3000, 9000, 27000];
const PP_WAKE_MIN_MS = 10000;
const PP_DEFER_ROUNDS = 2;
const PP_DEFER_PAD_MS = 1000;

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

/**
 * Builds a fresh filter object for the search form: every selection empty, sort at its default.
 *
 * It is a factory rather than a shared constant because the value is handed to `useState`, kept
 * in a ref and passed straight to `fetchPage` on reset; minting a new object each time keeps one
 * reset's `status`/`mode` arrays from ever aliasing another's. Every filter scalar starts as `''`
 * (not `null`) so the inputs stay controlled and `buildParams` can drop unset ones with a single
 * truthiness test. `sort` and `order` are the deliberate exceptions, seeded to the `updated`/`desc`
 * default rather than left blank.
 *
 * @returns {object} A new filter state with empty selections and the default `updated`/`desc` sort.
 */
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

/**
 * A labelled min/max pair of number inputs bound to two keys of the shared filter object.
 *
 * The row is deliberately generic over key names instead of holding its own state: it writes
 * straight back through `setFilters` with a functional update, so several rows editing the same
 * object in the same tick cannot clobber each other.
 *
 * @param {object} props - Component props.
 * @param {string} props.label - Caption shown above the pair (e.g. `Star Rating`).
 * @param {string} props.keyMin - Filter key holding the lower bound.
 * @param {string} props.keyMax - Filter key holding the upper bound.
 * @param {object} props.filters - Current filter state, read for both input values.
 * @param {React.Dispatch<React.SetStateAction<object>>} props.setFilters - Filter state setter.
 * @param {string} [props.step='0.1'] - `step` attribute for both inputs; pass `'1'` for whole
 *   numbers such as BPM or length in seconds.
 * @returns {JSX.Element} A grid column holding the min and max inputs.
 */
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

/**
 * The beatmapset search page: query box, collapsible filter panel, and an infinitely scrolling
 * grid of result cards enriched with PP for each set's hardest difficulty.
 *
 * Three things make this component fiddlier than a plain list. First, the IntersectionObserver
 * that drives infinite scroll is installed once and would otherwise capture stale state, so the
 * live query, filters, page number, loading flag and has-more flag are all mirrored into refs
 * that its callback reads. Second, a generation counter (`genRef`) is bumped on every new search
 * or reset and re-checked once each response lands, so an append that was already in flight
 * cannot splice old rows onto a fresh result set. Third, PP is not part of the search payload: it is
 * polled separately from the hinamizawa mirror on a backoff ladder whenever `results` changes.
 *
 * @returns {JSX.Element} The full search page.
 */
export default function BeatmapsetSearch() {
  const [query, setQuery]      = useState('');
  const [filters, setFilters]  = useState(emptyFilters());
  const [showFilters, setShow] = useState(false);
  const [results, setResults]  = useState([]);
  const [hasMore, setHasMore]  = useState(true);
  const [loading, setLoading]  = useState(false);
  const [error, setError]      = useState('');
  const [ppMap, setPpMap]      = useState(() => new Map());
  const [infoSet, setInfoSet]  = useState(null);

  // Refs to always have latest query/filters inside the IntersectionObserver callback
  const queryRef   = useRef(query);
  const filtersRef = useRef(filters);
  const pageRef    = useRef(1);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);
  const sentinelRef = useRef(null);
  // Increment on every new search/reset to discard stale in-flight appends
  const genRef     = useRef(0);

  /**
   * Flattens the filter state into the query object sent to `/api/search`.
   *
   * `q` and `page` are always written; every filter field is copied only when truthy, so blank
   * inputs and empty multi-selects never reach the API. That keeps the URL short and, more
   * importantly, keeps unset ranges from being sent as `''` and interpreted as a real bound. An
   * empty `q` does land in the returned object and is dropped by the caller's own `v !== ''` pass
   * before the query string is built. Array filters (`status`, `mode`) are comma-joined, and the
   * `set_id` filter is renamed to the API's `id` parameter.
   *
   * @param {number} pageNum - 1-based page to request.
   * @param {string} q - Free-text query.
   * @param {object} f - Filter state as produced by `emptyFilters`.
   * @returns {Object<string, string|number>} Query parameters, omitting anything unset.
   */
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

    /**
     * Fetches one page of search results and either replaces or appends to the grid.
     *
     * Concurrency is handled with two separate mechanisms because they solve different problems:
     * `loadingRef` is a synchronous mutex that stops the scroll observer from firing the same
     * page twice before React has re-rendered, while the `genRef` snapshot taken at entry is
     * re-checked after the await so a response that outlived its search is dropped instead of
     * being merged into newer results. `hasMore` is inferred from the page being full (>= 100
     * rows), so it goes false on the first short page rather than after a wasted empty request.
     *
     * Note that `pageRef` is only advanced on success, so a failed page is retried rather than
     * skipped the next time the sentinel comes into view.
     *
     * @param {number} pageNum - 1-based page to load.
     * @param {string} q - Free-text query for this request.
     * @param {object} f - Filter state for this request.
     * @param {boolean} [replace=false] - Replace the grid instead of appending to it.
     * @returns {Promise<void>} Resolves once state has been updated (or the response discarded).
     */
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
    useEffect(() => { fetchPage(1, '', emptyFilters(), true); }, [fetchPage]);

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

  /**
   * Runs a new search from the current query and filter state.
   *
   * Bumps the generation counter first so any append still in flight is invalidated before the
   * grid is cleared, then pushes the live query/filters into the refs the scroll observer reads
   * and rewinds the page cursor to 0 (page 1 is requested here; the observer picks up from
   * whatever the successful fetch writes back).
   *
   * Doubles as both the form's `onSubmit` and the filter panel's "Apply Filters" click handler,
   * which is why it defends with `preventDefault`.
   *
   * @param {React.SyntheticEvent} e - Submit or click event.
   * @returns {void}
   */
  const handleSearch = (e) => {
    e.preventDefault();
    genRef.current    += 1;   // invalidate any in-flight appends
    queryRef.current   = query;
    filtersRef.current = filters;
    pageRef.current    = 0;
    hasMoreRef.current = true;
    setHasMore(true);
    setResults([]);
    fetchPage(1, query, filters, true);
  };

  /**
   * Clears the query and every filter, then reloads the unfiltered first page.
   *
   * The blank filter object is built once and written to both state and `filtersRef`, and the
   * same object is passed straight to `fetchPage` — the fetch cannot wait for the state update,
   * so it has to be handed the new filters explicitly. Like `handleSearch`, it bumps the
   * generation counter so in-flight appends from the old query are discarded.
   *
   * @returns {void}
   */
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

  /**
   * Adds or removes one ranked-status key from the `status` multi-select.
   *
   * Only stages the change: nothing is refetched until Search or Apply Filters is pressed.
   *
   * @param {string} s - Status key from `STATUSES` (e.g. `'ranked'`, `'graveyard'`).
   * @returns {void}
   */
  const toggleStatus = s => setFilters(f => ({ ...f, status: f.status.includes(s) ? f.status.filter(x => x !== s) : [...f.status, s] }));
  /**
   * Adds or removes one game mode from the `mode` multi-select.
   *
   * Only stages the change: nothing is refetched until Search or Apply Filters is pressed.
   *
   * @param {string} m - Mode key from `MODES` (`'osu'`, `'taiko'`, `'fruits'`, `'mania'`).
   * @returns {void}
   */
  const toggleMode   = m => setFilters(f => ({ ...f, mode:   f.mode.includes(m)   ? f.mode.filter(x => x !== m)   : [...f.mode,   m] }));

  // Keep refs in sync when state changes (for observer callback)
  useEffect(() => { queryRef.current   = query;   }, [query]);
  useEffect(() => { filtersRef.current = filters; }, [filters]);

  useEffect(() => {
    if (!results.length) return undefined;

    const targets = [];
    for (const set of results) {
      const diff = hardestDiff(set);
      if (diff) targets.push(diff);
    }
    if (!targets.length) return undefined;

    let alive = true;
    let step = 0;
    let defers = 0;
    let lastRun = 0;
    let timer = null;

    /**
     * Cancels any pending poll and clears the handle.
     *
     * Nulling `timer` matters: it is the effect's only record of whether a poll is armed, so a
     * stale handle would let cleanup or a re-schedule believe one is still queued.
     *
     * @returns {void}
     */
    function stopTimer() {
      if (timer === null) return;
      clearTimeout(timer);
      timer = null;
    }

    /**
     * Arms the next PP poll, or stops polling when there is nothing left to wait for.
     *
     * `ppRetryAt` reports the earliest moment any still-unresolved target is worth asking about,
     * returning 0 once every visible difficulty has a cached value. A time in the future means
     * the PP layer is cooling down (rate limit or negative-cache TTL), so this waits it out plus
     * a small pad and resets the fast ladder — but only `PP_DEFER_ROUNDS` times, so a map the
     * mirror never computes cannot keep the page polling forever. Otherwise it walks the fixed
     * `PP_RETRY_MS` ladder one rung per call and gives up at the end of it.
     *
     * @returns {void}
     */
    function schedule() {
      if (!alive) return;

      const at = ppRetryAt(targets);
      if (at === 0) return;

      const wait = at - Date.now();
      stopTimer();

      if (wait > 0) {
        if (defers >= PP_DEFER_ROUNDS) return;
        defers += 1;
        step = 0;
        timer = setTimeout(run, wait + PP_DEFER_PAD_MS);
        return;
      }

      if (step >= PP_RETRY_MS.length) return;
      timer = setTimeout(run, PP_RETRY_MS[step]);
      step += 1;
    }

    /**
     * Performs one batched PP fetch for every visible hardest-difficulty target, then re-arms.
     *
     * `fetchPp` resolves to null rather than a snapshot whenever it made no progress at all, which
     * is either the global cooldown being active or every batch failing to settle; hence the
     * truthiness guard before publishing, since any other outcome is a Map safe to render. The
     * `alive` check inside the `.then` is what keeps an unmounted or superseded effect from writing
     * state, and `lastRun` is stamped up front so the wake throttle measures from the request going
     * out rather than from it coming back.
     *
     * @returns {void}
     */
    function run() {
      stopTimer();
      lastRun = Date.now();
      fetchPp(targets).then(next => {
        if (!alive) return;
        if (next) setPpMap(next);
        schedule();
      });
    }

    /**
     * Restarts polling when the tab is brought back to the foreground or the network returns.
     *
     * A backgrounded tab has its timers throttled, so the ladder will usually have run itself
     * out by the time the user comes back; this gives the page a second chance at the PP that
     * never arrived. It is deliberately defensive, because `visibilitychange` and `online` can
     * fire in bursts: hidden tabs are ignored, nothing happens when every target already
     * resolved, and `PP_WAKE_MIN_MS` since the last request is enforced so tab-flipping cannot
     * be turned into a request flood against the mirror. Both counters reset so a genuine wake
     * gets a full fresh ladder rather than resuming a spent one.
     *
     * @returns {void}
     */
    function wake() {
      if (!alive) return;
      if (document.visibilityState === 'hidden') return;
      if (ppRetryAt(targets) === 0) return;
      if (Date.now() - lastRun < PP_WAKE_MIN_MS) return;
      step = 0;
      defers = 0;
      run();
    }

    run();
    window.addEventListener('online', wake);
    document.addEventListener('visibilitychange', wake);

    return () => {
      alive = false;
      stopTimer();
      window.removeEventListener('online', wake);
      document.removeEventListener('visibilitychange', wake);
    };
  }, [results]);

  const activeFilterCount = [
    filters.status.length, filters.mode.length,
    filters.set_id, filters.map_id,
    filters.stars_min, filters.stars_max,
    filters.ar_min, filters.ar_max, filters.cs_min, filters.cs_max,
    filters.od_min, filters.od_max, filters.hp_min, filters.hp_max,
    filters.bpm_min, filters.bpm_max, filters.length_min, filters.length_max,
    filters.video,
  ].filter(Boolean).length;

  return (
    <>
      <title>Search</title>
      <div className="container mt-4">
        <SearchHero />

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
          {results.map(set => {
            const diff = hardestDiff(set);
            const pp = diff ? ppMap.get(ppKey(diff.id, diff.mode)) : undefined;
            return (
            <div className={`col-12 col-lg-6 ${!set.user_id ? 'missing-metadata' : ''}`} key={set.id}>
              <div className="border-beatmapcard rounded-4 border-4 p-3 beatmapset-card-bg beatmapset-card-hoverable position-relative"
                style={{ background: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url('${cover(set.id, 'cover')}')` }}
              >
                <a href={`/beatmapset/${set.id}`} className="stretched-link" aria-label={set.title} />
                <span className="badge border rounded-pill text-bg-dark nkstatus">{STATUS_LABELS[set.status] ?? 'Unknown'}</span>
                <div className="fw-bold nkcard-head">
                  <span className="text-white map-title">{!set.user_id ? 'Processing Metadata...' : set.title}</span>
                </div>
                <div className="small d-flex align-items-center">
                  <div>by: <span className="text-secondary">{set.artist}</span></div>
                </div>
                <div className="small d-flex align-items-center">
                  <div className="d-flex align-items-center gap-1">
                    <span>mapped by:</span>
                    <span className="position-relative d-inline-flex fw-bold" style={{ zIndex: 2 }}>
                      <MapperLink name={set.creator} avatar />
                    </span>
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
                {diff && (
                  <div className="nkpp">
                    <span className={`nkpp__sr nkpp__sr--t${starTier(diff.sr)}`}>{diff.sr.toFixed(2)}</span>
                    {pp === undefined ? (
                      <span className="nkpp__wait" aria-hidden="true" />
                    ) : pp === null ? (
                      <span className="nkpp__none" title="No PP for this difficulty yet">&#183;</span>
                    ) : (
                      <span className="nkpp__val" style={{ color: ppColor(pp) }}>
                        {formatPP(pp)}<span className="nkpp__unit">pp</span>
                      </span>
                    )}
                    <span className="nkpp__mod">NM</span>
                    {diff.version && <span className="nkpp__diff">{diff.version}</span>}
                  </div>
                )}
                <div className="position-relative mb-2" style={{ zIndex: 2 }} onClick={e => e.stopPropagation()}>
                  <HinaiAudio setId={set.id} dense />
                </div>
                <div className="d-flex flex-column flex-md-row gap-2 position-relative" style={{ zIndex: 2 }}>
                    <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${set.id}`}>
                        <span>Download {(set.mirror?.file_size / (1024 ** 2)).toFixed(2)} MB</span>
                        <FaDownload color="white" />
                    </a>
                    {set.video && (
                        <a className="btn btn-sm btn-success d-flex align-items-center gap-2" href={`/api/download/${set.id}?noVideo=1`} title="Download without video">
                            <span>No Video</span>
                            <FaDownload color="white" />
                        </a>
                    )}
                    <a className="btn btn-sm btn-secondary d-flex align-items-center gap-2" href={`osu://s/${set.id}`}>
                        <span>osu!direct</span>
                        <FaDownload color="black" />
                    </a>
                    <button
                        type="button"
                        className="btn btn-sm btn-hinai d-flex align-items-center gap-2"
                        onClick={e => { e.preventDefault(); e.stopPropagation(); setInfoSet(set); }}
                        title="PP for every mod, the josu viewer and the artwork, from mirror.hinamizawa.ai"
                    >
                        <span>hinai data</span>
                        <img src={HINAI_MARK} alt="" width={14} height={14} className="btn-hinai__mark" />
                    </button>
                </div>
              </div>
            </div>
            );
          })}
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

      {infoSet && <HinaiInfoModal seed={infoSet} onClose={() => setInfoSet(null)} />}

    </>
  );
}
