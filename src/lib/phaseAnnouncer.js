import { useEffect, useSyncExternalStore } from 'react';

// Tracks the last phase a player saw, so a change between polls can be announced full-screen.
// The announcement lives outside React state because the page that notices the change (e.g.
// Defend seeing "attack") navigates away right after; App renders it so it survives the switch.
const STORAGE_KEY = 'ctf_last_phase';
let current = null;
const listeners = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function readLast() {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeLast(key) {
  try {
    if (key) sessionStorage.setItem(STORAGE_KEY, key);
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable; worst case a phase change goes unannounced
  }
}

// Forget the last seen phase, e.g. on joining, so the first status after it isn't announced.
export function resetPhaseBaseline() {
  writeLast(null);
}

export function dismissPhaseAnnouncement() {
  current = null;
  emit();
}

// Call with each status poll; announces the phase if it changed since the last one seen.
export function useAnnouncePhase(status) {
  const roundNumber = status?.roundNumber;
  const state = status?.state;

  useEffect(() => {
    if (!state) return;
    const key = `${roundNumber}:${state}`;
    const last = readLast();
    writeLast(key);
    if (last && last !== key && state !== 'lobby') {
      current = { key, status };
      emit();
    }
    // status is only read for the announcement's wording, so it's left out of the deps on purpose.
  }, [roundNumber, state]);
}

export function usePhaseAnnouncement() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    () => current,
  );
}
