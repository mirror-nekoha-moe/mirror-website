import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delay` milliseconds,
 * used to keep fast inputs (search text, slider ranges) from firing a request
 * per keystroke. The first render is NOT delayed: state is seeded with the
 * initial value, so only later changes pay the wait. `delay` is in the effect
 * dependencies too, so changing it restarts the pending timer.
 *
 * @param {*} value - The rapidly changing value to settle.
 * @param {number} delay - Quiet period in milliseconds before the value is adopted.
 * @returns {*} The last settled value.
 */
export default function useDebounced(value, delay) {
    const [settled, setSettled] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setSettled(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return settled;
}
