/**
 * Pure animation timing for the pixel world.
 *
 * Every animated thing — water, fish, bugs, campfires, lamps, pines, tall
 * grass, the player — is described by a small schedule: how many frames the
 * sprite bank holds, how long each one is held, and whether the cycle wraps
 * or ping-pongs. The renderer owns the clock and passes elapsed milliseconds
 * in; this module is pure math with no imports at all, so it is SSR-safe and
 * trivially testable.
 *
 * Tempos are deliberately different per schedule — a flickering 640ms
 * campfire cycle next to an 8.4s pine sway — so nothing in the world moves in
 * lockstep. To keep two instances of one schedule apart, stagger the time you
 * pass (the renderer already does this with its per-prop phase) or spread the
 * schedule with a `phaseOffset`.
 */

/** Declarative description of one looping animation. Treat as immutable. */
export interface AnimationFrameSchedule {
  /** Stable identifier, matching this schedule's key in `WORLD_ANIMATION_SCHEDULES`. */
  readonly id?: string
  /** How many distinct frames the sprite bank holds. Clamped to at least 1. */
  readonly frameCount: number
  /** How long each frame is held before advancing, in ms. Clamped to at least 1. */
  readonly frameMs: number
  /** Advance 0 → N-1 and back down to 0, instead of wrapping straight around. */
  readonly pingPong?: boolean
  /** Steps the cycle is advanced by at t = 0, staggering variants of one schedule. */
  readonly phaseOffset?: number
}

/** Key of every schedule the world ships with. */
export type WorldAnimationId =
  | 'water'
  | 'fish'
  | 'butterfly'
  | 'campfire'
  | 'lampGlow'
  | 'pineSway'
  | 'tallGrass'
  | 'playerWalk'

/** Water shimmer: six frames at 420ms, a slow glassy loop of 2.52s. */
export const waterAnimation: AnimationFrameSchedule = {
  id: 'water',
  frameCount: 6,
  frameMs: 420,
}

/** Fish swim cycle: four frames at 230ms, one continuous 920ms tail sweep. */
export const fishAnimation: AnimationFrameSchedule = {
  id: 'fish',
  frameCount: 4,
  frameMs: 230,
}

/** Butterfly wing beat: four frames at 260ms, folding and unfolding (1.56s). */
export const butterflyAnimation: AnimationFrameSchedule = {
  id: 'butterfly',
  frameCount: 4,
  frameMs: 260,
  pingPong: true,
}

/** Campfire flicker: four frames at 160ms — the fastest cycle in the world. */
export const campfireAnimation: AnimationFrameSchedule = {
  id: 'campfire',
  frameCount: 4,
  frameMs: 160,
}

/** Lamp glow breathing: four frames at 950ms, swelling and receding (5.7s). */
export const lampGlowAnimation: AnimationFrameSchedule = {
  id: 'lampGlow',
  frameCount: 4,
  frameMs: 950,
  pingPong: true,
}

/** Pine sway in the wind: four frames at 1400ms, a full lean-and-return in 8.4s. */
export const pineSwayAnimation: AnimationFrameSchedule = {
  id: 'pineSway',
  frameCount: 4,
  frameMs: 1400,
  pingPong: true,
}

/** Tall grass rustle: four frames at 850ms, softer and quicker than the pines. */
export const tallGrassAnimation: AnimationFrameSchedule = {
  id: 'tallGrass',
  frameCount: 4,
  frameMs: 850,
  pingPong: true,
}

/** Player walk cycle: six frames at 130ms, a full stride every 780ms. */
export const playerWalkAnimation: AnimationFrameSchedule = {
  id: 'playerWalk',
  frameCount: 6,
  frameMs: 130,
}

/** Every world schedule, keyed by id; each entry's `id` equals its key. */
export const WORLD_ANIMATION_SCHEDULES: Record<WorldAnimationId, AnimationFrameSchedule> = {
  water: waterAnimation,
  fish: fishAnimation,
  butterfly: butterflyAnimation,
  campfire: campfireAnimation,
  lampGlow: lampGlowAnimation,
  pineSway: pineSwayAnimation,
  tallGrass: tallGrassAnimation,
  playerWalk: playerWalkAnimation,
}

/** A schedule with every field validated; the helpers only ever read this shape. */
interface ResolvedSchedule {
  frameCount: number
  frameMs: number
  phaseOffset: number
  pingPong: boolean
  /** Steps crossed in one full cycle: `2N - 2` when ping-ponging, else `N`. */
  stepCount: number
}

function resolveSchedule(schedule: AnimationFrameSchedule): ResolvedSchedule {
  const frameCount = Number.isFinite(schedule.frameCount) ? Math.max(1, Math.floor(schedule.frameCount)) : 1
  const frameMs = Number.isFinite(schedule.frameMs) ? Math.max(1, Math.floor(schedule.frameMs)) : 1
  const rawPhase = schedule.phaseOffset
  const phaseOffset = rawPhase !== undefined && Number.isFinite(rawPhase) ? Math.floor(rawPhase) : 0
  const pingPong = schedule.pingPong === true && frameCount > 1
  return {
    frameCount,
    frameMs,
    phaseOffset,
    pingPong,
    stepCount: pingPong ? frameCount * 2 - 2 : frameCount,
  }
}

/** Modulo that stays in `[0, modulus)` for negative values too. */
const mod = (value: number, modulus: number): number => ((value % modulus) + modulus) % modulus

/**
 * Index of the frame showing at `timeMs` — always an integer in
 * `[0, frameCount)`, never NaN, never thrown. Negative times count backwards
 * from the cycle start, so a stopped clock still lands on a valid frame.
 */
export function frameAt(timeMs: number, schedule: AnimationFrameSchedule): number {
  const { frameCount, frameMs, phaseOffset, pingPong, stepCount } = resolveSchedule(schedule)
  if (frameCount === 1) return 0
  const time = Number.isFinite(timeMs) ? timeMs : 0
  const step = mod(Math.floor(time / frameMs) + phaseOffset, stepCount)
  return pingPong && step >= frameCount ? stepCount - step : step
}

/**
 * Progress through the frame `frameAt` currently shows, in `[0, 1)`: 0 the
 * instant the frame appears, ~0.5 halfway to the next. Use it to interpolate
 * sub-frame motion — glow alpha, water level, a one-pixel lean — between the
 * current frame and whatever `frameAt` returns one step later.
 */
export function frameProgress(timeMs: number, schedule: AnimationFrameSchedule): number {
  const { frameMs } = resolveSchedule(schedule)
  const time = Number.isFinite(timeMs) ? timeMs : 0
  return mod(time, frameMs) / frameMs
}

/** Milliseconds in one full cycle (out and back, for ping-pong schedules). */
export function cycleDurationMs(schedule: AnimationFrameSchedule): number {
  const { frameMs, stepCount } = resolveSchedule(schedule)
  return frameMs * stepCount
}
