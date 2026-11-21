import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from 'vue'

/** Normalized movement axis. Magnitude is clamped to 1; diagonals are unit length. */
export interface ControlAxis {
  x: number
  y: number
}

export interface PlayerControls {
  /** Current input axis, reactively updated on every key or pointer change. */
  axis: Readonly<Ref<ControlAxis>>
  /** True while the axis pushes past a tiny deadzone. */
  isMoving: ComputedRef<boolean>
  /** Detach every listener. Runs automatically on component unmount. */
  dispose: () => void
}

/** Physical key codes so WASD keeps working on non-QWERTY layouts. */
const KEY_AXES: Readonly<Record<string, Readonly<ControlAxis>>> = {
  KeyW: { x: 0, y: -1 },
  ArrowUp: { x: 0, y: -1 },
  KeyS: { x: 0, y: 1 },
  ArrowDown: { x: 0, y: 1 },
  KeyA: { x: -1, y: 0 },
  ArrowLeft: { x: -1, y: 0 },
  KeyD: { x: 1, y: 0 },
  ArrowRight: { x: 1, y: 0 }
}

/** Drag distance that maps to full speed. */
const JOYSTICK_RADIUS = 36
/** Drag distance below which the stick reads as centered. */
const JOYSTICK_DEADZONE = 8
const MOVING_EPSILON = 0.01

/**
 * Combined keyboard + pointer controls for the player.
 *
 * Keyboard: WASD and arrow keys, held-state based so diagonals work.
 * Pointer: press anywhere on the target element and drag; the drag acts as a
 * floating joystick, so touch players get analog speed and direction.
 *
 * Must be called from a component setup scope; listeners attach on mount and
 * detach on unmount, so nothing here touches browser APIs during SSR.
 */
export function usePlayerControls(target: Readonly<Ref<HTMLElement | null | undefined>>): PlayerControls {
  const axis = ref<ControlAxis>({ x: 0, y: 0 })
  const isMoving = computed(() => Math.hypot(axis.value.x, axis.value.y) > MOVING_EPSILON)

  const heldKeys = new Set<string>()
  let joystickId: number | null = null
  let joystickOrigin: ControlAxis = { x: 0, y: 0 }
  let joystickAxis: ControlAxis = { x: 0, y: 0 }

  function recomputeAxis(): void {
    let x = 0
    let y = 0
    for (const code of heldKeys) {
      const keyAxis = KEY_AXES[code]
      if (keyAxis) {
        x += keyAxis.x
        y += keyAxis.y
      }
    }
    // Normalize keyboard diagonals so they are no faster than straight lines.
    const keyLength = Math.hypot(x, y)
    if (keyLength > 1) {
      x /= keyLength
      y /= keyLength
    }
    x += joystickAxis.x
    y += joystickAxis.y
    // Combined input can never exceed full speed either.
    const length = Math.hypot(x, y)
    if (length > 1) {
      x /= length
      y /= length
    }
    axis.value = { x, y }
  }

  /** Only swallow keys pressed while the game surface itself has focus. */
  function ownsEventTarget(event: KeyboardEvent): boolean {
    const element = target.value
    const node = event.target
    if (!element || !(node instanceof Node)) return false
    return node === element || element.contains(node)
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (!KEY_AXES[event.code]) return
    if (ownsEventTarget(event)) event.preventDefault()
    if (heldKeys.has(event.code)) return
    heldKeys.add(event.code)
    recomputeAxis()
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (!heldKeys.delete(event.code)) return
    recomputeAxis()
  }

  /** Never leave the player running away because the window lost focus mid-keypress. */
  function onWindowBlur(): void {
    heldKeys.clear()
    recomputeAxis()
  }

  function onPointerDown(event: PointerEvent): void {
    const element = target.value
    if (!element || joystickId !== null) return
    joystickId = event.pointerId
    joystickOrigin = { x: event.clientX, y: event.clientY }
    element.setPointerCapture(event.pointerId)
    recomputeAxis()
  }

  function onPointerMove(event: PointerEvent): void {
    if (event.pointerId !== joystickId) return
    const dx = event.clientX - joystickOrigin.x
    const dy = event.clientY - joystickOrigin.y
    const distance = Math.hypot(dx, dy)
    if (distance < JOYSTICK_DEADZONE) {
      joystickAxis = { x: 0, y: 0 }
    } else {
      // Analog tilt: further than the radius pins at full speed.
      const magnitude = Math.min(1, distance / JOYSTICK_RADIUS)
      joystickAxis = { x: (dx / distance) * magnitude, y: (dy / distance) * magnitude }
    }
    recomputeAxis()
  }

  function onPointerUp(event: PointerEvent): void {
    if (event.pointerId !== joystickId) return
    joystickId = null
    joystickAxis = { x: 0, y: 0 }
    recomputeAxis()
  }

  function attach(): void {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onWindowBlur)
    const element = target.value
    if (!element) return
    element.addEventListener('pointerdown', onPointerDown)
    element.addEventListener('pointermove', onPointerMove)
    element.addEventListener('pointerup', onPointerUp)
    element.addEventListener('pointercancel', onPointerUp)
  }

  function detach(): void {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    window.removeEventListener('blur', onWindowBlur)
    const element = target.value
    if (element) {
      element.removeEventListener('pointerdown', onPointerDown)
      element.removeEventListener('pointermove', onPointerMove)
      element.removeEventListener('pointerup', onPointerUp)
      element.removeEventListener('pointercancel', onPointerUp)
    }
    heldKeys.clear()
    joystickId = null
    joystickAxis = { x: 0, y: 0 }
    recomputeAxis()
  }

  onMounted(attach)
  onBeforeUnmount(detach)

  return { axis, isMoving, dispose: detach }
}
