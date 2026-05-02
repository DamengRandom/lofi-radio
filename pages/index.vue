<script setup lang="ts">
import { GENRES } from '~/composables/useGenres'

const player = usePlayer()
const route = useRoute()

const ytContainerId = 'yt-player-container'

type SelectorMode = 'pick' | 'search'
const selectorMode = ref<SelectorMode>('pick')

function applyPreselect() {
  const q = String(route.query.q ?? '').trim()
  const genreParam = String(route.query.genre ?? '').trim()

  if (q) {
    selectorMode.value = 'search'
    player.searchQuery.value = q

    return
  }

  if (GENRES.some((g) => g.id === genreParam)) {
    player.genre.value = genreParam
  }
}

applyPreselect()

onMounted(async () => {
  const ytPlayer = useYouTubePlayer(ytContainerId)
  await ytPlayer.init()

  player.attachPlayer(ytPlayer)

  const autoplay = route.query.autoplay === '1' || route.query.autoplay === 'true'

  if (!autoplay) return

  // Ambient launch (Siri / CLI / shortcut): skip the DJ intro entirely.
  // Works around iOS Safari blocking speechSynthesis without a user gesture,
  // and avoids spending Anthropic credits on speech that won't play.
  player.djEnabled.value = false

  if (player.searchQuery.value) {
    await player.setSearch(player.searchQuery.value)
  } else {
    await player.setGenre(player.genre.value)
  }
})

async function onGenreSelect(genre: string) {
  await player.setGenre(genre)
}

async function onSearchSubmit(q: string) {
  await player.setSearch(q)
}
</script>

<template>
  <div class="relative min-h-screen text-white font-sans flex flex-col">
    <!-- Hidden YouTube player -->
    <div :id="ytContainerId" class="fixed opacity-0 pointer-events-none w-px h-px" style="bottom: 0; right: 0;" />

    <!-- Fullscreen ASCII matrix rain background -->
    <ClientOnly>
      <Visualizer :is-playing="player.isPlaying.value" />
    </ClientOnly>

    <!-- Header -->
    <header class="relative z-10 flex items-center justify-between px-8 py-6">
      <div class="flex items-center gap-2">
        <span class="text-lg font-semibold tracking-tight">Groovy Radio</span>
        <span class="text-xs text-white/30 font-normal ml-1">AI Multi-Genre</span>
      </div>
      <div class="flex items-center gap-4">
        <!-- DJ Groovy toggle -->
        <button
          type="button"
          role="switch"
          :aria-checked="player.djEnabled.value"
          :title="player.djEnabled.value ? 'DJ Groovy is on — click to mute' : 'DJ Groovy is off — click to enable'"
          class="flex items-center gap-2 group"
          @click="player.djEnabled.value = !player.djEnabled.value"
        >
          <span class="text-xs uppercase tracking-widest transition-colors"
            :class="player.djEnabled.value ? 'text-amber-300/90' : 'text-white/30 group-hover:text-white/50'">
            DJ {{ player.djEnabled.value ? 'On' : 'Off' }}
          </span>
          <span
            :class="[
              'relative w-9 h-5 rounded-full transition-colors duration-200',
              player.djEnabled.value ? 'bg-amber-400/80' : 'bg-white/15',
            ]"
          >
            <span
              :class="[
                'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200',
                player.djEnabled.value ? 'translate-x-4' : 'translate-x-0',
              ]"
            />
          </span>
        </button>

        <div class="flex items-center gap-2 text-white/20 text-xs">
          <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
          <span>Live 24/7</span>
        </div>
      </div>
    </header>

    <!-- Main -->
    <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-8 pb-10">

      <!-- Selector: quick-pick genres OR free search -->
      <div class="flex flex-col items-center gap-3">
        <div class="inline-flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            :class="[
              'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
              selectorMode === 'pick'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70',
            ]"
            @click="selectorMode = 'pick'"
          >
            Quick Pick
          </button>
          <button
            type="button"
            :class="[
              'text-xs font-medium px-3 py-1.5 rounded-md transition-colors',
              selectorMode === 'search'
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:text-white/70',
            ]"
            @click="selectorMode = 'search'"
          >
            Search
          </button>
        </div>

        <GenreSelector
          v-if="selectorMode === 'pick'"
          :model-value="player.genre.value"
          :disabled="player.phase.value === 'loading' || player.phase.value === 'intro' || player.isRateLimited.value"
          @update:model-value="onGenreSelect"
        />
        <SearchBar
          v-else
          :model-value="player.searchQuery.value"
          :disabled="player.phase.value === 'loading' || player.phase.value === 'intro' || player.isRateLimited.value"
          :server-error="player.errorMessage.value"
          @search="onSearchSubmit"
          @throttle="(secs: number) => player.lockRateLimit(secs)"
        />

        <p
          v-if="player.isRateLimited.value"
          class="text-xs text-amber-400/80 mt-1"
          role="status"
        >
          Rate limit reached — controls unlock in {{ player.rateLimitRemainingSec.value }}s.
        </p>
      </div>

      <!-- Track info -->
      <TrackInfo :track="player.currentTrack.value" :phase="player.phase.value" />

      <!-- Controls -->
      <PlayerControls
        :phase="player.phase.value"
        :volume="player.volume.value"
        :disabled="player.isRateLimited.value"
        @skip="player.nextTrack()"
        @toggle-pause="player.togglePause()"
        @update:volume="player.setVolume($event)"
      />

      <!-- DJ Intro -->
      <DJIntro
        :text="player.introText.value"
        :visible="player.phase.value === 'intro'"
        :current-word-index="player.currentWordIndex.value"
        @skip-intro="player.skipIntro()"
      />
    </main>

    <!-- Footer -->
    <footer class="relative z-10 text-center text-white/50 text-xs py-4">
      Powered by DamengRandom with ❤️ ~ 2026 Groovy Radio
    </footer>
  </div>
</template>
