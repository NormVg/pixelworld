<script setup lang="ts">
/**
 * The game shell: the world, edge to edge.
 *
 * The canvas covers the whole viewport - no letterbox, no bars, no
 * on-screen controls, no badges; nothing but the world. Movement is the
 * world's own: WASD and arrow keys on keyboard, a touch drag anywhere on
 * the scene as a floating joystick. This page holds no world state of
 * its own. The PixelWorld component owns movement and interactions, and
 * reports back through one event: `message-change`, announced politely
 * to screen readers through an invisible live region.
 */

const message = ref('Take your first step, and the forest will start talking to you.')

/** Calm text for the moments between messages. */
const IDLE_MESSAGE = 'The forest hums softly around you.'

/** Coerce an unknown event payload into display text. */
function asText (value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim() !== '') {
    return value
  }

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>
    for (const key of ['label', 'text', 'message', 'name', 'title', 'description', 'location']) {
      const candidate = record[key]
      if (typeof candidate === 'string' && candidate.trim() !== '') {
        return candidate
      }
    }
  }

  return fallback
}

function onMessageChange (value?: unknown) {
  const empty = value === null || value === undefined || value === ''
  message.value = empty ? IDLE_MESSAGE : asText(value, message.value)
}

/* ---------- The world, fitted to the viewport ----------
   The renderer is rebuilt by a parallel hand, so the shell never
   assumes a canvas size: it reads the live canvas aspect ratio
   and covers the viewport honestly with whatever the renderer
   draws - filling 100vw x 100dvh and cropping, never letterboxing. */

const worldWrap = ref<HTMLElement | null>(null)

/** Aspect ratio of the rendered world; null until the canvas is read. */
const worldRatio = ref<number | null>(null)

/** Inline custom property carrying the measured ratio into the CSS. */
const worldStyle = computed<Record<string, string> | undefined>(() => (
  worldRatio.value === null
    ? undefined
    : { '--pw-world-ratio': String(worldRatio.value) }
))

function readWorldRatio (): void {
  const canvas = worldWrap.value?.querySelector('canvas')
  if (canvas instanceof HTMLCanvasElement && canvas.width > 0 && canvas.height > 0) {
    worldRatio.value = canvas.width / canvas.height
  }
}

/** If the renderer swaps or resizes its canvas, refit the cover. */
let canvasObserver: MutationObserver | null = null

/* ---------- Keyboard focus ----------
    The world reads held keys from the window itself, so movement
    works as soon as the page loads. The shell still focuses the
    canvas when it can - on mount and on any press over the scene -
    so key presses land on the game surface first and the focus
    ring stays honest for keyboard players. */

type PixelWorldHandle = {
  focus?: () => void
}

const world = ref<PixelWorldHandle | null>(null)

function focusWorld (): void {
  const handle = world.value
  if (handle && typeof handle.focus === 'function') {
    handle.focus()
  }
}

onMounted(() => {
  readWorldRatio()
  focusWorld()

  const wrap = worldWrap.value
  if (wrap) {
    canvasObserver = new MutationObserver(readWorldRatio)
    canvasObserver.observe(wrap, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['width', 'height']
    })
  }
})

onBeforeUnmount(() => {
  canvasObserver?.disconnect()
  canvasObserver = null
})
</script>

<template>
  <div class="pw-screen">
    <main class="pw-screen__stage" @pointerdown="focusWorld">
      <div ref="worldWrap" class="pw-screen__world" :style="worldStyle">
        <PixelWorld
          ref="world"
          @message-change="onMessageChange"
        />
        <div class="pw-screen__fx" aria-hidden="true"></div>
      </div>
    </main>

    <div class="pw-screen__hud">
      <!-- What the forest said, audible and invisible. -->
      <p class="pw-sr-only" aria-live="polite">{{ message }}</p>
    </div>
  </div>
</template>
