<script setup lang="ts">
/**
 * PixelPanel - a warm framed surface for content.
 *
 * `parchment` is solid paper for reading; `glass` is a quiet solid
 * forest tint; `overlay` is the game-UI box that floats over the
 * world: solid parchment paper, a hard ink outline, a 1px light
 * bevel - no translucency, no blur, no soft shadows. Padding is
 * adjustable through the `--pw-panel-pad` custom property.
 */
withDefaults(defineProps<{
  title?: string
  variant?: 'parchment' | 'glass' | 'overlay'
}>(), {
  variant: 'parchment'
})
</script>

<template>
  <section class="pw-panel pw-frame" :class="`pw-panel--${variant}`">
    <h2 v-if="title" class="pw-panel__title">{{ title }}</h2>
    <div class="pw-panel__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.pw-panel {
  position: relative;
  min-width: 0;
  padding: var(--pw-panel-pad, 1.5rem);
  background: var(--pw-parchment-100);
  color: var(--pw-ink-900);
}

.pw-panel--glass {
  background: var(--pw-forest-800);
  color: var(--pw-cream-100);
  --pw-frame-color: var(--pw-forest-950);
  --pw-frame-inner: rgba(231, 210, 168, 0.08);
}

.pw-panel__title {
  margin: 0 0 1.05rem;
  font-family: var(--pw-font-mono);
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--pw-ink-700);
}

.pw-panel--glass .pw-panel__title {
  color: var(--pw-cream-300);
}

/* Overlay: a solid game dialog box over the world - parchment
   paper, hard ink frame, 1px light bevel. Nothing here is
   translucent, blurred, or soft. */
.pw-panel--overlay {
  background: var(--pw-parchment-100);
  color: var(--pw-ink-900);
  --pw-frame-color: var(--pw-ink-900);
  --pw-frame-inner: rgba(255, 252, 240, 0.55);
}

.pw-panel--overlay .pw-panel__title {
  color: var(--pw-ink-700);
}
</style>
