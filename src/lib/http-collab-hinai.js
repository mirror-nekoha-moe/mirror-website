/**
 * Shared JSON fetch helper for every upstream call made by this collaboration's modules.
 *
 * The body is read as text and parsed by hand rather than via `res.json()` so that an HTML
 * error page slipping through with a 200 (a proxy interstitial, a Cloudflare challenge) fails
 * with a legible "non-JSON response" instead of a raw `SyntaxError` in the console. The `label`
 * names the upstream in that message, so failures stay attributable to the right service now
 * that the packs and graveyard modules share one implementation.
 *
 * @param {string} url - Absolute URL to request.
 * @param {string} label - Upstream name used in the non-JSON error, e.g. `mirror`, `collab API`.
 * @param {AbortSignal} [signal] - Optional abort signal; rejects with `AbortError` when fired.
 * @returns {Promise<any>} The parsed JSON body.
 * @throws {Error} On a non-2xx status, or when the body is not valid JSON.
 */
export async function getJson(url, label, signal) {
    const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`request failed: ${res.status}`);
    const body = await res.text();
    try {
        return JSON.parse(body);
    } catch {
        throw new Error(`${label} returned a non-JSON response`);
    }
}
