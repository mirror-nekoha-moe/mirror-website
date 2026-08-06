export const MIRROR = 'https://mirror.hinamizawa.ai';
export const ESTATE = 'https://hinamizawa.ai';

/**
 * Rewrites an arbitrary image URL to go through the mirror's image proxy.
 *
 * Two reasons this exists rather than pointing `<img>` straight at the osu! CDN: the proxy
 * answers with permissive CORS headers (so the bytes are usable from canvas/JS), and the
 * visitor's browser never contacts ppy.sh, so no referer or IP is handed to them on page view.
 *
 * @param {string} url - Absolute source image URL to proxy.
 * @returns {string} Mirror proxy URL with the source passed as an encoded `url` query param.
 */
export const proxyImage = url => `${MIRROR}/v3/osu/beatmaps/proxy-image?url=${encodeURIComponent(url)}`;
/**
 * Builds the raw osu! CDN cover URL for a beatmapset.
 *
 * This is the *unproxied* address and is meant as the input to {@link proxyImage} (see
 * {@link cover}), not as an `<img src>` on its own.
 *
 * @param {number|string} setId - Beatmapset id.
 * @param {string} size - osu! cover size variant, e.g. `cover`, `cover@2x`, `card`, `list@2x`.
 * @returns {string} `assets.ppy.sh` cover URL for that set and size.
 */
export const beatmapCoverUrl = (setId, size) => `https://assets.ppy.sh/beatmaps/${setId}/covers/${size}.jpg`;
/**
 * Proxied beatmapset cover URL: the one every component should actually render.
 *
 * @param {number|string} setId - Beatmapset id.
 * @param {string} size - osu! cover size variant, e.g. `cover`, `card`, `list@2x`.
 * @returns {string} Mirror-proxied URL for that set's cover art.
 */
export const cover = (setId, size) => proxyImage(beatmapCoverUrl(setId, size));
/**
 * Link to a mapper's page on the Hinamizawa estate site.
 *
 * Deliberately points at our own mapper page rather than `osu.ppy.sh/users/...` so outbound
 * clicks do not leak visitors to the official site. A missing name degrades to the bare
 * mapper route instead of interpolating `undefined`.
 *
 * @param {string} [name] - Mapper username; falsy values collapse to an empty path segment.
 * @returns {string} Absolute estate URL for the mapper.
 */
export const mapperUrl = name => `${ESTATE}/osu/mappers/${encodeURIComponent(name || '')}`;
/**
 * Download URL for a single beatmapset `.osz` through the mirror's CheeseGull-compatible route.
 *
 * @param {number|string} id - Beatmapset id.
 * @returns {string} Mirror download URL suitable for navigation (see `triggerDownload`).
 */
export const setDownloadUrl = id => `${MIRROR}/api/v1/hinai/d/${id}`;

let healthCache = null;
let healthInFlight = null;

/**
 * Fetches `/health` from the mirror once per page load and memoises the result.
 *
 * Three-state on purpose. A payload is only cached when it carries a `service` field, so a
 * shaped-but-wrong body (an error page, an HTML interstitial) resolves to `null` and is NOT
 * cached, letting a later caller retry. Network/JSON failures likewise resolve `null` instead
 * of rejecting, because every caller renders this as an optional status badge and must never
 * be able to break the page. Concurrent callers share the single in-flight promise.
 *
 * @returns {Promise<object|null>} The health payload, or `null` if unavailable/unrecognised.
 */
export function fetchMirrorHealth() {
    if (healthCache) return Promise.resolve(healthCache);
    if (healthInFlight) return healthInFlight;

    healthInFlight = fetch(`${MIRROR}/health`, { headers: { accept: 'application/json' } })
        .then(res => res.json())
        .then(payload => {
            healthCache = payload && payload.service ? payload : null;
            healthInFlight = null;
            return healthCache;
        })
        .catch(() => {
            healthInFlight = null;
            return null;
        });

    return healthInFlight;
}

const avatarCache = new Map();
const avatarInFlight = new Map();

/**
 * Synchronous, non-fetching read of the mapper-avatar cache.
 *
 * The `undefined` vs `null` split is load-bearing and is why this cannot just be
 * `avatarCache.get(name)`: `undefined` means "never looked up, go fetch", while `null` means
 * "already looked up, this mapper has no avatar". `MapperLink` keys its lazy
 * IntersectionObserver fetch off exactly that distinction, so collapsing the two would make it
 * re-request an avatar that is known not to exist on every mount.
 *
 * @param {string} name - Mapper username used as the cache key.
 * @returns {string|null|undefined} Avatar URL, `null` if known to have none, `undefined` if uncached.
 */
export function peekMapperAvatar(name) {
    return avatarCache.has(name) ? avatarCache.get(name) : undefined;
}

/**
 * Resolves a mapper's avatar URL via the mirror's player endpoint, cached and de-duplicated.
 *
 * Failures are cached as `null` too, which is intentional: a mapper who is not on osu! (or a
 * 404) would otherwise be re-requested by every card that mentions them. The response is
 * accepted in either shape, `{ user: {...} }` or a bare user object, because the player
 * endpoint has been served both ways.
 *
 * @param {string} name - Mapper username; a falsy name short-circuits without fetching or caching.
 * @returns {Promise<string|null>} Avatar URL, or `null` when absent, non-OK, or on network error.
 */
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
