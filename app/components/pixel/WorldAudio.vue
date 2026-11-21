<script setup lang="ts">
/**
 * WorldAudio - the app-wide sound layer, mounted once in app.vue.
 *
 * Calling `useWorldSounds()` here is what mounts the layer: on the first
 * user gesture the AudioContext warms up and the ambient forest bed may
 * fade in (never before, and never under prefers-reduced-motion), and the
 * shared mute state - persisted across reloads - is restored.
 *
 * The only thing it renders is a tiny pixel mute key: dark forest plastic
 * with an etched edge, pressed to lantern amber, cut from the same cloth
 * as the D-pad keys. It supports `v-model:muted`, so a page can own the
 * toggle instead if it ever wants to.
 */
const props = defineProps<{
  /** When bound, drives the shared mute state; otherwise the toggle owns it. */
  muted?: boolean | undefined
}>()

const emit = defineEmits<{
  'update:muted': [boolean]
}>()

const sounds = useWorldSounds()

/** Template-friendly view of the shared mute state. */
const isMuted = computed(() => sounds.muted.value)

/** An externally bound muted prop stays authoritative while present. */
watch(() => props.muted, (value) => {
  if (value !== undefined) {
    sounds.setMuted(value)
  }
}, { immediate: true })

/** Report every mute change back out, so v-model:muted stays honest. */
watch(sounds.muted, (value) => {
  emit('update:muted', value)
})
</script>

<template>
  <button
    type="button"
    class="pw-audio"
    aria-label="Forest sounds"
    :aria-pressed="isMuted"
    :title="isMuted ? 'Forest sounds are off. Click to unmute.' : 'Forest sounds are on. Click to mute.'"
    @click="sounds.toggleMuted()"
  >
    <svg class="pw-audio__icon" viewBox="0 0 12 12" shape-rendering="crispEdges" aria-hidden="true" focusable="false">
      <!-- the speaker cone, stepped like everything else here -->
      <g fill="currentColor">
        <rect x="1" y="5" width="1" height="2" />
        <rect x="2" y="4" width="1" height="4" />
        <rect x="3" y="3" width="1" height="6" />
        <rect x="4" y="2" width="1" height="8" />
      </g>
      <!-- muted: a small pixel cross where the waves were -->
      <g v-if="isMuted" fill="currentColor">
        <rect x="6" y="4" width="1" height="1" />
        <rect x="7" y="5" width="1" height="1" />
        <rect x="8" y="6" width="1" height="1" />
        <rect x="9" y="7" width="1" height="1" />
        <rect x="9" y="4" width="1" height="1" />
        <rect x="8" y="5" width="1" height="1" />
        <rect x="7" y="6" width="1" height="1" />
        <rect x="6" y="7" width="1" height="1" />
      </g>
      <!-- unmuted: two quiet volume bars -->
      <g v-else fill="currentColor">
        <rect x="6" y="4" width="1" height="4" />
        <rect x="8" y="2" width="1" height="8" />
      </g>
    </svg>
  </button>
</template>

<style scoped>
/* A tiny controller key pinned to the corner opposite the location badge. */
.pw-audio {
  position: fixed;
  right: clamp(0.85rem, 1rem + 1.5vmin, 1.6rem);
  bottom: clamp(0.85rem, 1rem + 1.5vmin, 1.6rem);
  z-index: 40;
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  padding: 0;
  border: 2px solid var(--pw-forest-950);
  border-radius: 0;
  background: var(--pw-forest-800);
  color: var(--pw-cream-100);
  /* the same etched edge as the D-pad keys */
  box-shadow: inset 0 0 0 1px rgba(231, 210, 168, 0.32);
  cursor: pointer;
  transition:
    transform 80ms steps(2, end),
    background-color 140ms linear,
    color 140ms linear;
}

.pw-audio:hover {
  color: var(--pw-amber-300);
  background: var(--pw-forest-700);
}

/* Pressing lights the key like a lantern flipping on. */
.pw-audio:active {
  transform: translateY(2px);
  color: var(--pw-ink-900);
  background: var(--pw-amber-500);
  box-shadow: inset 0 0 0 1px rgba(44, 36, 22, 0.55);
}

.pw-audio:focus-visible {
  outline: 3px solid var(--pw-amber-300);
  outline-offset: 2px;
}

.pw-audio__icon {
  width: 1.15rem;
  height: 1.15rem;
}

@media (prefers-reduced-motion: reduce) {
  .pw-audio {
    transition: none;
  }
}
</style>
