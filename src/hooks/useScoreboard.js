import { usePolling } from './usePolling.js';
import { api } from '../lib/api.js';

export function useScoreboard(options) {
  return usePolling(() => api.scoreboard(), 3000, options);
}
