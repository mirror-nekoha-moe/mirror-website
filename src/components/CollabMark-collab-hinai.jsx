export const HINAI_URL = 'https://mirror.hinamizawa.ai';
export const NEKOHA_URL = 'https://github.com/mirror-nekoha-moe/mirror-server/blob/master/README.MD';

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
