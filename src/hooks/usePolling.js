import { useCallback, useEffect, useRef, useState } from 'react';

export function usePolling(fetchFn, intervalMs, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;
  const tickRef = useRef(null);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    async function tick() {
      try {
        const result = await fetchFnRef.current();
        if (!cancelled) {
          setData(result);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          setLoading(false);
        }
      }
    }

    tickRef.current = tick;
    tick();
    const id = setInterval(tick, intervalMs);
    return () => {
      cancelled = true;
      tickRef.current = null;
      clearInterval(id);
    };
  }, [intervalMs, enabled]);

  // Fetch now instead of waiting for the next interval, e.g. right after an action changes the data.
  const refresh = useCallback(() => tickRef.current?.(), []);

  return { data, error, loading, refresh };
}
