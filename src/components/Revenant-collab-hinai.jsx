const SKULL = [
  "M100 14 C61 14 32 44 32 84 C32 104 40 120 53 129 C60 134 64 139 65 147",
  "C66 154 68 158 72 160 L72 172 C72 178 76 182 82 182 L118 182",
  "C124 182 128 178 128 172 L128 160 C132 158 134 154 135 147",
  "C136 139 140 134 147 129 C160 120 168 104 168 84 C168 44 139 14 100 14 Z",
  "M 72.2 71.4 C 58.5 71.4 51.7 82.8 52.8 96.4 C 54 108.8 61 117.2 70.9 117.2 C 81 117.2 90.2 108.5 88.1 86.2 C 85.9 75.9 80.2 71.4 72.2 71.4 Z",
  "M 127.8 71.4 C 141.5 71.4 148.3 82.8 147.2 96.4 C 146.1 110.1 135.8 117 124.4 113.5 C 114.1 110.1 109.6 98.7 111.9 86.2 C 114.1 75.9 119.8 71.4 127.8 71.4 Z",
  "M100 116 C96 124 90 132 90 138 C90 142 94 144 100 144 C106 144 110 142 110 138 C110 132 104 124 100 116 Z",
  "M84 158 h3.2 v24 h-3.2 z",
  "M95 158 h3.2 v24 h-3.2 z",
  "M106 158 h3.2 v24 h-3.2 z",
  "M117 158 h3.2 v24 h-3.2 z"
].join(" ");
function Revenant({ id, className, variant = "ambient" }) {
  const veil = `${id}-veil`;
  const ink = `${id}-ink`;
  return <svg
    className={`gv-revenant gv-revenant--${variant} ${className ?? ""}`.trim()}
    viewBox="0 0 200 200"
    role="img"
    aria-hidden="true"
    focusable="false"
  >
      <defs>

        <linearGradient id={ink} x1="0" y1="0" x2="0" y2="1">
          <stop className="gv-revenant__crown" offset="0%" />
          <stop className="gv-revenant__cheek" offset="58%" />
          <stop className="gv-revenant__jaw" offset="100%" />
        </linearGradient>

        <filter
    id={veil}
    x="-75%"
    y="-70%"
    width="250%"
    height="240%"
    colorInterpolationFilters="sRGB"
  >

          <feGaussianBlur in="SourceGraphic" stdDeviation="1.7" result="soft" />
          <feTurbulence
    type="fractalNoise"
    baseFrequency="0.013 0.024"
    numOctaves="3"
    seed="17"
    result="churn"
  />
          <feDisplacementMap
    in="soft"
    in2="churn"
    xChannelSelector="R"
    yChannelSelector="G"
    scale="150"
  >

            <animate
    attributeName="scale"
    dur="26s"
    repeatCount="indefinite"
    calcMode="spline"
    keyTimes="0;0.10;0.36;0.46;0.72;0.86;1"
    values="150;150;24;20;145;150;150"
    keySplines="0 0 1 1;0.16 0.8 0.3 1;0.4 0 0.6 1;0.7 0 0.9 0.6;0.3 0 0.7 1;0 0 1 1"
  />
          </feDisplacementMap>

          <feGaussianBlur stdDeviation="0.7" />
        </filter>
      </defs>

      <g className="gv-revenant__live" filter={`url(#${veil})`}>
        <path d={SKULL} fillRule="evenodd" fill={`url(#${ink})`} />
        <animate
    attributeName="opacity"
    dur="26s"
    repeatCount="indefinite"
    keyTimes="0;0.08;0.30;0.46;0.66;0.84;1"
    values="0;0.26;0.82;0.88;0.40;0;0"
  />
      </g>

      <g className="gv-revenant__still">
        <path d={SKULL} fillRule="evenodd" fill={`url(#${ink})`} />
      </g>
    </svg>;
}
export {
  SKULL,
  Revenant as default
};
