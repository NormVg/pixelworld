import { playerSprites, propSprites, terrainSprites } from '~/utils/pixel-sprite-bank'
import { worldMap } from '~/utils/world-map'
import { WORLD_ANIMATION_SCHEDULES, frameAt } from '~/utils/world-animation'
import type { AnimationFrameSchedule } from '~/utils/world-animation'

/**
 * Canvas renderer for the 2.5D pixel world.
 *
 * The world is authored on a tile grid (32px in the current build) but must
 * not read as one: grass variants, speckle dabs and a slow blade shimmer are
 * chosen by a deterministic per-tile hash so no pattern ever aligns with the
 * grid. Depth comes from base-anchored sprites drawn in one y-sorted pass,
 * soft nested contact shadows cast from a consistent top-left light, and
 * cliff faces that carry a grass lip, strata bands, rubble and a dark
 * contact line. Fish loop a swim ring that follows their pond's actual
 * shoreline, and bugs wander inside the bounds of their anchor tile, so
 * nothing drifts where it does not belong.
 *
 * Every rasterized sprite, procedural overlay and shadow is cached as an
 * offscreen canvas, so the per-frame loop only issues `drawImage` calls and
 * never draws pixel by pixel. All DOM access happens inside `render` and the
 * lazy canvas builders it calls, never at import or construct time.
 */

/** Sprite banks are keyed by these directions. */
export type PlayerDirection = 'down' | 'up' | 'left' | 'right'

/** Player state for one frame. Positions are in world pixels; x/y mark the feet. */
export interface RenderPlayerState {
  x: number
  y: number
  direction: PlayerDirection
  /** Walk-cycle frame index, chosen by the gameplay layer (cycled only while moving). */
  frame: number
  moving: boolean
}

/** Everything the renderer needs to draw one frame. */
export interface RenderState {
  player: RenderPlayerState
  /** Camera top-left in world pixels. Floats are rounded and clamped by the renderer. */
  camera: { x: number; y: number }
  /** Id of the landmark the player currently stands on, or null away from one. */
  activeLandmarkId: string | null
}

export interface WorldRendererOptions {
  /** Internal canvas resolution this renderer targets, in world pixels. Default 480. */
  viewWidth?: number
  /** Internal canvas height in world pixels. Default 300. */
  viewHeight?: number
  /** Draw the soft warm vignette / ambient light overlay. Default true. */
  ambient?: boolean
}

/** Per-sprite animation clock data, for callers that drive frame selection. */
export interface SpriteAnimation {
  frameCount: number
  frameMs: number
}

/* ------------------------------------------------------------------ */
/* Internal raster types                                               */
/* ------------------------------------------------------------------ */

interface RasterFrame {
  width: number
  height: number
  rows: readonly string[]
  palette: Readonly<Record<string, string>>
}

interface RasterSprite {
  frames: readonly RasterFrame[]
  frameMs: number
}

/** A standing prop with its scaled pixel footprint precomputed. */
interface SceneEntry {
  type: string
  sprite: RasterSprite
  /** Left edge of the sprite, in world pixels. */
  x: number
  /** Base (feet) line of the sprite, in world pixels. */
  baseY: number
  width: number
  height: number
  /** Feet line; larger y draws later / in front. */
  depth: number
  /** Per-instance phase offset so identical animated props stay out of lockstep. */
  phase: number
  castsShadow: boolean
  /**
   * World pixels of fully transparent rows beneath the sprite's art. The
   * sprite shifts down by this so its lowest opaque pixel lands exactly on
   * the footprint's base line instead of hovering above it.
   */
  basePad: number
}

/** Something drawn during the y-sorted scene pass whose position moves with time. */
interface DynamicItem {
  depth: number
  draw: () => void
}

/** A waypoint on a pond's swim ring, in world pixels. */
interface PondWaypoint {
  x: number
  y: number
}

/** A koi looping a ring that follows its pond's actual shoreline. */
interface FishMotion {
  key: string
  sprite: RasterSprite
  /** Interior water-tile centers ordered around the pond, a full tile clear of the shore. */
  path: readonly PondWaypoint[]
  /** Pond center in world pixels; per-fish ring scale keeps loops from overlapping. */
  cx: number
  cy: number
  /** Per-fish squeeze of the ring toward the pond center, in (0, 1]. */
  ringScale: number
  /** Milliseconds for one full lap around the pond. */
  loopMs: number
  phase: number
}

/** A bug wandering on a lazy two-frequency loop, boxed inside its anchor tile. */
interface ButterflyMotion {
  key: string
  sprite: RasterSprite
  ax: number
  ay: number
  ampX: number
  ampY: number
  /** Radians per millisecond; the two axes are deliberately incommensurate. */
  freqX: number
  freqY: number
  phase: number
  phase2: number
  /**
   * Wander box clamped to the anchor tile, so a bug can never drift onto
   * water, a path, or a neighbor's ground - it stays with its plant.
   */
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type GroundKind =
  | 'grass'
  | 'path'
  | 'sand'
  | 'water'
  | 'flower'
  | 'tallGrass'
  | 'cliff'
  | 'soil'
  | 'crop'
  | 'flat'

/** Ground treatment for one map character: which sprite(s) and how they animate. */
interface GroundStyle {
  kind: GroundKind
  variants: readonly RasterSprite[]
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_VIEW_WIDTH = 480
const DEFAULT_VIEW_HEIGHT = 300
const DEFAULT_TILE_SIZE = 32
const DEFAULT_FRAME_MS = 240

/**
 * ¾-view presentation tilt. Render space compresses each world row slightly
 * and shears it a hair to the right going down, so the ground plane reads as
 * receding. Gameplay stays in flat world space; only this transform tilts.
 */
const ROW_COMPRESS = 0.95
const SHEAR_PX_PER_TILE = 1

/** Character the map uses for water; also the pond fish live in. */
const WATER_CHAR = '~'
const CLIFF_CHAR = 'C'
/** River tile the bridge deck crosses: water wearing a timber deck. */
const BRIDGE_CHAR = 'B'

/** Map character -> ground treatment. Unknown characters fall back to `flat`. */
const CHAR_KINDS: Readonly<Record<string, GroundKind>> = {
  '.': 'grass',
  '-': 'path',
  s: 'sand',
  '~': 'water',
  B: 'water',
  f: 'flower',
  t: 'tallGrass',
  C: 'cliff',
  d: 'soil',
  x: 'soil',
  '=': 'soil',
  c: 'crop',
  w: 'crop',
}

/** Sprite-bank key candidates per ground kind, tried in order. */
const KIND_BANK_KEYS: Readonly<Record<GroundKind, readonly string[]>> = {
  grass: ['grass'],
  path: ['path'],
  sand: ['sand'],
  water: ['water'],
  flower: ['flower'],
  tallGrass: ['tallGrass', 'grassTall'],
  cliff: ['cliff', 'cliffFace'],
  soil: ['soil', 'tilled', 'farmland', 'dirt'],
  crop: ['crop', 'crops', 'wheat', 'grain', 'sprout', 'field'],
  flat: [],
}

/** Props whose frames follow the shared world schedules. */
const PROP_SCHEDULES: Readonly<Record<string, WorldAnimationIdKey>> = {
  pine: 'pineSway',
  campfire: 'campfire',
  lamp: 'lampGlow',
}

/**
 * Per-prop cadence multipliers. Farm props should feel settled rather than
 * animated for the sake of it: the campfire and lamp glow breathe slowly,
 * the pines sway on a long hinge, and the hens peck at an unhurried rural
 * rhythm instead of pecking twice a second.
 */
const PROP_PACE: Readonly<Record<string, number>> = {
  pine: 1.3,
  campfire: 1.8,
  lamp: 1.8,
  chicken: 2.2,
}

/** Object types that swim and so follow pond loops, not the prop scene. */
const FISH_TYPES: ReadonlySet<string> = new Set(['fish', 'koi', 'bass'])

/** Object types that fly and so wander freely above the scene. */
const BUG_TYPES: ReadonlySet<string> = new Set([
  'butterfly',
  'bug',
  'beetle',
  'bee',
  'dragonfly',
  'firefly',
  'moth',
  'sparrow',
  'robin',
  'gull',
  'bird'
])

/** Water-bound floaters: anchored like furniture, but never cast a shadow. */
const FLOATER_TYPES: ReadonlySet<string> = new Set(['lily', 'lilyPad'])

/** Contact-shadow geometry for one prop class. */
interface ShadowProfile {
  /** Dab radius as a share of the sprite's drawn width. */
  readonly rxFactor: number
  /** Dab radius floor in tiles, so thin props still cast a shadow. */
  readonly minRxTiles: number
  /** Dab depth in tiles — how far the shadow reaches below the base line. */
  readonly ryTiles: number
  /** Contact-line length as a share of the dab radius. */
  readonly coreShare: number
  /** How far the dab centre slides right, as a share of its radius. */
  readonly lean: number
  /** Flat dab darkness, 0–1. */
  readonly dabAlpha: number
  /** Contact-line darkness, 0–1. */
  readonly contactAlpha: number
}

/** Shadows for unlisted types use this. */
const DEFAULT_SHADOW_PROFILE: ShadowProfile = {
  rxFactor: 0.75,
  minRxTiles: 0.6,
  ryTiles: 0.18,
  coreShare: 0.75,
  lean: 0.12,
  dabAlpha: 0.3,
  contactAlpha: 0.4
}

/** One profile per prop class; see the method that consumes them. */
const SHADOW_PROFILES: Readonly<Record<string, ShadowProfile>> = {
  // Buildings cast the widest dab on the map.
  barn: { rxFactor: 0.62, minRxTiles: 0.7, ryTiles: 0.24, coreShare: 0.78, lean: 0.08, dabAlpha: 0.3, contactAlpha: 0.4 },
  cottage: { rxFactor: 0.6, minRxTiles: 0.65, ryTiles: 0.22, coreShare: 0.78, lean: 0.08, dabAlpha: 0.3, contactAlpha: 0.4 },
  // Fence pieces overlap into one continuous line under a run.
  fence: { rxFactor: 0.55, minRxTiles: 0.85, ryTiles: 0.13, coreShare: 0.8, lean: 0.05, dabAlpha: 0.26, contactAlpha: 0.36 },
  gate: { rxFactor: 0.58, minRxTiles: 0.75, ryTiles: 0.16, coreShare: 0.8, lean: 0.06, dabAlpha: 0.28, contactAlpha: 0.38 },
  // Tree canopies lean furthest right of anything standing.
  pine: { rxFactor: 0.55, minRxTiles: 0.7, ryTiles: 0.16, coreShare: 0.7, lean: 0.14, dabAlpha: 0.28, contactAlpha: 0.38 },
  oak: { rxFactor: 0.6, minRxTiles: 0.7, ryTiles: 0.16, coreShare: 0.7, lean: 0.14, dabAlpha: 0.28, contactAlpha: 0.38 },
  willow: { rxFactor: 0.6, minRxTiles: 0.7, ryTiles: 0.16, coreShare: 0.7, lean: 0.14, dabAlpha: 0.28, contactAlpha: 0.38 },
  bush: { rxFactor: 0.58, minRxTiles: 0.6, ryTiles: 0.14, coreShare: 0.7, lean: 0.12, dabAlpha: 0.28, contactAlpha: 0.38 },
  rock: { rxFactor: 0.62, minRxTiles: 0.55, ryTiles: 0.14, coreShare: 0.72, lean: 0.1, dabAlpha: 0.3, contactAlpha: 0.4 },
  // Tall thin props: a small dab, deeper than wide so the post reads.
  lamp: { rxFactor: 0.75, minRxTiles: 0.45, ryTiles: 0.15, coreShare: 0.7, lean: 0.12, dabAlpha: 0.28, contactAlpha: 0.38 },
  sign: { rxFactor: 0.75, minRxTiles: 0.45, ryTiles: 0.14, coreShare: 0.7, lean: 0.12, dabAlpha: 0.28, contactAlpha: 0.38 },
  scarecrow: { rxFactor: 0.6, minRxTiles: 0.6, ryTiles: 0.17, coreShare: 0.72, lean: 0.12, dabAlpha: 0.28, contactAlpha: 0.38 },
  campfire: { rxFactor: 0.58, minRxTiles: 0.6, ryTiles: 0.15, coreShare: 0.72, lean: 0.08, dabAlpha: 0.26, contactAlpha: 0.36 },
  player: { rxFactor: 0.6, minRxTiles: 0.55, ryTiles: 0.18, coreShare: 0.72, lean: 0.12, dabAlpha: 0.3, contactAlpha: 0.4 }
}

/**
 * Species the map ships that the sprite bank may not name identically:
 * koi and bass are fish, beetles flap like butterflies, a gate is a fence.
 */
const PROP_ALIASES: Readonly<Record<string, string>> = {
  koi: 'fish',
  bass: 'fish',
  beetle: 'butterfly',
  gate: 'fence'
}

const GRASS_BASE_FALLBACK = '#79cf9d'
const OUTLINE_COLOR = '#2a2431'

/**
 * Characters the shoreline pass counts as water: the river itself plus the
 * bridge tiles laid across it, so no bank band is ever drawn against a
 * deck — the river reads as flowing on beneath the timber.
 */
function isWaterChar(char: string): boolean {
  return char === WATER_CHAR || char === BRIDGE_CHAR
}

/* ------------------------------------------------------------------ */
/* Tolerant sprite loading                                             */
/* ------------------------------------------------------------------ */

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePalette(source: unknown): Record<string, string> {
  if (!isRecord(source)) return {}
  const palette: Record<string, string> = {}
  for (const [key, color] of Object.entries(source)) {
    if (typeof color === 'string') palette[key] = color
  }
  return palette
}

function normalizeRows(source: unknown): string[] {
  if (typeof source === 'string') return source.split('\n')
  if (!Array.isArray(source)) return []
  return source.filter((row): row is string => typeof row === 'string')
}

/**
 * The sprite bank shapes are owned by a parallel agent, so frames are read
 * tolerantly: pixels may be a flat multi-line string, a bare array of row
 * strings, or an object under `rows`/`pixels`/`data`; the palette may hang off
 * the frame, the sprite, or nowhere (then chars stay transparent).
 */
function normalizeFrame(source: unknown, spritePalette: Record<string, string>): RasterFrame | null {
  const bareRows = typeof source === 'string' || Array.isArray(source) ? normalizeRows(source) : null
  if (bareRows) {
    const width = bareRows.reduce((longest, row) => Math.max(longest, row.length), 0)
    return bareRows.length > 0 && width > 0
      ? { width, height: bareRows.length, rows: bareRows, palette: spritePalette }
      : null
  }
  if (!isRecord(source)) return null
  const rows = normalizeRows(source.rows ?? source.pixels ?? source.data)
  if (rows.length === 0) return null
  const longest = rows.reduce((max, row) => Math.max(max, row.length), 0)
  const width = typeof source.width === 'number' && source.width > 0 ? source.width : longest
  const height = typeof source.height === 'number' && source.height > 0 ? source.height : rows.length
  if (width <= 0 || height <= 0) return null
  const framePalette = normalizePalette(source.palette)
  return {
    width,
    height,
    rows,
    palette: Object.keys(framePalette).length > 0 ? framePalette : spritePalette
  }
}

function normalizeSprite(source: unknown): RasterSprite | null {
  if (!isRecord(source)) return null
  const palette = normalizePalette(source.palette)
  const rawFrames = Array.isArray(source.frames)
    ? source.frames
    : source.frame !== undefined
      ? [source.frame]
      : []
  const frames: RasterFrame[] = []
  for (const raw of rawFrames) {
    const frame = normalizeFrame(raw, palette)
    if (frame) frames.push(frame)
  }
  if (frames.length === 0) return null
  const frameMs = typeof source.frameMs === 'number' && source.frameMs > 0 ? source.frameMs : DEFAULT_FRAME_MS
  return { frames, frameMs }
}

function firstValue(bank: Record<string, unknown>): unknown {
  const values = Object.values(bank)
  return values.length > 0 ? values[0] : undefined
}

/** Horizontally flipped copy, for sprite banks that share one left-facing side. */
function mirrorSprite(sprite: RasterSprite): RasterSprite {
  return {
    ...sprite,
    frames: sprite.frames.map((frame) => ({
      ...frame,
      rows: frame.rows.map((row) => [...row].reverse().join(''))
    }))
  }
}

/**
 * Rows of fully transparent pixels beneath a frame's art. Sprites whose
 * bank art carries empty rows under its feet are shifted down by this many
 * world pixels, so every prop actually lands on its footprint's base line
 * instead of hovering a few pixels above the ground.
 */
function frameBottomPad(frame: RasterFrame): number {
  for (let y = frame.height - 1; y >= 0; y--) {
    const row = frame.rows[y] ?? ''
    for (let x = 0; x < frame.width; x++) {
      if (frame.palette[row.charAt(x)]) return frame.height - 1 - y
    }
  }
  return frame.height
}

/* ------------------------------------------------------------------ */
/* Deterministic hashing and seeded noise                              */
/* ------------------------------------------------------------------ */

/** Deterministic 32-bit hash of a tile coordinate pair; never random. */
function hashCoordinates(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(seed, 0x9e3779b1)
  h ^= h >>> 15
  h = Math.imul(h, 0x2c1b3c6d)
  h ^= h >>> 12
  h = Math.imul(h, 0x297a2d39)
  h ^= h >>> 15
  return h >>> 0
}

/** Small deterministic PRNG for building procedural pixel art once. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ------------------------------------------------------------------ */
/* Color helpers                                                       */
/* ------------------------------------------------------------------ */

interface Rgb {
  r: number
  g: number
  b: number
}

function parseHexColor(color: string): Rgb | null {
  const hex = color.trim()
  const short = /^#([0-9a-f]{3})$/i.exec(hex)
  if (short) {
    const [r, g, b] = [...short[1]]
    return { r: parseInt(r + r, 16), g: parseInt(g + g, 16), b: parseInt(b + b, 16) }
  }
  const full = /^#([0-9a-f]{6})$/i.exec(hex)
  if (full) {
    return {
      r: parseInt(full[1].slice(0, 2), 16),
      g: parseInt(full[1].slice(2, 4), 16),
      b: parseInt(full[1].slice(4, 6), 16)
    }
  }
  return null
}

function shadeColor(color: string, factor: number): string {
  const rgb = parseHexColor(color)
  if (!rgb) return color
  const channel = (value: number): number => clampNumber(Math.round(value * factor), 0, 255)
  return `#${[channel(rgb.r), channel(rgb.g), channel(rgb.b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** Most-used opaque color of a frame, for sampling a bank's own palette. */
function dominantColor(frame: RasterFrame): string | null {
  const counts = new Map<string, number>()
  for (const row of frame.rows) {
    for (const char of row) {
      const color = frame.palette[char]
      if (!color || !color.startsWith('#')) continue
      counts.set(color, (counts.get(color) ?? 0) + 1)
    }
  }
  let best: string | null = null
  let bestCount = 0
  for (const [color, count] of counts) {
    if (count > bestCount) {
      best = color
      bestCount = count
    }
  }
  return best
}

/** Sampled grass tones used to tint procedural overlays so they match the bank. */
interface GrassTones {
  base: string
  dark: string
  light: string
}

function sampleGrassTones(sprite: RasterSprite | null): GrassTones {
  const base = sprite?.frames[0] ? dominantColor(sprite.frames[0]) : null
  if (base) {
    return { base, dark: shadeColor(base, 0.82), light: shadeColor(base, 1.16) }
  }
  return { base: GRASS_BASE_FALLBACK, dark: shadeColor(GRASS_BASE_FALLBACK, 0.82), light: shadeColor(GRASS_BASE_FALLBACK, 1.16) }
}

/* ------------------------------------------------------------------ */
/* Procedural fallback art                                             */
/* ------------------------------------------------------------------ */

function emptyRows(width: number, height: number): string[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => ' '))
}

function rowsToFrame(rows: string[][], palette: Record<string, string>): RasterFrame {
  return { width: rows[0]?.length ?? 0, height: rows.length, rows: rows.map((row) => row.join('')), palette }
}

function spriteOf(frames: RasterFrame[], frameMs = DEFAULT_FRAME_MS): RasterSprite {
  return { frames, frameMs }
}

/** Lively speckled lawn used only if the bank ships no grass tile. */
function proceduralGrass(size: number): RasterSprite {
  const rng = mulberry32(0x6a77a55)
  const rows = emptyRows(size, size)
  const palette = { g: GRASS_BASE_FALLBACK, G: shadeColor(GRASS_BASE_FALLBACK, 0.82), l: shadeColor(GRASS_BASE_FALLBACK, 1.16) }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const roll = rng()
      rows[y][x] = roll < 0.1 ? 'G' : roll < 0.14 ? 'l' : 'g'
    }
  }
  for (let i = 0; i < size; i++) {
    const x = Math.floor(rng() * size)
    const y = Math.floor(rng() * (size - 3))
    rows[y][x] = 'l'
    rows[y + 1][x] = 'G'
    if (y + 2 < size) rows[y + 2][x] = 'g'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Tilled earth with furrow rows, for farm plots the bank does not cover. */
function proceduralSoil(size: number): RasterSprite {
  const rng = mulberry32(0x5011aa)
  const rows = emptyRows(size, size)
  const palette = { d: '#8a5f3a', f: '#6b4426', S: '#a3793f', h: '#a97a4e' }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const furrow = Math.abs(((y + 2) % Math.max(3, Math.floor(size / 3))) - 1) === 0
      rows[y][x] = furrow ? 'f' : rng() < 0.08 ? 'S' : rng() < 0.05 ? 'h' : 'd'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Crop rows: green sprouts standing in furrowed soil. */
function proceduralCrop(size: number): RasterSprite {
  const soil = proceduralSoil(size)
  const rows = soil.frames[0].rows.map((row) => [...row])
  const palette = { ...soil.frames[0].palette, p: '#4fae7c', q: '#a9e9bd', o: OUTLINE_COLOR }
  const stems = [Math.floor(size * 0.3), Math.floor(size * 0.72)]
  for (const cx of stems) {
    for (const cy of [Math.floor(size * 0.3), Math.floor(size * 0.68)]) {
      if (cy + 1 >= size) continue
      rows[cy][cx] = 'q'
      rows[cy + 1][cx] = 'p'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Water fallback with three drifting glint phases. */
function proceduralWater(size: number): RasterSprite {
  const palette = { w: '#3a6fd4', W: '#2a55b4', c: '#aee8f2', k: '#e6faff' }
  const frames: RasterFrame[] = []
  for (let f = 0; f < 3; f++) {
    const rng = mulberry32(0x3a6fd4 + f)
    const rows = emptyRows(size, size)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        rows[y][x] = (x + y * 3 + f * 4) % 7 === 0 ? 'W' : 'w'
      }
    }
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(rng() * (size - 4))
      const y = Math.floor(rng() * size)
      rows[y][x] = 'c'
      if (x + 1 < size) rows[y][x + 1] = 'k'
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames, 420)
}

/** Cliff fallback: rock face with strata bands and a grassy lip on top. */
function proceduralCliff(size: number, tones: GrassTones): RasterSprite {
  const rng = mulberry32(0xc11f22)
  const rows = emptyRows(size, size)
  const palette = {
    b: '#b0793f',
    B: '#8a5a2e',
    d: '#6e4526',
    D: '#4a3020',
    g: tones.base,
    l: tones.light,
    G: tones.dark
  }
  const lipHeight = Math.max(2, Math.floor(size * 0.22))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (y < lipHeight) {
        rows[y][x] = y === 0 ? 'l' : y === lipHeight - 1 ? 'G' : 'g'
      } else {
        const strata = (y - lipHeight) % Math.max(3, Math.floor(size / 4)) === 0
        rows[y][x] = y >= size - 2 ? 'D' : strata ? 'B' : rng() < 0.06 ? 'd' : 'b'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Barn fallback with a visible roof plane, for banks without one. */
function proceduralBarn(tile: number): RasterSprite {
  const w = tile * 3
  const h = Math.round(tile * 2.2)
  const rows = emptyRows(w, h)
  const palette = { o: OUTLINE_COLOR, k: '#8a3a30', K: '#b04c3c', r: '#c85a44', R: '#a34838', D: '#5a3a22', t: '#f0e0c0' }
  const roofBottom = Math.floor(h * 0.42)
  const doorW = Math.max(4, Math.floor(w * 0.22))
  const doorX = Math.floor((w - doorW) / 2)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1
      if (edge) {
        rows[y][x] = 'o'
      } else if (y < roofBottom) {
        // Roof plane: ridge highlight fading toward the eaves, light from the top left.
        rows[y][x] = y <= 1 ? 'K' : x < w / 2 ? 'K' : 'k'
      } else if (y === roofBottom) {
        rows[y][x] = 't'
      } else if (x >= doorX && x < doorX + doorW && y > h * 0.5) {
        rows[y][x] = 'D'
      } else {
        rows[y][x] = x > w * 0.66 ? 'R' : 'r'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Scarecrow fallback: pole, arms, straw head and a hat. */
function proceduralScarecrow(tile: number): RasterSprite {
  const w = tile
  const h = Math.round(tile * 1.5)
  const rows = emptyRows(w, h)
  const palette = { o: OUTLINE_COLOR, p: '#8a5f3a', P: '#6b4426', s: '#d9b678', h: '#5a4a3a', t: '#d85846' }
  const poleX = Math.floor(w / 2)
  const armY = Math.floor(h * 0.42)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1
      if (edge) rows[y][x] = 'o'
      else if (y < armY - 2) rows[y][x] = y <= 1 ? 'h' : 's'
      else if (y === armY - 2) rows[y][x] = 'h'
      else if (y === armY || y === armY + 1) rows[y][x] = x > poleX ? 'p' : 'P'
      else if (y <= armY + 3) rows[y][x] = 't'
      else rows[y][x] = x === poleX ? 'p' : ' '
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Fence fallback: one post with two rails, tileable into runs. */
function proceduralFence(tile: number): RasterSprite {
  const w = tile
  const h = Math.round(tile * 0.75)
  const rows = emptyRows(w, h)
  const palette = { o: OUTLINE_COLOR, p: '#a97a4e', P: '#8a5f3a', K: '#c9995f' }
  const postX = Math.floor(w / 2)
  const railY1 = Math.floor(h * 0.3)
  const railY2 = Math.floor(h * 0.65)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const edge = y === 0 || y === h - 1
      if (edge && (x === 0 || x === w - 1)) rows[y][x] = 'o'
      else if (Math.abs(x - postX) <= 1) rows[y][x] = x < postX ? 'K' : 'P'
      else if (y === railY1 || y === railY2) rows[y][x] = 'p'
      else if (y === railY1 + 1 || y === railY2 + 1) rows[y][x] = x > w / 2 ? 'P' : ' '
      else rows[y][x] = ' '
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** A visible stand-in for any sprite key the sprite bank does not provide. */
function makePlaceholderSprite(size: number, tone: string, accent: string): RasterSprite {
  const rows: string[] = []
  const center = size / 2 - 0.5
  for (let y = 0; y < size; y++) {
    let row = ''
    for (let x = 0; x < size; x++) {
      const edge = x === 0 || y === 0 || x === size - 1 || y === size - 1
      const dot = Math.abs(x - center) < 1 && Math.abs(y - center) < 1
      row += edge ? 'o' : dot ? 'x' : ' '
    }
    rows.push(row)
  }
  return spriteOf([{ width: size, height: size, rows, palette: { o: tone, x: accent } }])
}

/* ------------------------------------------------------------------ */
/* Ground overlays (grass life, cliff depth, water corners)            */
/* ------------------------------------------------------------------ */

/** Four speckle dab frames: hash-chosen and hash-mirrored per tile, they
 * dissolve the bank's repeating pattern and its faint grid line. */
function buildSpeckleFrames(size: number, tones: GrassTones): RasterSprite {
  const palette = { d: tones.dark, l: tones.light, b: tones.base }
  const frames: RasterFrame[] = []
  for (let f = 0; f < 4; f++) {
    const rng = mulberry32(0x5bec5 + f * 7919)
    const rows = emptyRows(size, size)
    for (let i = 0; i < Math.max(12, Math.floor(size * 1.25)); i++) {
      const x = Math.floor(rng() * size)
      const y = Math.floor(rng() * size)
      rows[y][x] = rng() < 0.55 ? 'd' : 'l'
      if (rng() < 0.3 && x + 1 < size) rows[y][x + 1] = rows[y][x]
    }
    // Repaint the shared edges fully in base color first — that erases the
    // bank's faint 1px grid line outright — then break them up with dabs.
    for (let y = 0; y < size; y++) {
      rows[y][size - 1] = 'b'
      rows[y][0] = 'b'
    }
    for (let x = 0; x < size; x++) {
      rows[size - 1][x] = 'b'
      rows[0][x] = 'b'
    }
    for (let i = 0; i < Math.max(6, Math.floor(size * 0.55)); i++) {
      const y = Math.floor(rng() * size)
      const x = Math.floor(rng() * size)
      const tone = rng() < 0.55 ? 'd' : 'l'
      rows[y][size - 1] = tone
      rows[y][0] = tone
      rows[size - 1][x] = tone
      rows[0][x] = tone
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames)
}


/** Grassy lip drawn where a cliff top meets open ground above it. */
function buildCliffLip(size: number, tones: GrassTones): RasterSprite {
  const lipH = Math.max(3, Math.round(size * 0.28))
  const rows = emptyRows(size, lipH)
  const palette = { l: tones.light, g: tones.base, G: tones.dark, e: 'rgba(35, 45, 30, 0.5)' }
  for (let y = 0; y < lipH; y++) {
    for (let x = 0; x < size; x++) {
      rows[y][x] = y === 0 ? 'l' : y === lipH - 1 ? 'e' : y === lipH - 2 ? 'G' : 'g'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Faint horizontal strata bands laid over the rock face. */
function buildCliffStrata(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { b: 'rgba(74, 48, 32, 0.2)', c: 'rgba(58, 40, 26, 0.16)' }
  const band1 = Math.floor(size * 0.42)
  const band2 = Math.floor(size * 0.68)
  for (let x = 0; x < size; x++) {
    rows[band1][x] = 'b'
    if (band1 + 1 < size) rows[band1 + 1][x] = 'c'
    if (Math.floor(size * 0.3) <= x) rows[band2][x] = 'c'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Dark left edge of a cliff run; the light comes from the top left. */
function buildCliffEdgeDark(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { e: 'rgba(40, 28, 18, 0.4)', E: 'rgba(40, 28, 18, 0.2)' }
  for (let y = 0; y < size; y++) {
    rows[y][0] = 'e'
    if (size > 1) rows[y][1] = 'E'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Sunlit right edge of a cliff run, one shade lifted. */
function buildCliffEdgeLight(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { l: 'rgba(200, 149, 90, 0.35)', L: 'rgba(200, 149, 90, 0.18)' }
  for (let y = 0; y < size; y++) {
    rows[y][size - 1] = 'l'
    if (size > 1) rows[y][size - 2] = 'L'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Loose rubble scattered along the base of a cliff that meets ground. */
function buildCliffRubble(size: number): RasterSprite {
  const rng = mulberry32(0x4b01e)
  const rows = emptyRows(size, size)
  const palette = { r: 'rgba(58, 40, 28, 0.4)', R: 'rgba(40, 28, 20, 0.3)' }
  for (let i = 0; i < Math.max(4, Math.floor(size * 0.4)); i++) {
    const x = Math.floor(rng() * size)
    rows[size - 2][x] = rng() < 0.5 ? 'r' : 'R'
    if (rng() < 0.4 && x + 1 < size) rows[size - 2][x + 1] = 'R'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Dark contact band where a cliff face drops onto walkable ground. */
function buildCliffContact(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { c: 'rgba(25, 16, 10, 0.34)', C: 'rgba(25, 16, 10, 0.2)' }
  for (let x = 0; x < size; x++) {
    rows[size - 1][x] = 'c'
    if (size > 2) rows[size - 2][x] = 'C'
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

type CornerId = 'nw' | 'ne' | 'sw' | 'se'

/** Inner (concave) water corner: two land edges meeting pinches the shore. */
function buildWaterInnerCorner(size: number, corner: CornerId): RasterSprite {
  const radius = Math.max(3, Math.round(size * 0.38))
  const rows = emptyRows(size, size)
  const palette = { s: 'rgba(38, 80, 158, 0.5)', c: 'rgba(174, 232, 242, 0.35)' }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = corner === 'nw' || corner === 'ne' ? x : size - 1 - x
      const dy = corner === 'nw' || corner === 'sw' ? y : size - 1 - y
      if (dx * dx + dy * dy <= radius * radius) {
        rows[y][x] = dx + dy <= radius * 0.55 ? 'c' : 's'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Shadow a cliff face casts onto the ground tile below it. */
function buildCliffCastShadow(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const depth = Math.max(3, Math.round(size * 0.45))
  const palette = { a: 'rgba(25, 16, 10, 0.26)', b: 'rgba(25, 16, 10, 0.18)', c: 'rgba(25, 16, 10, 0.1)' }
  for (let y = 0; y < depth; y++) {
    const tone = y < depth * 0.4 ? 'a' : y < depth * 0.75 ? 'b' : 'c'
    for (let x = 0; x < size; x++) rows[y][x] = tone
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** The pond's sunken inner wall: columns of varied depth, some missing
 * entirely, so the band reads as an irregular sunken rim, never a bar. */
function buildWaterInnerFace(size: number): RasterSprite {
  const palette = { h: 'rgba(174, 232, 242, 0.5)', s: 'rgba(38, 80, 158, 0.45)' }
  const frames: RasterFrame[] = []
  for (let f = 0; f < 4; f++) {
    const rng = mulberry32(0x7ace + f * 3301)
    const rows = emptyRows(size, size)
    for (let x = 0; x < size; x++) {
      if (rng() < 0.22) continue // gaps: the rim breaks for whole columns
      const columnH = 2 + Math.floor(rng() * Math.max(2, size * 0.16))
      for (let y = 0; y < columnH && y < size; y++) {
        rows[y][x] = y < columnH - 1 ? 'h' : 's'
      }
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames)
}

/** Vertical reflection smear below the near bank, tying the rim to the water. */
function buildWaterSmear(size: number): RasterSprite {
  const rng = mulberry32(0x5ae41)
  const rows = emptyRows(size, size)
  const palette = { m: 'rgba(233, 255, 250, 0.16)', w: 'rgba(174, 232, 242, 0.1)' }
  const top = Math.round(size * 0.28)
  for (let i = 0; i < Math.max(3, Math.floor(size * 0.3)); i++) {
    const x = Math.floor(rng() * size)
    const height = Math.max(2, Math.floor(rng() * (size - top)))
    for (let y = top; y < Math.min(size, top + height); y++) {
      rows[y][x] = rng() < 0.4 ? 'w' : 'm'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Outer (convex) water corner: a land tip pokes into the pond. */
function buildWaterOuterCorner(size: number, corner: CornerId): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { h: 'rgba(174, 232, 242, 0.55)', k: 'rgba(230, 250, 255, 0.4)' }
  const reach = Math.max(4, Math.round(size * 0.34))
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = corner === 'nw' || corner === 'ne' ? x : size - 1 - x
      const dy = corner === 'nw' || corner === 'sw' ? y : size - 1 - y
      // A rounded, slightly squashed quarter-ellipse whose rim wobbles
      // deterministically and dissolves in a checker dither, so the shore
      // tip reads worn and natural, never as a hard 45-degree triangle.
      const wobble = reach * (0.88 + (((x * 13 + y * 7) % 7) / 7) * 0.24)
      const d = Math.hypot(dx, dy * 1.25)
      if (d <= wobble * 0.66) {
        rows[y][x] = 'k'
      } else if (d <= wobble) {
        if ((x + y) % 3 !== 0) rows[y][x] = 'h'
      } else if (d <= wobble * 1.16 && (x + y) % 2 === 0) {
        rows[y][x] = 'h'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/**
 * The river crossing: a wooden bridge deck seen from above, carrying the
 * east-west path over the north-south river. Planks run north-south —
 * perpendicular to the walk line — as ~3px boards with a lit west edge and
 * a shaded seam, timber rails run the long north and south sides with
 * bolted posts at the corners, and a 1px near-black outline wraps the
 * silhouette, matching the world's art conventions. The very north and
 * south edges stay clear so the river still shows beneath the deck. One
 * static frame at the native tile size.
 */
function buildBridgeDeck(size: number): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    o: OUTLINE_COLOR,
    L: '#d9a86a', // rail top face catching the light
    l: '#c99a63', // lit plank edge
    p: '#a97a4e', // plank body
    d: '#7c5233', // shaded seam between boards
    r: '#8a5f3a', // rail body
    R: '#6b4426', // rail shaded face / post block
    k: '#4a3020'  // rain gap where two boards part
  }
  // Water breathing room top and bottom, so the deck floats over the river.
  const pad = Math.max(1, Math.round(size / 16))
  const top = pad
  const bottom = size - 1 - pad
  // Rails are slim 3px beams; they only shrink on absurdly tiny tiles.
  const railH = Math.max(1, Math.min(3, Math.floor((bottom - top - 1) / 4)))
  const northRailTop = top + 1
  const northRailBottom = northRailTop + railH - 1
  const southRailBottom = bottom - 1
  const southRailTop = southRailBottom - railH + 1
  const plankTop = northRailBottom + 1
  const plankBottom = southRailTop - 1

  // Silhouette: one pixel of near-black all around the deck.
  for (let x = 0; x < size; x++) {
    rows[top][x] = 'o'
    rows[bottom][x] = 'o'
  }
  for (let y = top; y <= bottom; y++) {
    rows[y][0] = 'o'
    rows[y][size - 1] = 'o'
  }

  // Rails: a lit top face, a body, then a shaded face toward the planks.
  for (let x = 1; x < size - 1; x++) {
    for (let y = northRailTop; y <= northRailBottom; y++) {
      rows[y][x] = y === northRailTop ? 'L' : y === northRailBottom ? 'R' : 'r'
    }
    for (let y = southRailTop; y <= southRailBottom; y++) {
      rows[y][x] = y === southRailTop ? 'L' : y === southRailBottom ? 'R' : 'r'
    }
  }

  // Planks: vertical boards across the tile width, each with its lit west
  // edge and its shaded east seam, tucked between the two rails.
  const plankW = Math.max(2, Math.min(3, Math.floor(size / 10)))
  for (let x = 1; x < size - 1; x++) {
    const edge = (x - 1) % plankW
    const tone = edge === 0 ? 'l' : edge === plankW - 1 ? 'd' : 'p'
    for (let y = plankTop; y <= plankBottom; y++) rows[y][x] = tone
  }

  // A couple of rain gaps: thin dark lines where two boards part.
  const boards = Math.floor((size - 2) / plankW)
  const gapCount = Math.max(1, Math.floor(boards / 4))
  for (let i = 0; i < gapCount; i++) {
    const board = Math.min(boards - 1, 1 + Math.round(((i + 1) * (boards - 2)) / (gapCount + 1)))
    const gapX = 1 + board * plankW
    if (gapX <= 0 || gapX >= size - 1) continue
    for (let y = plankTop; y <= plankBottom; y++) rows[y][gapX] = 'k'
  }

  // Corner posts: chunky blocks a row deeper than the rail, bolted down.
  const postW = Math.max(3, Math.round(size / 8))
  const postH = railH + 1
  const post = (x0: number, y0: number): void => {
    for (let dy = 0; dy < postH; dy++) {
      const y = y0 + dy
      if (y <= top || y >= bottom) continue
      for (let dx = 0; dx < postW; dx++) {
        const x = x0 + dx
        if (x <= 0 || x >= size - 1) continue
        rows[y][x] = dy === 0 ? 'r' : 'R'
      }
    }
    if (y0 > top && x0 > 0) rows[y0][x0] = 'l'
    const boltX = x0 + Math.floor(postW / 2)
    const boltY = y0 + Math.floor(postH / 2)
    if (boltY > top && boltY < bottom && boltX > 0 && boltX < size - 1) rows[boltY][boltX] = 'o'
  }
  post(1, northRailTop)
  post(size - 1 - postW, northRailTop)
  post(1, southRailBottom - postH + 1)
  post(size - 1 - postW, southRailBottom - postH + 1)

  return spriteOf([rowsToFrame(rows, palette)])
}

/* ------------------------------------------------------------------ */
/* The renderer                                                        */
/* ------------------------------------------------------------------ */

/** Offscreen canvases are shared across renderer instances and built once. */
const canvasCache = new Map<string, HTMLCanvasElement>()

export class WorldRenderer {
  private readonly viewWidth: number
  private readonly viewHeight: number
  private readonly ambient: boolean
  private readonly tileSize: number
  private readonly worldWidth: number
  private readonly worldHeight: number
  private readonly worldPxWidth: number
  private readonly worldPxHeight: number
  /** Pixel scale from sprite-bank space to world space (bank 16px -> 32px world = 2). */
  private readonly spriteScale: number
  private readonly cullMargin: number
  private readonly staticScene: readonly SceneEntry[]
  private readonly fishMotions: readonly FishMotion[]
  private readonly butterflies: readonly ButterflyMotion[]
  private readonly grassTones: GrassTones
  private readonly groundStyles = new Map<string, GroundStyle>()
  private readonly terrainCache = new Map<string, RasterSprite | null>()
  private readonly grassVariants: readonly RasterSprite[]
  private readonly edgeCache = new Map<string, RasterSprite | null>()
  private readonly propCache = new Map<string, RasterSprite>()
  private readonly playerCache = new Map<PlayerDirection, RasterSprite>()
  private readonly overlayCache = new Map<string, RasterSprite>()
  /** Swim rings per fish anchor tile, so each fish loops the water it was placed in. */
  private readonly pondRingCache = new Map<number, { path: PondWaypoint[]; cx: number; cy: number }>()
  private readonly fishSchedule: AnimationFrameSchedule
  private readonly butterflySchedule: AnimationFrameSchedule
  private vignette: CanvasGradient | null = null
  private vignetteCtx: CanvasRenderingContext2D | null = null
  private fringe: HTMLCanvasElement | null = null

  constructor(options: WorldRendererOptions) {
    this.viewWidth = options.viewWidth ?? DEFAULT_VIEW_WIDTH
    this.viewHeight = options.viewHeight ?? DEFAULT_VIEW_HEIGHT
    this.ambient = options.ambient ?? true
    this.tileSize = worldMap.tileSize > 0 ? worldMap.tileSize : DEFAULT_TILE_SIZE
    this.worldWidth = worldMap.width
    this.worldHeight = worldMap.height
    this.worldPxWidth = this.worldWidth * this.tileSize
    this.worldPxHeight = this.worldHeight * this.tileSize
    this.cullMargin = Math.max(64, this.tileSize * 2)

    // The grass tile defines the sprite bank's native pixel size; everything
    // rasterized is scaled from that into world space.
    const terrainBank = terrainSprites as unknown as Record<string, unknown>
    const grassSprite = normalizeSprite(terrainBank.grass) ?? normalizeSprite(firstValue(terrainBank))
    const nativeTile = grassSprite?.frames[0]?.width ?? this.tileSize
    this.spriteScale = clampNumber(this.tileSize / (nativeTile > 0 ? nativeTile : this.tileSize), 0.5, 4)
    this.grassTones = sampleGrassTones(grassSprite)
    this.grassVariants = this.collectGrassVariants(grassSprite)

    // Tail and wing flaps are slowed a touch so the gliding fish and the
    // hovering bugs never read as frantic, whatever the shared schedules say.
    this.fishSchedule = this.pacedSchedule(WORLD_ANIMATION_SCHEDULES.fish, 'fish', 1.5)
    this.butterflySchedule = this.pacedSchedule(WORLD_ANIMATION_SCHEDULES.butterfly, 'butterfly', 1.4)

    const entries: SceneEntry[] = []
    const fish: FishMotion[] = []
    const bugs: ButterflyMotion[] = []

    for (const object of worldMap.objects) {
      const hash = hashCoordinates(object.x, object.y, object.type.length * 31)
      // Multi-tile props declare their footprint; anchoring honors it.
      const footW = Math.max(1, Math.floor(object.width ?? 1))
      const footH = Math.max(1, Math.floor(object.height ?? 1))
      if (FISH_TYPES.has(object.type)) {
        const motion = this.buildFishMotion(object, footW, footH, hash)
        if (motion) fish.push(motion)
        continue
      }
      if (BUG_TYPES.has(object.type)) {
        bugs.push(this.buildButterflyMotion(object, footW, footH, hash))
        continue
      }
      // A fence or gate on a vertical run needs its vertical sprite; a
      // horizontal run keeps the horizontal one.
      const isVerticalRun =
        (object.type === 'fence' && footH > footW) ||
        (object.type === 'gate' && footH >= footW)
      const sprite = this.propSprite(isVerticalRun ? `${object.type}Vertical` : object.type)
      const base = sprite.frames[0]
      const width = (base?.width ?? this.tileSize) * this.spriteScale
      const height = (base?.height ?? this.tileSize) * this.spriteScale
      const basePad = base ? frameBottomPad(base) * this.spriteScale : 0
      // Buildings read as buildings: a cottage or barn sprite is scaled up
      // (a whole-number factor, drawn nearest-neighbour) so its walls fill
      // most of the footprint the player actually collides with.
      const buildingScale =
        object.type === 'cottage' || object.type === 'barn'
          ? clampNumber(Math.round((footW * this.tileSize) / Math.max(1, width)), 1, 3)
          : 1
      const drawWidth = width * buildingScale
      const drawHeight = height * buildingScale
      const drawBasePad = basePad * buildingScale
      // A fence object declares a whole run; the bank sprite covers one
      // tile of it. Tile the sprite across every footprint tile so the
      // run reads as a continuous grounded fence, post by post.
      if (object.type === 'fence' && (footW > 1 || footH > 1)) {
        for (let dy = 0; dy < footH; dy++) {
          for (let dx = 0; dx < footW; dx++) {
            const tileX = (object.x + dx) * this.tileSize
            const tileBaseY = (object.y + dy + 1) * this.tileSize
            entries.push({
              type: object.type,
              sprite,
              x: tileX + (this.tileSize - width) / 2,
              baseY: tileBaseY,
              width,
              height,
              depth: tileBaseY,
              phase: hash % 1600,
              castsShadow: true,
              basePad
            })
          }
        }
        continue
      }
      // Feet sit on the footprint's bottom edge; the sprite centers over it.
      const cx = object.x * this.tileSize + (footW * this.tileSize) / 2
      const baseY = (object.y + footH) * this.tileSize
      entries.push({
        type: object.type,
        sprite,
        x: cx - drawWidth / 2,
        baseY,
        width: drawWidth,
        height: drawHeight,
        depth: baseY,
        phase: hash % 1600,
        castsShadow: !FLOATER_TYPES.has(object.type),
        basePad: drawBasePad
      })
    }

    entries.sort((a, b) => a.depth - b.depth || a.x - b.x)
    this.staticScene = entries
    this.fishMotions = fish
    this.butterflies = bugs
  }

  /** Animation clock data for a player direction, so callers can cycle frames. */
  playerAnimation(direction: PlayerDirection): SpriteAnimation {
    const sprite = this.playerSprite(direction)
    const walk = WORLD_ANIMATION_SCHEDULES.playerWalk
    const frameCount = sprite.frames.length
    const frameMs = walk.frameCount === frameCount ? walk.frameMs : sprite.frameMs
    return { frameCount, frameMs }
  }

  render(ctx: CanvasRenderingContext2D, state: RenderState, time: number): void {
    const camX = Math.round(clampNumber(state.camera.x, 0, Math.max(0, this.worldPxWidth - this.viewWidth)))
    const camY = Math.round(clampNumber(state.camera.y, 0, Math.max(0, this.worldPxHeight - this.viewHeight)))

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight)
    // Beyond-map area reads as distant lawn rather than a hole in the world.
    ctx.fillStyle = shadeColor(this.grassTones.base, 0.55)
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)

    // ¾-view presentation: the GROUND plane is compressed per row and sheared
    // a little to the right going down. Props, the player and critters are
    // drawn upright in screen space, their feet projected onto this tilt.
    ctx.setTransform(1, 0, SHEAR_PX_PER_TILE / this.tileSize, ROW_COMPRESS, 0, 0)

    this.drawGround(ctx, camX, camY)

    ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.drawLandmarkGlow(ctx, state.activeLandmarkId, camX, camY, time)
    this.drawShadows(ctx, state, camX, camY)
    this.drawScene(ctx, state, camX, camY, time)
    this.drawButterflies(ctx, camX, camY, time)
    if (this.ambient) this.drawVignette(ctx)
    this.drawFringe(ctx)
  }

  /** World x to screen x under the ¾-view tilt (matches the ground transform). */
  private projectX(worldX: number, worldY: number, camX: number, camY: number): number {
    return worldX - camX + (SHEAR_PX_PER_TILE / this.tileSize) * (worldY - camY)
  }

  /** World y to screen y under the ¾-view tilt (matches the ground transform). */
  private projectY(worldY: number, camY: number): number {
    return (worldY - camY) * ROW_COMPRESS
  }

  /* ---------------------------------------------------------------- */
  /* Ground                                                            */
  /* ---------------------------------------------------------------- */

  private collectGrassVariants(fallback: RasterSprite | null): RasterSprite[] {
    const bank = terrainSprites as unknown as Record<string, unknown>
    const keys = Object.keys(bank).filter((key) => {
      if (key === 'tallGrass' || key === 'grassTall') return false
      return /^grass(\d+|[A-Za-z]|[-_](variant|v)\d*)?$/i.test(key)
    })
    keys.sort((a, b) => (a === 'grass' ? -1 : b === 'grass' ? 1 : a.localeCompare(b)))
    const variants: RasterSprite[] = []
    for (const key of keys) {
      const sprite = normalizeSprite(bank[key])
      if (sprite) variants.push(sprite)
    }
    if (variants.length === 0 && fallback) variants.push(fallback)
    if (variants.length === 0) variants.push(proceduralGrass(Math.round(this.tileSize / this.spriteScale)))
    return variants
  }

  /** Ground treatment for a map character, resolved once and memoized. */
  private groundStyle(char: string): GroundStyle {
    const cached = this.groundStyles.get(char)
    if (cached) return cached
    const kind = CHAR_KINDS[char] ?? 'flat'
    const bank = terrainSprites as unknown as Record<string, unknown>
    const candidates = kind === 'flat' ? [char] : KIND_BANK_KEYS[kind]
    const variants: RasterSprite[] = []
    for (const key of candidates) {
      const sprite = normalizeSprite(bank[key])
      if (sprite) {
        variants.push(sprite)
        break
      }
    }
    if (variants.length === 0) {
      const native = Math.round(this.tileSize / this.spriteScale)
      const procedural =
        kind === 'grass'
          ? this.grassVariants[0] ?? null
          : kind === 'soil'
            ? proceduralSoil(native)
            : kind === 'crop'
              ? proceduralCrop(native)
              : kind === 'water'
                ? proceduralWater(native)
                : kind === 'cliff'
                  ? proceduralCliff(native, this.grassTones)
                  : null
      if (procedural) variants.push(procedural)
      else if (kind === 'flat') {
        const bankSprite = normalizeSprite(bank[char])
        variants.push(bankSprite ?? makePlaceholderSprite(native, '#6a7a5a', '#8fae74'))
      } else {
        variants.push(makePlaceholderSprite(native, '#587953', '#8fae74'))
      }
    }
    const style: GroundStyle = { kind, variants }
    this.groundStyles.set(char, style)
    return style
  }

  /** A shared schedule clamped to the sprite's frames and slowed by `pace`. */
  private pacedSchedule(schedule: AnimationFrameSchedule, key: string, pace: number): AnimationFrameSchedule {
    const sprite =
      key === 'fish' || key === 'butterfly' || key === 'campfire' || key === 'lampGlow' || key === 'pineSway'
        ? this.propSpriteOfKey(key)
        : null
    const frameCount = sprite ? Math.min(schedule.frameCount, Math.max(1, sprite.frames.length)) : schedule.frameCount
    return { frameCount, frameMs: schedule.frameMs * pace, pingPong: schedule.pingPong }
  }

  private propSpriteOfKey(key: string): RasterSprite | null {
    const bank = propSprites as unknown as Record<string, unknown>
    return normalizeSprite(bank[key])
  }

  private drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number): void {
    const ts = this.tileSize
    const startX = Math.max(0, Math.floor(camX / ts))
    const startY = Math.max(0, Math.floor(camY / ts))
    // The tilt stretches world pixels across the view, so cover the extra reach.
    const rowsVisible = this.viewHeight / ROW_COMPRESS / ts + 2
    const endX = Math.min(this.worldWidth, Math.ceil((camX + this.viewWidth + SHEAR_PX_PER_TILE * rowsVisible) / ts) + 1)
    const endY = Math.min(this.worldHeight, Math.ceil((camY + this.viewHeight / ROW_COMPRESS) / ts) + 1)

    for (let ty = startY; ty < endY; ty++) {
      const row = worldMap.ground[ty]
      for (let tx = startX; tx < endX; tx++) {
        const char = row?.charAt(tx) ?? '.'
        const style = this.groundStyle(char)
        const hash = hashCoordinates(tx, ty, char.charCodeAt(0) * 17 + 3)
        const sx = tx * ts - camX
        const sy = ty * ts - camY
        const sprite = style.variants[hash % style.variants.length]
        // Floor tiles never animate: each holds one hash-chosen frame, so
        // the terrain still varies organically tile to tile while the
        // ground plane stays perfectly calm. (A moving floor reads as
        // visual noise before it ever reads as water or wind.)
        let frame: number
        if (style.kind === 'crop') {
          // Fields keep coherent stages instead: the young rows stay young
          // and the wheat rows ripen together.
          frame = char === 'w' ? sprite.frames.length - 1 : Math.min(1, sprite.frames.length - 1)
        } else {
          frame = hash % sprite.frames.length
        }
        const canvas = this.frameCanvas('terrain', char, sprite, frame)
        if (canvas) ctx.drawImage(canvas, sx, sy)

        if (style.kind === 'grass') this.drawGrassLife(ctx, sx, sy, hash)
        else if (style.kind === 'water') {
          this.drawWaterEdges(ctx, tx, ty, camX, camY)
          // A bridge tile is river water wearing a deck: the base and the
          // shoreline overlays land first, then the timber rides on top.
          if (char === BRIDGE_CHAR) {
            const deck = this.overlaySprite('bridgeDeck', () => buildBridgeDeck(this.nativeTile()))
            const deckCanvas = this.frameCanvas('overlay', 'bridgeDeck', deck, 0)
            if (deckCanvas) ctx.drawImage(deckCanvas, sx, sy)
          }
        } else if (style.kind === 'cliff') this.drawCliffDepth(ctx, tx, ty, sx, sy)
        // A cliff casts a soft shadow onto whatever ground lies below it.
        if (style.kind !== 'cliff' && this.groundChar(tx, ty - 1) === CLIFF_CHAR) {
          const cast = this.overlaySprite('cliffCast', () => buildCliffCastShadow(this.nativeTile()))
          const canvas = this.frameCanvas('overlay', 'cliffCast', cast, 0)
          if (canvas) ctx.drawImage(canvas, sx, sy)
        }
      }
    }
  }

  /** Hash-chosen speckle dabs, per tile: static detail, no motion. */
  private drawGrassLife(ctx: CanvasRenderingContext2D, sx: number, sy: number, hash: number): void {
    const speckles = this.overlaySprite('speckles', () => buildSpeckleFrames(this.nativeTile(), this.grassTones))
    const speckle = this.frameCanvas(
      'overlay',
      'speckles',
      speckles,
      hash % speckles.frames.length,
      (hash >>> 7) % 2 === 1
    )
    if (speckle) ctx.drawImage(speckle, sx, sy)
  }

  /** Cliff face treatment: lip, strata, rubble, contact band and run side edges. */
  private drawCliffDepth(ctx: CanvasRenderingContext2D, tx: number, ty: number, sx: number, sy: number): void {
    const n = this.nativeTile()
    const belowIsCliff = this.groundChar(tx, ty + 1) === CLIFF_CHAR
    const aboveIsCliff = this.groundChar(tx, ty - 1) === CLIFF_CHAR
    const drawOverlay = (name: string, sprite: RasterSprite, dy: number): void => {
      const canvas = this.frameCanvas('overlay', name, sprite, 0)
      if (canvas) ctx.drawImage(canvas, sx, sy + dy)
    }
    // A vertical run reads as one face: grass lip on the crown row, strata
    // down the middle, rubble and contact shadow where it meets the ground.
    if (!aboveIsCliff) {
      drawOverlay('cliffLip', this.overlaySprite('cliffLip', () => buildCliffLip(n, this.grassTones)), 0)
    }
    drawOverlay('cliffStrata', this.overlaySprite('cliffStrata', () => buildCliffStrata(n)), 0)
    if (!belowIsCliff) {
      drawOverlay('cliffRubble', this.overlaySprite('cliffRubble', () => buildCliffRubble(n)), 0)
      drawOverlay('cliffContact', this.overlaySprite('cliffContact', () => buildCliffContact(n)), 0)
    }
    // Side edges give the face volume; light comes from the top left.
    if (this.groundChar(tx - 1, ty) !== CLIFF_CHAR) {
      drawOverlay('cliffEdgeL', this.overlaySprite('cliffEdgeL', () => buildCliffEdgeDark(n)), 0)
    }
    if (this.groundChar(tx + 1, ty) !== CLIFF_CHAR) {
      drawOverlay('cliffEdgeR', this.overlaySprite('cliffEdgeR', () => buildCliffEdgeLight(n)), 0)
    }
  }

  /** Shoreline bands plus inner and outer corners around this water tile. */
  private drawWaterEdges(ctx: CanvasRenderingContext2D, tx: number, ty: number, camX: number, camY: number): void {
    const ts = this.tileSize
    const sx = tx * ts - camX
    const sy = ty * ts - camY
    const north = isWaterChar(this.groundChar(tx, ty - 1))
    const south = isWaterChar(this.groundChar(tx, ty + 1))
    const west = isWaterChar(this.groundChar(tx - 1, ty))
    const east = isWaterChar(this.groundChar(tx + 1, ty))
    const n = this.nativeTile()
    const tileHash = hashCoordinates(tx, ty, 99)
    const drawOverlayFrame = (name: string, sprite: RasterSprite, index = 0): void => {
      const canvas = this.frameCanvas('overlay', name, sprite, index)
      if (canvas) ctx.drawImage(canvas, sx, sy)
    }
    const corner = (id: string): void => {
      const sprite = this.edgeSprite(id)
      if (!sprite) return
      const canvas = this.frameCanvas('overlay', id, sprite, 0)
      if (canvas) ctx.drawImage(canvas, sx, sy)
    }

    // Shore bands vary per tile (the art carries a second foam frame) and
    // the waterline itself wobbles a pixel or two in and out of the bank,
    // so no straight, constant-depth outline survives a whole run.
    const drawBand = (name: string): void => {
      const sprite = this.edgeSprite(name)
      if (!sprite) return
      const frame = tileHash % sprite.frames.length
      const canvas = this.frameCanvas('terrain', name, sprite, frame)
      if (!canvas) return
      // Perpendicular inset: north/west bands slide into the water,
      // south/east bands slide back toward their land edge.
      const inset = (tileHash >>> 8) % 3
      if (name === 'waterEdgeN') ctx.drawImage(canvas, sx, sy + inset)
      else if (name === 'waterEdgeS') ctx.drawImage(canvas, sx, sy - inset)
      else if (name === 'waterEdgeW') ctx.drawImage(canvas, sx + inset, sy)
      else ctx.drawImage(canvas, sx - inset, sy)
    }
    if (!north) drawBand('waterEdgeN')
    if (!south) drawBand('waterEdgeS')
    if (!west) drawBand('waterEdgeW')
    if (!east) drawBand('waterEdgeE')

    // A north bank reads as sunken: inner wall face plus a vertical smear
    // of the rim reflecting into the water below it.
    if (!north) {
      const face = this.overlaySprite('waterInnerFace', () => buildWaterInnerFace(n))
      drawOverlayFrame('waterInnerFace', face, tileHash % face.frames.length)
      const smear = this.overlaySprite('waterSmear', () => buildWaterSmear(n))
      drawOverlayFrame('waterSmear', smear)
    }

    // Inner corners: two land edges meet and pinch the shore.
    if (!north && !west) corner('waterCornerNW')
    if (!north && !east) corner('waterCornerNE')
    if (!south && !west) corner('waterCornerSW')
    if (!south && !east) corner('waterCornerSE')
    // Outer corners: the diagonal is land while both orthogonal sides are water.
    if (north && west && !isWaterChar(this.groundChar(tx - 1, ty - 1))) corner('waterNotchNW')
    if (north && east && !isWaterChar(this.groundChar(tx + 1, ty - 1))) corner('waterNotchNE')
    if (south && west && !isWaterChar(this.groundChar(tx - 1, ty + 1))) corner('waterNotchSW')
    if (south && east && !isWaterChar(this.groundChar(tx + 1, ty + 1))) corner('waterNotchSE')
  }

  /** Lazily build (once) and cache a procedural overlay sprite by key. */
  private overlaySprite(key: string, build: () => RasterSprite): RasterSprite {
    const cached = this.overlayCache.get(key)
    if (cached) return cached
    const sprite = build()
    this.overlayCache.set(key, sprite)
    return sprite
  }

  private nativeTile(): number {
    return Math.max(8, Math.round(this.tileSize / this.spriteScale))
  }

  private edgeSprite(name: string): RasterSprite | null {
    const cached = this.edgeCache.get(name)
    if (cached !== undefined) return cached
    const bank = terrainSprites as unknown as Record<string, unknown>
    let sprite = normalizeSprite(bank[name])
    if (!sprite) {
      // Corners are renderer-owned; the straight bands may come from the bank.
      const n = this.nativeTile()
      if (name === 'waterCornerNW') sprite = buildWaterInnerCorner(n, 'nw')
      else if (name === 'waterCornerNE') sprite = buildWaterInnerCorner(n, 'ne')
      else if (name === 'waterCornerSW') sprite = buildWaterInnerCorner(n, 'sw')
      else if (name === 'waterCornerSE') sprite = buildWaterInnerCorner(n, 'se')
      else if (name === 'waterNotchNW') sprite = buildWaterOuterCorner(n, 'nw')
      else if (name === 'waterNotchNE') sprite = buildWaterOuterCorner(n, 'ne')
      else if (name === 'waterNotchSW') sprite = buildWaterOuterCorner(n, 'sw')
      else if (name === 'waterNotchSE') sprite = buildWaterOuterCorner(n, 'se')
    }
    this.edgeCache.set(name, sprite)
    return sprite
  }

  /** Ground character at a tile; anything outside the map reads as land. */
  private groundChar(tx: number, ty: number): string {
    if (tx < 0 || ty < 0 || tx >= this.worldWidth || ty >= this.worldHeight) return '.'
    return worldMap.ground[ty]?.charAt(tx) ?? '.'
  }

  /* ---------------------------------------------------------------- */
  /* Critter paths                                                     */
  /* ---------------------------------------------------------------- */

  /** A connected water region: its tile ids plus the bounding box. */
  private pondRegion(
    startX: number,
    startY: number
  ): { ids: number[]; minX: number; minY: number; maxX: number; maxY: number } | null {
    let originX = -1
    let originY = -1
    if (this.groundChar(startX, startY) === WATER_CHAR) {
      originX = startX
      originY = startY
    } else {
      for (let radius = 1; radius <= 8 && originX < 0; radius++) {
        for (let dy = -radius; dy <= radius && originX < 0; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (this.groundChar(startX + dx, startY + dy) === WATER_CHAR) {
              originX = startX + dx
              originY = startY + dy
              break
            }
          }
        }
      }
    }
    if (originX < 0) return null

    const ids: number[] = []
    const seen = new Set<number>()
    const queue: Array<[number, number]> = [[originX, originY]]
    seen.add(originY * this.worldWidth + originX)
    let minX = originX
    let minY = originY
    let maxX = originX
    let maxY = originY
    while (queue.length > 0) {
      const [cx, cy] = queue.pop() as [number, number]
      ids.push(cy * this.worldWidth + cx)
      minX = Math.min(minX, cx)
      minY = Math.min(minY, cy)
      maxX = Math.max(maxX, cx)
      maxY = Math.max(maxY, cy)
      const neighbors: Array<[number, number]> = [
        [cx - 1, cy],
        [cx + 1, cy],
        [cx, cy - 1],
        [cx, cy + 1]
      ]
      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= this.worldWidth || ny >= this.worldHeight) continue
        const id = ny * this.worldWidth + nx
        if (seen.has(id) || this.groundChar(nx, ny) !== WATER_CHAR) continue
        seen.add(id)
        queue.push([nx, ny])
      }
    }
    return { ids, minX, minY, maxX, maxY }
  }

  /**
   * A fish's swim ring: water tiles whose eight neighbours are all water
   * (so the ring always stays a full tile clear of the shore whatever
   * the water's shape), kept within a short radius of the fish's anchor
   * and ordered by angle around that local patch. A pond fish therefore
   * loops its pond and a sea fish its stretch of shore even when both
   * share one connected waterway; the per-frame water check in
   * `fishItem` still guarantees no fish ever touches land.
   */
  private pondRing(startX: number, startY: number): { path: PondWaypoint[]; cx: number; cy: number } | null {
    const region = this.pondRegion(startX, startY)
    if (!region) return null
    const cacheKey = startY * this.worldWidth + startX
    const cached = this.pondRingCache.get(cacheKey)
    if (cached !== undefined) return cached

    const water = new Set(region.ids)
    const enclosed = (id: number): boolean => {
      const tx = id % this.worldWidth
      const ty = Math.floor(id / this.worldWidth)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!water.has((ty + dy) * this.worldWidth + (tx + dx))) return false
        }
      }
      return true
    }
    const interior = region.ids.filter(enclosed)
    // Localize: a fish owns the water within a short radius of the tile it
    // was placed on, so a connected river never drags a pond fish out of
    // its pond or a shore fish across the map.
    const nearAnchor = (ids: number[]): number[] =>
      ids.filter((id) => {
        const dx = (id % this.worldWidth) - startX
        const dy = Math.floor(id / this.worldWidth) - startY
        return Math.hypot(dx, dy) <= 6
      })
    let ringSource = nearAnchor(interior)
    if (ringSource.length < 6) ringSource = nearAnchor(region.ids)
    if (ringSource.length < 3) ringSource = interior.length >= 6 ? interior : region.ids

    let sumX = 0
    let sumY = 0
    for (const id of ringSource) {
      sumX += id % this.worldWidth
      sumY += Math.floor(id / this.worldWidth)
    }
    const centerTileX = sumX / ringSource.length
    const centerTileY = sumY / ringSource.length
    const ts = this.tileSize

    const path = ringSource
      .map((id) => ({
        x: ((id % this.worldWidth) + 0.5) * ts,
        y: (Math.floor(id / this.worldWidth) + 0.5) * ts
      }))
      .sort(
        (a, b) =>
          Math.atan2(a.y / ts - 0.5 - centerTileY, a.x / ts - 0.5 - centerTileX) -
          Math.atan2(b.y / ts - 0.5 - centerTileY, b.x / ts - 0.5 - centerTileX)
      )

    const ring = {
      path,
      cx: (centerTileX + 0.5) * ts,
      cy: (centerTileY + 0.5) * ts
    }
    this.pondRingCache.set(cacheKey, ring)
    return ring
  }

  private buildFishMotion(
    object: { type: string; x: number; y: number },
    footW: number,
    footH: number,
    hash: number
  ): FishMotion | null {
    const sprite = this.propSprite(object.type)
    const anchorX = object.x + Math.floor(footW / 2)
    const anchorY = object.y + Math.floor(footH / 2)
    const ring = this.pondRing(anchorX, anchorY)
    // No pond around the anchor means the fish has nowhere to belong; skip
    // it rather than letting it swim on land.
    if (!ring) return null
    return {
      key: `${object.type}:${object.x}:${object.y}`,
      sprite,
      path: ring.path,
      cx: ring.cx,
      cy: ring.cy,
      ringScale: 0.62 + (hash % 31) / 100,
      // One unhurried lap of the pond takes the better part of a minute;
      // koi glide, they do not race.
      loopMs: 26000 + (hash % 14000),
      phase: (hash % 6283) / 1000
    }
  }

  private buildButterflyMotion(
    object: { type: string; x: number; y: number },
    footW: number,
    footH: number,
    hash: number
  ): ButterflyMotion {
    const ts = this.tileSize
    const inset = Math.max(2, Math.round(ts * 0.12))
    const left = object.x * ts
    const top = object.y * ts
    return {
      key: `${object.type}:${object.x}:${object.y}`,
      sprite: this.propSprite(object.type),
      ax: left + (footW * ts) / 2,
      ay: top + (footH * ts) / 2,
      ampX: ts * 0.3 + (hash % Math.max(1, Math.round(ts / 8))),
      ampY: ts * 0.2 + (hash % Math.max(1, Math.round(ts / 12))),
      // Long, lazy periods: a bug drifts across its tile over ten seconds
      // or more, never zipping or jittering.
      freqX: (Math.PI * 2) / (9200 + (hash % 3600)),
      freqY: (Math.PI * 2) / (7400 + (hash % 2900)),
      phase: (hash % 6283) / 1000,
      phase2: ((hash >>> 8) % 6283) / 1000,
      // The wander box is the anchor tile itself, inset a little, so the
      // bug always hovers over the ground it belongs to.
      minX: left + inset,
      maxX: left + footW * ts - inset,
      minY: top + inset,
      maxY: top + footH * ts - inset
    }
  }

  /* ---------------------------------------------------------------- */
  /* Sprites and raster caches                                         */
  /* ---------------------------------------------------------------- */

  private propSprite(type: string): RasterSprite {
    const cached = this.propCache.get(type)
    if (cached) return cached
    const bank = propSprites as unknown as Record<string, unknown>
    const native = this.nativeTile()
    const alias = PROP_ALIASES[type]
    const sprite =
      normalizeSprite(bank[type]) ??
      normalizeSprite(bank[type.charAt(0).toLowerCase() + type.slice(1)]) ??
      (alias !== undefined ? normalizeSprite(bank[alias]) : null) ??
      (type === 'barn'
        ? proceduralBarn(native)
        : type === 'scarecrow'
          ? proceduralScarecrow(native)
          : type === 'fence' || type === 'gate'
            ? proceduralFence(native)
            : makePlaceholderSprite(native, '#8b7d6b', '#c9b998'))
    this.propCache.set(type, sprite)
    return sprite
  }

  private playerSprite(direction: PlayerDirection): RasterSprite {
    const cached = this.playerCache.get(direction)
    if (cached) return cached
    const bank = playerSprites as unknown as Record<string, unknown>
    // The shared `side` sprite faces left; the right direction mirrors it.
    const side = bank.side
    const raw =
      direction === 'down'
        ? (bank.down ?? firstValue(bank))
        : direction === 'up'
          ? (bank.up ?? side ?? firstValue(bank))
          : direction === 'left'
            ? (bank.left ?? side ?? firstValue(bank))
            : (bank.right ?? side ?? firstValue(bank))
    let sprite = normalizeSprite(raw) ?? makePlaceholderSprite(this.nativeTile(), '#7a5a3e', '#e8c9a0')
    if (direction === 'right' && raw === side) sprite = mirrorSprite(sprite)
    this.playerCache.set(direction, sprite)
    return sprite
  }

  /** Rasterize a frame into a cached, scaled offscreen canvas; the only per-pixel path. */
  private frameCanvas(
    bank: string,
    key: string,
    sprite: RasterSprite,
    index: number,
    mirror = false
  ): HTMLCanvasElement | null {
    const frame = sprite.frames[index] ?? sprite.frames[0]
    if (!frame) return null
    const cacheKey = `${bank}:${key}:${index}:${this.spriteScale}:${mirror ? 'm' : 's'}`
    const cached = canvasCache.get(cacheKey)
    if (cached) return cached

    const source = document.createElement('canvas')
    source.width = frame.width
    source.height = frame.height
    const sourceCtx = source.getContext('2d')
    if (!sourceCtx) return null
    for (let y = 0; y < frame.height; y++) {
      const row = frame.rows[y] ?? ''
      for (let x = 0; x < frame.width; x++) {
        const color = frame.palette[row.charAt(x)]
        if (!color) continue
        sourceCtx.fillStyle = color
        sourceCtx.fillRect(x, y, 1, 1)
      }
    }

    let out: HTMLCanvasElement = source
    if (mirror || this.spriteScale !== 1) {
      out = document.createElement('canvas')
      out.width = Math.max(1, Math.round(frame.width * this.spriteScale))
      out.height = Math.max(1, Math.round(frame.height * this.spriteScale))
      const outCtx = out.getContext('2d')
      if (!outCtx) return null
      outCtx.imageSmoothingEnabled = false
      if (mirror) {
        outCtx.translate(out.width, 0)
        outCtx.scale(-1, 1)
      }
      outCtx.drawImage(source, 0, 0, out.width, out.height)
    }
    canvasCache.set(cacheKey, out)
    return out
  }

  /**
   * One shadow language for the whole world: a small flat dab, slightly
   * wider than the sprite and nudged to the lower right (the light comes
   * from the top left), with a short deeper contact line right at the
   * feet. Flat tones rather than gradient washes — a pixel-art shadow is
   * a crisp dab, not a smudge — and a fence run's pieces overlap their
   * neighbours into one continuous grounded line.
   */
  private drawStructureShadow(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    baseY: number,
    width: number,
    type: string
  ): void {
    const profile = SHADOW_PROFILES[type] ?? DEFAULT_SHADOW_PROFILE
    const rx = Math.max(this.tileSize * profile.minRxTiles, width * profile.rxFactor)
    const ry = Math.max(2, this.tileSize * profile.ryTiles * ROW_COMPRESS)
    const cx = Math.round(centerX + Math.max(2, rx * profile.lean))
    const cy = Math.round(baseY + ry * 0.55)
    ctx.save()
    // Flat dab: one even tone, no gradient smudge.
    ctx.fillStyle = `rgba(23, 32, 46, ${profile.dabAlpha})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    // Short, deeper contact line right at the feet.
    ctx.fillStyle = `rgba(23, 32, 46, ${profile.contactAlpha})`
    ctx.beginPath()
    ctx.ellipse(cx, baseY + ry * 0.35, rx * profile.coreShare, Math.max(1.5, ry * 0.55), 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /* ---------------------------------------------------------------- */
  /* Frame passes                                                      */
  /* ---------------------------------------------------------------- */

  private drawShadows(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number): void {
    for (const entry of this.staticScene) {
      if (!entry.castsShadow) continue
      const worldCx = entry.x + entry.width / 2
      const cx = this.projectX(worldCx, entry.baseY, camX, camY)
      const cy = this.projectY(entry.baseY, camY)
      if (cx < -this.cullMargin || cx > this.viewWidth + this.cullMargin) continue
      if (cy < -this.cullMargin || cy > this.viewHeight + this.cullMargin) continue
      // One shadow language for every standing thing.
      this.drawStructureShadow(ctx, cx, cy, entry.width, entry.type)
    }
    const px = this.projectX(state.player.x, state.player.y, camX, camY)
    const py = this.projectY(state.player.y, camY)
    if (px >= -this.cullMargin && px <= this.viewWidth + this.cullMargin && py >= -this.cullMargin && py <= this.viewHeight + this.cullMargin) {
      const sprite = this.playerSprite(state.player.direction)
      const base = sprite.frames[0]
      this.drawStructureShadow(ctx, px, py, (base?.width ?? this.tileSize) * this.spriteScale, 'player')
    }
  }

  /** Standing props, the player and the fish share one y-sorted pass. */
  private drawScene(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number, time: number): void {
    const dynamic: DynamicItem[] = [
      { depth: state.player.y, draw: () => this.drawPlayer(ctx, state, camX, camY) },
      ...this.fishMotions.map((motion) => this.fishItem(ctx, motion, camX, camY, time))
    ].sort((a, b) => a.depth - b.depth)

    let next = 0
    for (const entry of this.staticScene) {
      while (next < dynamic.length && dynamic[next].depth <= entry.depth) {
        dynamic[next].draw()
        next++
      }
      this.drawEntry(ctx, entry, camX, camY, time)
    }
    while (next < dynamic.length) {
      dynamic[next].draw()
      next++
    }
  }

  /** The fish's position and depth for this frame, as a sortable draw item. */
  private fishItem(
    ctx: CanvasRenderingContext2D,
    motion: FishMotion,
    camX: number,
    camY: number,
    time: number
  ): DynamicItem {
    const n = motion.path.length
    const cycle = (time / motion.loopMs + motion.phase) % 1
    const step = cycle * n
    const index = Math.floor(step) % n
    const nextIndex = (index + 1) % n
    const frac = step - Math.floor(step)
    // Smooth in and out of each waypoint so the loop reads as a lazy glide.
    const ease = frac * frac * (3 - 2 * frac)
    const from = motion.path[index]
    const to = motion.path[nextIndex]
    let px = from.x + (to.x - from.x) * ease
    let py = from.y + (to.y - from.y) * ease
    // Each fish squeezes its ring a little toward the pond center so the
    // shoal spreads out instead of stacking on one line.
    px = motion.cx + (px - motion.cx) * motion.ringScale
    py = motion.cy + (py - motion.cy) * motion.ringScale
    // The ring hugs the pond's own shape, but if an eased chord ever clips
    // a sandbar notch, fall back to the waypoint, which is guaranteed water.
    if (this.groundChar(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize)) !== WATER_CHAR) {
      px = from.x
      py = from.y
    }
    // Sprite faces left; flip it whenever it travels right.
    const mirror = to.x >= from.x
    const bob = Math.sin(time * 0.0012 + motion.phase) * 1.5
    const frame = frameAt(time + motion.phase * 900, this.fishSchedule)
    const base = motion.sprite.frames[0]
    const width = (base?.width ?? this.tileSize) * this.spriteScale
    const height = (base?.height ?? this.tileSize) * this.spriteScale

    return {
      depth: py,
      draw: () => {
        const cx = Math.round(this.projectX(px, py, camX, camY))
        const cy = Math.round(this.projectY(py, camY))
        const sx = Math.round(cx - width / 2)
        const sy = Math.round(cy - height / 2 + bob)
        if (sx < -this.cullMargin || sx > this.viewWidth + this.cullMargin) return
        if (sy < -this.cullMargin || sy > this.viewHeight + this.cullMargin) return
        const canvas = this.frameCanvas('prop', motion.key, motion.sprite, frame, mirror)
        if (!canvas) return
        // A faint ripple under the koi ties it to the pond surface.
        ctx.save()
        ctx.globalAlpha = 0.13
        ctx.fillStyle = '#1b2a44'
        ctx.beginPath()
        ctx.ellipse(cx, cy + 2, width * 0.38, Math.max(1.5, this.tileSize * 0.08 * ROW_COMPRESS), 0, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.92
        ctx.drawImage(canvas, sx, sy)
        ctx.restore()
      }
    }
  }

  private drawEntry(ctx: CanvasRenderingContext2D, entry: SceneEntry, camX: number, camY: number, time: number): void {
    // Feet projected onto the tilted ground; the sprite itself stays upright.
    const feetX = Math.round(this.projectX(entry.x + entry.width / 2, entry.baseY, camX, camY))
    const feetY = Math.round(this.projectY(entry.baseY, camY))
    const sx = Math.round(feetX - entry.width / 2)
    // The art's lowest opaque pixel lands on the base line; any transparent
    // padding under the sprite's feet is drawn away below it.
    const sy = Math.round(feetY - entry.height + entry.basePad)
    if (sx + entry.width < -this.cullMargin || sx > this.viewWidth + this.cullMargin) return
    if (sy + entry.height < -this.cullMargin || sy > this.viewHeight + this.cullMargin) return
    const schedule = this.propSchedule(entry)
    const frame = frameAt(time + entry.phase, schedule)
    const canvas = this.frameCanvas('prop', entry.type, entry.sprite, frame)
    // Explicit dimensions: buildings draw at a whole-number upscale of the
    // cached canvas (smoothing is off, so the pixels stay crisp).
    if (canvas) ctx.drawImage(canvas, sx, sy, entry.width, entry.height)
  }

  private propSchedule(entry: SceneEntry): AnimationFrameSchedule {
    const sharedKey = PROP_SCHEDULES[entry.type]
    // Settled pacing: calm props hold their frames longer than the shared
    // default, so nothing on the farm fidgets.
    const pace = PROP_PACE[entry.type] ?? 1
    if (sharedKey) {
      return {
        frameCount: Math.min(WORLD_ANIMATION_SCHEDULES[sharedKey].frameCount, Math.max(1, entry.sprite.frames.length)),
        frameMs: WORLD_ANIMATION_SCHEDULES[sharedKey].frameMs * pace,
        pingPong: WORLD_ANIMATION_SCHEDULES[sharedKey].pingPong
      }
    }
    return { frameCount: entry.sprite.frames.length, frameMs: entry.sprite.frameMs * pace }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number): void {
    const sprite = this.playerSprite(state.player.direction)
    const count = sprite.frames.length
    if (count === 0) return
    const rawFrame = Math.trunc(state.player.frame)
    const frame = ((rawFrame % count) + count) % count
    const base = sprite.frames[frame]
    const canvas = this.frameCanvas('player', state.player.direction, sprite, frame)
    if (!canvas || !base) return
    const width = base.width * this.spriteScale
    const height = base.height * this.spriteScale
    // Feet projected onto the tilted ground; the sprite itself stays upright,
    // with any transparent padding under the walk frames drawn away.
    const basePad = frameBottomPad(base) * this.spriteScale
    const feetX = Math.round(this.projectX(state.player.x, state.player.y, camX, camY))
    const feetY = Math.round(this.projectY(state.player.y, camY))
    ctx.drawImage(canvas, Math.round(feetX - width / 2), Math.round(feetY - height + basePad))
  }

  /** Bugs fly above the sorted scene, wandering lazily inside their anchor tile. */
  private drawButterflies(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number): void {
    if (this.butterflies.length === 0) return
    const items = this.butterflies
      .map((motion) => ({
        motion,
        y: clampNumber(motion.ay + motion.ampY * Math.sin(time * motion.freqY + motion.phase2), motion.minY, motion.maxY)
      }))
      .sort((a, b) => a.y - b.y)
    for (const { motion } of items) {
      // The wander box is the anchor tile, so the bug never leaves the
      // plant, flower or grass it belongs to.
      const px = clampNumber(
        motion.ax + motion.ampX * Math.sin(time * motion.freqX + motion.phase),
        motion.minX,
        motion.maxX
      )
      const py = clampNumber(
        motion.ay + motion.ampY * Math.sin(time * motion.freqY + motion.phase2),
        motion.minY,
        motion.maxY
      )
      // A slow vertical breathing, not a nervous jitter.
      const bob = Math.sin(time * 0.0012 + motion.phase) * 1.5
      const mirror = Math.cos(time * motion.freqX + motion.phase) > 0
      const frame = frameAt(time + motion.phase * 700, this.butterflySchedule)
      const base = motion.sprite.frames[0]
      const width = (base?.width ?? this.tileSize) * this.spriteScale
      const height = (base?.height ?? this.tileSize) * this.spriteScale
      const cx = Math.round(this.projectX(px, py, camX, camY))
      const cy = Math.round(this.projectY(py, camY))
      const sx = Math.round(cx - width / 2)
      const sy = Math.round(cy - height / 2 + bob)
      if (sx < -this.cullMargin || sx > this.viewWidth + this.cullMargin) continue
      if (sy < -this.cullMargin || sy > this.viewHeight + this.cullMargin) continue
      const canvas = this.frameCanvas('prop', motion.key, motion.sprite, frame, mirror)
      if (canvas) ctx.drawImage(canvas, sx, sy)
    }
  }

  private drawLandmarkGlow(
    ctx: CanvasRenderingContext2D,
    landmarkId: string | null,
    camX: number,
    camY: number,
    time: number
  ): void {
    if (!landmarkId) return
    const landmark = worldMap.landmarks.find((item) => item.id === landmarkId)
    if (!landmark) return
    const ts = this.tileSize
    const pulse = 0.5 + 0.5 * Math.sin(time / 650)
    // A ground marker: its center is projected onto the tilted plane.
    const cx = this.projectX(landmark.x * ts + ts / 2, landmark.y * ts + ts / 2, camX, camY)
    const cy = this.projectY(landmark.y * ts + ts / 2, camY)
    const radius = ts * (0.6 + 0.12 * pulse)
    ctx.save()
    ctx.globalAlpha = 0.12 + 0.1 * pulse
    ctx.fillStyle = '#ffd9a0'
    ctx.beginPath()
    ctx.ellipse(cx, cy, radius, radius * ROW_COMPRESS, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }

  /** Soft warm light in the middle, gentle dusk in the corners. Built once per context. */
  private drawVignette(ctx: CanvasRenderingContext2D): void {
    if (this.vignette === null || this.vignetteCtx !== ctx) {
      const cx = this.viewWidth / 2
      const cy = this.viewHeight / 2
      const gradient = ctx.createRadialGradient(cx, cy, this.viewHeight * 0.28, cx, cy, this.viewWidth * 0.62)
      gradient.addColorStop(0, 'rgba(255, 214, 150, 0.07)')
      gradient.addColorStop(0.55, 'rgba(84, 56, 28, 0)')
      gradient.addColorStop(1, 'rgba(43, 26, 12, 0.32)')
      this.vignette = gradient
      this.vignetteCtx = ctx
    }
    ctx.fillStyle = this.vignette
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight)
  }

  /** Faint foreground fringe at the bottom edge, so the world reads as a diorama. */
  private drawFringe(ctx: CanvasRenderingContext2D): void {
    const height = Math.max(10, Math.round(this.tileSize * 0.45))
    if (this.fringe === null) {
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, this.viewWidth)
      canvas.height = height
      const fringeCtx = canvas.getContext('2d')
      if (fringeCtx) {
        const rng = mulberry32(0xf41aae)
        // Scalloped blade silhouette along the top of the strip.
        for (let x = 0; x < canvas.width; x += 2) {
          const blade = 2 + Math.floor(rng() * Math.max(2, height * 0.5))
          fringeCtx.fillStyle = rng() < 0.5 ? 'rgba(26, 40, 24, 0.55)' : 'rgba(33, 50, 30, 0.55)'
          fringeCtx.fillRect(x, Math.max(0, height - blade), 2, blade)
        }
        const gradient = fringeCtx.createLinearGradient(0, height * 0.3, 0, height)
        gradient.addColorStop(0, 'rgba(16, 24, 14, 0)')
        gradient.addColorStop(1, 'rgba(16, 24, 14, 0.5)')
        fringeCtx.fillStyle = gradient
        fringeCtx.fillRect(0, 0, canvas.width, height)
      }
      this.fringe = canvas
    }
    ctx.drawImage(this.fringe, 0, this.viewHeight - height)
  }
}
