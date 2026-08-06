import { useId } from 'react';
import { FaBolt } from 'react-icons/fa';
import { PP_MAX, PP_STEP, PP_PRESETS } from '../lib/packs-collab-hinai.js';

/**
 * Dual-thumb PP range filter: two overlaid `<input type="range">` sliders over a shared
 * colour ramp, plus a row of one-click preset buttons and a live text readout.
 *
 * The two sliders are stacked in the same box (the track is `pointer-events: none`, only the
 * thumbs are grabbable), so `loOnTop` lifts the minimum slider's z-index from 3 to 4 once it
 * sits within one `step` of `max`: the usual dual-slider trick for keeping two thumbs pinned at
 * the ceiling separable. The maximum slider sets no z-index of its own. The `__dim` overlays
 * shade the ramp outside `[lo, hi]` rather than
 * colouring the selection, so the PP-to-colour mapping stays fixed as the range moves.
 *
 * @param {object} props - Component props.
 * @param {[number, number]} props.value - Controlled `[lo, hi]` range in PP.
 * @param {(range: [number, number]) => void} props.onChange - Receives the next `[lo, hi]` pair.
 * @param {number} [props.max=PP_MAX] - Upper bound of the track.
 * @param {number} [props.step=PP_STEP] - Slider granularity, also the "near the top" threshold.
 * @param {string} [props.label='Pack PP ceiling'] - Caption text; also seeds both `aria-label`s.
 * @param {Array<{label: string, range: [number, number]}>} [props.presets=PP_PRESETS] - Quick-pick
 *   buttons; the one matching the current range exactly renders as active.
 * @param {boolean} [props.unboundedTop=true] - When true and `hi` is at `max`, the readout gains a
 *   `+` to signal the filter is open-ended rather than capped at that number.
 * @param {React.ReactNode} [props.children] - Extra controls appended to the preset row.
 * @returns {JSX.Element} The filter block.
 */
export default function PpRangeFilter({
    value,
    onChange,
    max = PP_MAX,
    step = PP_STEP,
    label = 'Pack PP ceiling',
    presets = PP_PRESETS,
    unboundedTop = true,
    children,
}) {
    const [lo, hi] = value;
    const fieldId = useId();
    const loId = `${fieldId}-lo`;
    const hiId = `${fieldId}-hi`;

    const pctLo = (lo / max) * 100;
    const pctHi = (hi / max) * 100;
    const loOnTop = lo >= max - step;

    /**
     * Commits a new minimum, clamped to at most the current maximum so the thumbs cannot cross.
     *
     * @param {string|number} raw - Raw slider value (the DOM event gives a string).
     * @returns {void}
     */
    const setLo = raw => onChange([Math.min(Number(raw), hi), hi]);
    /**
     * Commits a new maximum, clamped to at least the current minimum so the thumbs cannot cross.
     *
     * @param {string|number} raw - Raw slider value (the DOM event gives a string).
     * @returns {void}
     */
    const setHi = raw => onChange([lo, Math.max(Number(raw), lo)]);

    const topMark = unboundedTop && hi >= max ? '+' : '';
    const readout = `${lo.toLocaleString()} to ${hi.toLocaleString()}${topMark} pp`;

    return (
        <div className="pp-filter">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <span className="pp-filter__label d-flex align-items-center gap-1">
                    <FaBolt size={11} />
                    <span>{label}</span>
                </span>
                {presets.map(preset => (
                    <button
                        key={preset.label}
                        type="button"
                        className={`btn btn-sm ${preset.range[0] === lo && preset.range[1] === hi ? 'btn-secondary' : 'btn-outline-secondary'}`}
                        onClick={() => onChange([preset.range[0], preset.range[1]])}
                    >
                        {preset.label}
                    </button>
                ))}
                {children}
            </div>

            <div className="d-flex align-items-center gap-3">
                <div className="pp-range flex-grow-1">
                    <div className="pp-range__ramp" />
                    <div className="pp-range__dim" style={{ left: 0, width: `${pctLo}%` }} />
                    <div className="pp-range__dim" style={{ left: `${pctHi}%`, right: 0 }} />
                    <input
                        id={loId}
                        className="pp-range__input"
                        style={{ zIndex: loOnTop ? 4 : 3 }}
                        type="range"
                        min="0"
                        max={max}
                        step={step}
                        value={lo}
                        aria-label={`Minimum ${label}`}
                        onChange={e => setLo(e.target.value)}
                    />
                    <input
                        id={hiId}
                        className="pp-range__input"
                        type="range"
                        min="0"
                        max={max}
                        step={step}
                        value={hi}
                        aria-label={`Maximum ${label}`}
                        onChange={e => setHi(e.target.value)}
                    />
                </div>
                <output className="pp-filter__readout" htmlFor={`${loId} ${hiId}`}>
                    {readout}
                </output>
            </div>
        </div>
    );
}
