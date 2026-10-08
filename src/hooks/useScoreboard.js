import { usePolling } from './usePolling.js';
import { api } from '../lib/api.js';

export function useScoreboard({ intervalMs = 5000, ...options } = {}) {
  return usePolling(() => api.scoreboard(), intervalMs, options);
}
