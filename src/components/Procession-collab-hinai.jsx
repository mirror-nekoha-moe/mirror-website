import { SKULL } from "./Revenant-collab-hinai.jsx";
const CYCLE = 30;
const SKULL_K = 0.43;
const SKULL_TX = 57;
const SKULL_TY = 40;
const SOCKETS = [
  { x: SKULL_TX + 70.7 * SKULL_K, y: SKULL_TY + 92.9 * SKULL_K },
  { x: SKULL_TX + 129.3 * SKULL_K, y: SKULL_TY + 92.9 * SKULL_K }
];
const RIBS = [
  { y: 158, hw: 30, dip: 7 },
  { y: 172, hw: 36, dip: 9 },
  { y: 186, hw: 39, dip: 11 },
  { y: 200, hw: 40, dip: 12 },
  { y: 214, hw: 38, dip: 13 },
  { y: 228, hw: 34, dip: 13 },
  { y: 242, hw: 28, dip: 12 }
];
const LUMBAR = [256, 268, 280, 292];
const PELVIS = [
  { d: "M70 300 Q100 291 130 300", w: 5 },
  { d: "M70 300 C65 316 71 333 84 339", w: 6 },
  { d: "M130 300 C135 316 129 333 116 339", w: 6 },
  { d: "M84 339 L100 345 L116 339", w: 5 }
];
const HIPS = [
  { x: 78, y: 330 },
  { x: 122, y: 330 }
];
const LEGS = ["M78 332 L73 402", "M122 332 L127 402"];
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
const BURST = { x: 100, y: 200 };
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
