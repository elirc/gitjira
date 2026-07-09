import { useEffect, useState } from 'react';

// LEARN: debounce vs throttle. Debounce = "wait until the user STOPS for N ms,
// then fire once" — perfect for a search box, where you don't want to query on
// every keystroke. Throttle = "fire at most once per N ms while active" —
// better for scroll/resize. This is debounce: `value` only updates after the
// input has been still for `delay` ms.
export function useDebounced(value, delay = 250) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id); // cancel the pending update if value changes first
  }, [value, delay]);
  return debounced;
}
