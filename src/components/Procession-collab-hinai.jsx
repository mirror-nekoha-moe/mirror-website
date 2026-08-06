import { SKULL } from "./Revenant-collab-hinai.jsx";
/**
 * Master period, in seconds, of the whole rise-and-scatter performance.
 *
 * Every SMIL `<animate>` / `<animateTransform>` in this file uses this as its
 * `dur`, which is what keeps the lift, the bone fade-in, the eye glow and the
 * dust burst phase-locked to one another: their `keyTimes` are fractions of
 * this single number, so retiming the sequence means editing only this value.
 * @type {number}
 */
const CYCLE = 30;
/**
 * Uniform scale applied to the imported {@link SKULL} path.
 *
 * `SKULL` is authored against Revenant's 200x200 viewBox, while this wraith is
 * drawn on a much taller `0 -150 200 650` canvas whose skeleton runs from the
 * crown down to the foot of the legs at y=402. Shrinking the skull to 0.43 is
 * what lands it on the spine, which starts at y=119.
 * @type {number}
 */
const SKULL_K = 0.43;
/**
 * X translation, in wraith user units, applied to the scaled skull path.
 * @type {number}
 */
const SKULL_TX = 57;
/**
 * Y translation, in wraith user units, applied to the scaled skull path.
 * @type {number}
 */
const SKULL_TY = 40;
/**
 * Centres of the two ember eye glows, in wraith user units.
 *
 * The raw numbers (70.7 / 129.3, 92.9) are the socket centres in the skull's
 * OWN coordinate space, pushed through the exact same `translate` + `scale`
 * the skull path gets. Deriving them instead of hard-coding is deliberate:
 * retuning `SKULL_K`/`SKULL_TX`/`SKULL_TY` moves the glows with the sockets
 * instead of leaving them floating off the face.
 * @type {{x: number, y: number}[]}
 */
const SOCKETS = [
  { x: SKULL_TX + 70.7 * SKULL_K, y: SKULL_TY + 92.9 * SKULL_K },
  { x: SKULL_TX + 129.3 * SKULL_K, y: SKULL_TY + 92.9 * SKULL_K }
];
/**
 * The rib cage, top rib first.
 *
 * Each entry is rendered as one quadratic arc centred on the x=100 spine:
 * `y` is the baseline the rib springs from, `hw` its half-width (so the arc
 * runs from `100 - hw` to `100 + hw`), and `dip` how far below `y` the control
 * point sits, which is what gives the rib its downward sag.
 * @type {{y: number, hw: number, dip: number}[]}
 */
const RIBS = [
  { y: 158, hw: 30, dip: 7 },
  { y: 172, hw: 36, dip: 9 },
  { y: 186, hw: 39, dip: 11 },
  { y: 200, hw: 40, dip: 12 },
  { y: 214, hw: 38, dip: 13 },
  { y: 228, hw: 34, dip: 13 },
  { y: 242, hw: 28, dip: 12 }
];
/**
 * Y positions of the four lumbar vertebrae, drawn as filled dots on the x=100 spine.
 * @type {number[]}
 */
const LUMBAR = [256, 268, 280, 292];
/**
 * The four strokes that make up the pelvic cradle.
 *
 * `d` is the SVG path data and `w` the stroke width (5 for the top span and the
 * bottom V, 6 for the two curved wings); the entries are also keyed by `d` when
 * rendered, so no two paths here may be identical.
 * @type {{d: string, w: number}[]}
 */
const PELVIS = [
  { d: "M70 300 Q100 291 130 300", w: 5 },
  { d: "M70 300 C65 316 71 333 84 339", w: 6 },
  { d: "M130 300 C135 316 129 333 116 339", w: 6 },
  { d: "M84 339 L100 345 L116 339", w: 5 }
];
/**
 * Centres of the two hip joint balls, drawn as filled circles where the legs meet the pelvis.
 * @type {{x: number, y: number}[]}
 */
const HIPS = [
  { x: 78, y: 330 },
  { x: 122, y: 330 }
];
/**
 * The two leg strokes, hanging from the hip joints and splaying slightly outward.
 * @type {string[]}
 */
const LEGS = ["M78 332 L73 402", "M122 332 L127 402"];
/**
 * The two silhouettes a procession column can wear, selected by `side`.
 *
 * `riser` (left) throws its arms overhead and tips the skull back; `mourner`
 * (right) lets them hang and bows the skull forward. Only the head tilt, the
 * arms and the hands differ; the skull, spine, ribs, pelvis and legs are all
 * module-level constants shared by both, so the two gutters read as one crowd
 * rather than a mirrored pair.
 *
 * `tilt` is degrees of skull rotation about (100, 121), `arms` the two arm
 * strokes, and `hands` the finger splays whose start points must coincide with
 * the matching arm's endpoint.
 * @type {Object<string, {tilt: number, arms: string[], hands: string[]}>}
 */
const POSES = {
  riser: {

    tilt: -7,
    arms: ["M66 150 L38 116 L28 64", "M134 150 L162 116 L172 64"],
    hands: [
      "M28 64 L18 44 M28 64 L26 40 M28 64 L36 44",
      "M172 64 L182 44 M172 64 L174 40 M172 64 L164 44"
    ]
  },
  mourner: {

    tilt: 10,
    arms: ["M66 152 L54 216 L62 272", "M134 152 L146 216 L138 272"],
    hands: [
      "M62 272 L56 288 M62 272 L62 290 M62 272 L68 287",
      "M138 272 L144 288 M138 272 L138 290 M138 272 L132 287"
    ]
  }
};
/**
 * Origin the ash burst expands away from, roughly the wraith's sternum.
 *
 * SVG `scale()` always grows about the user-space origin, so the burst group
 * is wrapped in `translate(BURST)` / `translate(-BURST)` around the scaling
 * `<g>` to move the centre of expansion onto the chest.
 * @type {{x: number, y: number}}
 */
const BURST = { x: 100, y: 200 };
/**
 * Seed positions and radii of the ash flakes thrown off when the wraith comes apart.
 *
 * They are scattered from skull height down past the rib cage rather than ringed
 * around `BURST`, so the scale-up reads as a skeleton coming apart instead of a
 * symmetric explosion. The rendered radius is `r * 1.7`, not `r`.
 * @type {{x: number, y: number, r: number}[]}
 */
const DUST = [
  { x: 100, y: 200, r: 3.2 },
  { x: 72, y: 158, r: 2.6 },
  { x: 128, y: 166, r: 2 },
  { x: 96, y: 138, r: 3 },
  { x: 58, y: 196, r: 2.2 },
  { x: 142, y: 202, r: 2.8 },
  { x: 88, y: 232, r: 2.4 },
  { x: 116, y: 244, r: 1.8 },
  { x: 66, y: 246, r: 2 },
  { x: 136, y: 128, r: 1.6 },
  { x: 104, y: 268, r: 2.6 },
  { x: 46, y: 168, r: 1.8 },
  { x: 154, y: 174, r: 2.2 },
  { x: 82, y: 108, r: 2 },
  { x: 120, y: 96, r: 1.5 },
  { x: 74, y: 286, r: 1.9 }
];
/**
 * The slow motes that drift up the gutter continuously, independent of the wraith cycle.
 *
 * These are plain DOM spans animated by CSS (`gv-proc-updraft`), not SMIL. The
 * five numeric fields are forwarded as custom properties: `x` the column
 * position in percent, `sz` the diameter in px, `dur` the rise duration in
 * seconds, `delay` how many seconds to rewind the animation by so the field
 * starts already in motion rather than all launching together, and `sway` the
 * horizontal px drift accumulated over one rise. The optional `tide` flag is
 * not a custom property but a modifier class, swapping the mote's gradient to
 * the pale `--gv-tide` green so a few specks pick up the water colour.
 * @type {{x: number, sz: number, dur: number, delay: number, sway: number, tide?: boolean}[]}
 */
const ASH = [
  { x: 18, sz: 2, dur: 19, delay: 0, sway: 14 },
  { x: 34, sz: 1.4, dur: 26, delay: 7, sway: -10 },
  { x: 47, sz: 2.6, dur: 15, delay: 3, sway: 18, tide: true },
  { x: 58, sz: 1.6, dur: 23, delay: 11, sway: -16 },
  { x: 68, sz: 2.2, dur: 17, delay: 5, sway: 9 },
  { x: 76, sz: 1.3, dur: 29, delay: 14, sway: -12 },
  { x: 86, sz: 2.4, dur: 21, delay: 2, sway: 15 },
  { x: 27, sz: 1.8, dur: 24, delay: 9, sway: -8, tide: true },
  { x: 92, sz: 1.5, dur: 18, delay: 16, sway: 11 }
];
/**
 * One ambient gutter column for the graveyard page: drifting fog, rising ash,
 * and a skeletal wraith that lifts out of the floor, opens its eyes, then
 * scatters into flakes on a loop.
 *
 * The whole thing is decorative and inert: the wrapper is `aria-hidden` and the
 * stylesheet pins it into the empty margin beside the 1400px content column,
 * hiding it entirely below 1680px, under `prefers-reduced-motion`, and in print.
 *
 * Two instances mount at once, which drives most of the parameters. Every SVG
 * `<defs>` id is namespaced with `id` because filter/gradient/mask ids are
 * document-global and the second column would otherwise silently reuse the
 * first's filters. `side` picks the pose, flips the fog fade so the bank is
 * densest at the outer screen edge, and swaps the `feTurbulence` seeds so the
 * two fog fields are visibly different noise rather than the same cloud twice.
 *
 * @param {string} id - Unique prefix for this instance's SVG def ids; must differ per mounted column.
 * @param {"left"|"right"} side - Which gutter this column occupies; also selects `POSES.riser` vs `POSES.mourner`.
 * @param {number} [phase=0] - Seconds to offset the loop by. Applied as a negative SMIL `begin`, so the animation starts already this far in rather than waiting, letting the second column run out of step with the first.
 * @returns {JSX.Element} The fixed-position decorative column.
 */
function Procession({ id, side, phase = 0 }) {
  const pose = side === "left" ? POSES.riser : POSES.mourner;
  const veil = `${id}-veil`;
  const ink = `${id}-ink`;
  const fogFilter = `${id}-fog`;
  const fogFade = `${id}-fog-fade`;
  const fogMask = `${id}-fog-mask`;
  const ember = `${id}-ember`;
  const flake = `${id}-flake`;
  const begin = `${-phase}s`;
  const bankX1 = side === "left" ? "0" : "1";
  const bankX2 = side === "left" ? "0.6" : "0.4";
  return <div className={`gv-proc gv-proc--${side}`} aria-hidden="true">

      <svg
    className="gv-proc__fog"
    viewBox="0 0 200 1000"
    preserveAspectRatio="none"
    focusable="false"
  >
        <defs>
          <filter
    id={fogFilter}
    filterUnits="userSpaceOnUse"
    x="0"
    y="0"
    width="200"
    height="1000"
    colorInterpolationFilters="sRGB"
  >
            <feTurbulence
    type="fractalNoise"
    baseFrequency="0.031 0.005"
    numOctaves="4"
    seed={side === "left" ? 7 : 41}
    result="noise"
  />

            <feColorMatrix
    in="noise"
    type="matrix"
    values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.33 0.33 0.33 0 -0.25"
    result="mask"
  />
            <feFlood className="gv-proc__tint" result="tint" />
            <feComposite in="tint" in2="mask" operator="in" result="fog" />
            <feGaussianBlur in="fog" stdDeviation="1.8" />
          </filter>

          <linearGradient id={fogFade} x1={bankX1} y1="1" x2={bankX2} y2="0">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="38%" stopColor="#d8d8d8" />
            <stop offset="72%" stopColor="#4a4a4a" />
            <stop offset="100%" stopColor="#000000" />
          </linearGradient>
          <mask id={fogMask}>
            <rect x="0" y="0" width="200" height="1000" fill={`url(#${fogFade})`} />
          </mask>
        </defs>
        <rect
    x="0"
    y="0"
    width="200"
    height="1000"
    filter={`url(#${fogFilter})`}
    mask={`url(#${fogMask})`}
  />
      </svg>

      <div className="gv-proc__ash">
        {ASH.map((a, i) => <span
    key={i}
    className={`gv-proc__mote${a.tide ? " gv-proc__mote--tide" : ""}`}
    style={{
      "--ax": `${a.x}%`,
      "--asz": `${a.sz}px`,
      "--adur": `${a.dur}s`,
      "--adelay": `-${a.delay}s`,
      "--asway": `${a.sway}px`
    }}
  />)}
      </div>

      <svg
    className="gv-proc__wraith"
    viewBox="0 -150 200 650"
    preserveAspectRatio="xMidYMax meet"
    focusable="false"
  >
        <defs>

          <linearGradient
    id={ink}
    gradientUnits="userSpaceOnUse"
    x1="0"
    y1="30"
    x2="0"
    y2="420"
  >
            <stop className="gv-proc__crown" offset="0%" />
            <stop className="gv-proc__bone" offset="40%" />
            <stop className="gv-proc__silt" offset="74%" />
            <stop className="gv-proc__gone" offset="100%" />
          </linearGradient>

          <radialGradient id={ember}>
            <stop className="gv-proc__ember-hot" offset="0%" />
            <stop className="gv-proc__ember-mid" offset="45%" />
            <stop className="gv-proc__ember-out" offset="100%" />
          </radialGradient>

          <radialGradient id={flake}>
            <stop className="gv-proc__flake-core" offset="0%" />
            <stop className="gv-proc__flake-edge" offset="100%" />
          </radialGradient>

          <filter
    id={veil}
    x="-60%"
    y="-30%"
    width="220%"
    height="160%"
    colorInterpolationFilters="sRGB"
  >

            <feGaussianBlur in="SourceGraphic" stdDeviation="2.7" result="soft" />
            <feTurbulence
    type="fractalNoise"
    baseFrequency="0.012 0.021"
    numOctaves="3"
    seed={side === "left" ? 23 : 61}
    result="churn"
  />
            <feDisplacementMap
    in="soft"
    in2="churn"
    xChannelSelector="R"
    yChannelSelector="G"
    scale="175"
  >

              <animate
    attributeName="scale"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    calcMode="spline"
    keyTimes="0;0.26;0.42;0.50;0.60;0.66;0.80;1"
    values="175;175;52;36;32;200;178;175"
    keySplines="0 0 1 1;0.16 0.75 0.3 1;0.3 0 0.4 1;0.4 0 0.6 1;0.75 0 0.95 0.5;0.2 0 0.7 1;0 0 1 1"
  />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="0.8" />
          </filter>
        </defs>

        <g className="gv-proc__lift">
          <animateTransform
    attributeName="transform"
    type="translate"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    calcMode="spline"
    keyTimes="0;0.26;0.50;0.60;0.72;0.86;1"
    values="0 108;0 96;0 8;0 0;0 -26;0 -74;0 -80"
    keySplines="0 0 1 1;0.2 0.7 0.35 1;0.4 0 0.6 1;0.2 0 0.8 1;0.3 0 0.7 1;0 0 1 1"
  />

          <g className="gv-proc__bones" filter={`url(#${veil})`}>
            <animate
    attributeName="opacity"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    keyTimes="0;0.24;0.34;0.48;0.60;0.68;0.80;1"
    values="0;0;0.38;0.76;0.8;0.5;0;0"
  />

            <g
    fill="none"
    stroke={`url(#${ink})`}
    strokeLinecap="round"
    strokeLinejoin="round"
  >

              <path
    d={SKULL}
    fillRule="evenodd"
    fill={`url(#${ink})`}
    stroke="none"
    transform={`rotate(${pose.tilt} 100 121) translate(${SKULL_TX} ${SKULL_TY}) scale(${SKULL_K})`}
  />

              <path d="M100 119 L100 142" strokeWidth="7" />
              <path d="M64 148 Q100 138 136 148" strokeWidth="5" />

              {RIBS.map((r) => <path
    key={r.y}
    d={`M${100 - r.hw} ${r.y} Q100 ${r.y + r.dip} ${100 + r.hw} ${r.y}`}
    strokeWidth="5"
  />)}

              <path d="M100 146 L100 250" strokeWidth="6" />
              {LUMBAR.map((y) => <circle key={y} cx="100" cy={y} r="4" fill={`url(#${ink})`} stroke="none" />)}

              {PELVIS.map((p) => <path key={p.d} d={p.d} strokeWidth={p.w} />)}

              {pose.arms.map((d) => <path key={d} d={d} strokeWidth="6.5" />)}
              {pose.hands.map((d) => <path key={d} d={d} strokeWidth="3" />)}
              {HIPS.map((h) => <circle key={h.x} cx={h.x} cy={h.y} r="5" fill={`url(#${ink})`} stroke="none" />)}
              {LEGS.map((d) => <path key={d} d={d} strokeWidth="8" />)}
            </g>
          </g>

          <g className="gv-proc__gaze" transform={`rotate(${pose.tilt} 100 121)`}>
            <animate
    attributeName="opacity"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    keyTimes="0;0.44;0.50;0.58;0.62;1"
    values="0;0;0.9;0.85;0;0"
  />
            {SOCKETS.map((s) => <circle key={s.x} cx={s.x} cy={s.y} r="6" fill={`url(#${ember})`} />)}
          </g>
        </g>

        <g className="gv-proc__dust">
          <animateTransform
    attributeName="transform"
    type="translate"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    calcMode="spline"
    keyTimes="0;0.60;0.90;1"
    values="0 20;0 20;0 -120;0 -120"
    keySplines="0 0 1 1;0.15 0.55 0.3 1;0 0 1 1"
  />
          <g transform={`translate(${BURST.x} ${BURST.y})`}>
            <g>
              <animateTransform
    attributeName="transform"
    type="scale"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    calcMode="spline"
    keyTimes="0;0.60;0.86;1"
    values="0.3;0.3;1.95;1.95"
    keySplines="0 0 1 1;0.1 0.6 0.3 1;0 0 1 1"
  />
              <g transform={`translate(${-BURST.x} ${-BURST.y})`}>
                <g className="gv-proc__flakes">
                  <animate
    attributeName="opacity"
    begin={begin}
    dur={`${CYCLE}s`}
    repeatCount="indefinite"
    keyTimes="0;0.58;0.63;0.74;0.90;1"
    values="0;0;0.75;0.5;0;0"
  />
                  {DUST.map((d, i) => (
    <circle key={i} cx={d.x} cy={d.y} r={d.r * 1.7} fill={`url(#${flake})`} />
  ))}
                </g>
              </g>
            </g>
          </g>
        </g>
      </svg>
    </div>;
}
export {
  Procession as default
};
