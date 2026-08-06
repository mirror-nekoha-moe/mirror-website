import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    EXCLUSIVE,
    MOD_TONES,
    TOGGLE_MODS,
    fetchPpAll,
    fetchPpCalc,
    modsToWire,
    orderModKeys,
    splitMods,
    starColor,
} from '../lib/hinai-collab-hinai.js';
import { formatPP, ppColor } from '../lib/graveyard-collab-hinai.js';

const ACC_PRESETS = [100, 99, 98, 95];
const DEBOUNCE_MS = 380;

/**
 * Renders a mod combination as a pill of individually tinted two-letter segments.
 *
 * `splitMods` chops the key into pairs ('HDDT' -> ['HD','DT'], 'NM' stays whole), and each
 * segment publishes its own colour through the `--seg` custom property so the stylesheet owns
 * the paint. Unknown segments fall back to a neutral grey rather than rendering untinted.
 *
 * @param {object} props
 * @param {string} props.combo - Mod key such as 'NM', 'HD' or 'HDHRDT'.
 * @returns {JSX.Element} The pill span containing one span per mod segment.
 */
function ModPill({ combo }) {
    return (
        <span className="hpp__pill">
            {splitMods(combo).map((seg, i) => (
                <span key={i} className="hpp__seg" style={{ '--seg': MOD_TONES[seg] || '#8b93a7' }}>
                    {seg}
                </span>
            ))}
        </span>
    );
}

/**
 * Two-zone performance panel for a single difficulty, backed by the hinai mirror.
 *
 * Zone one is the precomputed reference table (`fetchPpAll`) listing every mod combination at
 * SS; the highest-PP row is tagged `max` and any row can be clicked or keyboard-activated to
 * load its mods into zone two. Zone two is the what-if calculator: mod toggles plus accuracy,
 * combo and misses, re-queried through `fetchPpCalc` on a {@link DEBOUNCE_MS} debounce with an
 * AbortController so a fast slider drag cannot let an older response overwrite a newer one.
 *
 * Both zones reset whenever the difficulty or ruleset changes, because PP values and the mod
 * table are meaningless across maps.
 *
 * @param {object} props
 * @param {number|string} props.beatmapId - Difficulty id passed straight to the mirror endpoints.
 * @param {number} props.mode - osu! ruleset id (0 standard, 1 taiko, 2 catch, 3 mania).
 * @param {number} props.maxCombo - Difficulty max combo; clamps the combo input and the value
 *   sent to the calculator. Zero or absent means "unknown", in which case nothing is clamped.
 * @returns {JSX.Element} The reference table and calculator zones.
 */
export default function HinaiPpPanel({ beatmapId, mode, maxCombo }) {
    const [table, setTable] = useState(null);
    const [tableLoading, setTableLoading] = useState(true);

    const [active, setActive] = useState(() => new Set());
    const [accuracy, setAccuracy] = useState(100);
    const [combo, setCombo] = useState(0);
    const [misses, setMisses] = useState(0);
    const [calc, setCalc] = useState(null);
    const [calcLoading, setCalcLoading] = useState(false);

    const calcAbort = useRef(null);
    const debounceRef = useRef(null);

    const fieldId = useId();
    const accId = `${fieldId}-acc`;
    const comboId = `${fieldId}-combo`;
    const missId = `${fieldId}-miss`;

    const modsStr = useMemo(() => modsToWire(active), [active]);

    /**
     * Flips one mod in the active set, enforcing the mutually exclusive pairs.
     *
     * Turning a mod ON also deletes its {@link EXCLUSIVE} partner (HR/EZ, DT/HT), so an
     * impossible combination can never reach the calculator endpoint. Always builds a fresh Set
     * instead of mutating, otherwise React would not see the state change.
     *
     * @param {string} key - Two-letter mod acronym from `TOGGLE_MODS`.
     * @returns {void}
     */
    const toggle = key =>
        setActive(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
                const ex = EXCLUSIVE[key];
                if (ex) next.delete(ex);
            }
            return next;
        });

    /**
     * Replaces the whole active mod set with the mods of a clicked reference row.
     *
     * 'NM' clears everything. Otherwise the row key is split into segments and only segments the
     * button row can actually represent (`TOGGLE_MODS`) are kept, so a table key carrying a mod
     * with no toggle could never leave the user stuck with a mod they cannot switch off. Uses no
     * props or state, hence the empty dependency list.
     *
     * @param {string} key - Mod key from the reference table, e.g. 'NM', 'HD', 'HDHRDT'.
     * @returns {void}
     */
    const applyRow = useCallback(key => {
        if (key === 'NM') {
            setActive(new Set());
            return;
        }
        const next = new Set();
        for (const seg of splitMods(key)) {
            if (TOGGLE_MODS.includes(seg)) next.add(seg);
        }
        setActive(next);
    }, []);

    useEffect(() => {
        let alive = true;
        setTableLoading(true);
        setTable(null);
        setActive(new Set());
        setAccuracy(100);
        setCombo(0);
        setMisses(0);
        setCalc(null);

        fetchPpAll(beatmapId, mode).then(next => {
            if (!alive) return;
            setTable(next || {});
            setTableLoading(false);
        });

        return () => {
            alive = false;
        };
    }, [beatmapId, mode]);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        setCalcLoading(true);

        debounceRef.current = setTimeout(() => {
            if (calcAbort.current) calcAbort.current.abort();
            const ctrl = new AbortController();
            calcAbort.current = ctrl;

            const effCombo = combo > 0 && maxCombo > 0 ? Math.min(combo, maxCombo) : combo;
            fetchPpCalc(beatmapId, { mode, mods: modsStr, accuracy, misses, combo: effCombo }, ctrl.signal)
                .then(next => {
                    if (ctrl.signal.aborted) return;
                    setCalc(next);
                    setCalcLoading(false);
                })
                .catch(() => {
                    if (ctrl.signal.aborted) return;
                    setCalc(null);
                    setCalcLoading(false);
                });
        }, DEBOUNCE_MS);

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            if (calcAbort.current) calcAbort.current.abort();
        };
    }, [beatmapId, mode, modsStr, accuracy, combo, misses, maxCombo]);

    const keys = table ? orderModKeys(table) : [];
    const maxKey = useMemo(() => {
        if (!table) return null;
        let best = null;
        let bestPp = -1;
        for (const [k, v] of Object.entries(table)) {
            const pp = Number(v && v.pp);
            if (Number.isFinite(pp) && pp > bestPp) {
                bestPp = pp;
                best = k;
            }
        }
        return best;
    }, [table]);

    return (
        <div className="hpp">
            <div className="hpp__zone">
                <div className="hpp__zonehead">
                    <span className="hpp__zonetitle">PP reference</span>
                    <span className="hpp__zonehint">
                        {keys.length ? `${keys.length} mod combinations at SS, tap a row to load it` : 'every mod combination at SS'}
                    </span>
                </div>

                <div className="hpp__tablewrap">
                    {tableLoading ? (
                        <div className="hpp__skeleton">
                            {[0, 1, 2, 3, 4, 5].map(i => (
                                <span key={i} className="hpp__skelrow" />
                            ))}
                        </div>
                    ) : keys.length ? (
                        <table className="hpp__table">
                            <thead>
                                <tr>
                                    <th>Mods</th>
                                    <th className="hpp__num">PP</th>
                                    <th className="hpp__num">Stars</th>
                                    <th className="hpp__num">AR</th>
                                    <th className="hpp__num">OD</th>
                                    <th className="hpp__num">CS</th>
                                    <th className="hpp__num">HP</th>
                                    <th className="hpp__num">BPM</th>
                                    <th className="hpp__num">Combo</th>
                                </tr>
                            </thead>
                            <tbody>
                                {keys.map(key => {
                                    const row = table[key] || {};
                                    return (
                                        <tr
                                            key={key}
                                            className={key === maxKey ? 'hpp__row hpp__row--max' : 'hpp__row'}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => applyRow(key)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    applyRow(key);
                                                }
                                            }}
                                        >
                                            <td><ModPill combo={key} /></td>
                                            <td className="hpp__num hpp__ppcell" style={{ color: ppColor(row.pp) }}>
                                                {formatPP(row.pp)}
                                                {key === maxKey && <span className="hpp__maxtag">max</span>}
                                            </td>
                                            <td className="hpp__num" style={{ color: starColor(row.stars) }}>
                                                {Number.isFinite(Number(row.stars)) ? Number(row.stars).toFixed(2) : '-'}
                                            </td>
                                            <td className="hpp__num">{Number.isFinite(Number(row.ar)) ? Number(row.ar).toFixed(1) : '-'}</td>
                                            <td className="hpp__num">{Number.isFinite(Number(row.od)) ? Number(row.od).toFixed(1) : '-'}</td>
                                            <td className="hpp__num">{Number.isFinite(Number(row.cs)) ? Number(row.cs).toFixed(1) : '-'}</td>
                                            <td className="hpp__num">{Number.isFinite(Number(row.hp)) ? Number(row.hp).toFixed(1) : '-'}</td>
                                            <td className="hpp__num">{Number.isFinite(Number(row.bpm)) ? Math.round(row.bpm) : '-'}</td>
                                            <td className="hpp__num">{row.max_combo ? `${row.max_combo}x` : '-'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="hpp__empty">
                            No PP for this difficulty yet. It was queued for calculation on our mirror, check back shortly.
                        </p>
                    )}
                </div>
            </div>

            <div className="hpp__zone">
                <div className="hpp__zonehead">
                    <span className="hpp__zonetitle">Custom calculator</span>
                    <span className="hpp__zonehint">accuracy / misses / combo</span>
                </div>

                <div className="hpp__mods">
                    <button
                        type="button"
                        className={`hpp__mod ${active.size === 0 ? 'hpp__mod--on' : ''}`}
                        style={{ '--seg': MOD_TONES.NM }}
                        onClick={() => setActive(new Set())}
                        aria-pressed={active.size === 0}
                    >
                        NM
                    </button>
                    {TOGGLE_MODS.map(m => (
                        <button
                            key={m}
                            type="button"
                            className={`hpp__mod ${active.has(m) ? 'hpp__mod--on' : ''}`}
                            style={{ '--seg': MOD_TONES[m] }}
                            onClick={() => toggle(m)}
                            aria-pressed={active.has(m)}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                <div className="hpp__acc">
                    <div className="hpp__acchead">
                        <label htmlFor={accId}>Accuracy</label>
                        <span className="hpp__accval">{accuracy.toFixed(2)}%</span>
                    </div>
                    <input
                        id={accId}
                        type="range"
                        className="form-range hpp__slider"
                        min="90"
                        max="100"
                        step="0.01"
                        value={accuracy}
                        onChange={e => setAccuracy(Number(e.target.value))}
                    />
                    <div className="hpp__presets">
                        {ACC_PRESETS.map(a => (
                            <button
                                key={a}
                                type="button"
                                className={`hpp__preset ${Math.abs(accuracy - a) < 0.005 ? 'hpp__preset--on' : ''}`}
                                onClick={() => setAccuracy(a)}
                            >
                                {a === 100 ? 'SS' : `${a}%`}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="hpp__fields">
                    <div className="hpp__field">
                        <label htmlFor={comboId}>
                            Combo {maxCombo > 0 && <span className="hpp__fieldmax">/ {maxCombo}</span>}
                        </label>
                        <input
                            id={comboId}
                            type="number"
                            className="form-control form-control-sm bg-dark text-white border-secondary"
                            min="0"
                            max={maxCombo || undefined}
                            value={combo || ''}
                            placeholder="FC"
                            onChange={e => {
                                const n = Math.max(0, Math.floor(Number(e.target.value) || 0));
                                setCombo(maxCombo > 0 ? Math.min(n, maxCombo) : n);
                            }}
                        />
                    </div>
                    <div className="hpp__field">
                        <label htmlFor={missId}>Misses</label>
                        <input
                            id={missId}
                            type="number"
                            className="form-control form-control-sm bg-dark text-white border-secondary"
                            min="0"
                            value={misses || ''}
                            placeholder="0"
                            onChange={e => setMisses(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
                        />
                    </div>
                    <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary hpp__fc"
                        onClick={() => {
                            setCombo(0);
                            setMisses(0);
                        }}
                        disabled={combo === 0 && misses === 0}
                    >
                        Full combo
                    </button>
                </div>

                <div className="hpp__result">
                    <div className="hpp__resultmain">
                        <span className="hpp__resultpp" style={calc && calc.pp != null ? { color: ppColor(calc.pp) } : undefined}>
                            {calcLoading ? (
                                <span className="hpp__calcwait" aria-hidden="true" />
                            ) : calc && calc.pp != null ? (
                                <>
                                    {formatPP(calc.pp)}
                                    <small>pp</small>
                                </>
                            ) : (
                                <span className="hpp__resultdash">-</span>
                            )}
                        </span>
                        {calc && calc.fcPp != null && calc.pp != null && Math.round(calc.fcPp) !== Math.round(calc.pp) && (
                            <span className="hpp__fcchip">FC {Math.round(calc.fcPp).toLocaleString()}pp</span>
                        )}
                    </div>

                    <div className="hpp__summary">
                        <ModPill combo={modsStr === '' ? 'NM' : modsStr} />
                        <span className="hpp__dot" aria-hidden="true">&#183;</span>
                        <span>{accuracy.toFixed(2)}%</span>
                        <span className="hpp__dot" aria-hidden="true">&#183;</span>
                        <span>{combo > 0 ? `${combo}x` : 'FC'}</span>
                        {misses > 0 && (
                            <>
                                <span className="hpp__dot" aria-hidden="true">&#183;</span>
                                <span className="hpp__miss">{misses} miss</span>
                            </>
                        )}
                    </div>

                    {calc && (
                        <div className="hpp__attrs">
                            {calc.stars != null && (
                                <span className="hpp__attr" style={{ '--seg': starColor(calc.stars) }}>
                                    <span className="hpp__attrk">Stars</span>
                                    <span className="hpp__attrv">{calc.stars.toFixed(2)}</span>
                                </span>
                            )}
                            {[['AR', calc.ar], ['OD', calc.od], ['CS', calc.cs], ['HP', calc.hp]].map(([k, v]) =>
                                v != null ? (
                                    <span key={k} className="hpp__attr">
                                        <span className="hpp__attrk">{k}</span>
                                        <span className="hpp__attrv">{v.toFixed(1)}</span>
                                    </span>
                                ) : null,
                            )}
                            {calc.maxCombo != null && calc.maxCombo > 0 && (
                                <span className="hpp__attr">
                                    <span className="hpp__attrk">Max</span>
                                    <span className="hpp__attrv">{calc.maxCombo}x</span>
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
