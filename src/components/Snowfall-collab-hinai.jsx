/**
 * The eleven hand-tuned falling feathers, one entry per rendered feather.
 *
 * Every field is handed straight to CSS as a custom property by
 * {@link featherVars}, so each value is already written in its final CSS form:
 * `fx` horizontal position, `fs` size, `fd` fall duration, `fdl` a NEGATIVE
 * animation delay so each feather starts partway through its fall instead of
 * the whole flock dropping in unison, `fsw` sway amplitude, `fdrift` the net
 * horizontal drift over one fall, `fr` spin duration, `fr0` starting rotation,
 * and `fdir` the spin direction, the one bare number here (+1 / -1, multiplied
 * by 360deg in the spin keyframes).
 *
 * The values are deliberately non-repeating: the durations are mutually
 * un-round so the feathers do not visibly resynchronise, and `fx` is shuffled
 * out of ascending order at the tail so the flock does not read as a sweep.
 * @type {{fx: string, fs: string, fd: string, fdl: string, fsw: string, fdrift: string, fr: string, fr0: string, fdir: number}[]}
 */
const FEATHERS = [
    { fx: '6%', fs: '26px', fd: '34s', fdl: '-4s', fsw: '34px', fdrift: '5vw', fr: '26s', fr0: '-18deg', fdir: 1 },
    { fx: '17%', fs: '17px', fd: '44s', fdl: '-19s', fsw: '-26px', fdrift: '-3vw', fr: '33s', fr0: '32deg', fdir: -1 },
    { fx: '29%', fs: '30px', fd: '29s', fdl: '-11s', fsw: '42px', fdrift: '7vw', fr: '21s', fr0: '8deg', fdir: 1 },
    { fx: '41%', fs: '20px', fd: '39s', fdl: '-26s', fsw: '-31px', fdrift: '-5vw', fr: '29s', fr0: '-40deg', fdir: -1 },
    { fx: '53%', fs: '24px', fd: '36s', fdl: '-7s', fsw: '28px', fdrift: '4vw', fr: '24s', fr0: '54deg', fdir: 1 },
    { fx: '65%', fs: '15px', fd: '47s', fdl: '-33s', fsw: '-22px', fdrift: '-6vw', fr: '36s', fr0: '-12deg', fdir: -1 },
    { fx: '76%', fs: '28px', fd: '31s', fdl: '-16s', fsw: '38px', fdrift: '6vw', fr: '22s', fr0: '24deg', fdir: 1 },
    { fx: '88%', fs: '19px', fd: '41s', fdl: '-2s', fsw: '-29px', fdrift: '-4vw', fr: '31s', fr0: '-56deg', fdir: -1 },
    { fx: '95%', fs: '22px', fd: '37s', fdl: '-23s', fsw: '25px', fdrift: '3vw', fr: '27s', fr0: '40deg', fdir: 1 },
    { fx: '35%', fs: '13px', fd: '52s', fdl: '-40s', fsw: '-18px', fdrift: '-2vw', fr: '40s', fr0: '70deg', fdir: -1 },
    { fx: '58%', fs: '16px', fd: '45s', fdl: '-13s', fsw: '20px', fdrift: '5vw', fr: '34s', fr0: '-30deg', fdir: 1 },
];

/**
 * The single feather glyph, drawn as inline SVG on a 34x112 canvas.
 *
 * Three stacked paths: the opaque vane, a slightly softer sliver for the bare
 * quill below it, and a thin blue-grey rachis stroke over both to give the
 * spine some definition. Fills are hard-coded rgba rather than `currentColor`,
 * so this only reads correctly against the dark theme.
 *
 * Size and motion live entirely on the wrapping spans, so this takes no props.
 * @returns {JSX.Element} The feather artwork, marked `aria-hidden` and unfocusable.
 */
function Feather() {
    return (
        <svg viewBox="0 0 34 112" aria-hidden="true" focusable="false">
            <path
                fill="rgba(255,255,255,0.94)"
                d="M20.8 4 C23.6 10.6, 26.4 21, 27.5 32.4 C28.4 42, 27.8 54, 25.4 63.4 C23.6 70.2, 20 76, 16.2 79 C13.8 74.4, 11.8 69, 10.8 63.4 C9.6 56.6, 9.8 47.4, 10.9 38.6 C12.2 27.4, 15.4 14.6, 18.6 6 C19.2 4.6, 20 4, 20.8 4 Z"
            />
            <path
                fill="rgba(255,255,255,0.85)"
                d="M17.2 77.4 C16.8 85.4, 16.2 93.4, 15.2 101 C14.95 102.9, 13.6 102.7, 13.75 100.8 C14.5 93.4, 15 85.4, 15.6 77.4 Z"
            />
            <path
                fill="none"
                stroke="rgba(150,196,232,0.8)"
                strokeWidth="0.95"
                strokeLinecap="round"
                d="M20.6 6.4 C18.6 24, 17 48, 16.2 77"
            />
        </svg>
    );
}

/**
 * Expands one {@link FEATHERS} entry into the `--f*` custom properties its span
 * needs, ready to pass straight to a React `style` prop.
 *
 * The mapping is written out key by key because the `FEATHERS` fields are named
 * without the leading `--`, so a spread would emit `fx` / `fs` / ... as ordinary
 * style properties the browser drops on the floor; each name has to be
 * re-prefixed by hand. It also keeps the CSS contract explicit, so a field
 * renamed in `FEATHERS` without touching the stylesheet surfaces here rather
 * than silently dropping the animation.
 *
 * @param {{fx: string, fs: string, fd: string, fdl: string, fsw: string, fdrift: string, fr: string, fr0: string, fdir: number}} f - One feather descriptor.
 * @returns {Object<string, string|number>} Style object of CSS custom properties.
 */
function featherVars(f) {
    return {
        '--fx': f.fx,
        '--fs': f.fs,
        '--fd': f.fd,
        '--fdl': f.fdl,
        '--fsw': f.fsw,
        '--fdrift': f.fdrift,
        '--fr': f.fr,
        '--fr0': f.fr0,
        '--fdir': f.fdir,
    };
}

/**
 * The foreground half of the snow effect, mounted after the page content.
 *
 * `Snowfall` itself sits at `z-index: -1`, i.e. behind everything, so nothing
 * would ever pass in FRONT of the UI. This companion re-renders only the two
 * nearest sheets under `.nksnow--front` (`z-index: 5`, with the sheets dialled
 * back in opacity) to sell the depth: the same snow appears to sweep both
 * behind and over the cards.
 *
 * It carries no feathers on purpose, only the cheap gradient sheets, so the
 * overlay never obscures text with a full-size opaque glyph.
 * @returns {JSX.Element} The above-content snow layer, `aria-hidden` and pointer-transparent.
 */
export function SnowfallFront() {
    return (
        <div className="nksnow nksnow--front" aria-hidden="true">
            <div className="nksnow__sheet nksnow__sheet--near" />
            <div className="nksnow__sheet nksnow__sheet--mid" />
        </div>
    );
}

/**
 * The full-page winter backdrop, mounted once above the router.
 *
 * Layers back to front: a coloured `wash` of radial gradients, a `horizon`
 * band, three parallax snow `sheet`s (far / mid / near) and finally the
 * {@link FEATHERS} flock. It is fixed at `z-index: -1` and pointer-transparent,
 * so it never intercepts clicks and never scrolls with the page.
 *
 * Each feather is keyed on `fx + fd` rather than the array index, which is only
 * safe because no two entries share that pair; the index would do here too, but
 * this survives reordering the table.
 * @returns {JSX.Element} The behind-content snow layer, `aria-hidden`.
 */
export default function Snowfall() {
    return (
        <div className="nksnow" aria-hidden="true">
            <div className="nksnow__wash" />
            <div className="nksnow__horizon" />
            <div className="nksnow__sheet nksnow__sheet--far" />
            <div className="nksnow__sheet nksnow__sheet--mid" />
            <div className="nksnow__sheet nksnow__sheet--near" />
            {FEATHERS.map(f => (
                <span key={f.fx + f.fd} className="nksnow__feather" style={featherVars(f)}>
                    <span className="nksnow__feather-in">
                        <Feather />
                    </span>
                </span>
            ))}
        </div>
    );
}
