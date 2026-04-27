<script setup lang="ts">
import type { Mood } from '~/composables/useVisualizer'
import { GENRES } from '~/composables/useGenres'

const player = usePlayer()
const { freeSearch } = useFeatureFlags()
const route = useRoute()

const ytContainerId = 'yt-player-container'

type SelectorMode = 'pick' | 'search'
const selectorMode = ref<SelectorMode>('pick')

const VALID_MOODS = new Set<Mood>(['focus', 'chill', 'sleep', 'study'])

function applyPreselect() {
  const q = String(route.query.q ?? '').trim()
  const genreParam = String(route.query.genre ?? '').trim()
  const moodParam = String(route.query.mood ?? '').trim() as Mood

  if (VALID_MOODS.has(moodParam)) {
    player.mood.value = moodParam
  }

  if (q && freeSearch.value) {
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

async function onMoodSelect(mood: Mood) {
  await player.setMood(mood)
}

async function onGenreSelect(genre: string) {
  await player.setGenre(genre)
}

async function onSearchSubmit(q: string) {
  await player.setSearch(q)
}
</script>

<template>
  <div class="min-h-screen bg-black text-white font-sans flex flex-col">
    <!-- Hidden YouTube player -->
    <div :id="ytContainerId" class="fixed opacity-0 pointer-events-none w-px h-px" style="bottom: 0; right: 0;" />

    <!-- Header -->
    <header class="flex items-center justify-between px-8 py-6">
      <div class="flex items-center gap-2">
        <span class="text-lg font-semibold tracking-tight">Groovy Radio</span>
        <span class="text-xs text-white/30 font-normal ml-1">AI Multi-Genre</span>
      </div>
      <div class="flex items-center gap-2 text-white/20 text-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-slow" />
        <span>Live 24/7</span>
      </div>
    </header>

    <!-- Main -->
    <main class="flex-1 flex flex-col items-center justify-center px-6 gap-8 pb-10">

      <!-- Selector: quick-pick genres OR free search (search is feature-flagged) -->
      <div class="flex flex-col items-center gap-3">
        <div v-if="freeSearch" class="inline-flex items-center gap-1 p-1 rounded-lg border border-white/10 bg-white/[0.03]">
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
          v-if="!freeSearch || selectorMode === 'pick'"
          :model-value="player.genre.value"
          :disabled="player.phase.value === 'loading' || player.phase.value === 'intro'"
          @update:model-value="onGenreSelect"
        />
        <SearchBar
          v-else
          :model-value="player.searchQuery.value"
          :disabled="player.phase.value === 'loading' || player.phase.value === 'intro'"
          @search="onSearchSubmit"
        />
      </div>

      <!-- Bar visualizer — transparent, mood-colored, beat-reactive simulation -->
      <div class="w-full max-w-3xl h-40">
        <ClientOnly>
          <Visualizer :mood="player.mood.value" :is-playing="player.isPlaying.value" />
        </ClientOnly>
      </div>

      <!-- Track info -->
      <TrackInfo :track="player.currentTrack.value" :phase="player.phase.value" />

      <!-- DJ Intro -->
      <DJIntro
        :text="player.introText.value"
        :visible="player.phase.value === 'intro'"
        :current-word-index="player.currentWordIndex.value"
        @skip-intro="player.skipIntro()"
      />

      <!-- Controls -->
      <PlayerControls
        :phase="player.phase.value"
        :volume="player.volume.value"
        @skip="player.nextTrack()"
        @toggle-pause="player.togglePause()"
        @update:volume="player.setVolume($event)"
      />

      <!-- Mood pills -->
      <div class="flex flex-col items-center gap-3">
        <p class="text-white/20 text-xs uppercase tracking-widest">Vibe (color theme)</p>
        <MoodSelector
          v-model="player.mood.value"
          :disabled="player.phase.value === 'loading' || player.phase.value === 'intro'"
          @update:model-value="onMoodSelect"
        />
      </div>
    </main>

    <!-- Footer -->
    <footer class="text-center text-white/10 text-xs py-4">
      Powered by DamengRandom with ❤️ ~ 2026 Groovy Radio
    </footer>
  </div>
</template>
