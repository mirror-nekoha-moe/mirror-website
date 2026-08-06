export const HINAI_URL = 'https://mirror.hinamizawa.ai';
export const NEKOHA_URL = 'https://github.com/mirror-nekoha-moe/mirror-server/blob/master/README.MD';
export const NEKOHA_GITHUB_URL = 'https://github.com/mirror-nekoha-moe';

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

function buildStamp() {
    try {
        const d = new Date(__BUILD_DATE__);
        if (Number.isNaN(d.getTime())) return '';
        const pad = n => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    } catch {
        return '';
    }
}

const NEKOHA_FALLBACK_VERSION = (() => {
    const stamp = buildStamp();
    return stamp ? `${NEKOHA_PACKAGE_VERSION}B${stamp}` : NEKOHA_PACKAGE_VERSION;
})();

function versionSuffix(version) {
    if (!version) return null;
    const v = String(version).trim();
    if (!v) return null;
    return <span className="nk-source__v">({v.startsWith('v') ? v : `v${v}`})</span>;
}

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
