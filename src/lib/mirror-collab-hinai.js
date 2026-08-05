export const MIRROR = 'https://mirror.hinamizawa.ai';
export const ESTATE = 'https://hinamizawa.ai';

export const proxyImage = url => `${MIRROR}/v3/osu/beatmaps/proxy-image?url=${encodeURIComponent(url)}`;
export const beatmapCoverUrl = (setId, size) => `https://assets.ppy.sh/beatmaps/${setId}/covers/${size}.jpg`;
export const cover = (setId, size) => proxyImage(beatmapCoverUrl(setId, size));
export const mapperUrl = name => `${ESTATE}/osu/mappers/${encodeURIComponent(name || '')}`;
export const setDownloadUrl = id => `${MIRROR}/api/v1/hinai/d/${id}`;

const avatarCache = new Map();
const avatarInFlight = new Map();

export function peekMapperAvatar(name) {
    return avatarCache.has(name) ? avatarCache.get(name) : undefined;
}

export function fetchMapperAvatar(name) {
    if (!name) return Promise.resolve(null);
    if (avatarCache.has(name)) return Promise.resolve(avatarCache.get(name));

    const pending = avatarInFlight.get(name);
    if (pending) return pending;

    const request = fetch(`${MIRROR}/v3/osu/player/${encodeURIComponent(name)}/`, {
        headers: { accept: 'application/json' },
    })
        .then(res => (res.ok ? res.json() : null))
        .then(payload => {
            const user = payload && (payload.user || payload);
            const avatar = user && user.avatar_url ? user.avatar_url : null;
            avatarCache.set(name, avatar);
            avatarInFlight.delete(name);
            return avatar;
        })
        .catch(() => {
            avatarCache.set(name, null);
            avatarInFlight.delete(name);
            return null;
        });

    avatarInFlight.set(name, request);
    return request;
}
