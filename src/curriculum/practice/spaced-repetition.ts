/**
 * Spaced-repetition persistence + scheduling for Mendelian Practice Mode.
 *
 * Tracks per-concept mastery in `localStorage` under the key
 * `mendelian-practice-v1`. All scheduling logic is implemented as PURE
 * functions over an immutable `PracticeState`; the only side effects are
 * in `loadState` and `saveState`.
 *
 * Design notes:
 *  - "SM-2-lite" ease levels 0..3 map to intervals {0min, 4hr, 1d, 4d}.
 *    A correct answer promotes ease by 1; a wrong answer drops ease by 1
 *    (never below 0). This is simple enough to reason about by hand and
 *    still gives the student a reason to come back tomorrow.
 *  - Concept selection weights three factors additively:
 *      due weight: 1 if now >= nextDue (70% of the final weight)
 *      weak weight: extra for concepts with accuracy < 0.7
 *      new weight: moderate for never-seen concepts
 *      floor: small positive for mastered-and-not-due concepts
 *  - Streak math uses LOCAL calendar days, not UTC, so crossing midnight
 *    in any timezone behaves correctly for the student's locale.
 *  - Schema version is tracked so a future v2 migration is a single
 *    switch on `schemaVersion`.
 */

import type { PracticeConcept } from './problems';
import { ALL_CONCEPTS } from './problems';

// ── Types ───────────────────────────────────────────────────────────────

export interface ConceptStats {
  attempts: number;
  correct: number;
  lastSeen: number;           // timestamp ms (0 if never seen)
  nextDue: number;            // timestamp ms (0 => immediately due)
  easeLevel: 0 | 1 | 2 | 3;
}

export interface PracticeState {
  schemaVersion: 1;
  concepts: Record<PracticeConcept, ConceptStats>;
  streak: {
    current: number;
    best: number;
    lastSessionDate: string;  // YYYY-MM-DD in local time, '' if none
  };
  totalSessions: number;
  totalProblems: number;
  totalCorrect: number;
}

// ── Constants ───────────────────────────────────────────────────────────

export const STORAGE_KEY = 'mendelian-practice-v1';
export const SCHEMA_VERSION = 1 as const;

/** Interval in milliseconds for each ease level. Deliberately compact so
 *  a session every couple of days keeps the full concept set in rotation. */
export const EASE_INTERVALS_MS: Record<0 | 1 | 2 | 3, number> = {
  0: 0,                       // retry immediately (this session)
  1: 4 * 60 * 60 * 1000,      // 4 hours
  2: 24 * 60 * 60 * 1000,     // 1 day
  3: 4 * 24 * 60 * 60 * 1000, // 4 days
};

// ── Factory / load / save ───────────────────────────────────────────────

export function defaultConceptStats(): ConceptStats {
  return {
    attempts: 0,
    correct: 0,
    lastSeen: 0,
    nextDue: 0,
    easeLevel: 0,
  };
}

export function defaultState(): PracticeState {
  const concepts = {} as Record<PracticeConcept, ConceptStats>;
  for (const c of ALL_CONCEPTS) concepts[c] = defaultConceptStats();
  return {
    schemaVersion: SCHEMA_VERSION,
    concepts,
    streak: { current: 0, best: 0, lastSessionDate: '' },
    totalSessions: 0,
    totalProblems: 0,
    totalCorrect: 0,
  };
}

/** Read practice state from localStorage. Returns a fresh default on
 *  missing, malformed, or schema-mismatched storage. Never throws. */
export function loadState(): PracticeState {
  if (typeof localStorage === 'undefined') return defaultState();
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return defaultState();
  }
  if (!raw) return defaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return defaultState();

    // Reconstruct, filling in any missing concepts (e.g. if a new concept
    // was added in a later ship but before a migration).
    const base = defaultState();
    const merged: PracticeState = {
      schemaVersion: SCHEMA_VERSION,
      concepts: { ...base.concepts },
      streak: {
        current: parsed.streak?.current ?? 0,
        best: parsed.streak?.best ?? 0,
        lastSessionDate: parsed.streak?.lastSessionDate ?? '',
      },
      totalSessions: parsed.totalSessions ?? 0,
      totalProblems: parsed.totalProblems ?? 0,
      totalCorrect: parsed.totalCorrect ?? 0,
    };
    if (parsed.concepts) {
      for (const c of ALL_CONCEPTS) {
        const stored = parsed.concepts[c];
        if (stored && typeof stored === 'object') {
          merged.concepts[c] = {
            attempts: stored.attempts ?? 0,
            correct: stored.correct ?? 0,
            lastSeen: stored.lastSeen ?? 0,
            nextDue: stored.nextDue ?? 0,
            easeLevel: clampEase(stored.easeLevel),
          };
        }
      }
    }
    return merged;
  } catch {
    return defaultState();
  }
}

/** Persist practice state. Survives a quota error without crashing the
 *  session \u2014 the student simply loses the persistence for that write. */
export function saveState(state: PracticeState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    // QuotaExceededError or security error \u2014 log once and continue.
    // eslint-disable-next-line no-console
    console.warn('[practice] failed to persist state:', err);
  }
}

function clampEase(value: unknown): 0 | 1 | 2 | 3 {
  if (value === 1 || value === 2 || value === 3) return value;
  return 0;
}

// ── Pure update functions ───────────────────────────────────────────────

/** Record one answer for a concept. Returns a new PracticeState with
 *  updated stats. Correct -> ease up one; wrong -> ease down one (floor 0).
 *  Next due time recomputed from the new ease.
 *
 *  Takes an explicit `now` for testability. Defaults to `Date.now()`. */
export function recordAnswer(
  state: PracticeState,
  concept: PracticeConcept,
  correct: boolean,
  now: number = Date.now(),
): PracticeState {
  const prev = state.concepts[concept];
  const nextEase: 0 | 1 | 2 | 3 = correct
    ? (Math.min(3, prev.easeLevel + 1) as 0 | 1 | 2 | 3)
    : (Math.max(0, prev.easeLevel - 1) as 0 | 1 | 2 | 3);
  const updated: ConceptStats = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    lastSeen: now,
    nextDue: now + EASE_INTERVALS_MS[nextEase],
    easeLevel: nextEase,
  };
  return {
    ...state,
    concepts: { ...state.concepts, [concept]: updated },
    totalProblems: state.totalProblems + 1,
    totalCorrect: state.totalCorrect + (correct ? 1 : 0),
  };
}

/** Update session-level totals and streak. Call once at the end of each
 *  10-question session.
 *
 *  Streak rules (all local time):
 *    - No prior session OR prior > 1 day ago: streak = 1 (starting today).
 *    - Prior was yesterday: streak = current + 1 (extending).
 *    - Prior was today: no change (already counted today).
 *    - Best is the max of current and previous best.
 */
export function recordSessionEnd(
  state: PracticeState,
  problemsAttempted: number,
  _problemsCorrect: number,
  now: number = Date.now(),
): PracticeState {
  const today = localDateString(now);
  const yesterday = localDateString(now - 24 * 60 * 60 * 1000);
  const last = state.streak.lastSessionDate;

  let current: number;
  if (last === today) {
    // Already counted a session today \u2014 don't double-increment.
    current = state.streak.current;
  } else if (last === yesterday) {
    current = state.streak.current + 1;
  } else {
    // No prior session, or gap of 2+ days \u2014 restart streak at 1.
    current = 1;
  }

  const best = Math.max(state.streak.best, current);

  // Totals for attempted/correct are already incremented per-answer via
  // recordAnswer, so we only bump session count here to avoid
  // double-counting. (If a caller wants to skip per-answer persistence and
  // just call recordSessionEnd, the per-answer totals would be zero \u2014
  // that's a caller bug, not a state bug.)
  return {
    ...state,
    streak: { current, best, lastSessionDate: today },
    totalSessions: state.totalSessions + (problemsAttempted > 0 ? 1 : 0),
  };
}

// ── Scheduling / selection ──────────────────────────────────────────────

interface ConceptWeight {
  concept: PracticeConcept;
  weight: number;
}

/** Pick the next concept to drill, given the current state and an RNG.
 *  Deterministic for a seeded RNG (no Date.now inside).
 *
 *  Weighting:
 *    - base floor 0.1 for every concept (never starve a mastered concept)
 *    - +1.0 if the concept is due or overdue (nextDue <= now)
 *    - +0.7 if the concept is new (attempts === 0)
 *    - +0.5 if accuracy < 0.7 (weak spot \u2014 extra practice)
 *    - +0.3 if accuracy < 0.5 (on top of the above \u2014 really weak)
 */
export function selectNextConcept(
  state: PracticeState,
  rng: () => number,
  now: number = Date.now(),
): PracticeConcept {
  const weights: ConceptWeight[] = ALL_CONCEPTS.map(c => {
    const s = state.concepts[c];
    let w = 0.1;
    if (s.nextDue <= now) w += 1.0;
    if (s.attempts === 0) {
      w += 0.7;
    } else {
      const acc = s.correct / s.attempts;
      if (acc < 0.7) w += 0.5;
      if (acc < 0.5) w += 0.3;
    }
    return { concept: c, weight: w };
  });

  const total = weights.reduce((sum, w) => sum + w.weight, 0);
  let roll = rng() * total;
  for (const w of weights) {
    roll -= w.weight;
    if (roll <= 0) return w.concept;
  }
  // Floating-point backstop \u2014 should be unreachable.
  return weights[weights.length - 1].concept;
}

// ── Streak display ──────────────────────────────────────────────────────

export function getStreakDisplay(
  state: PracticeState,
  now: number = Date.now(),
): { current: number; best: number; isToday: boolean } {
  const today = localDateString(now);
  return {
    current: state.streak.current,
    best: state.streak.best,
    isToday: state.streak.lastSessionDate === today,
  };
}

// ── Date helpers ────────────────────────────────────────────────────────

/** YYYY-MM-DD in the viewer's local time. Used for streak day comparisons.
 *  Using local time (not UTC) means "yesterday" actually means "the
 *  previous calendar day for this student", which is what they\u2019d expect.
 */
export function localDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
