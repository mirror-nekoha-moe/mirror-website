import { useCallback, useEffect, useRef, useState } from 'react';
import { FaSearch, FaTimes, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import GraveyardCard from '../components/GraveyardCard-collab-hinai.jsx';
import GraveyardModal from '../components/GraveyardModal-collab-hinai.jsx';
import PpRangeFilter from '../components/PpRangeFilter-collab-hinai.jsx';
import GraveMist from '../components/GraveMist-collab-hinai.jsx';
import Revenant from '../components/Revenant-collab-hinai.jsx';
import Procession from '../components/Procession-collab-hinai.jsx';
import { HINAI_URL, HinaiSource, NekohaSource } from '../components/CollabMark-collab-hinai.jsx';
import { fetchMirrorHealth } from '../lib/mirror-collab-hinai.js';
import useDebounced from '../lib/useDebounced-collab-hinai.js';
import {
    PP_CAP,
    PP_PRESETS,
    MEME_RANGE,
    PRIMARY_MODS,
    MOD_GROUPS,
    MODES,
    STATUSES,
    SORTS,
    buildSearchQuery,
    searchGraveyard,
    graveyardStats,
    modColor,
    formatCount,
} from '../lib/graveyard-collab-hinai.js';

const SKELETONS = 12;

const MOTES = [
    { x: 12, sz: 3, dur: 15, delay: -2, sway: 16 },
    { x: 27, sz: 2, dur: 19, delay: -7, sway: -12 },
    { x: 41, sz: 4, dur: 13, delay: -11, sway: 22 },
    { x: 58, sz: 2, dur: 21, delay: -4, sway: -18 },
    { x: 73, sz: 3, dur: 17, delay: -14, sway: 14 },
    { x: 88, sz: 2, dur: 23, delay: -9, sway: -20 },
];

export default function Graveyard() {
    const [activeMod, setActiveMod] = useState('NM');
    const [showAllMods, setShowAllMods] = useState(false);
    const [term, setTerm] = useState('');
    const [mode, setMode] = useState('all');
    const [status, setStatus] = useState('graveyard');
    const [sort, setSort] = useState('pp_desc');
    const [ppRange, setPpRange] = useState([0, PP_CAP]);
    const [memeMode, setMemeMode] = useState(false);

    const debouncedTerm = useDebounced(term, 400);
    const debouncedPp = useDebounced(ppRange, 250);
    const [ppLo, ppHi] = debouncedPp;

    const [maps, setMaps] = useState([]);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(true);
    const [paging, setPaging] = useState(false);
    const [error, setError] = useState('');
    const [retryKey, setRetryKey] = useState(0);
    const [stats, setStats] = useState(null);
    const [mirrorHealth, setMirrorHealth] = useState(null);
    const [active, setActive] = useState(null);

    const genRef = useRef(0);
    const busyRef = useRef(false);
    const pageRef = useRef(1);
    const sentinelRef = useRef(null);
    const filtersRef = useRef(null);
    const loadMoreRef = useRef(() => {});

    useEffect(() => {
        const controller = new AbortController();
        graveyardStats(controller.signal).then(setStats).catch(() => {});
        fetchMirrorHealth().then(setMirrorHealth);
        return () => controller.abort();
    }, []);

    useEffect(() => {
        filtersRef.current = {
            mod: activeMod, status, sort, mode, term: debouncedTerm,
            ppRange: [ppLo, ppHi], memeMode,
        };
    }, [activeMod, status, sort, mode, debouncedTerm, ppLo, ppHi, memeMode]);

    useEffect(() => {
        const gen = genRef.current + 1;
        genRef.current = gen;
        const controller = new AbortController();

        busyRef.current = true;
        pageRef.current = 1;
        setLoading(true);
        setError('');
        setMaps([]);
        setHasMore(false);

        const query = buildSearchQuery({
            mod: activeMod, status, sort, mode, term: debouncedTerm,
            page: 1, ppRange: [ppLo, ppHi], memeMode,
        });

        searchGraveyard(query, controller.signal)
            .then(data => {
                if (gen !== genRef.current) return;
                if (data.ready === false) {
                    setError('The graveyard collection is still building. Check back shortly.');
                    setLoading(false);
                    busyRef.current = false;
                    return;
                }
                const rows = data.maps || [];
                setMaps(rows);
                setTotal(Number(data.total || 0));
                setHasMore(rows.length >= 24 && rows.length < Number(data.total || 0));
                setLoading(false);
                busyRef.current = false;
            })
            .catch(() => {
                if (controller.signal.aborted || gen !== genRef.current) return;
                setError('Could not reach the graveyard collection. Please try again.');
                setLoading(false);
                busyRef.current = false;
            });

        return () => controller.abort();
    }, [activeMod, status, sort, mode, debouncedTerm, ppLo, ppHi, memeMode, retryKey]);

    const loadMore = useCallback(() => {
        if (busyRef.current || !filtersRef.current) return;
        const gen = genRef.current;
        const next = pageRef.current + 1;
        busyRef.current = true;
        setPaging(true);

        searchGraveyard(buildSearchQuery({ ...filtersRef.current, page: next }))
            .then(data => {
                if (gen !== genRef.current) return;
                const rows = data.maps || [];
                setMaps(prev => {
                    const merged = prev.concat(rows);
                    setHasMore(merged.length < Number(data.total || 0) && rows.length > 0);
                    return merged;
                });
                pageRef.current = next;
                setPaging(false);
                busyRef.current = false;
            })
            .catch(() => {
                if (gen !== genRef.current) return;
                setPaging(false);
                busyRef.current = false;
            });
    }, []);

    useEffect(() => { loadMoreRef.current = loadMore; }, [loadMore]);

    useEffect(() => {
        const node = sentinelRef.current;
        if (!node) return undefined;
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) loadMoreRef.current();
        }, { rootMargin: '400px' });
        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    const toggleMeme = () => {
        setMemeMode(on => {
            const next = !on;
            setPpRange(([lo, hi]) => (next
                ? [PP_CAP, PP_CAP]
                : [Math.min(lo, PP_CAP - 10), Math.min(hi, PP_CAP)]));
            return next;
        });
    };

    const lens = modColor(activeMod);

    return (
        <div className="gv-page" style={{ '--gv-lens': lens }}>
            <title>Graveyard PP Lookup | Nekoha</title>

            <GraveMist id="gv-ground" className="gv-ground" fade="up" />
            <Procession id="gv-proc-l" side="left" />
            <Procession id="gv-proc-r" side="right" phase={15} />

            <section className="gv-hero">
                <div className="gv-hero__art" />
                <div className="gv-hero__scrim" />
                <GraveMist id="gv-hero-mist" className="gv-mist--hero" />
                <Revenant id="gv-hero-rev" variant="ambient" className="gv-hero__revenant" />
                <div className="gv-hero__motes" aria-hidden="true">
                    {MOTES.map(mote => (
                        <span key={mote.x} className="gv-mote" style={{
                            '--x': `${mote.x}%`,
                            '--sz': `${mote.sz}px`,
                            '--dur': `${mote.dur}s`,
                            '--delay': `${mote.delay}s`,
                            '--sway': `${mote.sway}px`,
                        }} />
                    ))}
                </div>

                <div className="container gv-hero__inner">
                    <div className="gv-hero__copy">
                        <p className="gv-hero__eyebrow">
                            <span className="gv-hero__mark" />
                            Nekoha &#215;{' '}
                            <a className="nk-hinai-out" href={HINAI_URL} target="_blank" rel="noopener noreferrer">
                                Hinai
                            </a>{' '}
                            collab
                        </p>
                        <h1 className="gv-hero__title">Graveyard <span>PP Lookup</span></h1>
                        <p className="gv-hero__lede">
                            <b>{stats ? formatCount(stats.by_status && stats.by_status.graveyard) : '118,866'}</b> beatmapsets
                            were submitted to osu! and never ranked. Through a collaboration with{' '}
                            <a className="gv-hero__hinai" href={HINAI_URL} target="_blank" rel="noopener noreferrer">hinai</a>, an osu! data hub and beatmap parser, our
                            graveyard collection has been scored across all 36 mod combinations.
                        </p>
                        <p className="gv-hero__sublede">
                            Built for private server nominators: pick a mod lens, see what an abandoned map is
                            actually worth, and nominate it.
                        </p>
                        <a className="gv-hinai" href={HINAI_URL} target="_blank" rel="noopener noreferrer">
                            <span className="gv-hinai__halo">
                                <img src="/assets/collab-hinai/hinai-logo.png" alt="" width="34" height="34" />
                            </span>
                            <span className="gv-hinai__txt">
                                <span className="gv-hinai__main">Visit mirror.hinamizawa.ai</span>
                                <span className="gv-hinai__sub">osu! data hub and beatmap parser</span>
                            </span>
                            <span className="gv-hinai__arrow" aria-hidden="true">&#8599;</span>
                        </a>
                    </div>
                    <aside className="gv-collab">
                        <span className="gv-collab__halo" aria-hidden="true" />
                        <img src="/assets/collab-hinai/collab-hinai-nekoha.webp" alt="Hinai and Nekoha" className="gv-collab__art" />
                        <div className="gv-collab__plate">
                            <span className="gv-collab__kicker">Collaboration</span>
                            <span className="gv-collab__names">
                                <a className="nk-hinai-out" href={HINAI_URL} target="_blank" rel="noopener noreferrer">Hinai</a>
                                {' '}&#215; Nekoha
                            </span>
                        </div>
                    </aside>
                </div>
                <div className="gv-hero__tide" />
            </section>

            <div className="container py-4 px-3 mx-auto">
                {stats && stats.provenance && (
                    <div className="gv-prov">
                        <span><span className="gv-prov__k">Graveyard</span> {formatCount(stats.by_status && stats.by_status.graveyard)} sets</span>
                        <span className="gv-prov__sep" />
                        <span><span className="gv-prov__k">Difficulties</span> {formatCount(stats.beatmaps)}</span>
                        <span className="gv-prov__sep" />
                        <span><span className="gv-prov__k">PP rows</span> {formatCount(stats.pp_rows)}</span>
                        <span className="gv-prov__sep" />
                        <span><span className="gv-prov__k">Engine</span> rosu-pp {stats.provenance.rosu_pp_version || '-'}</span>
                        <span className="gv-prov__sep" />
                        <span className="gv-prov__src">
                            <span className="gv-prov__k">Source</span>
                            <NekohaSource
                                label="nekoha.moe"
                                size={13}
                                version={stats.provenance.source_version || undefined}
                            />
                            <span className="gv-prov__amp" aria-hidden="true">&amp;</span>
                            <HinaiSource size={13} version={mirrorHealth && mirrorHealth.version} />
                        </span>
                    </div>
                )}

                <div className="gv-controls card cbg-dark border-0 p-3 mb-3">
                    <div className="gv-lens mb-3">
                        <div className="small text-white mb-2">Mod lens</div>
                        <div className="d-flex flex-wrap gap-2 align-items-center">
                            {PRIMARY_MODS.map(m => {
                                const on = m === activeMod;
                                return (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`btn btn-sm ${on ? '' : 'btn-outline-secondary'}`}
                                        style={on ? { borderColor: modColor(m), color: modColor(m), background: `${modColor(m)}18` } : undefined}
                                        onClick={() => setActiveMod(m)}
                                    >
                                        {m}
                                    </button>
                                );
                            })}
                            <button type="button" className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1" onClick={() => setShowAllMods(v => !v)}>
                                More {showAllMods ? <FaChevronUp size={10} /> : <FaChevronDown size={10} />}
                            </button>
                        </div>

                        {showAllMods && (
                            <div className="gv-lens__panel mt-2">
                                {MOD_GROUPS.map(group => (
                                    <div key={group.label} className="gv-lens__group">
                                        <div className="gv-lens__grouplabel">{group.label}</div>
                                        <div className="d-flex flex-wrap gap-1">
                                            {group.mods.map(m => {
                                                const on = m === activeMod;
                                                return (
                                                    <button
                                                        key={m}
                                                        type="button"
                                                        className={`btn btn-sm ${on ? '' : 'btn-outline-secondary'}`}
                                                        style={on ? { borderColor: modColor(m), color: modColor(m), background: `${modColor(m)}18` } : undefined}
                                                        onClick={() => setActiveMod(m)}
                                                    >
                                                        {m}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="input-group gap-1 mb-3">
                        <span className="input-group-text bg-dark border-secondary rounded-0"><FaSearch size={12} /></span>
                        <input
                            type="text"
                            className="form-control bg-dark border-secondary rounded-0"
                            placeholder="Search by title, artist, or mapper..."
                            value={term}
                            onChange={e => setTerm(e.target.value)}
                            aria-label="Search graveyard beatmaps"
                        />
                        {term && (
                            <button type="button" className="btn btn-secondary rounded-0" onClick={() => setTerm('')} aria-label="Clear search">
                                <FaTimes size={12} />
                            </button>
                        )}
                    </div>

                    <div className="d-flex flex-wrap gap-3 mb-3">
                        <div>
                            <div className="small text-white mb-2">Mode</div>
                            <div className="d-flex flex-wrap gap-2">
                                {MODES.map(m => (
                                    <button key={m.key} type="button"
                                        className={`btn btn-sm ${mode === m.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setMode(m.key)}>{m.label}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="small text-white mb-2">Status</div>
                            <div className="d-flex flex-wrap gap-2">
                                {STATUSES.map(s => (
                                    <button key={s.key} type="button"
                                        className={`btn btn-sm ${status === s.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setStatus(s.key)}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <div className="small text-white mb-2">Sort</div>
                            <div className="d-flex flex-wrap gap-2">
                                {SORTS.map(s => (
                                    <button key={s.key} type="button"
                                        className={`btn btn-sm ${sort === s.key ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                        onClick={() => setSort(s.key)}>{s.label}</button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <PpRangeFilter
                        value={ppRange}
                        onChange={setPpRange}
                        max={PP_CAP}
                        step={10}
                        label="PP band"
                        presets={PP_PRESETS}
                    >
                        <button
                            type="button"
                            className={`btn btn-sm gv-meme ${memeMode ? 'is-on' : ''}`}
                            onClick={toggleMeme}
                            title="Show the broken aspire maps above the cap"
                        >
                            Memes
                        </button>
                    </PpRangeFilter>
                </div>

                <div className="d-flex justify-content-between align-items-center mb-2 small">
                    <span className="text-secondary">
                        {loading ? 'Reading the graveyard...' : (
                            <>
                                {formatCount(total)} results <em className="text-muted">under {activeMod}</em>
                            </>
                        )}
                    </span>
                    {memeMode && <span className="gv-memenote">showing maps above {formatCount(PP_CAP)}pp</span>}
                </div>

                {error && (
                    <div className="alert bg-danger d-flex justify-content-between align-items-center gap-3">
                        <span>{error}</span>
                        <button type="button" className="btn btn-sm btn-dark-c1" onClick={() => setRetryKey(k => k + 1)}>Retry</button>
                    </div>
                )}

                <div className="row g-3 mb-3">
                    {loading && Array.from({ length: SKELETONS }).map((_, i) => (
                        <div className="col-12 col-md-6 col-xl-4" key={`gv-skel-${i}`}>
                            <div className="gv-card gv-card--skeleton border-beatmapcard rounded-4 border-4 h-100" />
                        </div>
                    ))}

                    {!loading && maps.map(map => (
                        <div className="col-12 col-md-6 col-xl-4" key={`${map.beatmap_md5}-${activeMod}`}>
                            <GraveyardCard map={map} onOpen={() => setActive(map)} />
                        </div>
                    ))}
                </div>

                {!loading && !error && maps.length === 0 && (
                    <div className="gv-empty text-center py-5">
                        <Revenant id="gv-empty-rev" variant="emblem" className="gv-empty__emblem" />
                        <p className="gv-empty__verdict mb-1">Nothing is buried here.</p>
                        <p className="text-muted small mb-0">
                            No graveyard maps match these filters. Try widening the PP or star range.
                        </p>
                    </div>
                )}

                <div ref={sentinelRef} style={{ height: 1 }} />

                {paging && (
                    <div className="search-loading-bar mb-4"><div className="search-loading-bar-value" /></div>
                )}

                {!loading && !paging && !hasMore && maps.length > 0 && (
                    <p className="text-center text-secondary small mb-4">That is every match.</p>
                )}
            </div>

            {active && (
                <GraveyardModal seed={active} activeMod={activeMod} onClose={() => setActive(null)} />
            )}
        </div>
    );
}
