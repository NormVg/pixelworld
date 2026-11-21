<script setup lang="ts">
/**
 * The app shell around every page. WorldAudio mounts the app-wide sound
 * layer here - outside NuxtPage - so the ambient forest bed, the mute
 * state and the tiny pixel mute key survive page navigation and the
 * world's cues all speak through one shared engine.
 */
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtPage />
  <WorldAudio />
</template>
