<script setup lang="ts">
import type { Track } from '~/server/api/tracks.get'

defineProps<{ track: Track | null; phase: string }>()
</script>

<template>
  <div class="flex flex-col items-center gap-3 text-center">
    <!-- Thumbnail -->
    <div class="relative w-20 h-20 rounded-2xl overflow-hidden bg-white/5 border border-white/10 shrink-0">
      <Transition
        enter-active-class="transition-opacity duration-700"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
      >
        <img
          v-if="track?.thumbnail"
          :key="track.videoId"
          :src="track.thumbnail"
          :alt="track.title"
          class="w-full h-full object-cover"
        />
      </Transition>
      <div v-if="!track" class="absolute inset-0 flex items-center justify-center text-2xl">🎵</div>
      <!-- Spinning disc overlay when playing -->
      <div
        v-if="phase === 'playing'"
        class="absolute inset-0 rounded-2xl border-2 border-white/20 animate-spin"
        style="animation-duration: 8s; border-style: dashed;"
      />
    </div>

    <!-- Text -->
    <div class="min-w-0 max-w-md px-4">
      <p v-if="phase === 'loading'" class="text-white/50 text-sm animate-pulse-slow">Loading...</p>
      <template v-else-if="track">
        <p class="text-white font-medium text-base leading-snug break-words">{{ track.title }}</p>
        <p class="text-white/40 text-sm mt-1 break-words">{{ track.channelTitle }}</p>
      </template>
      <p v-else class="text-white/30 text-sm">Select a mood to begin</p>
    </div>
  </div>
</template>
