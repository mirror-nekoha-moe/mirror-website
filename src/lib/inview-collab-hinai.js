let sharedObserver = null;
const callbacks = new WeakMap();

/**
 * Lazily creates the single IntersectionObserver shared by every caller, since
 * one observer watching many elements is far cheaper than one observer per card.
 * The 300px rootMargin fires just before an element actually scrolls into view,
 * so lazily loaded content has a head start. Each hit unobserves the element and
 * drops its callback BEFORE invoking it, which gives fire-once semantics and
 * leaves the callback free to re-register the same element if it wants to.
 *
 * @returns {IntersectionObserver} The shared observer.
 */
function ensureObserver() {
    if (sharedObserver) return sharedObserver;
    sharedObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const callback = callbacks.get(entry.target);
            sharedObserver.unobserve(entry.target);
            callbacks.delete(entry.target);
            if (callback) callback();
        });
    }, { rootMargin: '300px' });
    return sharedObserver;
}

/**
 * Registers a callback to run exactly once, when the element first comes within
 * 300px of the viewport. The callback is held in a WeakMap keyed by the element,
 * so it is dropped as soon as the element itself becomes collectable. Note the
 * shared observer keeps a strong reference to every element it watches until
 * that element's hit fires, so an element unmounted before it ever scrolled
 * into view must be passed to unobserve() to be released. Registering the same
 * element twice replaces the callback.
 *
 * @param {Element|null|undefined} el - Element to watch; a falsy value is a no-op.
 * @param {Function} callback - Invoked once on first intersection.
 * @returns {void}
 */
export function observeOnce(el, callback) {
    if (!el) return;
    callbacks.set(el, callback);
    ensureObserver().observe(el);
}

/**
 * Cancels a pending observeOnce registration, typically on unmount when the
 * element never scrolled into view. Deliberately does not create the observer:
 * if none exists yet there is nothing registered to cancel.
 *
 * @param {Element|null|undefined} el - Element to stop watching; a falsy value is a no-op.
 * @returns {void}
 */
export function unobserve(el) {
    if (!el || !sharedObserver) return;
    callbacks.delete(el);
    sharedObserver.unobserve(el);
}
