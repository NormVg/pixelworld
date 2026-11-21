<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { usePlayerControls } from '~/composables/usePlayerControls'
import { frameAt, playerWalkAnimation } from '~/utils/world-animation'
import { createCollisionGrid, getLandmarkAt, worldMap, type WorldObject } from '~/utils/world-map'
import { WorldRenderer, type PlayerDirection, type RenderState } from '~/utils/world-renderer'

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
const camera = { x: 0, y: 0 }
let walkTime = 0
let activeLandmarkId: string | null = null
let activeMessage: string | null = null
let lastTileX = -1
let lastTileY = -1
let rafId = 0
let lastFrameTime = 0
let ctx2d: CanvasRenderingContext2D | null = null

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
const renderState: RenderState = {
  player: { x: 0, y: 0, direction: 'down', frame: 0, moving: false },
  camera: { x: 0, y: 0 },
  activeLandmarkId: null
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
