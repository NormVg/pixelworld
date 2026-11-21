<script setup lang="ts">
/**
 * PixelBadge - a small pixel-cut status chip.
 *
 * `warm` glows like lantern light; `cool` sits mossy and green;
 * `overlay` is the location sign that floats over the game world:
 * solid amber, hard ink outline, square corners. The dot breathes
 * slowly, at its own unhurried rate.
 */
withDefaults(defineProps<{
  label: string
  tone?: 'warm' | 'cool' | 'overlay'
}>(), {
  tone: 'warm'
})
</script>

<template>
  <span class="pw-badge pw-frame" :class="`pw-badge--${tone}`">
    <span class="pw-badge__dot" aria-hidden="true"></span>
    <span class="pw-badge__label">{{ label }}</span>
  </span>
</template>

<style scoped>
.pw-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.45rem 0.9rem;
  font-family: var(--pw-font-mono);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--pw-ink-900);
  background: var(--pw-amber-400);
  --pw-frame-size: 2px;
  --pw-frame-color: var(--pw-ink-900);
  --pw-frame-inner: rgba(255, 252, 240, 0.45);
}

.pw-badge--cool {
  color: var(--pw-cream-100);
  background: var(--pw-forest-700);
  --pw-frame-color: var(--pw-forest-950);
}

/* Overlay: the location sign over the world - solid lantern
   amber with a hard ink frame. No translucency, no blur, no
   soft shadow; its dot is a small parchment lantern. */
.pw-badge--overlay {
  color: var(--pw-ink-900);
  background: var(--pw-amber-400);
  --pw-frame-color: var(--pw-ink-900);
  --pw-frame-inner: rgba(255, 252, 240, 0.45);
}

.pw-badge--overlay .pw-badge__dot {
  background: var(--pw-parchment-100);
  box-shadow: 0 0 0 1px rgba(44, 36, 22, 0.55);
}

.pw-badge__dot {
  width: 6px;
  height: 6px;
  background: currentColor;
  animation: pw-breathe 3.2s var(--pw-ease-soft) infinite;
}

@keyframes pw-breathe {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pw-badge__dot {
    animation: none;
  }
}
</style>
