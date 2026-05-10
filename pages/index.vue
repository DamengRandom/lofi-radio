<script setup lang="ts">
const player = usePlayer()
const route = useRoute()
const { loggedIn, user, clear: clearSession, fetch: refreshSession } = useUserSession()
const { playlists, loading, error, fetchPlaylists, reset: resetPlaylists } = usePlaylists()

const ytContainerId = 'yt-player-container'

const authError = computed(() => route.query.auth_error === '1')

watch(
  loggedIn,
  (signedIn) => {
    if (signedIn) fetchPlaylists()
    else resetPlaylists()
  },
  { immediate: true },
)

onMounted(async () => {
  const ytPlayer = useYouTubePlayer(ytContainerId)
  await ytPlayer.init()
  player.attachPlayer(ytPlayer)
})

function onSelectPlaylist(playlistId: string) {
  player.loadPlaylist(playlistId)
}

function onBackToGrid() {
  player.clearPlaylist()
}

async function onSignOut() {
  await $fetch('/auth/logout', { method: 'POST' }).catch(() => {})
  player.clearPlaylist()
  resetPlaylists()
  await refreshSession()
}

const view = computed<'signin' | 'grid' | 'player'>(() => {
  if (!loggedIn.value) return 'signin'
  if (player.currentTrack.value) return 'player'
  return 'grid'
})
</script>

<template>
  <div class="relative min-h-screen text-white font-sans flex flex-col">
    <!-- Hidden YouTube player -->
    <div :id="ytContainerId" class="fixed opacity-0 pointer-events-none w-px h-px" style="bottom: 0; right: 0;" />

    <!-- Fullscreen ASCII matrix rain background -->
    <ClientOnly>
      <Visualizer
        :is-playing="player.isPlaying.value"
        :thumbnail="player.currentTrack.value?.thumbnail ?? null"
        :video-id="player.currentTrack.value?.videoId ?? null"
      />
    </ClientOnly>

    <!-- Header -->
    <header class="relative z-30 flex items-center justify-between px-8 py-6">
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2">
          <span class="text-lg font-semibold tracking-tight">Groovy Radio</span>
          <span class="text-xs text-white/30 font-normal ml-1">YouTube playlists</span>
        </div>
        <button
          v-if="view === 'player'"
          type="button"
          class="text-xs text-white/50 hover:text-white/80 transition-colors flex items-center gap-1.5 pl-3 ml-1 border-l border-white/10"
          @click="onBackToGrid"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
            <path fill-rule="evenodd" d="M11.03 3.97a.75.75 0 0 1 0 1.06l-6.22 6.22H21a.75.75 0 0 1 0 1.5H4.81l6.22 6.22a.75.75 0 1 1-1.06 1.06l-7.5-7.5a.75.75 0 0 1 0-1.06l7.5-7.5a.75.75 0 0 1 1.06 0Z" clip-rule="evenodd" />
          </svg>
          Back to playlists
        </button>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-white/20 text-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
          <span>Live 24/7</span>
        </div>
        <AccountChip
          v-if="loggedIn"
          :name="user?.name"
          :picture="user?.picture"
          @sign-out="onSignOut"
        />
      </div>
    </header>

    <!-- Main -->
    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-8 pb-10">
      <SignInButton v-if="view === 'signin'" :error="authError" />

      <PlaylistGrid
        v-else-if="view === 'grid'"
        :playlists="playlists"
        :loading="loading"
        :error="error"
        @select="onSelectPlaylist"
        @refresh="fetchPlaylists(true)"
      />

      <template v-else>
        <TrackInfo :track="player.currentTrack.value" :phase="player.phase.value" />

        <PlayerControls
          :phase="player.phase.value"
          :volume="player.volume.value"
          :disabled="player.isRateLimited.value"
          @skip="player.nextTrack()"
          @toggle-pause="player.togglePause()"
          @update:volume="player.setVolume($event)"
        />

        <p
          v-if="player.errorMessage.value"
          class="text-xs text-red-400/80"
          role="status"
        >
          {{ player.errorMessage.value }}
        </p>
      </template>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 text-center text-white/50 text-xs py-4">
      Powered by DamengRandom with ❤️ ~ 2026 Groovy Radio
    </footer>
  </div>
</template>
