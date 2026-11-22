import { playerSprites, propSprites, terrainSprites } from '~/utils/pixel-sprite-bank'
import { catSprites } from '~/utils/pixel-sprite-cat'
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

/** The cat companion's state for one frame. Positions are in world pixels; x/y mark her feet. */
export interface RenderCompanionState {
  x: number
  y: number
  /** True while she is walking or running. */
  moving: boolean
  /** True while she is in the faster catch-up run. */
  running: boolean
  /** True while she is holding the sit pose. */
  sitting: boolean
  /** True while she is holding the alert/stare pose. */
  staring: boolean
  /** Pose frame index, chosen by the gameplay layer. */
  frame: number
  direction: PlayerDirection
}

/** Everything the renderer needs to draw one frame. */
export interface RenderState {
  player: RenderPlayerState
  /** Camera top-left in world pixels. Floats are rounded and clamped by the renderer. */
  camera: { x: number; y: number }
  /** Id of the landmark the player currently stands on, or null away from one. */
  activeLandmarkId: string | null
  /** Optional cat companion; absent or null renders nothing. */
  companion?: RenderCompanionState | null
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

/** A waypoint on a looping path (a pond ring or a flyer route), in world pixels. */
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

/** A flyer following a long eased waypoint loop across the whole map. */
interface ButterflyMotion {
  key: string
  sprite: RasterSprite
  /** Tile-centre waypoints spread across the map, in world pixels. */
  path: readonly PondWaypoint[]
  /** Milliseconds for one full lap of the waypoint loop. */
  loopMs: number
  /** Per-flyer loop phase in [0, 1). */
  phase: number
  /** Gentle wander overlay on the waypoint position, a few pixels. */
  ampX: number
  ampY: number
  /** Radians per millisecond; the two axes are deliberately incommensurate. */
  freqX: number
  freqY: number
  phase2: number
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
 * The world is drawn axis-aligned: one world pixel maps to one screen pixel
 * on both axes. These were once a 3/4-view shear and row compression; the
 * user reads that as a tilted rhombus, so both are neutral now. Keeping the
 * names lets the projection helpers and edge-bleed math stay unchanged.
 */
const ROW_COMPRESS = 1
const SHEAR_PX_PER_TILE = 0

/** How far the water wheel sinks below its tile-bottom anchor, in world px.
 * At 28px the waterline crosses just under the hub, so the lower half of the
 * paddle circle turns through the water and the stone plinth stands submerged
 * in the outflow, the way a working mill wheel is mounted. */
const WATER_WHEEL_SINK_PX = 56

/** The mill house sinks so the river cuts across the wheel just above its hub:
 * the wheel's lower half turns in the water and the sprite's bottom edge hides
 * under the surface instead of clipping the arc. */
const WATER_WHEEL_HOUSE_SINK_PX = 24

/** Character the map uses for water; also the pond fish live in. */
const WATER_CHAR = '~'
const CLIFF_CHAR = 'C'
/** River tile the bridge deck crosses: water wearing a timber deck. */
const BRIDGE_CHAR = 'B'
/** Stone dam tile: water wearing a walkable crest and a downstream spill. */
const DAM_CHAR = 'D'
/** Stone arch bridge tile: water wearing a rising deck. */
const ARCH_CHAR = 'A'

/** Map character -> ground treatment. Unknown characters fall back to `flat`. */
const CHAR_KINDS: Readonly<Record<string, GroundKind>> = {
  '.': 'grass',
  '-': 'path',
  s: 'sand',
  '~': 'water',
  B: 'water',
  D: 'water',
  A: 'water',
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
  cliff: ['cliffFace', 'cliff'],
  soil: ['soil', 'tilled', 'farmland', 'dirt'],
  crop: ['crop', 'crops', 'wheat', 'grain', 'sprout', 'field'],
  flat: [],
}

/** Props whose frames follow the shared world schedules. */
const PROP_SCHEDULES: Readonly<Record<string, WorldAnimationIdKey>> = {
  pine: 'pineSway',
  campfire: 'campfire',
  lamp: 'lampGlow',
  windmill: 'windmill',
  waterWheel: 'waterWheel',
  waterWheelHouse: 'waterWheel',
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

/**
 * Per-species flyer pace, applied to the shared 96-168s base loop. The whole
 * range is deliberately lazy: butterflies drift almost in place, sparrows
 * and robins make unhurried flits, gulls hold slow level glides, and
 * dragonflies are the quickest but still hover-mostly with only occasional
 * short sallies. Nothing darts or zips. Fish and chickens keep their own
 * pacing.
 */
const FLYER_PACE: Readonly<Record<string, { loop: number; amp: number; freq: number }>> = {
  gull: { loop: 0.8, amp: 0.9, freq: 0.4 },
  sparrow: { loop: 0.95, amp: 0.7, freq: 0.5 },
  robin: { loop: 1.05, amp: 0.7, freq: 0.5 },
  bird: { loop: 0.95, amp: 0.7, freq: 0.5 },
  dragonfly: { loop: 0.7, amp: 0.35, freq: 0.8 },
  butterfly: { loop: 1.3, amp: 0.5, freq: 0.35 },
  monarch: { loop: 1.3, amp: 0.5, freq: 0.35 }
}

const DEFAULT_FLYER_PACE = { loop: 1, amp: 0.7, freq: 0.5 } as const

/**
 * Bugs are authored at 32px for detail, but a 32px butterfly dwarfs a
 * 22x16 bird. Each species is drawn at a compact on-screen size instead:
 * the monarch 14x12, the dragonfly 18x14, the beetle 10x8, the firefly 8x8.
 * Birds keep their native size, so the garden reads at the right scale.
 */
const FLYER_DRAW_SCALE: Readonly<Record<string, { w: number; h: number }>> = {
  monarch: { w: 14 / 32, h: 12 / 32 },
  butterfly: { w: 14 / 32, h: 12 / 32 },
  dragonfly: { w: 18 / 32, h: 14 / 32 },
  beetle: { w: 10 / 32, h: 8 / 28 },
  firefly: { w: 8 / 32, h: 8 / 28 }
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
  windmill: { rxFactor: 0.6, minRxTiles: 0.7, ryTiles: 0.28, coreShare: 0.7, lean: 0.15, dabAlpha: 0.3, contactAlpha: 0.4 },
  waterWheel: { rxFactor: 0.6, minRxTiles: 0.7, ryTiles: 0.28, coreShare: 0.7, lean: 0.15, dabAlpha: 0.3, contactAlpha: 0.4 },
  well: { rxFactor: 0.62, minRxTiles: 0.55, ryTiles: 0.16, coreShare: 0.72, lean: 0.1, dabAlpha: 0.28, contactAlpha: 0.38 },
  cottage: { rxFactor: 0.6, minRxTiles: 0.65, ryTiles: 0.22, coreShare: 0.78, lean: 0.08, dabAlpha: 0.3, contactAlpha: 0.4 },
  house: { rxFactor: 0.6, minRxTiles: 0.65, ryTiles: 0.22, coreShare: 0.78, lean: 0.08, dabAlpha: 0.3, contactAlpha: 0.4 },
  hut: { rxFactor: 0.6, minRxTiles: 0.6, ryTiles: 0.2, coreShare: 0.75, lean: 0.1, dabAlpha: 0.3, contactAlpha: 0.4 },
  mudHut: { rxFactor: 0.6, minRxTiles: 0.6, ryTiles: 0.2, coreShare: 0.75, lean: 0.1, dabAlpha: 0.3, contactAlpha: 0.4 },
  waterWheelHouse: { rxFactor: 0.62, minRxTiles: 0.7, ryTiles: 0.22, coreShare: 0.75, lean: 0.1, dabAlpha: 0.3, contactAlpha: 0.4 },
  stoneWall: { rxFactor: 0.8, minRxTiles: 0.8, ryTiles: 0.12, coreShare: 0.8, lean: 0.05, dabAlpha: 0.26, contactAlpha: 0.36 },
  stonePost: { rxFactor: 0.62, minRxTiles: 0.5, ryTiles: 0.14, coreShare: 0.72, lean: 0.1, dabAlpha: 0.28, contactAlpha: 0.38 },
  // A seedling is a tiny prop: a small, soft dab, not a field-wide ellipse.
  sprout: { rxFactor: 0.3, minRxTiles: 0.16, ryTiles: 0.05, coreShare: 0.45, lean: 0.04, dabAlpha: 0.16, contactAlpha: 0.2 },
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
  player: { rxFactor: 0.6, minRxTiles: 0.55, ryTiles: 0.18, coreShare: 0.72, lean: 0.12, dabAlpha: 0.3, contactAlpha: 0.4 },
  // The companion is a big small-animal sprite: a broad, shallow dab that
  // matches her 40px body without swallowing the path beneath her.
  cat: { rxFactor: 0.5, minRxTiles: 0.6, ryTiles: 0.18, coreShare: 0.72, lean: 0.12, dabAlpha: 0.3, contactAlpha: 0.4 }
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
 * bridge, dam and arch tiles laid across it, so no bank band is ever drawn
 * against a structure — the river reads as flowing on beneath the stone.
 */
function isWaterChar(char: string): boolean {
  return char === WATER_CHAR || char === BRIDGE_CHAR || char === DAM_CHAR || char === ARCH_CHAR
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
  const palette = { l: 'rgba(196, 202, 210, 0.35)', L: 'rgba(196, 202, 210, 0.18)' }
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
  const palette = { r: 'rgba(90, 96, 104, 0.4)', R: 'rgba(70, 76, 84, 0.3)' }
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
 * The river crossing: a wooden footbridge seen from above, carrying the
 * east-west path over the north-south river. The deck is authored as two
 * half-frames that compose into one bridge: frame 0 is the west half with
 * its stone abutment on the west edge, frame 1 the east half with its
 * abutment on the east edge. Vertical planks run north-south, a worn path
 * band crosses the middle, and chunky post-and-rope rails run along the
 * north and south edges. The seam between the halves carries no outline,
 * so the pair reads as one continuous deck; the outer silhouette is
 * wrapped in the world's near-black outline. Two static frames at the
 * native tile size.
 */
function buildBridgeDeckFrames(size: number, single = false): RasterSprite {
  return single
    ? spriteOf([buildBridgeHalf(size, 0, true)])
    : spriteOf([buildBridgeHalf(size, 0), buildBridgeHalf(size, 1)])
}

/** One half of the footbridge; `half` 0 is west, 1 is east. */
function buildBridgeHalf(size: number, half: 0 | 1, single = false): RasterFrame {
  const rows = emptyRows(size, size)
  const palette = {
    o: OUTLINE_COLOR,
    L: '#e0b47a', // rail top face catching the light
    l: '#d9a86a', // lit plank edge
    p: '#b8875a', // plank body
    d: '#8f6238', // shaded seam between boards
    k: '#5a3a24', // dark gap between boards / knot
    r: '#a97a4e', // rail body
    R: '#7c5233', // rail shaded face
    s: '#c9b79a', // stone lit face
    S: '#a89478', // stone body
    t: '#7d6b55', // stone shade / mortar
    w: '#e8c48f', // worn path lit edge
    W: '#cfa06a', // worn path body
    v: '#a97a4e', // worn path shade
    e: '#efe3c4', // pale rope
    m: '#5f9e5a', // bank moss
    M: '#3f7a44', // bank moss shade
    h: 'rgba(20, 30, 40, 0.18)', // water shadow, near row
    H: 'rgba(20, 30, 40, 0.10)'  // water shadow, far row
  }

  // Both frames describe one 2*size-wide bridge; global x is clipped into
  // this half so posts and rope can straddle the seam.
  const plot = (gx: number, y: number, tone: string): void => {
    const x = gx - half * size
    if (x < 0 || x >= size || y < 0 || y >= size) return
    rows[y][x] = tone
  }

  // Water breathing room top and bottom, so the deck floats over the river.
  const pad = Math.max(1, Math.round(size / 16))
  const top = pad
  const bottom = size - 1 - pad
  const railH = Math.max(2, Math.min(4, Math.round(size / 8)))
  const northRailTop = top + 1
  const southRailBottom = bottom - 1
  const southRailTop = southRailBottom - railH + 1
  const plankTop = northRailTop + railH
  const plankBottom = southRailTop - 1
  const stoneW = Math.max(2, Math.round(size * 0.09))
  const plankW = Math.max(3, Math.round(size / 8))
  const plankStart = stoneW + 1
  const plankEnd = size * 2 - 2 - stoneW

  // Silhouette: one pixel of near-black around the outer deck edge. The
  // seam edge stays open so the two halves join without a dark spine.
  for (let gx = 0; gx < size * 2; gx++) {
    plot(gx, top, 'o')
    plot(gx, bottom, 'o')
  }
  for (let y = top; y <= bottom; y++) {
    plot(0, y, 'o')
    plot(size * 2 - 1, y, 'o')
  }

  // Rails: a lit top face, a body, then a shaded face toward the planks.
  for (let gx = 1; gx < size * 2 - 1; gx++) {
    for (let i = 0; i < railH; i++) {
      const tone = i === 0 ? 'L' : i === railH - 1 ? 'R' : 'r'
      plot(gx, northRailTop + i, tone)
      plot(gx, southRailTop + i, tone)
    }
  }

  // Planks: vertical boards across the deck, each with a lit west edge, a
  // shaded seam and a thin dark gap. The worn band through the middle
  // swaps in lighter tones where feet polish the boards.
  const bandH = Math.max(3, Math.round(size * 0.19))
  const bandTop = Math.round((plankTop + plankBottom - bandH + 1) / 2)
  const bandBottom = bandTop + bandH - 1
  const wornTone = (tone: string): string =>
    tone === 'l' ? 'w' : tone === 'p' ? 'W' : tone === 'd' || tone === 'k' ? 'v' : tone
  for (let y = plankTop; y <= plankBottom; y++) {
    for (let gx = plankStart; gx <= plankEnd; gx++) {
      const edge = (gx - plankStart) % plankW
      const tone = edge === 0 ? 'l' : edge === plankW - 1 ? 'k' : edge === plankW - 2 && plankW >= 4 ? 'd' : 'p'
      const inBand = y >= bandTop && y <= bandBottom
      const dither = y === bandTop || y === bandBottom
      const worn = inBand && (!dither || (gx + y) % 2 === 0)
      plot(gx, y, worn ? wornTone(tone) : tone)
    }
  }

  // A knot or two per half, set into the board bodies.
  const knots: ReadonlyArray<readonly [number, number]> =
    half === 0
      ? [[Math.round(size * 0.28), Math.round(size * 0.28)], [Math.round(size * 0.66), Math.round(size * 0.69)]]
      : [[Math.round(size * 0.16), Math.round(size * 0.31)], [Math.round(size * 0.53), Math.round(size * 0.66)]]
  for (const [x, y] of knots) {
    if (x > 0 && x < size - 1 && y > top && y < bottom) rows[y][x] = 'k'
  }

  // Stone abutments where the deck meets the bank. A paired bridge gets one
  // on its outer edge; a single-tile bridge gets one on both edges, so its
  // open seam never exposes the water-edge band as a white strip.
  const westAbut = half === 0 ? 1 : size * 2 - 1 - stoneW
  const eastAbut = single ? size - 1 - stoneW : -1
  for (let y = top + 1; y <= bottom - 1; y++) {
    const mortar = (y - top) % 6 === 0
    for (let i = 0; i < stoneW; i++) {
      const tone = mortar ? 't' : i === 0 ? 's' : i === stoneW - 1 ? 't' : 'S'
      plot(westAbut + i, y, tone)
      if (eastAbut >= 0) plot(eastAbut + i, y, tone)
    }
  }
  // Moss tufts at the abutment tops and a soft shadow at their feet blend
  // the stone into the grass bank on both sides.
  for (let i = 0; i < Math.min(2, stoneW); i++) {
    plot(westAbut + i, top + 1, i === 0 ? 'm' : 'M')
    plot(westAbut + i, top + 2, 'M')
    if (eastAbut >= 0) {
      plot(eastAbut + stoneW - 1 - i, top + 1, i === 0 ? 'm' : 'M')
      plot(eastAbut + stoneW - 1 - i, top + 2, 'M')
    }
  }
  for (let i = 0; i < stoneW; i++) {
    plot(westAbut + i, bottom - 1, 'H')
    if (eastAbut >= 0) plot(eastAbut + i, bottom - 1, 'H')
  }

  // Posts every ~8px, three pixels wide, with a lit top face. They are
  // placed in global coordinates so the pair straddling the seam is drawn
  // by both halves and reads as one post.
  const postW = Math.max(3, Math.round(size / 10))
  const spacing = Math.max(6, Math.round(size / 4))
  const postXs: number[] = []
  for (let gx = Math.round(size * 0.19); gx + postW <= size * 2 - Math.round(size * 0.06); gx += spacing) {
    postXs.push(gx)
  }

  // Rope: a pale line sagging 2px between posts, lying on the rail top.
  for (let i = 0; i < postXs.length - 1; i++) {
    const gapStart = postXs[i] + postW
    const gapEnd = postXs[i + 1] - 1
    const span = gapEnd - gapStart
    if (span < 1) continue
    for (let gx = gapStart; gx <= gapEnd; gx++) {
      const t = (gx - gapStart) / span
      const sag = Math.round(Math.sin(Math.PI * t) * 2)
      plot(gx, northRailTop + sag, 'e')
      plot(gx, southRailTop + sag, 'e')
    }
  }

  // Posts sit on top of the rope ends: a lit cap, a body, a shaded face
  // and a dark foot one row into the planks.
  const postH = railH + 1
  for (const gx of postXs) {
    for (let dx = 0; dx < postW; dx++) {
      for (let i = 0; i < postH; i++) {
        const tone = i === 0 ? 'L' : i === postH - 1 ? 'k' : i === postH - 2 ? 'R' : 'r'
        plot(gx + dx, northRailTop + i, tone)
        plot(gx + dx, southRailTop - 1 + i, tone)
      }
    }
  }

  // The deck casts a soft two-row shadow onto the river below it; light
  // comes from the top left, so the far row leans a pixel to the right.
  if (bottom + 1 < size) {
    for (let gx = 1; gx < size * 2 - 1; gx++) plot(gx, bottom + 1, 'h')
  }
  if (bottom + 2 < size) {
    for (let gx = 2; gx < size * 2 - 1; gx++) plot(gx, bottom + 2, 'H')
  }

  return rowsToFrame(rows, palette)
}

/** Native-pixel layout of the dam's raised silhouette. */
interface DamLayout {
  /** How far the frame rises above its tile top. */
  rise: number
  /** Still-water rows at the top of the frame, where the pond meets the wall. */
  waterEdgeH: number
  /** Walkable crest height. */
  crestH: number
  /** Total frame height. */
  height: number
  /** Frame y of the walkable crest surface, used to lift the player. */
  crestTop: number
  /** Frame y of the crest's downstream edge, where the cascade sheets over. */
  crestEdge: number
  /** Frame y where the downstream stone face begins. */
  faceTop: number
  /** Height of the downstream stone face in frame pixels. */
  faceH: number
}

function damLayout(size: number): DamLayout {
  const rise = Math.max(10, Math.round(size * 0.62))
  const waterEdgeH = Math.max(2, Math.round(size * 0.09))
  const crestH = Math.max(6, Math.round(size * 0.22))
  const height = size + rise
  const crestTop = waterEdgeH + 1
  const crestEdge = crestTop + crestH
  const faceTop = crestEdge + 1
  return {
    rise,
    waterEdgeH,
    crestH,
    height,
    crestTop,
    crestEdge,
    faceTop,
    faceH: height - 1 - faceTop
  }
}

/**
 * The stone dam: a broad, tall weir wall standing across the channel,
 * holding the pond back on its upstream face. Authored as two half-frames
 * that compose into one continuous structure, like the footbridge: frame 0
 * is the west half, frame 1 the east half. The seam carries no outline and
 * the crest runs unbroken across it, so the pair reads as one wall.
 */
function buildDamFrames(size: number): RasterSprite {
  return spriteOf([buildDamHalf(size, 0), buildDamHalf(size, 1)])
}

/** One half of the stone dam; `half` 0 is west, 1 is east. */
function buildDamHalf(size: number, half: 0 | 1): RasterFrame {
  const layout = damLayout(size)
  const rows = emptyRows(size, layout.height)
  const palette = {
    o: OUTLINE_COLOR,
    s: '#c9b79a', // stone lit face
    S: '#a89478', // stone body
    t: '#7d6b55', // stone shade / mortar
    k: '#5a4a3a', // deep joint
    d: '#8a6238', // crest path shade
    w: '#e0bc84', // worn path highlight
    W: '#cfa06a', // worn path body
    c: '#3272a4', // still pond water
    b: '#28618f', // shaded pond water at the wall
    g: '#a8dce8', // calm waterline glint
    f: '#6fb4d4', // water crest
    m: '#5f7a52', // bank moss
    M: '#45583f'  // bank moss shade
  }
  const plot = (gx: number, y: number, tone: string): void => {
    const x = gx - half * size
    if (x < 0 || x >= size || y < 0 || y >= layout.height) return
    rows[y][x] = tone
  }
  const bottom = layout.height - 1
  const crestTop = layout.crestTop
  const crestEdge = layout.crestEdge
  const faceTop = layout.faceTop
  const faceBottom = bottom - 1
  const abutW = Math.max(5, Math.round(size * 0.18))
  const gxStart = half * size
  const gxEnd = gxStart + size - 1
  const outerX = half === 0 ? 0 : size * 2 - 1

  // Still pond water at the wall: two shaded rows and a calm glint line.
  // The water is stopped against the dam, so the band is deliberately flat.
  for (let gx = gxStart; gx <= gxEnd; gx++) {
    plot(gx, 0, (gx + half) % 5 === 0 ? 'b' : 'c')
    plot(gx, 1, (gx + half) % 4 === 0 ? 'c' : 'b')
    const wave = Math.round(Math.sin(gx * 0.7 + half * 1.3))
    const tone = (gx + wave) % 7 === 0 ? 'b' : (gx + wave) % 5 === 0 ? 'f' : 'g'
    plot(gx, 2, tone)
  }

  // Crest silhouette: one unbroken top line across both halves. The seam
  // has no vertical outline, so the wall never reads as two pieces.
  for (let gx = gxStart; gx <= gxEnd; gx++) plot(gx, crestTop - 1, 'o')

  // Capstone band along the crest's north edge: individual stone blocks with
  // a lit top, a body, a shade lip and a deep joint between neighbours.
  const capW = Math.max(4, Math.round(size * 0.17))
  for (let gx = gxStart; gx <= gxEnd; gx++) {
    const joint = gx % capW === 0
    plot(gx, crestTop, joint ? 'k' : 's')
    plot(gx, crestTop + 1, joint ? 'k' : 'S')
    plot(gx, crestTop + 2, joint ? 'k' : 't')
  }

  // Worn walkway below the capstones: a lit path body with subtle seams and
  // a shade lip. The path is continuous across the seam.
  for (let y = crestTop + 3; y < crestEdge; y++) {
    for (let gx = gxStart; gx <= gxEnd; gx++) {
      const seam = gx % 5 === 0
      const worn = (gx + y) % 13 === 0
      const tone = y === crestEdge - 1 ? 'd' : seam ? 'd' : worn ? 'w' : 'W'
      plot(gx, y, tone)
    }
  }
  // The crest's downstream edge is a shade lip; the cascade sheets over it.
  for (let gx = gxStart; gx <= gxEnd; gx++) plot(gx, crestEdge, 'd')

  // Downstream face: three chunky, top-lit courses of stone. Each block has
  // a lit top and left edge, a body, and a shaded bottom-right corner, with
  // mortar seams between courses and staggered deep joints between blocks.
  const courses = 3
  const courseH = Math.max(4, Math.floor((faceBottom - faceTop + 1) / courses))
  for (let y = faceTop; y <= faceBottom; y++) {
    const course = Math.min(courses - 1, Math.floor((y - faceTop) / courseH))
    const courseTop = faceTop + course * courseH
    const courseBottom = Math.min(faceBottom, courseTop + courseH - 1)
    const rowInCourse = y - courseTop
    const isTop = rowInCourse === 0
    const isBottom = y === courseBottom
    for (let gx = gxStart; gx <= gxEnd; gx++) {
      const phase = (gx + course * 3) % 9
      const joint = phase === 0
      const blockStart = phase === 1
      const blockEnd = phase === 8
      let tone: string
      if (joint) tone = 'k'
      else if (isTop || blockStart) tone = 's'
      else if (isBottom || blockEnd) tone = 't'
      else tone = 'S'
      // Shade the bottom-right corner of every block one step deeper.
      if (!joint && isBottom && blockEnd) tone = 'k'
      plot(gx, y, tone)
    }
  }

  // Chunky abutments at the outer edges: large blocks that anchor the wall
  // into the bank, one pixel proud of the crest and shaded to the outside.
  const abutStart = half === 0 ? 0 : size * 2 - abutW
  const abutCourseH = Math.max(6, Math.round((faceBottom - crestTop + 1) / 4))
  for (let y = crestTop; y <= faceBottom; y++) {
    const rowInCourse = (y - crestTop) % abutCourseH
    const mortar = rowInCourse === abutCourseH - 1
    for (let i = 0; i < abutW; i++) {
      const gx = abutStart + i
      const outerEdge = half === 0 ? i === 0 : i === abutW - 1
      const innerEdge = half === 0 ? i === abutW - 1 : i === 0
      let tone: string
      if (outerEdge) tone = 'o'
      else if (innerEdge) tone = 'k'
      else if (mortar) tone = 't'
      else if (rowInCourse === 0) tone = 's'
      else if (i === abutW - 2) tone = 't'
      else tone = 'S'
      plot(gx, y, tone)
    }
  }
  // A moss tuft at the top outer corner ties the abutment into the bank.
  for (let i = 0; i < Math.min(3, abutW - 1); i++) {
    const gx = half === 0 ? 1 + i : size * 2 - 2 - i
    plot(gx, crestTop, i === 0 ? 'm' : 'M')
    plot(gx, crestTop + 1, 'M')
  }

  // Outer edge and bottom outline: the only vertical silhouette lines.
  for (let y = crestTop - 1; y <= bottom; y++) plot(outerX, y, 'o')
  for (let gx = gxStart; gx <= gxEnd; gx++) plot(gx, bottom, 'o')

  return rowsToFrame(rows, palette)
}

/**
 * The dam's downstream cascade: a broad curtain of falling water that sheets
 * over the crest's downstream edge and runs down the stone face into a foam
 * churn pool at its foot. Four static frames in the river-flow family; frame
 * 0 is the west half and frame 1 the east half, so the pair composes into one
 * fall. The sheet spans most of the face and feathers out at its sides, so it
 * reads as a cascade, never as a crack at the seam.
 */
function buildDamSpillFrames(size: number, half: 0 | 1): RasterSprite {
  const layout = damLayout(size)
  const h = Math.max(8, layout.faceH)
  const palette = {
    w: 'rgba(214, 248, 255, 0.5)', // falling water
    f: 'rgba(240, 255, 255, 0.68)', // foam
    s: 'rgba(190, 240, 255, 0.32)'  // spray / feathered edge
  }
  const frames: RasterFrame[] = []
  for (let f = 0; f < 4; f++) {
    const rows = emptyRows(size, h)
    const rng = mulberry32(0xd4a3 + f * 1301 + half * 733)
    const seamX = half === 0 ? size - 1 : 0
    const outerEdge = half === 0 ? 0 : size - 1
    const dir = half === 0 ? -1 : 1
    // Broad curtain: the sheet spans most of the face and widens as it falls.
    for (let y = 0; y < h; y++) {
      const t = y / Math.max(1, h - 1)
      const spread = size * (0.5 + 0.18 * Math.sin(t * Math.PI))
      const sheetW = Math.max(8, Math.round(spread + (f % 2)))
      for (let i = 0; i < sheetW; i++) {
        const x = seamX + dir * i
        if (x === outerEdge || x < 0 || x >= size) continue
        const edge = i / Math.max(1, sheetW - 1)
        const wobble = Math.sin(y * 0.62 + f * 1.9 + i * 0.85)
        // Feather the outer third: dither it out instead of a hard edge.
        if (edge > 0.62) {
          const fade = (edge - 0.62) / 0.38
          if (wobble < -0.1 - fade * 0.6) continue
          rows[y][x] = 's'
        } else {
          rows[y][x] = edge < 0.18 ? 'f' : 'w'
        }
      }
      // A few translucent pixels beyond the sheet feather the vertical edge.
      for (let i = sheetW; i < sheetW + 4; i++) {
        const x = seamX + dir * i
        if (x === outerEdge || x < 0 || x >= size) continue
        if ((y + i + f) % 5 === 0) rows[y][x] = 's'
      }
    }
    // Bright ribbons inside the sheet, so the curtain has vertical grain.
    for (let i = 0; i < 6; i++) {
      const baseX = seamX + dir * (2 + i * 3)
      let prevX = -1
      for (let y = 0; y < h; y++) {
        const x = clampNumber(
          Math.round(baseX + Math.sin(y * 0.5 + f * 1.7 + i * 2.1) * 1.4),
          0,
          size - 1
        )
        if (prevX >= 0 && Math.abs(x - prevX) > 1) {
          const lo = Math.min(prevX, x)
          const hi = Math.max(prevX, x)
          for (let px = lo; px <= hi; px++) rows[y][px] = 'f'
        } else {
          rows[y][x] = 'f'
        }
        prevX = x
      }
    }
    // Broad foam churn at the foot, spanning the sheet.
    const foamY = Math.round(h * 0.86)
    for (let i = 0; i < 4; i++) {
      const cx = seamX + dir * (3 + i * 5)
      const cy = foamY + (i % 2) * 2
      for (let a = 0; a <= 14; a++) {
        const angle = Math.PI * (0.05 + (a / 14) * 0.9)
        const x = Math.round(cx + Math.cos(angle) * (size * 0.2) * dir)
        const y = Math.round(cy + Math.sin(angle) * (h * 0.06))
        if (x !== outerEdge && x >= 0 && x < size && y >= 1 && y < h - 1) rows[y][x] = 'f'
      }
    }
    for (let i = 0; i < 14; i++) {
      const x = clampNumber(seamX + dir * Math.round(rng() * (size * 0.5)), 0, size - 1)
      const y = clampNumber(foamY + Math.round(rng() * (h * 0.1)), 1, h - 2)
      rows[y][x] = rng() < 0.5 ? 'f' : 's'
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames)
}

/**
 * The stone arch bridge: the deck rises to an apex at the seam between the
 * two tiles and falls to stone abutments at the outer ends. Frame 0 is the
 * west half, frame 1 the east half; the seam carries no outline, so the
 * pair reads as one arc. Water and a soft shadow show beneath the deck.
 */
function buildArchFrames(size: number): RasterSprite {
  return spriteOf([buildArchHalf(size, 0), buildArchHalf(size, 1)])
}

/** Native-pixel deck top for one arch half at a local x. */
function archDeckTop(size: number, half: 0 | 1, localX: number): number {
  const apexY = Math.max(6, Math.round(size * 0.28))
  const rise = Math.max(6, Math.round(size * 0.4))
  const d = half === 0 ? size - 1 - localX : localX
  const t = d / Math.max(1, size - 1)
  return apexY + Math.round(rise * t * t)
}

/** One half of the arch bridge; `half` 0 is west, 1 is east. */
function buildArchHalf(size: number, half: 0 | 1): RasterFrame {
  const rows = emptyRows(size, size)
  const palette = {
    o: OUTLINE_COLOR,
    s: '#c9b79a', // stone lit
    S: '#a89478', // stone body
    t: '#7d6b55', // stone shade
    k: '#5a4a3a', // joint
    w: '#e0bc84', // worn path lit
    W: '#cfa06a', // worn path body
    d: '#8a6238', // worn path shade
    L: '#e0b47a', // post lit top
    r: '#a97a4e', // post body
    R: '#7c5233', // post shade
    e: '#efe3c4', // pale rope
    h: 'rgba(20, 30, 40, 0.22)', // under-deck shadow
    H: 'rgba(20, 30, 40, 0.12)'
  }
  const plot = (gx: number, y: number, tone: string): void => {
    const x = gx - half * size
    if (x < 0 || x >= size || y < 0 || y >= size) return
    rows[y][x] = tone
  }
  const deckTop = (gx: number): number => archDeckTop(size, half, gx - half * size)

  // Deck band: a lit stone top, body, worn path, shade, then a soft shadow.
  for (let gx = 0; gx < size * 2; gx++) {
    const localX = gx - half * size
    if (localX < 0 || localX >= size) continue
    const top = deckTop(gx)
    plot(gx, top - 1, 'o')
    plot(gx, top, 's')
    plot(gx, top + 1, 'S')
    plot(gx, top + 2, 'W')
    plot(gx, top + 3, 'W')
    plot(gx, top + 4, 'S')
    plot(gx, top + 5, 't')
    plot(gx, top + 6, 'h')
    plot(gx, top + 7, 'H')
  }

  // Stone abutments at the outer ends, from the deck down to the water.
  const abutW = Math.max(4, Math.round(size * 0.16))
  for (let dx = 0; dx < abutW; dx++) {
    const gx = half === 0 ? dx : size * 2 - abutW + dx
    const top = deckTop(gx)
    for (let y = top; y < size; y++) {
      const tone = y === top ? 's' : (y - top) % 5 === 0 ? 't' : dx === 0 ? 's' : dx === abutW - 1 ? 't' : 'S'
      plot(gx, y, tone)
    }
  }
  // Abutment outline: outer edge and bottom.
  const outerX = half === 0 ? 0 : size * 2 - 1
  for (let y = deckTop(outerX); y < size; y++) plot(outerX, y, 'o')
  for (let gx = 0; gx < size * 2; gx++) {
    const localX = gx - half * size
    if (localX < 0 || localX >= size) continue
    if (half === 0 ? localX < abutW : localX >= size - abutW) plot(gx, size - 1, 'o')
  }

  // Posts and rope along the north and south deck edges, following the arc.
  const postW = Math.max(2, Math.round(size / 12))
  const spacing = Math.max(6, Math.round(size / 4))
  const postXs: number[] = []
  for (let gx = Math.round(size * 0.19); gx + postW <= size * 2 - Math.round(size * 0.06); gx += spacing) {
    postXs.push(gx)
  }
  for (let i = 0; i < postXs.length - 1; i++) {
    const gapStart = postXs[i] + postW
    const gapEnd = postXs[i + 1] - 1
    const span = gapEnd - gapStart
    if (span < 1) continue
    for (let gx = gapStart; gx <= gapEnd; gx++) {
      const t = (gx - gapStart) / span
      const sag = Math.round(Math.sin(Math.PI * t) * 1)
      plot(gx, deckTop(gx) - 1 + sag, 'e')
      plot(gx, deckTop(gx) + 5 + sag, 'e')
    }
  }
  for (const gx of postXs) {
    for (let dx = 0; dx < postW; dx++) {
      const top = deckTop(gx + dx)
      plot(gx + dx, top - 3, 'o')
      plot(gx + dx, top - 2, 'L')
      plot(gx + dx, top - 1, 'r')
      plot(gx + dx, top, 'R')
      plot(gx + dx, top + 4, 'L')
      plot(gx + dx, top + 5, 'r')
      plot(gx + dx, top + 6, 'R')
      plot(gx + dx, top + 7, 'o')
    }
  }

  return rowsToFrame(rows, palette)
}

type ShoreSide = 'n' | 'e' | 's' | 'w'

/** Map a bank-relative point (along the bank, depth into water) to a tile pixel. */
function shorePoint(side: ShoreSide, along: number, depth: number, size: number): [number, number] {
  if (side === 'n') return [along, depth]
  if (side === 's') return [along, size - 1 - depth]
  if (side === 'w') return [depth, along]
  return [size - 1 - depth, along]
}

/** Reeds overhanging from a grass bank into the water. */
function buildShoreReeds(size: number, side: ShoreSide): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    g: '#5f9e5a', // reed stem
    G: '#3f7a44', // shade
    l: '#8fc47a', // lit blade
    h: '#b08a4a'  // seed head
  }
  const rng = mulberry32(0x5eed + side.charCodeAt(0) * 97)
  const count = 4 + (side.charCodeAt(0) % 3)
  for (let i = 0; i < count; i++) {
    const along = Math.round(size * (0.12 + ((i + 0.5) / count) * 0.76))
    const len = 5 + Math.floor(rng() * 6)
    const lean = Math.round((rng() - 0.5) * 4)
    for (let d = 0; d < len; d++) {
      const [x, y] = shorePoint(side, along + Math.round((lean * d) / len), d, size)
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      rows[y][x] = d === len - 1 ? 'h' : d % 3 === 0 ? 'l' : d % 3 === 1 ? 'g' : 'G'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** Soft foam crescents and a translucent shallows tint where water meets sand. */
function buildShoreFoam(size: number, side: ShoreSide): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    f: 'rgba(240, 255, 255, 0.55)', // foam crest
    s: 'rgba(214, 248, 255, 0.32)', // soft wash
    t: 'rgba(214, 196, 158, 0.18)'  // shallows tint into the sand
  }
  const reach = Math.max(6, Math.round(size * 0.34))
  // A 1-2px translucent shallows tint softens the hard waterline.
  for (let along = 0; along < size; along++) {
    const wobble = ((along * 7 + side.charCodeAt(0) * 13) % 5) / 5
    const depth = 1 + Math.round(wobble)
    for (let d = 0; d <= depth; d++) {
      const [x, y] = shorePoint(side, along, d, size)
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      if (d === 0 || (along + d) % 2 === 0) rows[y][x] = 't'
    }
  }
  // Two large, soft crescents instead of a dense speckled wash.
  for (let i = 0; i < 2; i++) {
    const offset = Math.round(size * (0.28 + i * 0.4))
    const radius = reach - i * 2
    for (let a = 0; a <= 18; a++) {
      const angle = Math.PI * (0.08 + (a / 18) * 0.84)
      const along = offset + Math.round(Math.cos(angle) * radius)
      const depth = Math.round(Math.sin(angle) * radius * 0.62)
      const [x, y] = shorePoint(side, along, depth, size)
      if (x >= 0 && x < size && y >= 0 && y < size) rows[y][x] = a % 5 === 0 ? 's' : 'f'
      // A second row makes the crescent 2px thick and soft.
      if (a % 2 === 0) {
        const [x2, y2] = shorePoint(side, along, depth + 1, size)
        if (x2 >= 0 && x2 < size && y2 >= 0 && y2 < size) rows[y2][x2] = 's'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** A 1-2px translucent shallows tint that fades water into a sand bank. */
function buildShallowsTint(size: number, side: ShoreSide): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    t: 'rgba(214, 196, 158, 0.2)',
    u: 'rgba(214, 196, 158, 0.1)'
  }
  for (let along = 0; along < size; along++) {
    const wobble = ((along * 5 + side.charCodeAt(0) * 11) % 4) / 4
    const depth = 1 + Math.round(wobble)
    for (let d = 0; d <= depth; d++) {
      const [x, y] = shorePoint(side, along, d, size)
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      if (d === 0) rows[y][x] = 't'
      else if ((along + d) % 2 === 0) rows[y][x] = 'u'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/**
 * A wide, soft sand-to-water band: a 3px translucent shallows fade, a broken
 * foam lip, and two large 3-4px crescents. It replaces the bank's hard edge
 * band on sand seams, so the beach never speckles or ends on a straight line.
 */
function buildSandShoreBand(size: number, side: ShoreSide): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    t: 'rgba(214, 196, 158, 0.24)',
    u: 'rgba(214, 196, 158, 0.12)',
    f: 'rgba(240, 255, 255, 0.5)',
    s: 'rgba(214, 248, 255, 0.28)'
  }
  for (let along = 0; along < size; along++) {
    const wobble = ((along * 7 + side.charCodeAt(0) * 13) % 7) / 7
    // 3px translucent shallows band.
    for (let d = 0; d <= 2; d++) {
      const [x, y] = shorePoint(side, along, d, size)
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      if (d === 0) rows[y][x] = 't'
      else if (d === 1) rows[y][x] = 'u'
      else if ((along + d) % 2 === 0) rows[y][x] = 'u'
    }
    // A broken 1-2px foam lip, no isolated pixels.
    if ((along + Math.round(wobble * 3)) % 9 < 4) {
      const [x, y] = shorePoint(side, along, 0, size)
      if (x >= 0 && x < size && y >= 0 && y < size) rows[y][x] = 'f'
      const [x2, y2] = shorePoint(side, along, 1, size)
      if (x2 >= 0 && x2 < size && y2 >= 0 && y2 < size) rows[y2][x2] = 's'
    }
  }
  // Two large 3-4px crescents per tile, soft and wide.
  const reach = Math.max(7, Math.round(size * 0.38))
  for (let i = 0; i < 2; i++) {
    const offset = Math.round(size * (0.26 + i * 0.42))
    const radius = reach - i * 2
    for (let a = 0; a <= 20; a++) {
      const angle = Math.PI * (0.06 + (a / 20) * 0.88)
      const along = offset + Math.round(Math.cos(angle) * radius)
      const depth = Math.round(Math.sin(angle) * radius * 0.6)
      for (let thick = 0; thick < 3; thick++) {
        const [x, y] = shorePoint(side, along, depth + thick, size)
        if (x < 0 || x >= size || y < 0 || y >= size) continue
        if (thick === 0) rows[y][x] = a % 5 === 0 ? 's' : 'f'
        else if (thick === 1) rows[y][x] = 's'
        else if (a % 2 === 0) rows[y][x] = 's'
      }
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

type MouthVariant = 'left' | 'right' | 'middle'

/**
 * A river-mouth delta: a 2-3px shallows tint across the north edge and large
 * foam arcs curling into the sea from the mouth lips. The middle tiles carry
 * a soft foam wash, so a widened mouth still reads as one delta.
 */
function buildMouthDelta(size: number, variant: MouthVariant): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    t: 'rgba(214, 196, 158, 0.22)',
    u: 'rgba(214, 196, 158, 0.11)',
    f: 'rgba(240, 255, 255, 0.55)',
    s: 'rgba(214, 248, 255, 0.32)'
  }
  // A 2-3px shallows tint across the north edge blends river into sea.
  for (let x = 0; x < size; x++) {
    const wobble = ((x * 7 + variant.charCodeAt(0) * 13) % 5) / 5
    const depth = 2 + Math.round(wobble)
    for (let d = 0; d <= depth; d++) {
      if (d === 0) rows[d][x] = 't'
      else if (d === 1) rows[d][x] = 'u'
      else if ((x + d) % 2 === 0) rows[d][x] = 'u'
    }
  }
  // Large foam arcs curl into the sea from the left and right lips.
  const arcs = variant === 'middle' ? 0 : 2
  for (let i = 0; i < arcs; i++) {
    const radius = Math.round(size * (0.3 + i * 0.12))
    const cx = variant === 'left' ? 2 : size - 3
    const cy = 1
    for (let a = 0; a <= 22; a++) {
      const angle = Math.PI * (0.05 + (a / 22) * 0.9)
      const x = Math.round(cx + Math.cos(angle) * radius * (variant === 'right' ? -1 : 1))
      const y = Math.round(cy + Math.sin(angle) * radius * 0.7)
      for (let thick = 0; thick < 3; thick++) {
        const px = clampNumber(x, 0, size - 1)
        const py = clampNumber(y + thick, 0, size - 1)
        if (thick === 0) rows[py][px] = a % 5 === 0 ? 's' : 'f'
        else if (thick === 1) rows[py][px] = 's'
        else if (a % 2 === 0) rows[py][px] = 's'
      }
    }
  }
  // A few soft foam dashes in the middle of the mouth.
  if (variant === 'middle') {
    for (let i = 0; i < 3; i++) {
      const x = Math.round(size * (0.2 + i * 0.3))
      const y = 2 + (i % 2)
      rows[y][x] = 'f'
      if (x + 1 < size) rows[y][x + 1] = 's'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** An occasional small stone at the water's edge. */
function buildShoreStone(size: number, side: ShoreSide): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = { o: OUTLINE_COLOR, s: '#c9b79a', S: '#a89478', t: '#7d6b55' }
  const w = Math.max(4, Math.round(size * 0.18))
  const h = Math.max(3, Math.round(size * 0.13))
  const along = Math.round(size * 0.5)
  for (let v = 0; v < h; v++) {
    for (let u = -Math.floor(w / 2); u <= Math.floor(w / 2); u++) {
      const [x, y] = shorePoint(side, along + u, v, size)
      if (x < 0 || x >= size || y < 0 || y >= size) continue
      const edge = v === 0 || v === h - 1 || u === -Math.floor(w / 2) || u === Math.floor(w / 2)
      rows[y][x] = edge ? 'o' : v === 1 ? 's' : v === h - 2 ? 't' : 'S'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/** A soft foam arc that rounds a water/land corner instead of a hard 90°. */
function buildSoftCorner(size: number, corner: CornerId): RasterSprite {
  const rows = emptyRows(size, size)
  const palette = {
    f: 'rgba(240, 255, 255, 0.55)',
    s: 'rgba(214, 248, 255, 0.32)',
    t: 'rgba(214, 196, 158, 0.12)'
  }
  const radius = Math.max(5, Math.round(size * 0.46))
  for (let a = 0; a <= 20; a++) {
    const angle = (Math.PI / 2) * (a / 20)
    const wobble = 1 + (((a * 7) % 5) / 5) * 0.06
    const r = radius * wobble
    const dx = Math.round(Math.cos(angle) * r)
    const dy = Math.round(Math.sin(angle) * r)
    const x = corner === 'nw' || corner === 'sw' ? dx : size - 1 - dx
    const y = corner === 'nw' || corner === 'ne' ? dy : size - 1 - dy
    if (x >= 0 && x < size && y >= 0 && y < size) rows[y][x] = a % 4 === 0 ? 's' : 'f'
    const ix = corner === 'nw' || corner === 'sw' ? dx - 1 : size - dx
    const iy = corner === 'nw' || corner === 'ne' ? dy - 1 : size - dy
    if (ix >= 0 && ix < size && iy >= 0 && iy < size && a % 2 === 0) rows[iy][ix] = 's'
  }
  // A faint tint inside the arc covers the right-angle step underneath.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = corner === 'nw' || corner === 'sw' ? x : size - 1 - x
      const dy = corner === 'nw' || corner === 'ne' ? y : size - 1 - y
      if (Math.hypot(dx, dy) < radius * 0.8 && (x + y) % 2 === 0) rows[y][x] = 't'
    }
  }
  return spriteOf([rowsToFrame(rows, palette)])
}

/**
 * Static current garnish for the river channel and its pools: sinuous light
 * streaks, hooked eddies and foam flecks per frame. `bend` curves the
 * streaks toward the open water beside a bank; `calm` thins the density for
 * the widened pool. Every frame is mostly transparent so the water base and
 * its shoreline edges show through; the ground pass picks one frame per
 * tile by hash, so the river never animates.
 */
function buildRiverFlow(size: number, bend: number, calm: boolean): RasterSprite {
  const palette = {
    s: 'rgba(214, 248, 255, 0.35)', // streak / eddy
    f: 'rgba(240, 255, 255, 0.5)'   // foam fleck
  }
  // Per frame: three streaks with their own base, amplitude, wavelength
  // and phase, so no two frames repeat the same curve.
  const streaks: ReadonlyArray<ReadonlyArray<{ base: number; amp: number; wavelength: number; phase: number }>> = [
    [
      { base: 0.24, amp: 3, wavelength: 12, phase: 0.0 },
      { base: 0.52, amp: 2, wavelength: 9, phase: 2.1 },
      { base: 0.78, amp: 4, wavelength: 14, phase: 4.2 }
    ],
    [
      { base: 0.31, amp: 2, wavelength: 10, phase: 1.3 },
      { base: 0.59, amp: 4, wavelength: 13, phase: 3.4 },
      { base: 0.84, amp: 3, wavelength: 8, phase: 5.0 }
    ],
    [
      { base: 0.19, amp: 4, wavelength: 11, phase: 2.6 },
      { base: 0.47, amp: 3, wavelength: 14, phase: 0.7 },
      { base: 0.75, amp: 2, wavelength: 9, phase: 4.8 }
    ],
    [
      { base: 0.28, amp: 3, wavelength: 13, phase: 3.9 },
      { base: 0.56, amp: 2, wavelength: 8, phase: 1.8 },
      { base: 0.81, amp: 4, wavelength: 12, phase: 5.7 }
    ]
  ]
  // Two eddy centres per frame, shifting so the swirls never sit still.
  const eddies: ReadonlyArray<ReadonlyArray<readonly [number, number]>> = [
    [[0.34, 0.28], [0.72, 0.70]],
    [[0.44, 0.38], [0.80, 0.58]],
    [[0.26, 0.62], [0.62, 0.22]],
    [[0.38, 0.76], [0.76, 0.34]]
  ]
  const frames: RasterFrame[] = []
  const streakCount = calm ? 2 : 3
  const eddyCount = calm ? 1 : 2
  const foamCount = calm ? 3 : 5
  for (let f = 0; f < 4; f++) {
    const rows = emptyRows(size, size)
    const specs = streaks[f].slice(0, streakCount)
    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i]
      const baseX = Math.round(size * spec.base)
      const startY = 2 + (i % 2)
      const endY = size - 3 - ((i + f) % 2)
      let prevX = -1
      for (let y = startY; y <= endY; y++) {
        const wave = Math.sin((2 * Math.PI * y) / spec.wavelength + spec.phase)
        // The bend drifts the streak toward the open water beside a bank,
        // so the current visibly follows the meander instead of a rail.
        const drift = bend * (2 + (y / size) * 3)
        const x = clampNumber(Math.round(baseX + spec.amp * wave + drift), 1, size - 2)
        // Keep the 1px line connected when the sine steps sideways.
        if (prevX >= 0 && Math.abs(x - prevX) > 1) {
          const lo = Math.min(prevX, x)
          const hi = Math.max(prevX, x)
          for (let px = lo; px <= hi; px++) rows[y][px] = 's'
        } else {
          rows[y][x] = 's'
        }
        prevX = x
      }
    }

    // A tiny spiral that hooks back on itself, two pixels thick.
    for (const [ex, ey] of eddies[f].slice(0, eddyCount)) {
      const cx = Math.round(size * ex)
      const cy = Math.round(size * ey)
      const steps = 14
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const angle = -Math.PI * 0.6 + t * Math.PI * 1.8
        const radius = 3.2 - t * 1.8
        for (const r of [radius, radius - 1]) {
          const x = Math.round(cx + Math.cos(angle) * r)
          const y = Math.round(cy + Math.sin(angle) * r)
          if (x >= 1 && x < size - 1 && y >= 1 && y < size - 1) rows[y][x] = 's'
        }
      }
    }

    // Foam flecks scattered near the streaks, deterministic per frame.
    const rng = mulberry32(0xf10a + f * 977)
    for (let i = 0; i < foamCount; i++) {
      const spec = specs[i % specs.length]
      const baseX = Math.round(size * spec.base)
      const fx = clampNumber(baseX + Math.round((rng() - 0.5) * 6), 1, size - 2)
      const fy = clampNumber(2 + Math.round(rng() * (size - 5)), 1, size - 2)
      rows[fy][fx] = 'f'
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames)
}

/**
 * The open sea's lazy swell: two wide, slow arcs per frame and a few soft
 * foam crest flecks. Four frames at a long cadence, so the sea rolls rather
 * than flickers. The overlay is mostly transparent; the static water base
 * and its shoreline bands show through.
 */
function buildSeaSwell(size: number): RasterSprite {
  const palette = {
    b: 'rgba(40, 97, 143, 0.18)',   // calm base wash
    w: 'rgba(174, 232, 242, 0.16)', // wide wash
    s: 'rgba(214, 248, 255, 0.28)', // swell crest
    f: 'rgba(240, 255, 255, 0.42)'  // foam fleck
  }
  const frames: RasterFrame[] = []
  for (let f = 0; f < 4; f++) {
    const rows = emptyRows(size, size)
    // A low-alpha wash mutes the base tile's diagonal texture, so the sea
    // reads as open water rather than a repeating pattern.
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) rows[y][x] = 'b'
    }
    // Two wide arcs, rolling north a pixel or two per frame.
    for (let i = 0; i < 2; i++) {
      const baseY = Math.round(size * (0.3 + i * 0.34)) - f
      const phase = f * 0.9 + i * 2.4
      for (let x = 1; x < size - 1; x++) {
        const y = baseY + Math.round(Math.sin((x / size) * Math.PI * 2 + phase) * 1.6)
        if (y < 1 || y >= size - 1) continue
        rows[y][x] = (x + f) % 7 === 0 ? 'f' : 's'
        if (y + 1 < size - 1) rows[y + 1][x] = 'w'
      }
    }
    // Sparse foam crest flecks: 2px dashes that drift a few pixels.
    const flecks: ReadonlyArray<readonly [number, number]> = [
      [Math.round(size * 0.18) + f * 2, Math.round(size * 0.26)],
      [Math.round(size * 0.58) - f, Math.round(size * 0.62)],
      [Math.round(size * 0.82) + f, Math.round(size * 0.44)]
    ]
    for (const [fx, fy] of flecks) {
      for (let dx = 0; dx < 2; dx++) {
        const x = clampNumber(fx + dx, 1, size - 2)
        const y = clampNumber(fy, 1, size - 2)
        rows[y][x] = dx === 0 ? 'f' : 's'
      }
    }
    frames.push(rowsToFrame(rows, palette))
  }
  return spriteOf(frames, 2400)
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
  /** Rows that are mostly water: the open sea, excluded from river flow. */
  private readonly seaRows: ReadonlySet<number>
  /** Water tiles per map row and column, for channel-mouth corner detection. */
  private readonly rowWaterCounts: readonly number[]
  private readonly columnWaterCounts: readonly number[]
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
  private readonly catCache = new Map<string, RasterSprite>()
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

    // A row that is mostly water is the open sea, not the river; the flow
    // garnish stays off it so the sea keeps its own calm surface. The same
    // pass caches per-row and per-column water counts for channel mouths.
    const seaRows = new Set<number>()
    const rowWaterCounts = new Array<number>(this.worldHeight).fill(0)
    const columnWaterCounts = new Array<number>(this.worldWidth).fill(0)
    for (let y = 0; y < this.worldHeight; y++) {
      const row = worldMap.ground[y] ?? ''
      for (let x = 0; x < this.worldWidth; x++) {
        if (!isWaterChar(row.charAt(x))) continue
        rowWaterCounts[y]++
        columnWaterCounts[x]++
      }
      if (rowWaterCounts[y] >= this.worldWidth * 0.7) seaRows.add(y)
    }
    this.seaRows = seaRows
    this.rowWaterCounts = rowWaterCounts
    this.columnWaterCounts = columnWaterCounts

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
    // The paddock ring is authored as one stoneWall object per tile, so a
    // wall tile's run direction comes from its neighbours, not its footprint.
    const stoneWallKeys = new Set(
      worldMap.objects.filter((item) => item.type === 'stoneWall').map((item) => `${item.x},${item.y}`)
    )

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
        bugs.push(this.buildButterflyMotion(object, hash))
        continue
      }
      // A fence, gate, or stone wall on a vertical run needs its vertical
      // sprite; a horizontal run keeps the horizontal one. Stone walls are
      // single-tile objects, so their run direction is read from neighbours:
      // a north or south wall with no east or west wall is a vertical run.
      const isVerticalRun =
        (object.type === 'fence' && footH > footW) ||
        (object.type === 'gate' && footH >= footW) ||
        (object.type === 'stoneWall' &&
          !stoneWallKeys.has(`${object.x - 1},${object.y}`) &&
          !stoneWallKeys.has(`${object.x + 1},${object.y}`) &&
          (stoneWallKeys.has(`${object.x},${object.y - 1}`) ||
            stoneWallKeys.has(`${object.x},${object.y + 1}`)))
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

    this.drawGround(ctx, camX, camY, time)

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

  private drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number): void {
    const ts = this.tileSize
    const rowsVisible = this.viewHeight / ROW_COMPRESS / ts + 2
    // The shear pushes lower rows right, so the left edge needs the same
    // reach as the right. A two-tile margin past that reach lets the map
    // bleed into the shear wedges instead of showing flat clear-rect fill.
    const shearTiles = Math.ceil((SHEAR_PX_PER_TILE * rowsVisible) / ts)
    const margin = 2
    const startX = Math.floor(camX / ts) - shearTiles - margin
    const startY = Math.floor(camY / ts) - margin
    const endX = Math.ceil((camX + this.viewWidth + SHEAR_PX_PER_TILE * rowsVisible) / ts) + 1 + margin
    const endY = Math.ceil((camY + this.viewHeight / ROW_COMPRESS) / ts) + 1 + margin

    for (let ty = startY; ty < endY; ty++) {
      // Outside the map, sample the nearest edge row/column and draw that
      // tile's art at the real screen position, so the border bleeds.
      const sampleY = clampNumber(ty, 0, this.worldHeight - 1)
      const row = worldMap.ground[sampleY]
      for (let tx = startX; tx < endX; tx++) {
        const sampleX = clampNumber(tx, 0, this.worldWidth - 1)
        const char = row?.charAt(sampleX) ?? '.'
        const style = this.groundStyle(char)
        const hash = hashCoordinates(sampleX, sampleY, char.charCodeAt(0) * 17 + 3)
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

        // Shoreline and cliff treatments only make sense inside the map;
        // the bleed margin is the edge tile's base art.
        const inMap = tx >= 0 && ty >= 0 && tx < this.worldWidth && ty < this.worldHeight
        if (style.kind === 'grass') this.drawGrassLife(ctx, sx, sy, hash)
        else if (style.kind === 'water' && inMap) {
          this.drawWaterEdges(ctx, tx, ty, camX, camY)
          // A bridge, dam or arch tile is river water wearing a structure:
          // the base and shoreline overlays land first, then the stone or
          // timber rides on top.
          if (char === BRIDGE_CHAR) {
            const westBridge = this.groundChar(tx - 1, ty) === BRIDGE_CHAR
            const eastBridge = this.groundChar(tx + 1, ty) === BRIDGE_CHAR
            const single = !westBridge && !eastBridge
            const key = single ? 'bridgeDeckSingle' : 'bridgeDeck'
            const deck = this.overlaySprite(key, () => buildBridgeDeckFrames(this.nativeTile(), single))
            // A paired deck composes left to right: a deck with another deck
            // to its west is the east half, everything else the west half.
            const half = westBridge ? 1 : 0
            const deckCanvas = this.frameCanvas('overlay', key, deck, single ? 0 : half)
            if (deckCanvas) ctx.drawImage(deckCanvas, sx, sy)
          } else if (char === DAM_CHAR) {
            const layout = damLayout(this.nativeTile())
            const dam = this.overlaySprite('dam', () => buildDamFrames(this.nativeTile()))
            const half = this.groundChar(tx - 1, ty) === DAM_CHAR ? 1 : 0
            const damCanvas = this.frameCanvas('overlay', 'dam', dam, half)
            // The dam frame is taller than its tile: lift it so its bottom
            // stays on the tile bottom and its crest rises above the bank.
            const rise = layout.rise * this.spriteScale
            if (damCanvas) ctx.drawImage(damCanvas, sx, sy - rise)
            // The cascade sheets over the crest's downstream edge and down
            // the face into the foam churn at its foot. Both halves share
            // one frame so the pair reads as a single fall.
            const key = `damSpill:${half}`
            const spill = this.overlaySprite(key, () => buildDamSpillFrames(this.nativeTile(), half))
            const spillFrame = hashCoordinates(tx - half, ty, 0xd4a3) % spill.frames.length
            const spillCanvas = this.frameCanvas('overlay', key, spill, spillFrame)
            if (spillCanvas) {
              ctx.drawImage(spillCanvas, sx, sy - rise + layout.crestEdge * this.spriteScale)
            }
          } else if (char === ARCH_CHAR) {
            const arch = this.overlaySprite('arch', () => buildArchFrames(this.nativeTile()))
            const half = this.groundChar(tx - 1, ty) === ARCH_CHAR ? 1 : 0
            const archCanvas = this.frameCanvas('overlay', 'arch', arch, half)
            if (archCanvas) ctx.drawImage(archCanvas, sx, sy)
          } else {
            // The open sea gets its own lazy swell: wide arcs and sparse
            // foam, animated only in this overlay. The water base stays
            // static, so the ground plane never moves.
            if (this.seaRows.has(ty)) {
              const swell = this.overlaySprite('seaSwell', () => buildSeaSwell(this.nativeTile()))
              const swellFrame = (Math.floor(time / 2400) + hash) % swell.frames.length
              const swellCanvas = this.frameCanvas('overlay', 'seaSwell', swell, swellFrame)
              if (swellCanvas) ctx.drawImage(swellCanvas, sx, sy)
              // The river mouth gets a delta overlay on top of the swell:
              // a shallows tint and foam arcs curling into the sea.
              if (this.isMouthTile(tx, ty)) {
                const variant = this.mouthVariant(tx, ty)
                const key = `mouthDelta:${variant}`
                const delta = this.overlaySprite(key, () => buildMouthDelta(this.nativeTile(), variant))
                const deltaCanvas = this.frameCanvas('overlay', key, delta, 0)
                if (deltaCanvas) ctx.drawImage(deltaCanvas, sx, sy)
              }
            } else {
              // Static current garnish on river and pool tiles; the frame is
              // hash-chosen per tile, so the pattern varies but never moves.
              const variant = this.riverFlowVariant(tx, ty)
              if (variant) {
                const key = `riverFlow:${variant.bend}:${variant.calm ? 'c' : 'n'}`
                const flow = this.overlaySprite(key, () =>
                  buildRiverFlow(this.nativeTile(), variant.bend, variant.calm)
                )
                const flowCanvas = this.frameCanvas('overlay', key, flow, hash % flow.frames.length)
                if (flowCanvas) ctx.drawImage(flowCanvas, sx, sy)
              }
            }
          }
          // Reeds, foam and stones break the long waterlines.
          this.drawShoreGarnish(ctx, tx, ty, sx, sy)
        } else if (style.kind === 'cliff' && inMap) this.drawCliffDepth(ctx, tx, ty, sx, sy)
        else if (style.kind === 'sand' && inMap) this.drawLandShoreGarnish(ctx, tx, ty, sx, sy)
        // A cliff casts a soft shadow onto whatever ground lies below it.
        if (inMap && style.kind !== 'cliff' && this.groundChar(tx, ty - 1) === CLIFF_CHAR) {
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
    // A vertical run reads as one face: grass lip on the crown row, the
    // sprite's own organic rock masses down the middle, and rubble plus a
    // contact shadow where it meets the ground. No horizontal strata band:
    // the face is grey stone, not stacked timber.
    if (!aboveIsCliff) {
      drawOverlay('cliffLip', this.overlaySprite('cliffLip', () => buildCliffLip(n, this.grassTones)), 0)
    }
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
    // A foam arc over the bank corner rounds the junction instead of
    // leaving a hard 90-degree pinch, especially at sea corners and bends.
    const softCorner = (id: CornerId): void => {
      const key = `softCorner:${id}`
      const sprite = this.overlaySprite(key, () => buildSoftCorner(n, id))
      const canvas = this.frameCanvas('overlay', key, sprite, 0)
      if (canvas) ctx.drawImage(canvas, sx, sy)
    }
    // A wide, soft sand band replaces the bank's hard edge band on sand
    // seams, so the beach fades into the water without speckles.
    const sandBand = (side: ShoreSide): void => {
      const key = `sandBand:${side}`
      const sprite = this.overlaySprite(key, () => buildSandShoreBand(n, side))
      const canvas = this.frameCanvas('overlay', key, sprite, 0)
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
    const northChar = this.groundChar(tx, ty - 1)
    const southChar = this.groundChar(tx, ty + 1)
    const westChar = this.groundChar(tx - 1, ty)
    const eastChar = this.groundChar(tx + 1, ty)
    if (!north) {
      if (northChar === 's') sandBand('n')
      else drawBand('waterEdgeN')
    }
    if (!south) {
      if (southChar === 's') sandBand('s')
      else drawBand('waterEdgeS')
    }
    if (!west) {
      if (westChar === 's') sandBand('w')
      else drawBand('waterEdgeW')
    }
    if (!east) {
      if (eastChar === 's') sandBand('e')
      else drawBand('waterEdgeE')
    }

    // A north bank reads as sunken: inner wall face plus a vertical smear
    // of the rim reflecting into the water below it. A sand beach is a
    // gentle slope, not a sunken wall, so it gets the soft sand band instead.
    if (!north && northChar !== 's') {
      const face = this.overlaySprite('waterInnerFace', () => buildWaterInnerFace(n))
      drawOverlayFrame('waterInnerFace', face, tileHash % face.frames.length)
      const smear = this.overlaySprite('waterSmear', () => buildWaterSmear(n))
      drawOverlayFrame('waterSmear', smear)
    }

    // Inner corners: two land edges meet and pinch the shore.
    if (!north && !west) {
      corner('waterCornerNW')
      softCorner('nw')
    }
    if (!north && !east) {
      corner('waterCornerNE')
      softCorner('ne')
    }
    if (!south && !west) {
      corner('waterCornerSW')
      softCorner('sw')
    }
    if (!south && !east) {
      corner('waterCornerSE')
      softCorner('se')
    }
    // Outer corners: the diagonal is land while both orthogonal sides are water.
    if (north && west && !isWaterChar(this.groundChar(tx - 1, ty - 1))) {
      corner('waterNotchNW')
      softCorner('nw')
    }
    if (north && east && !isWaterChar(this.groundChar(tx + 1, ty - 1))) {
      corner('waterNotchNE')
      softCorner('ne')
    }
    if (south && west && !isWaterChar(this.groundChar(tx - 1, ty + 1))) {
      corner('waterNotchSW')
      softCorner('sw')
    }
    if (south && east && !isWaterChar(this.groundChar(tx + 1, ty + 1))) {
      corner('waterNotchSE')
      softCorner('se')
    }

    // Mouth lips: where the sand shore meets the river mouth, round the
    // corner so the delta has soft lips instead of a right-angle T.
    const neDiag = this.groundChar(tx + 1, ty - 1)
    const nwDiag = this.groundChar(tx - 1, ty - 1)
    if (!north && east && isWaterChar(neDiag) && !this.seaRows.has(ty - 1)) softCorner('ne')
    if (!north && west && isWaterChar(nwDiag) && !this.seaRows.has(ty - 1)) softCorner('nw')

    // Wide non-sea water bodies (the mountain lake and pond) get a soft
    // corner at both ends of every land side, so the rim reads organic
    // instead of a tile staircase.
    if (this.isWideWater(tx, ty)) {
      if (!north) {
        softCorner('nw')
        softCorner('ne')
      }
      if (!south) {
        softCorner('sw')
        softCorner('se')
      }
      if (!west) {
        softCorner('nw')
        softCorner('sw')
      }
      if (!east) {
        softCorner('ne')
        softCorner('se')
      }
    }

    // Channel mouths: where a narrow run meets a wider body, round the two
    // land-side corners so the river mouth, lake inlet and pond outlet never
    // leave a right-angle step at the seam.
    const rowWater = this.waterInRow(ty)
    if (north && south && this.waterInRow(ty - 1) >= rowWater + 3) {
      if (!west) softCorner('nw')
      if (!east) softCorner('ne')
    }
    if (north && south && this.waterInRow(ty + 1) >= rowWater + 3) {
      if (!west) softCorner('sw')
      if (!east) softCorner('se')
    }
    if (west && east) {
      const colWater = this.waterInColumn(tx)
      if (this.waterInColumn(tx - 1) >= colWater + 3) {
        if (!north) softCorner('nw')
        if (!south) softCorner('sw')
      }
      if (this.waterInColumn(tx + 1) >= colWater + 3) {
        if (!north) softCorner('ne')
        if (!south) softCorner('se')
      }
    }
    // The dam's foot is a hard stone lip; a foam arc at each corner blends
    // the spill into the river below it.
    if (northChar === DAM_CHAR) {
      softCorner('nw')
      softCorner('ne')
    }
  }

  /**
   * A water tile in a narrow north-south channel: water or bridge above and
   * below, and land pressing in from one side. This selects the river run
   * (including the mouth) while leaving the open sea alone. Tiles outside
   * the map do not count as land, so the sea's outer columns stay clear.
   */
  private isNarrowChannel(tx: number, ty: number): boolean {
    const north = isWaterChar(this.groundChar(tx, ty - 1))
    const south = isWaterChar(this.groundChar(tx, ty + 1))
    const westLand = this.isLandTile(tx - 1, ty)
    const eastLand = this.isLandTile(tx + 1, ty)
    return north && south && (westLand || eastLand)
  }

  private isLandTile(tx: number, ty: number): boolean {
    if (tx < 0 || ty < 0 || tx >= this.worldWidth || ty >= this.worldHeight) return false
    return !isWaterChar(this.groundChar(tx, ty))
  }

  /** A wide, non-sea water body: the mountain lake, the pond, a broad pool. */
  private isWideWater(tx: number, ty: number): boolean {
    if (!isWaterChar(this.groundChar(tx, ty))) return false
    if (this.seaRows.has(ty)) return false
    let count = 0
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (isWaterChar(this.groundChar(tx + dx, ty + dy))) count++
      }
    }
    return count >= 14
  }

  /** A sea tile at the river mouth: river water above, sea water here. */
  private isMouthTile(tx: number, ty: number): boolean {
    if (!this.seaRows.has(ty)) return false
    if (this.seaRows.has(ty - 1)) return false
    const north = this.groundChar(tx, ty - 1)
    const nw = this.groundChar(tx - 1, ty - 1)
    const ne = this.groundChar(tx + 1, ty - 1)
    return isWaterChar(north) || isWaterChar(nw) || isWaterChar(ne)
  }

  /** Which side of the mouth a sea tile sits on, for the delta foam arcs. */
  private mouthVariant(tx: number, ty: number): MouthVariant {
    const nwLand = this.isLandTile(tx - 1, ty - 1)
    const neLand = this.isLandTile(tx + 1, ty - 1)
    if (nwLand && !neLand) return 'left'
    if (neLand && !nwLand) return 'right'
    return 'middle'
  }

  /** Water tiles in one map row, used to spot a channel widening into a body. */
  private waterInRow(ty: number): number {
    return this.rowWaterCounts[ty] ?? 0
  }

  /** Water tiles in one map column, for east-west channel mouths. */
  private waterInColumn(tx: number): number {
    return this.columnWaterCounts[tx] ?? 0
  }

  /**
   * The flow variant for a river or pool tile: `bend` curves the streaks
   * toward the open water beside a bank, `calm` thins them for the widened
   * pool. The open sea is excluded by its mostly-water rows.
   */
  private riverFlowVariant(tx: number, ty: number): { bend: number; calm: boolean } | null {
    if (this.seaRows.has(ty)) return null
    const north = isWaterChar(this.groundChar(tx, ty - 1))
    const south = isWaterChar(this.groundChar(tx, ty + 1))
    const west = isWaterChar(this.groundChar(tx - 1, ty))
    const east = isWaterChar(this.groundChar(tx + 1, ty))
    const waterCount = (north ? 1 : 0) + (south ? 1 : 0) + (west ? 1 : 0) + (east ? 1 : 0)
    if (waterCount < 2) return null
    const westLand = this.isLandTile(tx - 1, ty)
    const eastLand = this.isLandTile(tx + 1, ty)
    const bend = westLand && !eastLand ? 1 : eastLand && !westLand ? -1 : 0
    return { bend, calm: waterCount >= 3 }
  }

  /**
   * Hash-gated shore garnish on plain water tiles: reeds over grass banks,
   * foam arcs over sand banks, and the occasional stone. This breaks the
   * long hard waterline along the sea and the meandering riverbanks.
   */
  private drawShoreGarnish(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    sx: number,
    sy: number
  ): void {
    if (this.groundChar(tx, ty) !== WATER_CHAR) return
    const sides: Array<{ side: ShoreSide; land: string }> = []
    const north = this.groundChar(tx, ty - 1)
    const south = this.groundChar(tx, ty + 1)
    const west = this.groundChar(tx - 1, ty)
    const east = this.groundChar(tx + 1, ty)
    if (!isWaterChar(north)) sides.push({ side: 'n', land: north })
    if (!isWaterChar(south)) sides.push({ side: 's', land: south })
    if (!isWaterChar(west)) sides.push({ side: 'w', land: west })
    if (!isWaterChar(east)) sides.push({ side: 'e', land: east })
    // Small enclosed bodies (the mountain lake and pond) get a denser
    // reed/foam rim so their shore reads organic rather than tiled.
    const wide = this.isWideWater(tx, ty)
    const garnishGate = wide ? 2 : 4
    for (const { side, land } of sides) {
      const sideHash = hashCoordinates(tx, ty, side.charCodeAt(0) * 31 + 7)
      const isSand = land === 's'
      const isGrass = land === '.' || land === 'f' || land === 't'
      const isDam = land === 'D'
      // Shift toward the bank so reeds and foam overlap the land's own
      // dark edge, not just the water side of the seam. Foam reaches two
      // pixels in because the sand tile's bottom edge is two rows deep.
      const dx = side === 'w' ? -1 : side === 'e' ? 1 : 0
      const dy = side === 'n' ? -1 : side === 's' ? 1 : 0
      const fdx = side === 'w' ? -2 : side === 'e' ? 2 : 0
      const fdy = side === 'n' ? -2 : side === 's' ? 2 : 0
      if (isGrass && sideHash % garnishGate === 0) {
        const key = `shoreReeds:${side}`
        const sprite = this.overlaySprite(key, () => buildShoreReeds(this.nativeTile(), side))
        const canvas = this.frameCanvas('overlay', key, sprite, 0)
        if (canvas) ctx.drawImage(canvas, sx + dx, sy + dy)
      } else if (isSand && sideHash % garnishGate === 0) {
        const key = `shoreFoam:${side}`
        const sprite = this.overlaySprite(key, () => buildShoreFoam(this.nativeTile(), side))
        const canvas = this.frameCanvas('overlay', key, sprite, 0)
        if (canvas) ctx.drawImage(canvas, sx + fdx, sy + fdy)
      } else if (isDam) {
        // The dam's foot is a stone lip; a soft foam lip blends the spill
        // into the river without a hard horizontal seam.
        const key = `shoreFoam:${side}`
        const sprite = this.overlaySprite(key, () => buildShoreFoam(this.nativeTile(), side))
        const canvas = this.frameCanvas('overlay', key, sprite, 0)
        if (canvas) ctx.drawImage(canvas, sx + fdx, sy + fdy)
      }
      if (sideHash % 13 === 0) {
        const key = `shoreStone:${side}`
        const sprite = this.overlaySprite(key, () => buildShoreStone(this.nativeTile(), side))
        const canvas = this.frameCanvas('overlay', key, sprite, 0)
        if (canvas) ctx.drawImage(canvas, sx + dx, sy + dy)
      }
    }
  }

  /**
   * Foam wash on the land side of a sand/water seam. The sand tile's own
   * bottom edge is the dark line the user sees; drawing the wash here
   * covers it instead of only painting the water side.
   */
  private drawLandShoreGarnish(
    ctx: CanvasRenderingContext2D,
    tx: number,
    ty: number,
    sx: number,
    sy: number
  ): void {
    if (this.groundChar(tx, ty) !== 's') return
    const sides: ShoreSide[] = []
    if (isWaterChar(this.groundChar(tx, ty - 1))) sides.push('n')
    if (isWaterChar(this.groundChar(tx, ty + 1))) sides.push('s')
    if (isWaterChar(this.groundChar(tx - 1, ty))) sides.push('w')
    if (isWaterChar(this.groundChar(tx + 1, ty))) sides.push('e')
    for (const side of sides) {
      const sideHash = hashCoordinates(tx, ty, side.charCodeAt(0) * 53 + 11)
      if (sideHash % 3 !== 0) continue
      const key = `shoreFoamLand:${side}`
      const sprite = this.overlaySprite(key, () => buildShoreFoam(this.nativeTile(), side))
      const canvas = this.frameCanvas('overlay', key, sprite, 0)
      if (canvas) ctx.drawImage(canvas, sx, sy)
    }
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
    if (isWaterChar(this.groundChar(startX, startY))) {
      originX = startX
      originY = startY
    } else {
      for (let radius = 1; radius <= 8 && originX < 0; radius++) {
        for (let dy = -radius; dy <= radius && originX < 0; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (isWaterChar(this.groundChar(startX + dx, startY + dy))) {
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
        if (seen.has(id) || !isWaterChar(this.groundChar(nx, ny))) continue
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

  /**
   * A flyer's route: 5-8 tile-centre waypoints spread around the map on a
   * hash-rotated ellipse, with per-waypoint radius and angle jitter so two
   * flyers rarely share a loop. Flyers are above the scene, so any tile is
   * fair game - water, cliffs and roofs included.
   */
  private buildButterflyMotion(
    object: { type: string; x: number; y: number },
    hash: number
  ): ButterflyMotion {
    const ts = this.tileSize
    const count = 5 + (hash % 4)
    const baseAngle = (hash % 6283) / 1000
    const cx = this.worldWidth / 2
    const cy = this.worldHeight / 2
    const path: PondWaypoint[] = []
    for (let i = 0; i < count; i++) {
      // A different salt per waypoint keeps the route from collapsing into
      // a regular polygon; the rotation spreads flyers apart.
      const h = hashCoordinates(object.x + i * 13, object.y - i * 7, hash ^ Math.imul(i + 1, 0x9e3779b1))
      const angle = baseAngle + (i / count) * Math.PI * 2 + ((h % 100) / 100) * 0.35
      const rx = (this.worldWidth / 2) * (0.42 + ((h >>> 8) % 56) / 100)
      const ry = (this.worldHeight / 2) * (0.42 + ((h >>> 16) % 56) / 100)
      const tx = clampNumber(Math.round(cx + Math.cos(angle) * rx), 0, this.worldWidth - 1)
      const ty = clampNumber(Math.round(cy + Math.sin(angle) * ry), 0, this.worldHeight - 1)
      path.push({ x: tx * ts + ts / 2, y: ty * ts + ts / 2 })
    }
    const pace = FLYER_PACE[object.type] ?? DEFAULT_FLYER_PACE
    return {
      key: `${object.type}:${object.x}:${object.y}`,
      sprite: this.propSprite(object.type),
      path,
      // A full circuit takes a couple of lazy minutes, not half a minute.
      // The species pace stretches or squeezes that calm base.
      loopMs: (96000 + (hash % 72000)) * pace.loop,
      phase: (hash % 997) / 997,
      // A gentle 1-2px drift over many seconds, so the route never reads
      // as a rigid rail and never buzzes.
      ampX: (1 + (hash % 2)) * pace.amp,
      ampY: (1 + ((hash >>> 4) % 2)) * pace.amp,
      freqX: ((Math.PI * 2) / (14000 + (hash % 6000))) * pace.freq,
      freqY: ((Math.PI * 2) / (12000 + (hash % 5000))) * pace.freq,
      phase2: ((hash >>> 8) % 6283) / 1000
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

  /** The companion's sprite set for a pose; bank art is normalized once. */
  private catSprite(kind: 'walk' | 'sit' | 'stare'): RasterSprite {
    const cached = this.catCache.get(kind)
    if (cached) return cached
    const sprite =
      normalizeSprite(catSprites[kind]) ?? makePlaceholderSprite(this.nativeTile(), '#c97a3a', '#f2e2c4')
    this.catCache.set(kind, sprite)
    return sprite
  }

  /** Walk frames while moving; sit or stare frames while idle. */
  private catKind(companion: RenderCompanionState): 'walk' | 'sit' | 'stare' {
    if (companion.moving) return 'walk'
    return companion.staring ? 'stare' : 'sit'
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
    const py =
      this.projectY(state.player.y, camY) + this.structureLiftAt(state.player.x, state.player.y) * ROW_COMPRESS
    if (px >= -this.cullMargin && px <= this.viewWidth + this.cullMargin && py >= -this.cullMargin && py <= this.viewHeight + this.cullMargin) {
      const sprite = this.playerSprite(state.player.direction)
      const base = sprite.frames[0]
      this.drawStructureShadow(ctx, px, py, (base?.width ?? this.tileSize) * this.spriteScale, 'player')
    }
    const companion = state.companion
    if (companion) {
      const cx = this.projectX(companion.x, companion.y, camX, camY)
      const cy =
        this.projectY(companion.y, camY) + this.structureLiftAt(companion.x, companion.y) * ROW_COMPRESS
      if (cx >= -this.cullMargin && cx <= this.viewWidth + this.cullMargin && cy >= -this.cullMargin && cy <= this.viewHeight + this.cullMargin) {
        const sprite = this.catSprite(this.catKind(companion))
        const base = sprite.frames[0]
        this.drawStructureShadow(ctx, cx, cy, (base?.width ?? this.tileSize) * this.spriteScale, 'cat')
      }
    }
  }

  /** Standing props, the player and the fish share one y-sorted pass. */
  private drawScene(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number, time: number): void {
    const dynamic: DynamicItem[] = [
      { depth: state.player.y, draw: () => this.drawPlayer(ctx, state, camX, camY) },
      ...(state.companion
        ? [{ depth: state.companion.y, draw: () => this.drawCompanion(ctx, state, camX, camY) }]
        : []),
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
    if (!isWaterChar(this.groundChar(Math.floor(px / this.tileSize), Math.floor(py / this.tileSize)))) {
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
    // Hens amble a couple of pixels over many seconds, never pecking in a
    // nervous jitter. This is a draw-time offset only: the footprint, depth
    // and collision stay put.
    const shuffleX =
      entry.type === 'chicken' ? Math.sin(time * 0.00035 + entry.phase * 0.013 + 1.7) * 2 : 0
    const shuffleY =
      entry.type === 'chicken' ? Math.sin(time * 0.00028 + entry.phase * 0.019 + 4.2) * 1.5 : 0
    // Feet projected onto the tilted ground; the sprite itself stays upright.
    const feetX = Math.round(this.projectX(entry.x + entry.width / 2, entry.baseY, camX, camY) + shuffleX)
    const feetY = Math.round(this.projectY(entry.baseY, camY) + shuffleY)
    const sx = Math.round(feetX - entry.width / 2)
    // The art's lowest opaque pixel lands on the base line; any transparent
    // padding under the sprite's feet is drawn away below it.
    // The water wheel sits in the river: its paddle arc and foam dip below
    // the tile-bottom anchor while the hub stays above the waterline. The
    // shadow still uses entry.baseY, so it stays on the base tile.
    const sink =
      entry.type === 'waterWheel'
        ? WATER_WHEEL_SINK_PX * this.spriteScale
        : entry.type === 'waterWheelHouse'
          ? WATER_WHEEL_HOUSE_SINK_PX * this.spriteScale
          : 0
    const sy = Math.round(feetY - entry.height + entry.basePad + sink)
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
    const shared = sharedKey ? WORLD_ANIMATION_SCHEDULES[sharedKey] : undefined
    if (shared) {
      return {
        frameCount: Math.min(shared.frameCount, Math.max(1, entry.sprite.frames.length)),
        frameMs: shared.frameMs * pace,
        pingPong: shared.pingPong
      }
    }
    return { frameCount: entry.sprite.frames.length, frameMs: entry.sprite.frameMs * pace }
  }

  /**
   * How far the player's feet must rise to stand on a raised structure.
   * The gameplay position stays at the tile base; this is a draw-time lift
   * that follows the arch curve or the dam's flat crest.
   */
  private structureLiftAt(worldX: number, worldY: number): number {
    const ts = this.tileSize
    const tx = Math.floor(worldX / ts)
    const ty = Math.floor(worldY / ts)
    const char = this.groundChar(tx, ty)
    if (char === DAM_CHAR) {
      const layout = damLayout(this.nativeTile())
      const crestWorld = ty * ts - layout.rise * this.spriteScale + layout.crestTop * this.spriteScale
      return crestWorld - worldY
    }
    if (char !== ARCH_CHAR) return 0
    const native = this.nativeTile()
    const localX = clampNumber(worldX - tx * ts, 0, ts - 1)
    const nx = Math.round((localX / ts) * (native - 1))
    const half = this.groundChar(tx - 1, ty) === ARCH_CHAR ? 1 : 0
    const deckTopWorld = archDeckTop(native, half, nx) * this.spriteScale
    return deckTopWorld - (worldY - ty * ts)
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
    const feetY = Math.round(
      this.projectY(state.player.y, camY) + this.structureLiftAt(state.player.x, state.player.y) * ROW_COMPRESS
    )
    ctx.drawImage(canvas, Math.round(feetX - width / 2), Math.round(feetY - height + basePad))
  }

  /**
   * The cat companion, drawn exactly like the player: feet projected onto
   * the tilted ground, sprite upright, mirrored for rightward travel, and
   * the art's transparent bottom padding drawn away so her paws land on
   * the base line.
   */
  private drawCompanion(ctx: CanvasRenderingContext2D, state: RenderState, camX: number, camY: number): void {
    const companion = state.companion
    if (!companion) return
    const kind = this.catKind(companion)
    const sprite = this.catSprite(kind)
    const count = sprite.frames.length
    if (count === 0) return
    const rawFrame = Math.trunc(companion.frame)
    const frame = ((rawFrame % count) + count) % count
    const base = sprite.frames[frame]
    if (!base) return
    const canvas = this.frameCanvas('cat', kind, sprite, frame, companion.direction === 'right')
    if (!canvas) return
    const width = base.width * this.spriteScale
    const height = base.height * this.spriteScale
    const basePad = frameBottomPad(base) * this.spriteScale
    const feetX = Math.round(this.projectX(companion.x, companion.y, camX, camY))
    const feetY = Math.round(
      this.projectY(companion.y, camY) + this.structureLiftAt(companion.x, companion.y) * ROW_COMPRESS
    )
    ctx.drawImage(canvas, Math.round(feetX - width / 2), Math.round(feetY - height + basePad))
  }

  /**
   * Bugs fly above the sorted scene, following long eased waypoint loops
   * across the map. A small sinusoid rides on the interpolated waypoint so
   * the flight never reads as a rigid rail; the sprite mirrors with the
   * east/west leg and keeps the same lazy bob as the fish.
   */
  private drawButterflies(ctx: CanvasRenderingContext2D, camX: number, camY: number, time: number): void {
    if (this.butterflies.length === 0) return
    const items = this.butterflies
      .map((motion) => {
        const n = motion.path.length
        const cycle = (time / motion.loopMs + motion.phase) % 1
        const step = cycle * n
        const index = Math.floor(step) % n
        const nextIndex = (index + 1) % n
        const frac = step - Math.floor(step)
        // Smooth in and out of each waypoint, like the fish ring.
        const ease = frac * frac * (3 - 2 * frac)
        const from = motion.path[index]
        const to = motion.path[nextIndex]
        const px =
          from.x +
          (to.x - from.x) * ease +
          motion.ampX * Math.sin(time * motion.freqX + motion.phase2)
        const py =
          from.y +
          (to.y - from.y) * ease +
          motion.ampY * Math.sin(time * motion.freqY + motion.phase)
        return { motion, from, to, px, py }
      })
      .sort((a, b) => a.py - b.py)
    for (const { motion, from, to, px, py } of items) {
      // A slow vertical breathing, not a nervous jitter.
      const bob = Math.sin(time * 0.0012 + motion.phase) * 1.5
      // Sprite faces left; flip it whenever it travels right.
      const mirror = to.x >= from.x
      const frame = frameAt(time + motion.phase * 900, this.butterflySchedule)
      const base = motion.sprite.frames[0]
      const scale = FLYER_DRAW_SCALE[motion.key.split(':')[0]] ?? { w: 1, h: 1 }
      const width = (base?.width ?? this.tileSize) * this.spriteScale * scale.w
      const height = (base?.height ?? this.tileSize) * this.spriteScale * scale.h
      const cx = Math.round(this.projectX(px, py, camX, camY))
      const cy = Math.round(this.projectY(py, camY))
      const sx = Math.round(cx - width / 2)
      const sy = Math.round(cy - height / 2 + bob)
      if (sx < -this.cullMargin || sx > this.viewWidth + this.cullMargin) continue
      if (sy < -this.cullMargin || sy > this.viewHeight + this.cullMargin) continue
      const canvas = this.frameCanvas('prop', motion.key, motion.sprite, frame, mirror)
      if (canvas) ctx.drawImage(canvas, sx, sy, width, height)
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
