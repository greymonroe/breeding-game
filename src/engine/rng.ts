import type { RNG } from './types';

/** Mulberry32: small, fast, deterministic seedable PRNG. */
export function makeRng(seed: number): RNG {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal via Box–Muller. */
export function gaussian(rng: RNG): number {
  let u = 0, v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function pickInt(rng: RNG, n: number): number {
  return Math.floor(rng() * n);
}

let _idCounter = 0;
export function nextId(prefix = 'ind'): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter.toString(36)}`;
}
