<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlayerControls } from '~/composables/usePlayerControls'
import { frameAt, playerWalkAnimation } from '~/utils/world-animation'
import { createCollisionGrid, getLandmarkAt, worldMap, type WorldObject } from '~/utils/world-map'
import { WorldRenderer, type PlayerDirection, type RenderCompanionState, type RenderState } from '~/utils/world-renderer'

/**
 * Gameplay is defined in tiles, not pixels, so it follows the map's own tile
 * size: at 32px tiles the viewport is 768x480 world pixels and the player
 * crosses 3.75 tiles per second, and the same numbers stay correct if the
 * world's tile size changes again.
 */
const VIEW_TILES_W = 24
const VIEW_TILES_H = 15
const MOVE_TILES_PER_SEC = 3.75
const CAMERA_LERP = 7
const MAX_FRAME_DT = 0.05
const MESSAGE_RANGE = 1
/** Movement cues are throttled so the sound layer hears a steady stride, not every frame. */
const MOVE_CUE_MS = 250

const props = defineProps<{ label?: string }>()

/** Entering a landmark emits its id and label; leaving emits null. */
const emit = defineEmits<{
  'location-change': [location: { id: string; label: string } | null]
  'message-change': [message: string | null]
}>()

const rootEl = ref<HTMLElement | null>(null)
const canvasEl = ref<HTMLCanvasElement | null>(null)
const controls = usePlayerControls(rootEl)

const tileSize = worldMap.tileSize > 0 ? worldMap.tileSize : 16
const VIEW_W = VIEW_TILES_W * tileSize
const VIEW_H = VIEW_TILES_H * tileSize
const MOVE_SPEED = MOVE_TILES_PER_SEC * tileSize
/** Feet box: a quarter tile wide and three-sixteenths of a tile tall. */
const PLAYER_HALF_W = Math.round(tileSize / 4)
const PLAYER_HALF_H = Math.round((tileSize * 3) / 16)
const collisionGrid = createCollisionGrid()
const renderer = new WorldRenderer({ viewWidth: VIEW_W, viewHeight: VIEW_H })
/** Aspect ratio carried into the CSS so the frame always matches the canvas. */
const frameStyle = { aspectRatio: `${VIEW_W} / ${VIEW_H}` }
const ariaLabel = computed(() => {
  if (props.label) return props.label
  const spots = worldMap.landmarks.map((landmark) => landmark.label.toLowerCase()).join(', ')
  return `Cozy pixel world with ${spots}. Move with WASD, the arrow keys, or a touch drag.`
})

const player = {
  x: worldMap.spawn.x * tileSize + tileSize / 2,
  y: (worldMap.spawn.y + 1) * tileSize - PLAYER_HALF_H - 1,
  direction: 'down' as PlayerDirection,
  frame: 0,
  moving: false
}

/* ------------------------------------------------------------------ */
/* Cat companion                                                       */
/* ------------------------------------------------------------------ */

/** She walks a little slower than the player and runs 1.6x her walk. */
const CAT_WALK_TILES_PER_SEC = 2.6
const CAT_RUN_MULTIPLIER = 1.6
const CAT_WALK_SPEED = CAT_WALK_TILES_PER_SEC * tileSize
const CAT_RUN_SPEED = CAT_WALK_SPEED * CAT_RUN_MULTIPLIER
/** A lazy trot between walk and run, for when she is close but catching up. */
const CAT_TROT_SPEED = CAT_WALK_SPEED * 1.2
/** Time constants for the smoothed speed, aim and facing. */
const CAT_ACCEL_LERP = 8
const CAT_AIM_LERP = 12
const CAT_TURN_LERP = 10
/** Her feet box is smaller than the player's, so she slips through gaps he cannot. */
const CAT_HALF_W = Math.max(4, Math.round(tileSize * 0.22))
const CAT_HALF_H = Math.max(3, Math.round(tileSize * 0.16))
/** Follow target: the player's position about 1.1s ago. */
const PLAYER_SAMPLE_MS = 150
const CAT_TRAIL_MS = 1100
const PLAYER_TRAIL_LENGTH = 24
/** She stops within this many tiles of the delayed target. */
const CAT_FOLLOW_STOP_TILES = 0.7
/** If she falls further behind than this, she trots to catch up. */
const CAT_CATCHUP_TILES = 2.5
/** Notice delay before she reacts to the player moving again. */
const CAT_NOTICE_MIN_MS = 600
const CAT_NOTICE_MAX_MS = 1400
/** Free-roam cadence: a short pause, then a wander/sit/stare activity. */
const CAT_IDLE_PAUSE_MIN_MS = 700
const CAT_IDLE_PAUSE_MAX_MS = 1800
const CAT_SIT_MIN_MS = 2200
const CAT_SIT_MAX_MS = 4200
const CAT_STARE_MIN_MS = 1600
const CAT_STARE_MAX_MS = 3000
/** A quiet meow every 8-15s of free-roam idleness. */
const CAT_MEOW_MIN_MS = 8000
const CAT_MEOW_MAX_MS = 15000

type CatMode = 'follow' | 'notice' | 'run' | 'wander' | 'sit' | 'stare' | 'idle'

/** Her walk cycle: four frames at 140ms, a full stride every 560ms. */
const catWalkAnimation = { frameCount: 4, frameMs: 140 }
/** The same stride at 90ms while she is genuinely running. */
const catRunAnimation = { frameCount: 4, frameMs: 90 }
/** Sit and stare hold each frame much longer, so idle poses breathe. */
const catSitAnimation = { frameCount: 2, frameMs: 900 }
const catStareAnimation = { frameCount: 2, frameMs: 520 }

const cat = {
  x: 0,
  y: 0,
  direction: 'left' as PlayerDirection,
  frame: 0,
  /** True while she should show the walk sprite (follow, run or wander). */
  moving: false,
  /** True while she is actually stepping, so the walk clock only runs then. */
  stepping: false,
  running: false,
  sitting: true,
  staring: false,
  mode: 'idle' as CatMode,
  targetX: 0,
  targetY: 0,
  modeUntil: 0,
  walkTime: 0,
  idleTime: 0,
  nextMeowAt: 0,
  /** Current smoothed speed in world px/s. */
  speed: 0,
  /** Smoothed aim point, so a new delayed sample never kinks her path. */
  aimX: 0,
  aimY: 0,
  /** Smoothed facing vector, so left/right flips are gentle. */
  facingX: -1,
  facingY: 0,
  /** Seconds spent pushing against an obstacle; drives the local detour. */
  stuckTime: 0,
  /** While now < detourUntil she sidesteps instead of pushing straight on. */
  detourUntil: 0,
  detourX: 0,
  detourY: 0
}

/** Small deterministic PRNG: her idle choices stay stable within a session. */
let catSeed = 0x9e3779b9
function catRandom(): number {
  catSeed = (catSeed + 0x6d2b79f5) >>> 0
  let t = catSeed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

function catRange(min: number, max: number): number {
  return min + catRandom() * (max - min)
}

/** One sampled player position, kept for the delayed follow target. */
interface PlayerTrailSample {
  t: number
  x: number
  y: number
}

const playerTrail: PlayerTrailSample[] = []
let trailClock = 0
let playerWasMoving = false

/** The player's position about 1.1s ago; the oldest sample until the trail fills. */
function delayedPlayerTarget(now: number): PlayerTrailSample {
  const cutoff = now - CAT_TRAIL_MS
  for (let i = playerTrail.length - 1; i >= 0; i--) {
    const sample = playerTrail[i]
    if (sample.t <= cutoff) return sample
  }
  return playerTrail[0] ?? { t: now, x: player.x, y: player.y }
}

/** True when the cat's small feet-box overlaps any solid tile. */
function catBoxBlocked(x: number, y: number): boolean {
  const left = Math.floor((x - CAT_HALF_W) / tileSize)
  const right = Math.floor((x + CAT_HALF_W) / tileSize)
  const top = Math.floor((y - CAT_HALF_H) / tileSize)
  const bottom = Math.floor((y + CAT_HALF_H) / tileSize)
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (blockedAt(tx, ty)) return true
    }
  }
  return false
}

/** Sub-pixel stepping per axis, the same wall-sliding rule the player uses. */
function tryCatMove(dx: number, dy: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
  const stepX = dx / steps
  const stepY = dy / steps
  for (let step = 0; step < steps; step++) {
    if (stepX !== 0 && !catBoxBlocked(cat.x + stepX, cat.y)) cat.x += stepX
    if (stepY !== 0 && !catBoxBlocked(cat.x, cat.y + stepY)) cat.y += stepY
  }
}

/** Walk toward a point; returns true once she is within `stopPx` of it. */
function moveCatToward(
  now: number,
  targetX: number,
  targetY: number,
  targetSpeed: number,
  dt: number,
  stopPx: number
): boolean {
  const dx = targetX - cat.x
  const dy = targetY - cat.y
  const dist = Math.hypot(dx, dy)
  if (dist <= stopPx) {
    cat.stepping = false
    cat.stuckTime = 0
    cat.speed += (0 - cat.speed) * (1 - Math.exp(-CAT_ACCEL_LERP * dt))
    return true
  }

  // Ease the speed toward the state's target: a cat accelerates over a few
  // frames instead of snapping to full pace, and eases out on arrival.
  cat.speed += (targetSpeed - cat.speed) * (1 - Math.exp(-CAT_ACCEL_LERP * dt))

  // Ease the aim toward the target so a new 150ms sample never kinks the
  // path. The stop check still uses the real target.
  const aimBlend = 1 - Math.exp(-CAT_AIM_LERP * dt)
  cat.aimX += (targetX - cat.aimX) * aimBlend
  cat.aimY += (targetY - cat.aimY) * aimBlend

  const aimDx = cat.aimX - cat.x
  const aimDy = cat.aimY - cat.y
  const aimDist = Math.hypot(aimDx, aimDy)
  if (aimDist < 0.001) {
    cat.stepping = false
    return Math.hypot(targetX - cat.x, targetY - cat.y) <= stopPx
  }

  // Direct pursuit, unless a recent block put her on a short sidestep.
  let moveX = aimDx / aimDist
  let moveY = aimDy / aimDist
  if (now < cat.detourUntil) {
    moveX = cat.detourX
    moveY = cat.detourY
  }

  // Smooth the facing vector, then only flip the cardinal direction when
  // the turn is meaningful. This keeps vertical travel from flickering.
  const turnBlend = 1 - Math.exp(-CAT_TURN_LERP * dt)
  cat.facingX += (moveX - cat.facingX) * turnBlend
  cat.facingY += (moveY - cat.facingY) * turnBlend
  const ax = Math.abs(cat.facingX)
  const ay = Math.abs(cat.facingY)
  if (ax > ay && ax > 0.15) cat.direction = cat.facingX > 0 ? 'right' : 'left'
  else if (ay > ax && ay > 0.15) cat.direction = cat.facingY > 0 ? 'down' : 'up'

  const step = Math.min(dist - stopPx, cat.speed * dt)
  if (step <= 0) {
    cat.stepping = false
    return Math.hypot(targetX - cat.x, targetY - cat.y) <= stopPx
  }

  const beforeX = cat.x
  const beforeY = cat.y
  tryCatMove(moveX * step, moveY * step)
  const moved = Math.abs(cat.x - beforeX) + Math.abs(cat.y - beforeY) > 0.001
  cat.stepping = moved

  if (moved) {
    cat.stuckTime = 0
  } else if (now >= cat.detourUntil) {
    // Pushing straight into a wall: after a beat, try a perpendicular
    // sidestep, probing both sides so she rounds a pond edge instead of
    // grinding against it forever.
    cat.stuckTime += dt
    if (cat.stuckTime > 0.35) {
      const px = -aimDy / aimDist
      const py = aimDx / aimDist
      const probe = Math.max(4, tileSize * 0.4)
      if (!catBoxBlocked(cat.x + px * probe, cat.y + py * probe)) {
        cat.detourX = px
        cat.detourY = py
      } else {
        cat.detourX = -px
        cat.detourY = -py
      }
      cat.detourUntil = now + 650
      cat.stuckTime = 0
    }
  }
  return Math.hypot(targetX - cat.x, targetY - cat.y) <= stopPx
}

/** A walkable tile centre 1-3 tiles from her current spot, or null if boxed in. */
function pickWanderPoint(): { x: number; y: number } | null {
  const catTileX = Math.floor(cat.x / tileSize)
  const catTileY = Math.floor(cat.y / tileSize)
  for (let attempt = 0; attempt < 14; attempt++) {
    const angle = catRandom() * Math.PI * 2
    const radius = 1 + catRandom() * 2
    const tx = Math.round(catTileX + Math.cos(angle) * radius)
    const ty = Math.round(catTileY + Math.sin(angle) * radius)
    if (blockedAt(tx, ty)) continue
    const x = tx * tileSize + tileSize / 2
    const y = ty * tileSize + tileSize / 2
    if (catBoxBlocked(x, y)) continue
    return { x, y }
  }
  return null
}

/** A random nearby cardinal direction, for watching a butterfly. */
function pickStareDirection(): PlayerDirection {
  const angle = catRandom() * Math.PI * 2
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left'
  return dy > 0 ? 'down' : 'up'
}

/** The sound layer listens for this exact event; no audio lives here. */
function dispatchCatMeow(): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('pw:cat-meow'))
}

/** Movement cue: throttled while walking, one final still cue on stopping. */
function dispatchPlayerMoveCue(now: number): void {
  if (typeof window === 'undefined') return
  if (player.moving) {
    if (!moveCueMoving || now - lastMoveCueAt >= MOVE_CUE_MS) {
      moveCueMoving = true
      lastMoveCueAt = now
      window.dispatchEvent(
        new CustomEvent('pw:player-move', { detail: { x: player.x, y: player.y, moving: true } })
      )
    }
  } else if (moveCueMoving) {
    moveCueMoving = false
    window.dispatchEvent(
      new CustomEvent('pw:player-move', { detail: { x: player.x, y: player.y, moving: false } })
    )
  }
}

/** Landmark cue: the same discovery that drives the location-change emit. */
function dispatchLandmarkCue(landmark: { id: string; x: number; y: number }): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(
    new CustomEvent('pw:landmark', { detail: { id: landmark.id, x: landmark.x, y: landmark.y } })
  )
}

function isCatIdle(): boolean {
  return cat.mode === 'wander' || cat.mode === 'sit' || cat.mode === 'stare' || cat.mode === 'idle'
}

/** Clear any in-flight sidestep when she changes activity. */
function resetCatSteering(): void {
  cat.stuckTime = 0
  cat.detourUntil = 0
  cat.aimX = cat.x
  cat.aimY = cat.y
}

/** A short settle between activities, sitting quietly. */
function enterIdlePause(now: number): void {
  cat.mode = 'idle'
  cat.modeUntil = now + catRange(CAT_IDLE_PAUSE_MIN_MS, CAT_IDLE_PAUSE_MAX_MS)
  cat.idleTime = 0
  cat.moving = false
  cat.stepping = false
  cat.running = false
  cat.sitting = true
  cat.staring = false
  resetCatSteering()
}

/** Pick a sit or a stare after a wander, or when there is nowhere to walk. */
function enterIdlePose(now: number): void {
  if (catRandom() < 0.5) {
    cat.mode = 'sit'
    cat.modeUntil = now + catRange(CAT_SIT_MIN_MS, CAT_SIT_MAX_MS)
    cat.sitting = true
    cat.staring = false
  } else {
    cat.mode = 'stare'
    cat.modeUntil = now + catRange(CAT_STARE_MIN_MS, CAT_STARE_MAX_MS)
    cat.direction = pickStareDirection()
    cat.sitting = false
    cat.staring = true
  }
  cat.idleTime = 0
  cat.moving = false
  cat.stepping = false
  cat.running = false
  resetCatSteering()
}

/** Every few seconds she chooses her own little activity. */
function pickActivity(now: number): void {
  const roll = catRandom()
  if (roll < 0.5) {
    const point = pickWanderPoint()
    if (point) {
      cat.mode = 'wander'
      cat.targetX = point.x
      cat.targetY = point.y
      cat.modeUntil = now + 8000
      cat.idleTime = 0
      cat.moving = true
      cat.stepping = false
      cat.running = false
      cat.sitting = false
      cat.staring = false
      resetCatSteering()
      return
    }
  }
  enterIdlePose(now)
}

/** The player is still and she has caught up: settle and start free roam. */
function enterFreeRoam(now: number): void {
  cat.mode = 'idle'
  cat.modeUntil = now + catRange(CAT_IDLE_PAUSE_MIN_MS, CAT_IDLE_PAUSE_MAX_MS)
  cat.idleTime = 0
  cat.moving = false
  cat.stepping = false
  cat.running = false
  cat.sitting = true
  cat.staring = false
  cat.nextMeowAt = now + catRange(CAT_MEOW_MIN_MS, CAT_MEOW_MAX_MS)
  resetCatSteering()
}

/** Her whole brain, driven from the same tick as the player. */
function updateCat(now: number, dt: number): void {
  // Sample the player on a fixed cadence for the delayed follow target.
  trailClock += dt * 1000
  if (trailClock >= PLAYER_SAMPLE_MS) {
    trailClock %= PLAYER_SAMPLE_MS
    playerTrail.push({ t: now, x: player.x, y: player.y })
    if (playerTrail.length > PLAYER_TRAIL_LENGTH) playerTrail.shift()
  }

  const playerMoving = player.moving
  const justStarted = playerMoving && !playerWasMoving
  playerWasMoving = playerMoving

  // She does not snap to attention: she finishes her idle moment first,
  // then runs. The meow marks the moment she notices.
  if (justStarted && isCatIdle()) {
    cat.mode = 'notice'
    cat.modeUntil = now + catRange(CAT_NOTICE_MIN_MS, CAT_NOTICE_MAX_MS)
    cat.idleTime = 0
    cat.moving = false
    cat.stepping = false
    cat.running = false
    resetCatSteering()
    dispatchCatMeow()
  }

  // If the player stops again while she is still deciding, she settles.
  if (!playerMoving && cat.mode === 'notice') enterFreeRoam(now)

  switch (cat.mode) {
    case 'notice': {
      cat.moving = false
      cat.stepping = false
      cat.sitting = !cat.staring
      cat.speed += (0 - cat.speed) * (1 - Math.exp(-CAT_ACCEL_LERP * dt))
      cat.idleTime += dt * 1000
      cat.frame = cat.staring
        ? frameAt(cat.idleTime, catStareAnimation)
        : frameAt(cat.idleTime, catSitAnimation)
      if (now >= cat.modeUntil) {
        cat.mode = 'run'
      }
      break
    }
    case 'run': {
      const target = delayedPlayerTarget(now)
      cat.targetX = target.x
      cat.targetY = target.y
      const gap = Math.hypot(target.x - cat.x, target.y - cat.y)
      // Far behind: a genuine chase. Close: settle into a lazy trot.
      const targetSpeed =
        gap > 3 * tileSize ? CAT_RUN_SPEED : gap > 1.2 * tileSize ? CAT_TROT_SPEED : CAT_WALK_SPEED
      const close = moveCatToward(now, target.x, target.y, targetSpeed, dt, CAT_FOLLOW_STOP_TILES * tileSize)
      cat.moving = true
      cat.sitting = false
      cat.staring = false
      if (close) {
        if (playerMoving) {
          cat.mode = 'follow'
        } else {
          enterFreeRoam(now)
        }
      }
      break
    }
    case 'follow': {
      const target = delayedPlayerTarget(now)
      cat.targetX = target.x
      cat.targetY = target.y
      const gap = Math.hypot(target.x - cat.x, target.y - cat.y)
      // Walk when close, trot in the middle, and genuinely run when the
      // delayed target has pulled far ahead.
      const targetSpeed =
        gap > CAT_CATCHUP_TILES * tileSize
          ? CAT_RUN_SPEED
          : gap > 1.2 * tileSize
            ? CAT_TROT_SPEED
            : CAT_WALK_SPEED
      const close = moveCatToward(now, target.x, target.y, targetSpeed, dt, CAT_FOLLOW_STOP_TILES * tileSize)
      cat.moving = true
      cat.sitting = false
      cat.staring = false
      if (close && !playerMoving) enterFreeRoam(now)
      break
    }
    case 'wander': {
      const close = moveCatToward(now, cat.targetX, cat.targetY, CAT_WALK_SPEED * 0.8, dt, 2)
      cat.moving = true
      cat.sitting = false
      cat.staring = false
      if (close || now >= cat.modeUntil) enterIdlePose(now)
      break
    }
    case 'sit':
    case 'stare':
    case 'idle': {
      cat.moving = false
      cat.stepping = false
      cat.speed += (0 - cat.speed) * (1 - Math.exp(-CAT_ACCEL_LERP * dt))
      cat.idleTime += dt * 1000
      cat.frame = cat.mode === 'stare'
        ? frameAt(cat.idleTime, catStareAnimation)
        : frameAt(cat.idleTime, catSitAnimation)
      if (now >= cat.modeUntil) {
        if (cat.mode === 'idle') pickActivity(now)
        else enterIdlePause(now)
      }
      break
    }
  }

  // The run flag follows her actual pace, so walk-to-run and run-to-walk
  // transitions read as acceleration rather than a mode switch.
  cat.running = cat.moving && cat.speed > CAT_WALK_SPEED * 1.15

  // Walk frames run on her own clock, so stopping and starting never snaps
  // the stride back to frame zero. The pass pose is her neutral stand.
  if (cat.stepping) {
    cat.walkTime += dt * 1000
    cat.frame = frameAt(cat.walkTime, cat.running ? catRunAnimation : catWalkAnimation)
  } else if (cat.moving) {
    cat.frame = 1
  }

  // A quiet meow every 8-15s of free-roam idleness.
  if (isCatIdle() && now >= cat.nextMeowAt) {
    dispatchCatMeow()
    cat.nextMeowAt = now + catRange(CAT_MEOW_MIN_MS, CAT_MEOW_MAX_MS)
  }
}

/** Spawn her a tile away from the player, on the first walkable candidate. */
function catSpawnPoint(): { x: number; y: number } {
  const candidates = [
    { x: player.x - tileSize, y: player.y },
    { x: player.x + tileSize, y: player.y },
    { x: player.x, y: player.y - tileSize },
    { x: player.x, y: player.y + tileSize },
    { x: player.x - tileSize, y: player.y - tileSize }
  ]
  for (const point of candidates) {
    if (!catBoxBlocked(point.x, point.y)) return point
  }
  return { x: player.x, y: player.y }
}

const catSpawn = catSpawnPoint()
cat.x = catSpawn.x
cat.y = catSpawn.y
cat.targetX = cat.x
cat.targetY = cat.y
cat.aimX = cat.x
cat.aimY = cat.y

const camera = { x: 0, y: 0 }
let walkTime = 0
let activeLandmarkId: string | null = null
let activeMessage: string | null = null
let lastTileX = -1
let lastTileY = -1
let rafId = 0
let lastFrameTime = 0
let ctx2d: CanvasRenderingContext2D | null = null
/** Throttle state for the decoupled movement cue. */
let lastMoveCueAt = 0
let moveCueMoving = false

/** The collision grid marks solid tiles (water, props) as true. */
function blockedAt(tx: number, ty: number): boolean {
  if (tx < 0 || ty < 0 || tx >= worldMap.width || ty >= worldMap.height) return true
  return collisionGrid[ty]?.[tx] === true
}

/** True when the player's small feet-box overlaps any solid tile. */
function boxBlocked(x: number, y: number): boolean {
  const left = Math.floor((x - PLAYER_HALF_W) / tileSize)
  const right = Math.floor((x + PLAYER_HALF_W) / tileSize)
  const top = Math.floor((y - PLAYER_HALF_H) / tileSize)
  const bottom = Math.floor((y + PLAYER_HALF_H) / tileSize)
  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (blockedAt(tx, ty)) return true
    }
  }
  return false
}

/** Sub-pixel stepping per axis, so the player stops flush against walls and slides along them. */
function tryMove(dx: number, dy: number): void {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))))
  const stepX = dx / steps
  const stepY = dy / steps
  for (let step = 0; step < steps; step++) {
    if (stepX !== 0 && !boxBlocked(player.x + stepX, player.y)) player.x += stepX
    if (stepY !== 0 && !boxBlocked(player.x, player.y + stepY)) player.y += stepY
  }
}

function directionFrom(x: number, y: number): PlayerDirection {
  const ax = Math.abs(x)
  const ay = Math.abs(y)
  if (ax > ay) return x > 0 ? 'right' : 'left'
  if (ay > ax) return y > 0 ? 'down' : 'up'
  return player.direction
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/** Reused camera target, written in place each frame to keep the loop allocation-free. */
const cameraTargetPoint = { x: 0, y: 0 }

/** Follow the player, clamped to the world; a world smaller than the
 * viewport centers instead of pinning to its top-left corner. */
function cameraAxis(value: number, worldPx: number, viewPx: number): number {
  const span = worldPx - viewPx
  return span <= 0 ? span / 2 : clamp(value - viewPx / 2, 0, span)
}

function cameraTarget(): { x: number; y: number } {
  cameraTargetPoint.x = cameraAxis(player.x, worldMap.width * tileSize, VIEW_W)
  cameraTargetPoint.y = cameraAxis(player.y, worldMap.height * tileSize, VIEW_H)
  return cameraTargetPoint
}

/** Reused render payload; `WorldRenderer.render` reads it synchronously, so
 * the fields can be overwritten in place every frame. */
const companionState: RenderCompanionState = {
  x: 0,
  y: 0,
  moving: false,
  running: false,
  sitting: true,
  staring: false,
  frame: 0,
  direction: 'left'
}
const renderState: RenderState = {
  player: { x: 0, y: 0, direction: 'down', frame: 0, moving: false },
  camera: { x: 0, y: 0 },
  activeLandmarkId: null,
  companion: companionState
}

/** Tile distance from (tileX, tileY) to the object's whole footprint, so a
 * big barn reads up close along any wall, not just beside one corner. */
function footprintDistance(object: WorldObject, tileX: number, tileY: number): number {
  const width = Math.max(1, Math.floor(object.width ?? 1))
  const height = Math.max(1, Math.floor(object.height ?? 1))
  const dx = Math.max(object.x - tileX, 0, tileX - (object.x + width - 1))
  const dy = Math.max(object.y - tileY, 0, tileY - (object.y + height - 1))
  return Math.max(dx, dy)
}

function updateNearby(tileX: number, tileY: number): void {
  if (tileX === lastTileX && tileY === lastTileY) return
  lastTileX = tileX
  lastTileY = tileY

  const landmark = getLandmarkAt(tileX, tileY)
  if (landmark) {
    if (landmark.id !== activeLandmarkId) {
      activeLandmarkId = landmark.id
      emit('location-change', { id: landmark.id, label: landmark.label })
      dispatchLandmarkCue(landmark)
    }
  } else if (activeLandmarkId !== null) {
    activeLandmarkId = null
    emit('location-change', null)
  }

  let message: string | null = null
  for (const object of worldMap.objects) {
    if (!object.message) continue
    if (footprintDistance(object, tileX, tileY) <= MESSAGE_RANGE) {
      message = object.message
      break
    }
  }
  if (message !== activeMessage) {
    activeMessage = message
    emit('message-change', message)
  }
}

function tick(now: number): void {
  rafId = requestAnimationFrame(tick)
  const dt = Math.min(MAX_FRAME_DT, Math.max(0, (now - lastFrameTime) / 1000))
  lastFrameTime = now

  const input = controls.axis.value
  player.moving = controls.isMoving.value
  if (player.moving) {
    player.direction = directionFrom(input.x, input.y)
    tryMove(input.x * MOVE_SPEED * dt, input.y * MOVE_SPEED * dt)

    // The walk cycle runs on the shared animation clock: `walkTime` only
    // advances while moving, and `frameAt` picks the schedule's frame.
    walkTime += dt * 1000
    player.frame = frameAt(walkTime, playerWalkAnimation)
  } else {
    walkTime = 0
    player.frame = 0
  }

  dispatchPlayerMoveCue(now)
  updateCat(now, dt)

  const target = cameraTarget()
  const follow = 1 - Math.exp(-CAMERA_LERP * dt)
  camera.x += (target.x - camera.x) * follow
  camera.y += (target.y - camera.y) * follow

  updateNearby(Math.floor(player.x / tileSize), Math.floor(player.y / tileSize))

  if (ctx2d) {
    renderState.player.x = player.x
    renderState.player.y = player.y
    renderState.player.direction = player.direction
    renderState.player.frame = player.frame
    renderState.player.moving = player.moving
    renderState.camera.x = camera.x
    renderState.camera.y = camera.y
    renderState.activeLandmarkId = activeLandmarkId
    companionState.x = cat.x
    companionState.y = cat.y
    companionState.moving = cat.moving
    companionState.running = cat.running
    companionState.sitting = cat.sitting
    companionState.staring = cat.staring
    companionState.frame = cat.frame
    companionState.direction = cat.direction
    renderer.render(ctx2d, renderState, now)
  }
}

function focus(): void {
  canvasEl.value?.focus()
}

onMounted(() => {
  const canvas = canvasEl.value
  if (!canvas) return
  ctx2d = canvas.getContext('2d')
  const target = cameraTarget()
  camera.x = target.x
  camera.y = target.y
  updateNearby(Math.floor(player.x / tileSize), Math.floor(player.y / tileSize))
  // Give her first meow and first activity a full idle beat rather than
  // firing on frame one.
  cat.nextMeowAt = performance.now() + catRange(CAT_MEOW_MIN_MS, CAT_MEOW_MAX_MS)
  cat.modeUntil = performance.now() + catRange(CAT_IDLE_PAUSE_MIN_MS, CAT_IDLE_PAUSE_MAX_MS)
  lastFrameTime = performance.now()
  rafId = requestAnimationFrame(tick)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(rafId)
  rafId = 0
})

defineExpose({ focus })
</script>

<template>
  <div ref="rootEl" class="pixel-world" :style="frameStyle">
    <canvas
      ref="canvasEl"
      class="pixel-world__canvas"
      :width="VIEW_W"
      :height="VIEW_H"
      tabindex="0"
      role="img"
      :aria-label="ariaLabel"
    />
  </div>
</template>

<style scoped>
.pixel-world {
  position: relative;
  width: 100%;
  user-select: none;
  -webkit-user-select: none;
}

.pixel-world__canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
  image-rendering: crisp-edges;
  image-rendering: pixelated;
  outline: none;
}

.pixel-world__canvas:focus-visible {
  outline: 3px solid rgba(242, 201, 138, 0.85);
  outline-offset: -3px;
}
</style>
