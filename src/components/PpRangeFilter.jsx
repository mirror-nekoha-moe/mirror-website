import { useId } from 'react';
import { FaBolt } from 'react-icons/fa';
import { PP_MAX, PP_STEP, PP_PRESETS } from '../lib/packs.js';

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

    const setLo = raw => onChange([Math.min(Number(raw), hi), hi]);
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
