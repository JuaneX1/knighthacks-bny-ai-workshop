import { usePolling } from './usePolling.js';
import { api } from '../lib/api.js';

export function useGameStatus(options) {
  return usePolling(() => api.status(), 2000, options);
}
