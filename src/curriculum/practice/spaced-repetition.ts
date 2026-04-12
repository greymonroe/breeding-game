/**
 * Spaced-repetition persistence + scheduling for Practice Mode.
 *
 * Generalized to support multiple modules (Mendelian, PopGen, etc.) via
 * configurable `storageKey` and `conceptKeys` parameters. All functions
 * default to Mendelian values when called without those parameters, so
 * existing Mendelian callers continue to work unchanged.
 *
 * Tracks per-concept mastery in `localStorage`. All scheduling logic is
 * implemented as PURE functions over an immutable `PracticeState`; the
 * only side effects are in `loadState` and `saveState`.
 *
 * Design notes:
 *  - "SM-2-lite" ease levels 0..3 map to intervals {0min, 15min, 1d, 4d}.
 *    A correct answer promotes ease by 1; a wrong answer drops ease by 1
 *    (never below 0). This is simple enough to reason about by hand and
 *    still gives the student a reason to come back tomorrow. The 15-minute
 *    ease-1 interval (was 4 hours pre-F-033) ensures a just-missed concept
 *    resurfaces within the same practice session rather than vanishing.
 *  - Concept selection weights three factors additively:
 *      due weight: 1 if now >= nextDue (70% of the final weight)
 *      weak weight: extra for concepts with accuracy < 0.9 (any recent miss
 *        should resurface — F-034 loosened this from < 0.7, which let
 *        a 9/10 session at acc=0.9 silently skip the upweight and broke the
 *        "you'll see more of those next time" promise on the scorecard)
 *      new weight: moderate for never-seen concepts
 *      floor: small positive for mastered-and-not-due concepts
 *  - Streak math uses LOCAL calendar days, not UTC, so crossing midnight
 *    in any timezone behaves correctly for the student's locale.
 *  - Schema version is tracked so a future v2 migration is a single
 *    switch on `schemaVersion`.
 */

import { ALL_CONCEPTS } from './problems';

// ── Types ───────────────────────────────────────────────────────────────

export interface ConceptStats {
  attempts: number;
  correct: number;
  lastSeen: number;           // timestamp ms (0 if never seen)
  nextDue: number;            // timestamp ms (0 => immediately due)
  easeLevel: 0 | 1 | 2 | 3;
}

/** Generic practice state that works for any module. The `concepts` field
 *  is a `Record<string, ConceptStats>` so it can hold Mendelian, PopGen,
 *  or any future module's concept keys. */
export interface PracticeState {
  schemaVersion: 1;
  concepts: Record<string, ConceptStats>;
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
  1: 15 * 60 * 1000,          // 15 minutes (within-session resurface, F-033)
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

/** Build a fresh default state. When `conceptKeys` is provided the state
 *  is keyed by those strings (for PopGen or any future module). When
 *  omitted the Mendelian `ALL_CONCEPTS` are used for backward-compat. */
export function defaultState(conceptKeys?: readonly string[]): PracticeState {
  const keys: readonly string[] = conceptKeys ?? ALL_CONCEPTS;
  const concepts: Record<string, ConceptStats> = {};
  for (const c of keys) concepts[c] = defaultConceptStats();
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
 *  missing, malformed, or schema-mismatched storage. Never throws.
 *
 *  @param storageKey   localStorage key. Defaults to `mendelian-practice-v1`.
 *  @param conceptKeys  Concept strings to seed. Defaults to Mendelian ALL_CONCEPTS. */
export function loadState(
  storageKey: string = STORAGE_KEY,
  conceptKeys?: readonly string[],
): PracticeState {
  const keys: readonly string[] = conceptKeys ?? ALL_CONCEPTS;
  if (typeof localStorage === 'undefined') return defaultState(keys);
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(storageKey);
  } catch {
    return defaultState(keys);
  }
  if (!raw) return defaultState(keys);

  try {
    const parsed = JSON.parse(raw) as Partial<PracticeState>;
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) return defaultState(keys);

    // Reconstruct, filling in any missing concepts (e.g. if a new concept
    // was added in a later ship but before a migration).
    const base = defaultState(keys);
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
      for (const c of keys) {
        const stored = (parsed.concepts as Record<string, ConceptStats | undefined>)[c];
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
    return defaultState(keys);
  }
}

/** Persist practice state. Survives a quota error without crashing the
 *  session — the student simply loses the persistence for that write.
 *
 *  @param storageKey  localStorage key. Defaults to `mendelian-practice-v1`. */
export function saveState(state: PracticeState, storageKey: string = STORAGE_KEY): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (err) {
    // QuotaExceededError or security error — log once and continue.
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
 *  Accepts `string` for the concept key so it works for any module.
 *  Takes an explicit `now` for testability. Defaults to `Date.now()`. */
export function recordAnswer(
  state: PracticeState,
  concept: string,
  correct: boolean,
  now: number = Date.now(),
): PracticeState {
  const prev = state.concepts[concept];
  if (!prev) return state; // safety: unknown concept key
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
  now: number = Date.now(),
): PracticeState {
  const today = localDateString(now);
  // Yesterday via calendar-day arithmetic, not millisecond subtraction.
  // `new Date(now - 24h)` breaks on the day DST ends (the local clock
  // falls back, so 24h ago lands two calendar days earlier), silently
  // resetting streaks for one user per year. `setDate(d - 1)` uses
  // calendar days and handles DST transitions correctly. F-046.
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateString(yesterdayDate.getTime());
  const last = state.streak.lastSessionDate;

  let current: number;
  if (last === today) {
    // Already counted a session today — don't double-increment.
    current = state.streak.current;
  } else if (last === yesterday) {
    current = state.streak.current + 1;
  } else {
    // No prior session, or gap of 2+ days — restart streak at 1.
    current = 1;
  }

  const best = Math.max(state.streak.best, current);

  // Totals for attempted/correct are already incremented per-answer via
  // recordAnswer, so we only bump session count here to avoid
  // double-counting. (If a caller wants to skip per-answer persistence and
  // just call recordSessionEnd, the per-answer totals would be zero —
  // that's a caller bug, not a state bug.)
  return {
    ...state,
    streak: { current, best, lastSessionDate: today },
    totalSessions: state.totalSessions + (problemsAttempted > 0 ? 1 : 0),
  };
}

// ── Scheduling / selection ──────────────────────────────────────────────

interface ConceptWeight {
  concept: string;
  weight: number;
}

/** Pick the next concept to drill, given the current state and an RNG.
 *  Deterministic for a seeded RNG (no Date.now inside).
 *
 *  @param allConcepts  The concept keys to choose from. Defaults to Mendelian ALL_CONCEPTS.
 *
 *  Weighting:
 *    - base floor 0.1 for every concept (never starve a mastered concept)
 *    - +1.0 if the concept is due or overdue (nextDue <= now)
 *    - +0.7 if the concept is new (attempts === 0)
 *    - +0.5 if accuracy < 0.9 (weak spot — any recent miss; F-034)
 *    - +0.3 if accuracy < 0.5 (on top of the above — really weak)
 */
export function selectNextConcept(
  state: PracticeState,
  rng: () => number,
  now: number = Date.now(),
  allConcepts?: readonly string[],
): string {
  const concepts: readonly string[] = allConcepts ?? ALL_CONCEPTS;
  const weights: ConceptWeight[] = concepts.map(c => {
    const s = state.concepts[c];
    if (!s) return { concept: c, weight: 0.1 }; // safety
    let w = 0.1;
    if (s.nextDue <= now) w += 1.0;
    if (s.attempts === 0) {
      w += 0.7;
    } else {
      const acc = s.correct / s.attempts;
      // Threshold 0.9 (was 0.7 pre-F-034): a 9/10 session is exactly the
      // case where the student saw one miss and we promised on the
      // scorecard they'd see more of that concept. 0.9 is strictly greater
      // than any accuracy a student with >=1 miss on their current
      // attempts can achieve, so the upweight fires whenever they missed
      // anything recently.
      if (acc < 0.9) w += 0.5;
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
  // Floating-point backstop — should be unreachable.
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
 *  previous calendar day for this student", which is what they'd expect.
 */
export function localDateString(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
