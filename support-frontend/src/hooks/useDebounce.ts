/**
 * Debounce hook: returns a value that only updates after `delay` ms of
 * inactivity. Used to avoid firing a search request on every keystroke.
 */

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
