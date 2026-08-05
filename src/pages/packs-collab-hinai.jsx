import { useCallback, useEffect, useRef, useState } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import PackCard from '../components/PackCard-collab-hinai.jsx';
import PacksHero from '../components/PacksHero-collab-hinai.jsx';
import PackDetailModal from '../components/PackDetailModal-collab-hinai.jsx';
import PpRangeFilter from '../components/PpRangeFilter-collab-hinai.jsx';
import useDebounced from '../lib/useDebounced-collab-hinai.js';
import {
    MODES,
    PACK_TYPES,
    PP_MAX,
    MODE_LABELS,
    packsQuery,
    fetchPacks,
    fetchPackStats,
    formatCount,
} from '../lib/packs-collab-hinai.js';

const SEARCH_CAP = 200;
const SKELETONS = 8;

export default function Packs() {
    const [query, setQuery] = useState('');
    const [type, setType] = useState('all');
    const [mode, setMode] = useState('all');
    const [ppRange, setPpRange] = useState([0, PP_MAX]);

    const debouncedQuery = useDebounced(query, 400);
    const debouncedPp = useDebounced(ppRange, 250);
    const [ppLo, ppHi] = debouncedPp;

    const [packs, setPacks] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [paging, setPaging] = useState(false);
    const [error, setError] = useState('');
    const [moreError, setMoreError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [stats, setStats] = useState(null);
    const [activePack, setActivePack] = useState(null);

    const genRef = useRef(0);
    const cursorRef = useRef(null);
    const busyRef = useRef(false);
    const sentinelRef = useRef(null);
    const loadMoreRef = useRef(() => {});
    const filtersRef = useRef({ type, mode, search: '', ppRange });

    const isSearch = debouncedQuery.trim().length > 0;

    useEffect(() => {
        const controller = new AbortController();
        fetchPackStats(controller.signal)
            .then(setStats)
            .catch(() => {});
        return () => controller.abort();
    }, []);

    useEffect(() => {
        const gen = genRef.current + 1;
        genRef.current = gen;
        const controller = new AbortController();

        busyRef.current = true;
        cursorRef.current = null;
        setLoading(true);
        setError('');
        setMoreError('');
        setPacks([]);
        setHasMore(false);

        fetchPacks(packsQuery({ type, mode, search: debouncedQuery, cursor: null, ppRange: [ppLo, ppHi] }), controller.signal)
            .then(data => {
                if (gen !== genRef.current) return;
                setPacks(data.beatmap_packs || []);
                setTotal(Number(data.total || 0));
                cursorRef.current = data.cursor_string || null;
                setHasMore(Boolean(data.cursor_string));
                setLoading(false);
                busyRef.current = false;
            })
            .catch(() => {
                if (controller.signal.aborted || gen !== genRef.current) return;
                setError('Could not reach the mirror. Please try again.');
                setLoading(false);
                busyRef.current = false;
            });

        return () => controller.abort();
    }, [type, mode, debouncedQuery, ppLo, ppHi, retryKey]);

    useEffect(() => {
        filtersRef.current = { type, mode, search: debouncedQuery, ppRange: [ppLo, ppHi] };
    }, [type, mode, debouncedQuery, ppLo, ppHi]);

    const loadMore = useCallback(() => {
        if (busyRef.current || !cursorRef.current) return;
        const gen = genRef.current;
        busyRef.current = true;
        setPaging(true);
        setMoreError('');

        fetchPacks(packsQuery({ ...filtersRef.current, cursor: cursorRef.current }))
            .then(data => {
                if (gen !== genRef.current) return;
                setPacks(prev => prev.concat(data.beatmap_packs || []));
                cursorRef.current = data.cursor_string || null;
                setHasMore(Boolean(data.cursor_string));
                setPaging(false);
                busyRef.current = false;
            })
            .catch(() => {
                if (gen !== genRef.current) return;
                setMoreError('Could not load more packs.');
                setPaging(false);
                busyRef.current = false;
            });
    }, []);

    useEffect(() => {
        loadMoreRef.current = loadMore;
    }, [loadMore]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return undefined;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) loadMoreRef.current();
        }, { rootMargin: '400px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const resetFilters = () => {
        setQuery('');
        setType('all');
        setMode('all');
        setPpRange([0, PP_MAX]);
    };

    const countLabel = isSearch && total >= SEARCH_CAP
        ? `${formatCount(SEARCH_CAP)}+`
        : formatCount(total);

    return (
        <>
            <title>Beatmap Packs | Nekoha</title>

            <div className="container py-4 px-3 mx-auto">
                <PacksHero stats={stats} />

                <div className="alert cbg-dark border-0 small d-flex gap-2 mb-3">
                    <span className="text-secondary fw-bold">Installation:</span>
                    <span>download a pack, drop the .osz files into your osu! Songs folder, and osu! imports them automatically (hit F5 in song select to force a refresh).</span>
                </div>

                <div className="card cbg-dark border-0 p-3 mb-3">
                    <div className="input-group gap-1 mb-3">
                        <span className="input-group-text bg-dark border-secondary rounded-0">
                            <FaSearch size={12} />
                        </span>
                        <input
                            type="text"
                            className="form-control bg-dark border-secondary rounded-0"
                            placeholder="Search packs by name, tag, or #number..."
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            aria-label="Search beatmap packs"
                        />
                        {query && (
                            <button type="button" className="btn btn-secondary rounded-0" onClick={() => setQuery('')} aria-label="Clear search">
                                <FaTimes size={12} />
                            </button>
                        )}
                    </div>

                    <div className="mb-3">
                        <div className="small text-white mb-2">Game Mode</div>
                        <div className="d-flex flex-wrap gap-2">
                            {MODES.map(m => (
                                <button
                                    key={m.key}
                                    type="button"
                                    className={`btn btn-sm ${mode === m.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => setMode(m.key)}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3">
                        <div className="small text-white mb-2">Category</div>
                        <div className="d-flex flex-wrap gap-2">
                            {PACK_TYPES.map(t => (
                                <button
                                    key={t.key}
                                    type="button"
                                    className={`btn btn-sm ${type === t.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                    onClick={() => { setType(t.key); setQuery(''); }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <PpRangeFilter value={ppRange} onChange={setPpRange} />
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="small text-secondary">
                        {loading ? 'Loading...' : `${countLabel} packs`}
                    </div>
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={resetFilters}>
                        Reset
                    </button>
                </div>

                {error && (
                    <div className="alert bg-danger d-flex justify-content-between align-items-center gap-3">
                        <span>{error}</span>
                        <button type="button" className="btn btn-sm btn-dark-c1" onClick={() => setRetryKey(k => k + 1)}>
                            Try again
                        </button>
                    </div>
                )}

                <div className="row g-3 mb-3">
                    {loading && Array.from({ length: SKELETONS }).map((_, i) => (
                        <div className="col-12 col-md-6 col-xl-4" key={`skeleton-${i}`}>
                            <div className="pack-card pack-card--skeleton border-beatmapcard rounded-4 border-4 h-100" />
                        </div>
                    ))}

                    {!loading && packs.map(pack => (
                        <div className="col-12 col-md-6 col-xl-4" key={pack.tag}>
                            <PackCard pack={pack} onOpen={() => setActivePack(pack)} />
                        </div>
                    ))}
                </div>

                {!loading && !error && packs.length === 0 && (
                    <p className="text-center text-secondary py-5 mb-0">
                        No packs match these filters.
                    </p>
                )}

                <div ref={sentinelRef} style={{ height: 1 }} />

                {paging && (
                    <div className="search-loading-bar mb-4">
                        <div className="search-loading-bar-value" />
                    </div>
                )}

                {moreError && (
                    <div className="text-center mb-4">
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={loadMore}>
                            {moreError} Retry
                        </button>
                    </div>
                )}

                {!loading && !paging && !hasMore && packs.length > 0 && (
                    <p className="text-center text-secondary small mb-4">That is every pack.</p>
                )}
            </div>

            {activePack && (
                <PackDetailModal pack={activePack} onClose={() => setActivePack(null)} />
            )}
        </>
    );
}
