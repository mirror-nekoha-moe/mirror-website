export const HINAI_URL = 'https://mirror.hinamizawa.ai';
export const NEKOHA_URL = 'https://github.com/mirror-nekoha-moe/mirror-server/blob/master/README.MD';
export const NEKOHA_GITHUB_URL = 'https://github.com/mirror-nekoha-moe';

/**
 * Inline GitHub octocat glyph, drawn as a single path that carries no `fill` attribute, so the
 * `.nk-gh` rule (`fill: currentColor`) is what paints it and it takes the link's colour.
 *
 * It is `aria-hidden` and `focusable="false"` on purpose: every caller wraps it in an already
 * labelled link, so exposing the glyph would duplicate that label and, on older Edge/IE
 * engines, put the SVG itself in the tab order.
 *
 * @param {object} props
 * @param {number} [props.size=15] - Rendered width and height in pixels.
 * @param {string} [props.className=''] - Extra class appended to the base `nk-gh` class.
 * @returns {JSX.Element} The icon SVG.
 */
export function GithubMark({ size = 15, className = '' }) {
    return (
        <svg
            className={className ? `nk-gh ${className}` : 'nk-gh'}
            viewBox="0 0 16 16"
            width={size}
            height={size}
            aria-hidden="true"
            focusable="false"
        >
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
        </svg>
    );
}

const NEKOHA_MARK = '/assets/collab-hinai/nekoha-mark-collab-hinai.webp';
const HINAI_MARK = '/assets/collab-hinai/hinai-logo.png';
const FISHY_MARK = '/assets/collab-hinai/fishy-mark-collab-hinai.webp';

const NEKOHA_PACKAGE_VERSION =
    typeof __NEKOHA_API_VERSION__ === 'string' ? __NEKOHA_API_VERSION__ : '1.3.2';

/**
 * Compacts the Vite-injected build timestamp into a UTC `YYYYMMDD` stamp.
 *
 * `__BUILD_DATE__` is a compile-time define, so it is a bare identifier at runtime: if a bundle
 * is ever built without that define the reference throws, which is why the whole body sits in a
 * try block. Any failure, thrown or merely unparsable, degrades to an empty string so callers
 * can simply fall back to the bare version.
 *
 * @returns {string} Eight-digit UTC date stamp, or '' when no usable build date exists.
 */
function buildStamp() {
    try {
        const d = new Date(__BUILD_DATE__);
        if (Number.isNaN(d.getTime())) return '';
        /**
         * Zero-pads a month or day to the two digits the stamp format requires.
         *
         * @param {number} n - Value to pad.
         * @returns {string} Two-character (or longer) numeric string.
         */
        const pad = n => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    } catch {
        return '';
    }
}

/**
 * Version label shown when a caller has no live version from the nekoha API.
 *
 * Computed once at module load: the packaged API version with a `B<YYYYMMDD>` build suffix when
 * a build date is available (e.g. `1.3.2B20260806`), otherwise the bare version. The suffix is
 * what distinguishes two deploys of the same API version.
 *
 * @type {string}
 */
const NEKOHA_FALLBACK_VERSION = (() => {
    const stamp = buildStamp();
    return stamp ? `${NEKOHA_PACKAGE_VERSION}B${stamp}` : NEKOHA_PACKAGE_VERSION;
})();

/**
 * Renders the parenthesised version tag that trails a source link.
 *
 * Normalises the leading `v` so callers may pass either `1.3.2` or `v1.3.2` and still get one
 * `v`. Returns null (rendering nothing) for null, undefined, empty or whitespace-only input,
 * which is the common case when an upstream health check has not answered yet.
 *
 * @param {string|number|null|undefined} version - Raw version from an API response.
 * @returns {JSX.Element|null} The `(vX.Y.Z)` span, or null when there is nothing to show.
 */
function versionSuffix(version) {
    if (!version) return null;
    const v = String(version).trim();
    if (!v) return null;
    return <span className="nk-source__v">({v.startsWith('v') ? v : `v${v}`})</span>;
}

/**
 * Attribution link crediting the hinai mirror as the source of the surrounding data.
 *
 * The mark size is published as `--nkmark-size` because the shared `.nkmark__img` rule reads its
 * width and height from that variable; the matching `width`/`height` attributes on the img are
 * only the pre-CSS fallback. `version` has no default here (unlike {@link NekohaSource}): the
 * hinai version is only known from a live health check, so the tag stays hidden until one
 * answers.
 *
 * @param {object} props
 * @param {string} [props.label='mirror.hinamizawa.ai'] - Visible link text.
 * @param {number} [props.size=14] - Mark size in pixels, also used for the CSS variable.
 * @param {string} [props.version] - Version to append as `(vX.Y.Z)`; omitted renders no tag.
 * @returns {JSX.Element} The attribution anchor.
 */
export function HinaiSource({ label = 'mirror.hinamizawa.ai', size = 14, version }) {
    return (
        <a
            className="nk-source nk-hinai-out"
            href={HINAI_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ '--nkmark-size': `${size}px` }}
        >
            <img className="nkmark__img" src={HINAI_MARK} alt="" width={size} height={size} />
            {label}
            {versionSuffix(version)}
        </a>
    );
}

/**
 * Attribution link crediting the nekoha mirror, twinned with {@link HinaiSource}.
 *
 * The href deliberately points at the mirror-server README on GitHub rather than at
 * mirror.nekoha.moe itself, since the useful destination for someone reading an attribution is
 * the API documentation. Falls back to the build-stamped package version when `version` is
 * omitted or `undefined`, so this side normally always carries a tag. A default parameter only
 * fires on `undefined`, so a caller passing an explicit `null` or `''` bypasses the fallback and
 * renders no tag, which is why callers coerce with `|| undefined`.
 *
 * @param {object} props
 * @param {string} [props.label='mirror.nekoha.moe'] - Visible link text.
 * @param {number} [props.size=14] - Mark size in pixels, also used for the CSS variable.
 * @param {string} [props.version=NEKOHA_FALLBACK_VERSION] - Version to append as `(vX.Y.Z)`.
 * @returns {JSX.Element} The attribution anchor.
 */
export function NekohaSource({ label = 'mirror.nekoha.moe', size = 14, version = NEKOHA_FALLBACK_VERSION }) {
    return (
        <a
            className="nk-source nk-hinai-out"
            href={NEKOHA_URL}
            target="_blank"
            rel="noopener noreferrer"
            title="mirror-server API docs on GitHub"
            style={{ '--nkmark-size': `${size}px` }}
        >
            <img className="nkmark__img" src={NEKOHA_MARK} alt="" width={size} height={size} />
            {label}
            {versionSuffix(version)}
        </a>
    );
}

/**
 * The "nekoha x hinai" co-branding lockup: two linked marks joined by a multiplication sign.
 *
 * Both names link out (nekoha to the mirror-server API docs, hinai to the mirror), while the
 * separators are `aria-hidden` so a screen reader hears two link names and not stray glyphs.
 * With `egg` set, a third fishy mark and separator are spliced between them, making the lockup
 * read "nekoha x fishy x hinai": a deliberate easter egg, not a layout option.
 *
 * @param {object} props
 * @param {number} [props.size=18] - Mark size in pixels, published as `--nkmark-size`.
 * @param {string} [props.className=''] - Extra class appended to the base `nkmark` class.
 * @param {boolean} [props.egg=false] - Splice the fishy mark into the middle of the lockup.
 * @returns {JSX.Element} The lockup span.
 */
export default function CollabMark({ size = 18, className = '', egg = false }) {
    return (
        <span
            className={className ? `nkmark ${className}` : 'nkmark'}
            style={{ '--nkmark-size': `${size}px` }}
        >
            <a
                className="nkmark__link"
                href={NEKOHA_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="mirror-server API docs on GitHub"
            >
                <img className="nkmark__img" src={NEKOHA_MARK} alt="" width={size} height={size} />
                <span className="nkmark__name">nekoha</span>
            </a>
            <span className="nkmark__x" aria-hidden="true">&#215;</span>
            {egg && (
                <>
                    <img
                        className="nkmark__img nkmark__egg"
                        src={FISHY_MARK}
                        alt=""
                        width={size}
                        height={size}
                        aria-hidden="true"
                    />
                    <span className="nkmark__x" aria-hidden="true">&#215;</span>
                </>
            )}
            <a
                className="nkmark__link"
                href={HINAI_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="mirror.hinamizawa.ai"
            >
                <img className="nkmark__img" src={HINAI_MARK} alt="" width={size} height={size} />
                <span className="nkmark__name">hinai</span>
            </a>
        </span>
    );
}
