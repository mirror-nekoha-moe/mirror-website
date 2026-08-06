import { useEffect, useState } from 'react';
import { MODE_LABELS, formatCount } from '../lib/packs-collab-hinai.js';
import { fetchMirrorHealth } from '../lib/mirror-collab-hinai.js';
import CollabMark, { HINAI_URL, HinaiSource, NekohaSource } from './CollabMark-collab-hinai.jsx';

const BG = '/assets/collab-hinai/packs-hero-bg-collab-hinai.webp';
const PLATE = '/assets/collab-hinai/packs-hero-plate-collab-hinai.webp';
const FIGURE = '/assets/collab-hinai/packs-hero-figure-collab-hinai.webp';
const LOOP_POSTER = '/assets/collab-hinai/packs-hero-loop-poster-collab-hinai.webp';
const LOOP_GIF = '/assets/collab-hinai/packs-hero-loop-collab-hinai.gif';

/**
 * Viewport query deciding whether the animated character loop is worth downloading.
 *
 * This is the exact complement of the `.pkh__ch--loop { display: none }` rule inside the
 * `@media (max-width: 1200px)` block of `src/scss/_packs-hero-collab-hinai.scss`, and the two
 * MUST be changed together: raise the SCSS breakpoint alone and the GIF is fetched for a figure
 * that is never painted; raise this alone and the loop stays frozen on its poster at a width
 * where the layout still shows it.
 *
 * @type {string}
 */
const LOOP_MIN_WIDTH = '(min-width: 1201px)';

const FEATHERS = [
    { fx: '12%', fs: '7px', fd: '17s', fdl: '0s', fsw: '26px' },
    { fx: '31%', fs: '5px', fd: '23s', fdl: '-6s', fsw: '-20px' },
    { fx: '54%', fs: '9px', fd: '19s', fdl: '-11s', fsw: '32px' },
    { fx: '72%', fs: '6px', fd: '26s', fdl: '-3s', fsw: '-28px' },
    { fx: '88%', fs: '8px', fd: '21s', fdl: '-15s', fsw: '22px' },
];

const WATER_SPARKS = [
    { sx: '17%', sy: '52%', ss: '7px', sd: '4.2s', sdl: '0s' },
    { sx: '68%', sy: '49%', ss: '6px', sd: '5.1s', sdl: '-1.4s' },
    { sx: '31%', sy: '61%', ss: '9px', sd: '4.6s', sdl: '-2.9s' },
    { sx: '82%', sy: '58%', ss: '7px', sd: '5.6s', sdl: '-0.7s' },
    { sx: '11%', sy: '70%', ss: '10px', sd: '4.9s', sdl: '-3.6s' },
    { sx: '56%', sy: '74%', ss: '8px', sd: '5.3s', sdl: '-2.1s' },
    { sx: '89%', sy: '80%', ss: '11px', sd: '4.4s', sdl: '-4.1s' },
    { sx: '38%', sy: '88%', ss: '9px', sd: '5.8s', sdl: '-1.1s' },
];

/**
 * Renders a mirror sync timestamp as a short `D Mon YYYY` label in the viewer's local time.
 *
 * The value arrives as UNIX seconds, hence the multiply by 1000 for the `Date` constructor.
 * A missing or zero timestamp is reported as "unknown" rather than an epoch date.
 *
 * @param {?number} ts - Last sync time in seconds since the UNIX epoch.
 * @returns {string} Formatted date, or "unknown" when no timestamp was supplied.
 */
function syncLabel(ts) {
    if (!ts) return 'unknown';
    const d = new Date(ts * 1000);
    return `${d.getDate()} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}`;
}

const GLINTS = [
    { gx: '26%', gy: '19%', gs: '16px', gd: '0s' },
    { gx: '73%', gy: '31%', gs: '22px', gd: '-2.6s' },
    { gx: '46%', gy: '66%', gs: '13px', gd: '-4.1s' },
];

/**
 * Decorative hero for the packs page: layered artwork (aurora and snow washes styled purely in
 * CSS, plus feathers, sparks and glints placed through inline CSS custom properties), the
 * headline copy, a catalogue stat strip, and a provenance footer crediting both the Nekoha
 * index and the hinai mirror.
 *
 * The animated character loop is opt-in and swapped in for the poster only once the GIF has
 * finished loading, so it never paints a half-loaded frame. It is skipped entirely on narrow
 * viewports, under `prefers-reduced-motion`, and when the connection reports Save-Data, since
 * the loop is pure decoration and by far the largest asset here. Mirror health is fetched here
 * on its own rather than arriving alongside `stats`, because it feeds only optional provenance
 * detail (the rosu-pp engine chip and the hinai version tag) and must never block the strip.
 *
 * @param {Object} props - Component props.
 * @param {?Object} props.stats - Pack catalogue stats (totals, PP coverage, per-mode counts,
 *   index size, last sync); `null` while loading, which renders the skeleton strip instead.
 * @returns {JSX.Element} The hero section.
 */
export default function PacksHero({ stats }) {
    const [loopLive, setLoopLive] = useState(false);
    const [health, setHealth] = useState(null);

    useEffect(() => {
        let alive = true;
        fetchMirrorHealth().then(next => {
            if (alive) setHealth(next);
        });
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return undefined;
        const wide = window.matchMedia(LOOP_MIN_WIDTH);
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
        const saveData = navigator.connection && navigator.connection.saveData;
        if (!wide.matches || calm.matches || saveData) return undefined;

        const img = new Image();
        img.onload = () => setLoopLive(true);
        img.src = LOOP_GIF;
        return () => {
            img.onload = null;
        };
    }, []);

    const coverage = stats ? Math.round(Number(stats.pp_coverage_pct || 0)) : 0;
    const modes = stats && Array.isArray(stats.modes) ? stats.modes : [];

    return (
        <section className="pkh mb-3">
            <div className="pkh__bg" style={{ '--pkh-bg': `url('${BG}')` }} aria-hidden="true" />
            <div className="pkh__veil" aria-hidden="true" />
            <div className="pkh__aurora" aria-hidden="true" />
            <div className="pkh__snow pkh__snow--far" aria-hidden="true" />
            <div className="pkh__snow pkh__snow--mid" aria-hidden="true" />
            <div className="pkh__snow pkh__snow--near" aria-hidden="true" />
            {FEATHERS.map(f => (
                <span
                    key={f.fx}
                    className="pkh__feather"
                    aria-hidden="true"
                    style={{ '--fx': f.fx, '--fs': f.fs, '--fd': f.fd, '--fdl': f.fdl, '--fsw': f.fsw }}
                />
            ))}
            <div className="pkh__sweep" aria-hidden="true" />

            <figure className="pkh__ch pkh__ch--loop" aria-hidden="true">
                <img
                    src={loopLive ? LOOP_GIF : LOOP_POSTER}
                    className={loopLive ? 'is-live' : undefined}
                    alt=""
                    width="320"
                    height="569"
                />
                <span className="pkh__frost pkh__frost--scan" />
                <figcaption className="pkh__tag">
                    <span className={loopLive ? 'pkh__dot pkh__dot--live' : 'pkh__dot'} />
                    CH&middot;01
                </figcaption>
            </figure>

            <div className="pkh__body">
                <div className="pkh__eyebrow">
                    <CollabMark size={20} />
                </div>

                <h1 className="pkh__title">Beatmap Packs</h1>

                <p className="pkh__lede">
                    The whole osu! pack catalogue with per-difficulty PP data, pulled as one download.
                    Standard, featured artist, tournament, loved and more, across every mode. Served
                    straight from the{' '}
                    <a className="nk-hinai-out" href={HINAI_URL} target="_blank" rel="noopener noreferrer">
                        hinai mirror
                    </a>.
                </p>

                {stats ? (
                    <div className="pkh__strip">
                        <div className="pkh__figure">
                            <span className="pkh__number">{formatCount(stats.total_packs)}</span>
                            <span className="pkh__unit">curated packs</span>
                        </div>
                        <div className="pkh__proof">
                            {formatCount(stats.total_diffs)} difficulties with per-difficulty PP data
                        </div>
                        <div className="pkh__chips">
                            <span className="pkh__chip pkh__chip--beam">{coverage}% PP coverage</span>
                            <span className="pkh__chip">{formatCount(stats.total_beatmapsets)} beatmapsets</span>
                            {stats.archive_size_gb ? (
                                <span className="pkh__chip">{stats.archive_size_gb} GB archive</span>
                            ) : null}
                        </div>
                        {modes.length > 0 && (
                            <div className="pkh__modes">
                                {modes.map((entry, index) => (
                                    <span key={entry.mode} className="d-inline-flex align-items-center gap-2">
                                        {index > 0 && <span className="pkh__modes-sep" />}
                                        <span>
                                            {MODE_LABELS[entry.mode] || entry.name} <b>{formatCount(entry.count)}</b>
                                        </span>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pkh__strip">
                        <div className="pkh__skel pkh__skel--number" />
                        <div className="pkh__skel pkh__skel--line" />
                    </div>
                )}
            </div>

            <figure className="pkh__ch pkh__ch--still" aria-hidden="true">
                <img src={PLATE} alt="" width="720" height="1280" fetchPriority="high" />
                <span className="pkh__sky" />
                <span className="pkh__aura" />
                <span className="pkh__figure-glow" />
                <img className="pkh__figure-art" src={FIGURE} alt="" width="461" height="600" />
                {WATER_SPARKS.map(s => (
                    <span
                        key={s.sx + s.sy}
                        className="pkh__spark"
                        style={{ '--sx': s.sx, '--sy': s.sy, '--ss': s.ss, '--sd': s.sd, '--sdl': s.sdl }}
                    />
                ))}
                {GLINTS.map(g => (
                    <span
                        key={g.gx}
                        className="pkh__glint"
                        style={{ '--gx': g.gx, '--gy': g.gy, '--gs': g.gs, '--gd': g.gd }}
                    />
                ))}
                <span className="pkh__frost" />
                <figcaption className="pkh__tag">
                    <span className="pkh__dot pkh__dot--live" />
                    CH&middot;02
                </figcaption>
            </figure>

            {stats && (
                <div className="pkh__prov">
                    <span><span className="pkh__prov-k">PP rows</span> {formatCount(stats.pp_coverage)}</span>
                    <span className="pkh__prov-sep" />
                    <span><span className="pkh__prov-k">Index</span> {formatCount(stats.db_size_mb)} MB</span>
                    <span className="pkh__prov-sep" />
                    <span><span className="pkh__prov-k">Synced</span> {syncLabel(stats.last_sync_ts)}</span>
                    {health && health.engines && health.engines.rosu_pp && (
                        <>
                            <span className="pkh__prov-sep" />
                            <span><span className="pkh__prov-k">Engine</span> rosu-pp {health.engines.rosu_pp}</span>
                        </>
                    )}
                    <span className="pkh__prov-sep" />
                    <span className="pkh__prov-src">
                        <span className="pkh__prov-k">Source</span>
                        <NekohaSource version={stats.source_version || undefined} />
                        <span className="pkh__prov-amp" aria-hidden="true">&amp;</span>
                        <HinaiSource version={health && health.version} />
                    </span>
                </div>
            )}
        </section>
    );
}
