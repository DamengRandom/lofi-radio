import type { Mood } from './useVisualizer'
import type { Track } from '~/server/api/tracks.get'

export type Phase = 'idle' | 'loading' | 'intro' | 'playing'

const log = {
  group: (label: string, color: string) => {
    console.groupCollapsed(`%c${label}`, `color:${color};font-weight:bold;`)
  },
  end: () => console.groupEnd(),
  info: (...args: any[]) => console.log(...args),
}

export function usePlayer() {
  const mood = ref<Mood>('chill')
  const genre = ref<string>('lofi')
  const searchQuery = ref<string>('')
  const queue = ref<Track[]>([])
  const currentIndex = ref(0)
  const phase = ref<Phase>('idle')
  const introText = ref('')
  const volume = ref(0.8)
  const djEnabled = ref(true)

  const currentTrack = computed<Track | null>(() => queue.value[currentIndex.value] ?? null)
  const isPlaying = computed(() => phase.value === 'playing')

  const { speak, stop: stopSpeech, currentWordIndex } = useSpeech()

  let ytPlayer: ReturnType<typeof useYouTubePlayer> | null = null

  function attachPlayer(player: ReturnType<typeof useYouTubePlayer>) {
    ytPlayer = player
    ytPlayer.onEnded(() => nextTrack())
    ytPlayer.setVolume(volume.value)
    console.log('%c[Player] ✓ YouTube player attached & ready', 'color:#22c55e;font-weight:bold;')
  }

  function trackQuery() {
    return searchQuery.value
      ? { q: searchQuery.value, mood: mood.value }
      : { genre: genre.value, mood: mood.value }
  }

  async function reload() {
    phase.value = 'loading'
    stopSpeech()
    ytPlayer?.pause()

    const label = searchQuery.value
      ? `[Player] 🎚 Loading search="${searchQuery.value}" mood="${mood.value}"`
      : `[Player] 🎚 Loading genre="${genre.value}" mood="${mood.value}"`
    log.group(label, '#a855f7')
    const t0 = performance.now()
    try {
      const tracks = await $fetch<Track[]>('/api/tracks', { query: trackQuery() })
      const ms = (performance.now() - t0).toFixed(0)
      log.info(`✓ Received ${tracks.length} tracks in ${ms}ms`)
      console.table(
        tracks.slice(0, 10).map((t, i) => ({
          '#': i + 1,
          title: t.title.length > 60 ? t.title.slice(0, 57) + '...' : t.title,
          channel: t.channelTitle,
          videoId: t.videoId,
        })),
      )
      log.end()

      queue.value = shuffle(tracks)
      currentIndex.value = 0
      await playCurrentTrack()
    } catch (e) {
      log.info('✗ Failed to load tracks:', e)
      log.end()
      phase.value = 'idle'
    }
  }

  async function setMood(newMood: Mood) {
    mood.value = newMood
    await reload()
  }

  async function setGenre(newGenre: string) {
    genre.value = newGenre
    searchQuery.value = ''
    await reload()
  }

  async function setSearch(query: string) {
    const q = query.trim()
    if (!q) return
    searchQuery.value = q
    await reload()
  }

  async function playCurrentTrack() {
    const track = currentTrack.value
    if (!track) return

    log.group(`[Player] ▶ Track ${currentIndex.value + 1}/${queue.value.length}`, '#3b82f6')
    log.info(`Title:    ${track.title}`)
    log.info(`Channel:  ${track.channelTitle}`)
    log.info(`VideoId:  ${track.videoId}`)
    log.info(`URL:      https://youtu.be/${track.videoId}`)
    log.end()

    if (djEnabled.value) {
      phase.value = 'intro'
      introText.value = ''
      try {
        const t0 = performance.now()
        const { intro } = await $fetch<{ intro: string }>('/api/intro', {
          method: 'POST',
          body: {
            title: track.title,
            channelTitle: track.channelTitle,
            mood: mood.value,
            genre: genre.value,
          },
        })
        const ms = (performance.now() - t0).toFixed(0)
        console.log(`%c[DJ] 🎙 ${ms}ms · "${intro}"`, 'color:#f59e0b;')
        introText.value = intro
        await speak(intro)
      } catch {
        introText.value = `Up next — "${track.title}"`
        console.log('%c[DJ] ⚠ Fallback intro used', 'color:#ef4444;')
        await speak(introText.value)
      }
    } else {
      console.log('%c[DJ] 🤫 Ambient mode — DJ skipped', 'color:#64748b;')
    }

    phase.value = 'playing'
    console.log('%c[Player] ▶ Playing', 'color:#22c55e;')
    ytPlayer?.loadAndPlay(track.videoId)
    ytPlayer?.setVolume(volume.value)
  }

  async function nextTrack() {
    stopSpeech()
    ytPlayer?.pause()
    if (currentIndex.value < queue.value.length - 1) {
      currentIndex.value++
    } else {
      console.log('%c[Player] 🔁 Queue exhausted — fetching fresh tracks', 'color:#a855f7;')
      try {
        const tracks = await $fetch<Track[]>('/api/tracks', { query: trackQuery() })
        queue.value = shuffle(tracks)
        currentIndex.value = 0
      } catch { return }
    }
    await playCurrentTrack()
  }

  function skipIntro() {
    if (phase.value !== 'intro') return
    console.log('%c[Player] ⏭ DJ intro skipped', 'color:#f59e0b;')
    // Cancel speech — the awaited speak() promise resolves, and
    // playCurrentTrack() continues to phase='playing' + loadAndPlay()
    stopSpeech()
  }

  function togglePause() {
    if (phase.value === 'playing') {
      ytPlayer?.pause()
      phase.value = 'idle'
      console.log('%c[Player] ⏸ Paused', 'color:#64748b;')
      return
    }
    if (phase.value === 'idle') {
      // First-time play: nothing loaded yet → fetch tracks for current genre/mood
      if (!currentTrack.value) {
        console.log('%c[Player] ▶ First play — loading tracks', 'color:#22c55e;')
        reload()
        return
      }
      ytPlayer?.resume()
      phase.value = 'playing'
      console.log('%c[Player] ▶ Resumed', 'color:#22c55e;')
    }
  }

  function setVolume(v: number) {
    volume.value = v
    ytPlayer?.setVolume(v)
  }

  return {
    mood,
    genre,
    searchQuery,
    djEnabled,
    phase,
    introText,
    currentWordIndex,
    currentTrack,
    isPlaying,
    volume,
    queue,
    currentIndex,
    setMood,
    setGenre,
    setSearch,
    nextTrack,
    skipIntro,
    togglePause,
    setVolume,
    attachPlayer,
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
