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
const SHEETS = [
  { freq: "0.004 0.011", seed: 3, blur: 3, cut: 0.14, opacity: 0.6, dur: "53s", dir: 1 },
  { freq: "0.009 0.020", seed: 11, blur: 1.8, cut: 0.2, opacity: 0.38, dur: "71s", dir: -1 },
  { freq: "0.021 0.036", seed: 29, blur: 1, cut: 0.3, opacity: 0.2, dur: "37s", dir: 1 }
];
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
