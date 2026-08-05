let sharedObserver = null;
const callbacks = new WeakMap();

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

export function observeOnce(el, callback) {
    if (!el) return;
    callbacks.set(el, callback);
    ensureObserver().observe(el);
}

export function unobserve(el) {
    if (!el || !sharedObserver) return;
    callbacks.delete(el);
    sharedObserver.unobserve(el);
}
