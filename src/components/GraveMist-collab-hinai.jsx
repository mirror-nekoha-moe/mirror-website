/**
 * Mask-gradient presets keyed by the `fade` prop.
 *
 * `band` is a vertical linear fade that holds the middle of the sheet solid and dissolves the top
 * and bottom edges; `up` is a radial fade anchored at the bottom centre, so the fog is dense at
 * ground level and thins as it climbs. The stop values are luminance for an SVG mask, not visible
 * paint: `#fff` keeps the pixel, `#000` cuts it, `#666` is a partial cut.
 */
const FADES = {
  band: {
    kind: "linear",
    stops: [
      { at: "0%", v: "#000" },
      { at: "34%", v: "#fff" },
      { at: "82%", v: "#fff" },
      { at: "100%", v: "#000" }
    ]
  },
  up: {
    kind: "radial",
    stops: [
      { at: "0%", v: "#fff" },
      { at: "55%", v: "#fff" },
      { at: "82%", v: "#666" },
      { at: "100%", v: "#000" }
    ]
  }
};
/**
 * The three stackable fog layers, ordered coarsest first, since `GraveMist` takes them from the
 * front. Each entry tunes one turbulence sheet: `freq` is the `baseFrequency` pair (x is lower than
 * y on every layer, which stretches the noise horizontally into fog banks rather than clouds),
 * `seed` decorrelates a layer from its siblings so they never line up, `blur` is the final
 * `stdDeviation`, and `cut` is subtracted from the alpha channel by the colour matrix, so a higher
 * value means sparser fog. `opacity` and `dur` set the layer weight and drift period, and `dir`
 * (+1 / -1) flips the drift direction so the layers slide past each other instead of moving as one
 * slab. The durations are mutually non-harmonic (53s / 71s / 37s) so the stack does not visibly
 * repeat.
 */
const SHEETS = [
  { freq: "0.004 0.011", seed: 3, blur: 3, cut: 0.14, opacity: 0.6, dur: "53s", dir: 1 },
  { freq: "0.009 0.020", seed: 11, blur: 1.8, cut: 0.2, opacity: 0.38, dur: "71s", dir: -1 },
  { freq: "0.021 0.036", seed: 29, blur: 1, cut: 0.3, opacity: 0.2, dur: "37s", dir: 1 }
];
/**
 * Procedural fog: a stack of animated fractal-noise sheets, each masked to a soft edge.
 *
 * Every sheet is one full-bleed rect run through its own filter chain: `feTurbulence` makes the
 * noise, `feColorMatrix` turns it into an alpha mask (all colour channels forced to white, alpha
 * taken from the average of RGB minus `cut`), `feFlood` paints the theme fog colour, `feComposite`
 * keeps only where the mask allows, and `feGaussianBlur` softens the result. A second, separate mask
 * built from {@link FADES} then dissolves the sheet's edges, so the fog never shows a rectangular
 * border. The drift is CSS (`gv-mist-drift`, fed by the `--dur` and `--dir` custom properties)
 * rather than SMIL, which is what lets the stylesheet stop it under `prefers-reduced-motion`.
 *
 * Every generated def id is namespaced with `id` plus the sheet index, because SVG defs share one
 * document-wide namespace and two mist instances on a page would otherwise resolve to each other's
 * filters.
 *
 * @param {object} props
 * @param {string} props.id - Unique instance id, seeding the filter, gradient and mask ids.
 * @param {string} [props.className] - Extra class appended to the wrapper div, used to position the fog.
 * @param {number} [props.sheets=2] - How many of the three {@link SHEETS} presets to render, taken from the front, so the default drops the finest and cheapest-to-omit layer.
 * @param {'band'|'up'} [props.fade='band'] - Which {@link FADES} preset masks the sheets. There is no fallback: an unknown key throws.
 * @returns {JSX.Element} An `aria-hidden`, pointer-events-none fog wrapper.
 */
function GraveMist({ id, className, sheets = 2, fade = "band" }) {
  return <div className={`gv-mist ${className ?? ""}`.trim()} aria-hidden="true">
      {SHEETS.slice(0, sheets).map((s, i) => {
    const fid = `${id}-sheet-${i}`;
    return <svg
      key={fid}
      className="gv-mist__sheet"
      style={{ "--dur": s.dur, "--dir": s.dir, opacity: s.opacity }}
      viewBox="0 0 600 200"
      preserveAspectRatio="none"
      focusable="false"
    >
            <defs>

              <filter
      id={fid}
      filterUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="600"
      height="200"
      colorInterpolationFilters="sRGB"
    >
                <feTurbulence
      type="fractalNoise"
      baseFrequency={s.freq}
      numOctaves="4"
      seed={s.seed}
      result="noise"
    />

                <feColorMatrix
      in="noise"
      type="matrix"
      values={`0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.33 0.33 0.33 0 ${-s.cut}`}
      result="mask"
    />

                <feFlood className="gv-mist__tint" result="tint" />
                <feComposite in="tint" in2="mask" operator="in" result="fog" />
                <feGaussianBlur in="fog" stdDeviation={s.blur} />
              </filter>

              {FADES[fade].kind === "linear" ? <linearGradient id={`${fid}-fade`} x1="0" y1="0" x2="0" y2="1">
                  {FADES[fade].stops.map((st) => <stop key={st.at} offset={st.at} stopColor={st.v} />)}
                </linearGradient> : (
      <radialGradient id={`${fid}-fade`} cx="0.5" cy="1" r="0.9">
                  {FADES[fade].stops.map((st) => <stop key={st.at} offset={st.at} stopColor={st.v} />)}
                </radialGradient>
    )}
              <mask id={`${fid}-mask`}>
                <rect x="0" y="0" width="600" height="200" fill={`url(#${fid}-fade)`} />
              </mask>
            </defs>

            <rect
      x="0"
      y="0"
      width="600"
      height="200"
      filter={`url(#${fid})`}
      mask={`url(#${fid}-mask)`}
    />
          </svg>;
  })}
    </div>;
}
export {
  GraveMist as default
};
