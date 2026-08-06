import { useEffect, useState } from "react";
/**
 * Media query for a viewer who has asked for less motion.
 *
 * The stylesheet already reacts to this by swapping the emblem to its still group, but CSS cannot
 * stop the SMIL clocks it hides, so the component reads the same query to drop the animated group
 * outright.
 * @type {string}
 */
const CALM_QUERY = "(prefers-reduced-motion: reduce)";
/**
 * Reads {@link CALM_QUERY} once, right now.
 *
 * Used as the component's initial state as well as its subscription handler, because the
 * unmatched value is the ANIMATED branch: settling this in an effect alone would build the SMIL
 * clocks for one frame before tearing them down again, on exactly the machine that asked for no
 * motion. The app renders client-side only (`createRoot`, never hydrated), so reading `matchMedia`
 * during the initial render is safe; the `typeof window` guard is for a non-DOM test runner.
 *
 * @returns {boolean} `true` when the viewer has asked for reduced motion.
 */
function prefersCalm() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(CALM_QUERY).matches;
}
/**
 * The single `d` attribute for the revenant skull: eight sub-paths, spelled out across eleven array
 * entries joined by spaces, since the cranium and jaw outline alone spans the first four entries.
 * The shapes are that outline, the two eye sockets, the nasal cavity, and four teeth.
 *
 * It is one path rather than several elements so that `fill-rule="evenodd"` can carve the sockets,
 * nose and tooth gaps straight out of the outline. Painting them as separate shapes would require a
 * background colour to fake the holes, which would break the moment the skull is composited over
 * the fog.
 *
 * @type {string}
 */
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
/**
 * Decorative skull that smears in and out of the graveyard fog.
 *
 * Renders {@link SKULL} twice while motion is allowed. The `.gv-revenant__live` group is pushed through a turbulence plus
 * displacement filter whose `scale` is animated 150 -> ~20 -> 150 over 26s, so the skull starts as
 * unrecognisable noise, resolves into a face, then dissolves again; a matching 26s opacity animation
 * on the same group fades it so the resolve lands while it is most visible. The `.gv-revenant__still`
 * group is the same path with no filter, kept `display: none` by CSS until
 * `prefers-reduced-motion: reduce`, where the emblem variant swaps to it and the ambient variant is
 * hidden outright.
 *
 * Under {@link CALM_QUERY} the live group and its filter are left out of the DOM entirely rather
 * than merely hidden, because a `display: none` group's SMIL clocks keep running; the still group is
 * then the only thing rendered, which is exactly what the CSS swap was already showing. The query is
 * read via {@link prefersCalm} for the very first render and then watched, so a reduced-motion
 * viewer never gets even one frame of the animated group and toggling the preference restores or
 * removes it without a reload.
 *
 * The gradient and filter ids are namespaced with `id` because SVG defs live in one document-wide
 * namespace, so two instances on the same page sharing an id would resolve to the same filter.
 *
 * @param {object} props
 * @param {string} props.id - Unique instance id, seeding the `${id}-ink` gradient and `${id}-veil` filter ids.
 * @param {string} [props.className] - Extra class appended to the root svg.
 * @param {'ambient'|'emblem'} [props.variant='ambient'] - Selects the `gv-revenant--*` modifier, which sets opacity and decides the reduced-motion behaviour.
 * @returns {JSX.Element} An `aria-hidden` svg carrying no semantic content.
 */
function Revenant({ id, className, variant = "ambient" }) {
  const [calm, setCalm] = useState(prefersCalm);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia(CALM_QUERY);
    /**
     * Copies the media query's current state into `calm`, adding or dropping the animated group.
     *
     * @returns {void}
     */
    const sync = () => setCalm(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
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

        {!calm && <filter
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
        </filter>}
      </defs>

      {!calm && <g className="gv-revenant__live" filter={`url(#${veil})`}>
        <path d={SKULL} fillRule="evenodd" fill={`url(#${ink})`} />
        <animate
    attributeName="opacity"
    dur="26s"
    repeatCount="indefinite"
    keyTimes="0;0.08;0.30;0.46;0.66;0.84;1"
    values="0;0.26;0.82;0.88;0.40;0;0"
  />
      </g>}

      <g className="gv-revenant__still">
        <path d={SKULL} fillRule="evenodd" fill={`url(#${ink})`} />
      </g>
    </svg>;
}
export {
  SKULL,
  Revenant as default
};
