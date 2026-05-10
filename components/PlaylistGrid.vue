<script setup lang="ts">
import type { PlaylistSummary } from '~/server/api/playlists.get'

defineProps<{
  playlists: PlaylistSummary[]
  loading: boolean
  error: string
}>()

const emit = defineEmits<{
  select: [playlistId: string]
  refresh: []
}>()
</script>

<template>
  <div class="w-full max-w-6xl flex flex-col gap-6">
    <div class="flex items-end justify-between px-1">
      <div>
        <h2 class="text-lg font-semibold tracking-tight">Your playlists</h2>
        <p class="text-xs text-white/40 mt-1">Pick one to start playing on loop.</p>
      </div>
      <button
        type="button"
        class="text-xs text-white/40 hover:text-white/80 transition-colors flex items-center gap-1.5"
        :disabled="loading"
        @click="emit('refresh')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5" :class="loading && 'animate-spin'">
          <path fill-rule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clip-rule="evenodd" />
        </svg>
        Refresh
      </button>
    </div>

    <p v-if="error" class="text-sm text-red-400/80 text-center" role="status">{{ error }}</p>

    <div v-if="loading && playlists.length === 0" class="text-center text-white/40 text-sm py-12">
      Loading your playlists…
    </div>

    <div
      v-else-if="!loading && playlists.length === 0 && !error"
      class="text-center text-white/40 text-sm py-12"
    >
      No playlists with playable tracks. Create one on YouTube and refresh.
    </div>

    <div
      v-else
      class="grid gap-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
    >
      <button
        v-for="p in playlists"
        :key="p.id"
        type="button"
        class="group flex flex-col gap-2 text-left rounded-lg overflow-hidden transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        @click="emit('select', p.id)"
      >
        <div class="relative aspect-video rounded-md overflow-hidden bg-white/5 border border-white/10 group-hover:border-white/30 transition-colors">
          <img
            v-if="p.thumbnail"
            :src="p.thumbnail"
            :alt="p.title"
            class="w-full h-full object-cover"
            loading="lazy"
          />
          <div v-else class="w-full h-full flex items-center justify-center text-white/20 text-xs">
            No thumbnail
          </div>
          <span class="absolute bottom-1.5 right-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded bg-black/70 text-white/90">
            {{ p.itemCount }} videos
          </span>
        </div>
        <div class="px-0.5">
          <p class="text-sm font-medium text-white/90 line-clamp-2 leading-snug">{{ p.title }}</p>
          <p v-if="p.description" class="text-xs text-white/40 line-clamp-1 mt-0.5">{{ p.description }}</p>
        </div>
      </button>
    </div>
  </div>
</template>
