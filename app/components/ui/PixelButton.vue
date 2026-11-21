<script setup lang="ts">
/**
 * PixelButton - a chunky, tactile pixel-art button.
 *
 * `primary` wears lantern amber; `ghost` is quiet ink on paper;
 * `dpad` is a solid square controller key: dark forest plastic with
 * a warm etched edge, pressed to lantern amber. Pressing sinks the
 * button onto its pixel base - a hard offset, never a blur.
 *
 * `press` fires on pointer down and `release` on pointer up, cancel,
 * or slip-off, so callers can bridge a held press to gameplay input.
 * Keyboard activation never fires those two; it raises `click` alone,
 * which always fires for pointer clicks too.
 */
withDefaults(defineProps<{
  variant?: 'primary' | 'ghost' | 'dpad'
  size?: 'sm' | 'md'
  label?: string
}>(), {
  variant: 'primary',
  size: 'md',
  label: ''
})

const emit = defineEmits<{
  click: [MouseEvent]
  press: [PointerEvent]
  release: [PointerEvent]
}>()

/** Pointer-hold state; not reactive because no template rule reads it. */
let pointerHeld = false

function onPointerPress (event: PointerEvent): void {
  pointerHeld = true
  emit('press', event)
}

function onPointerRelease (event: PointerEvent): void {
  if (!pointerHeld) {
    return
  }
  pointerHeld = false
  emit('release', event)
}
</script>

<template>
  <button
    type="button"
    class="pw-btn"
    :class="[`pw-btn--${variant}`, `pw-btn--${size}`]"
    @pointerdown="onPointerPress"
    @pointerup="onPointerRelease"
    @pointercancel="onPointerRelease"
    @pointerleave="onPointerRelease"
    @click="emit('click', $event)"
  >
    <slot>{{ label }}</slot>
  </button>
</template>

<style scoped>
.pw-btn {
  --pw-btn-edge: var(--pw-ink-900);
  --pw-btn-base: 6px;
  --pw-btn-pad-y: 0.68rem;
  --pw-btn-pad-x: 1.3rem;
  --pw-btn-font: 0.82rem;
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-width: 5.5rem;
  padding: var(--pw-btn-pad-y) var(--pw-btn-pad-x);
  font-family: var(--pw-font-mono);
  font-size: var(--pw-btn-font);
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  border: 2px solid var(--pw-btn-edge);
  border-radius: 0;
  cursor: pointer;
  color: var(--pw-ink-900);
  background: var(--pw-amber-400);
  /* a hard solid base under the key - the pixel-art press */
  box-shadow: 0 var(--pw-btn-base) 0 0 var(--pw-btn-edge);
  transform: translateY(0);
  /* discrete steps keep the press feeling pixel-made */
  transition:
    transform 80ms steps(2, end),
    box-shadow 80ms steps(2, end),
    background-color 140ms linear;
}

.pw-btn:hover {
  background: var(--pw-amber-300);
}

.pw-btn:active {
  transform: translateY(3px);
  background: var(--pw-amber-500);
  box-shadow: none;
}

.pw-btn:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
  box-shadow: 0 var(--pw-btn-base) 0 0 var(--pw-btn-edge);
}

.pw-btn--ghost {
  --pw-btn-edge: rgba(44, 36, 22, 0.42);
  background: transparent;
  color: var(--pw-ink-900);
}

.pw-btn--ghost:hover {
  background: rgba(44, 36, 22, 0.07);
}

.pw-btn--ghost:active {
  background: rgba(44, 36, 22, 0.12);
}

.pw-btn--sm {
  --pw-btn-pad-y: 0.45rem;
  --pw-btn-pad-x: 0.9rem;
  --pw-btn-font: 0.72rem;
}

.pw-btn--md {
  --pw-btn-pad-y: 0.68rem;
  --pw-btn-pad-x: 1.3rem;
  --pw-btn-font: 0.82rem;
}

/* D-pad: a solid controller key - dark forest plastic with a warm
   etched edge, pressed to lantern amber. Keys sit flush against
   their neighbours in the molded cross, so a key carries no drop
   base of its own; the etched 1px inner edge and the pressed fill
   carry the feedback. Sits after the base hover/active rules so,
   at equal specificity, the variant wins. */
.pw-btn--dpad {
  min-width: 0;
  width: 100%;
  aspect-ratio: 1;
  padding: 0;
  border: 2px solid var(--pw-forest-950);
  border-radius: 0;
  color: var(--pw-cream-100);
  background: var(--pw-forest-800);
  box-shadow: inset 0 0 0 1px rgba(231, 210, 168, 0.32);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}

.pw-btn--dpad:hover {
  color: var(--pw-amber-300);
  background: var(--pw-forest-700);
}

/* Pressing lights the key like a lantern flipping on. */
.pw-btn--dpad:active {
  color: var(--pw-ink-900);
  background: var(--pw-amber-500);
  box-shadow: inset 0 0 0 1px rgba(44, 36, 22, 0.55);
  transform: translateY(2px);
}

@media (prefers-reduced-motion: reduce) {
  .pw-btn {
    transition: none;
  }
}
</style>
