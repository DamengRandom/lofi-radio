import type { Track } from '~/types/track'

export type Phase = 'idle' | 'loading' | 'playing'

const log = {
  group: (label: string, color: string) => {
    console.groupCollapsed(`%c${label}`, `color:${color};font-weight:bold;`)
  },
  end: () => console.groupEnd(),
  info: (...args: any[]) => console.log(...args),
}

export function usePlayer() {
  const queue = ref<Track[]>([])
  const currentIndex = ref(0)
  const currentPlaylistId = ref<string>('')
  const phase = ref<Phase>('idle')
  const volume = ref(0.8)
  const errorMessage = ref('')

  // Server-issued cool-down window. While `now < rateLimitedUntil`, every
  // user-initiated action (skip) is gated.
  const rateLimitedUntil = ref(0)
  const nowTs = ref(Date.now())
  const isRateLimited = computed(() => nowTs.value < rateLimitedUntil.value)
  const rateLimitRemainingSec = computed(() =>
    isRateLimited.value ? Math.ceil((rateLimitedUntil.value - nowTs.value) / 1000) : 0,
  )

  if (typeof window !== 'undefined') {
    setInterval(() => { nowTs.value = Date.now() }, 500)
  }

  const currentTrack = computed<Track | null>(() => queue.value[currentIndex.value] ?? null)
  const isPlaying = computed(() => phase.value === 'playing')

  let ytPlayer: ReturnType<typeof useYouTubePlayer> | null = null

  function attachPlayer(player: ReturnType<typeof useYouTubePlayer>) {
    ytPlayer = player
    ytPlayer.onEnded(() => nextTrack())
    ytPlayer.onError((code) => handleUnplayable(code))
    ytPlayer.setVolume(volume.value)
    console.log('%c[Player] ✓ YouTube player attached & ready', 'color:#22c55e;font-weight:bold;')
  }

  // Triggered by the YouTube iframe when the current video can't play —
  // copyright/region block, removed, embed-disabled, etc. We drop the bad
  // track from the queue so it isn't retried on the next loop, then auto-
  // advance to whatever's next.
  async function handleUnplayable(code: number) {
    const bad = currentTrack.value
    if (!bad) return

    console.log(
      `%c[Player] ✗ Unplayable (code ${code}): "${bad.title}" — removing from queue and skipping`,
      'color:#ef4444;',
    )

    // Remove the bad track. After splice, currentIndex naturally points to
    // what was the next track (or past the end if we removed the last one).
    queue.value.splice(currentIndex.value, 1)

    if (queue.value.length === 0) {
      ytPlayer?.pause()
      phase.value = 'idle'
      errorMessage.value = 'No playable tracks left in this playlist.'
      return
    }

    if (currentIndex.value >= queue.value.length) {
      currentIndex.value = 0
      console.log('%c[Player] 🔁 Playlist looped after skip', 'color:#a855f7;')
    }

    await playCurrentTrack()
  }

  function lockRateLimit(seconds: number, message?: string) {
    const s = Math.max(1, Math.ceil(seconds))
    rateLimitedUntil.value = Date.now() + s * 1000
    errorMessage.value = message ?? `Slow down — try again in ${s}s.`
  }

  function blockedByRateLimit(): boolean {
    if (!isRateLimited.value) return false
    errorMessage.value = `Slow down — try again in ${rateLimitRemainingSec.value}s.`
    return true
  }

  async function loadPlaylist(playlistId: string) {
    if (!playlistId) return

    phase.value = 'loading'
    errorMessage.value = ''
    ytPlayer?.pause()

    log.group(`[Player] 🎵 Loading playlist=${playlistId}`, '#a855f7')

    const t0 = performance.now()

    try {
      const { tracks } = await $fetch<{ tracks: Track[] }>('/api/playlist-items', {
        query: { playlistId },
      })
      const ms = (performance.now() - t0).toFixed(0)

      log.info(`✓ Received ${tracks.length} tracks in ${ms}ms`)

      if (tracks.length === 0) {
        log.end()
        phase.value = 'idle'
        errorMessage.value = 'This playlist has no playable tracks.'
        return
      }

      console.table(
        tracks.slice(0, 10).map((t, i) => ({
          '#': i + 1,
          title: t.title.length > 60 ? t.title.slice(0, 57) + '...' : t.title,
          channel: t.channelTitle,
          videoId: t.videoId,
        })),
      )

      log.end()

      queue.value = tracks
      currentIndex.value = 0
      currentPlaylistId.value = playlistId

      await playCurrentTrack()
    } catch (e: any) {
      log.info('✗ Failed to load playlist:', e)
      log.end()
      phase.value = 'idle'

      const msg =
        e?.data?.message ||
        e?.statusMessage ||
        e?.message ||
        'Something went wrong loading the playlist.'

      errorMessage.value = String(msg)

      if (e?.statusCode === 429 || e?.response?.status === 429) {
        const retryAfter = Number(e?.response?.headers?.get?.('retry-after'))
        const fromHeader = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0
        const fromMsg = Number((/(\d+)\s*s/.exec(String(msg)) ?? [])[1] ?? 0)
        const seconds = fromHeader || fromMsg || 30
        rateLimitedUntil.value = Date.now() + seconds * 1000
      }
    }
  }

  function clearPlaylist() {
    ytPlayer?.pause()
    queue.value = []
    currentIndex.value = 0
    currentPlaylistId.value = ''
    phase.value = 'idle'
    errorMessage.value = ''
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

    phase.value = 'playing'
    console.log('%c[Player] ▶ Playing', 'color:#22c55e;')
    ytPlayer?.loadAndPlay(track.videoId)
    ytPlayer?.setVolume(volume.value)
  }

  async function nextTrack() {
    if (blockedByRateLimit()) return
    if (queue.value.length === 0) return

    ytPlayer?.pause()

    // Loop the playlist when we walk off the end.
    currentIndex.value =
      currentIndex.value < queue.value.length - 1 ? currentIndex.value + 1 : 0

    if (currentIndex.value === 0) {
      console.log('%c[Player] 🔁 Playlist looped', 'color:#a855f7;')
    }

    await playCurrentTrack()
  }

  function togglePause() {
    if (phase.value === 'playing') {
      ytPlayer?.pause()
      phase.value = 'idle'
      console.log('%c[Player] ⏸ Paused', 'color:#64748b;')
      return
    }

    if (phase.value === 'idle' && currentTrack.value) {
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
    phase,
    errorMessage,
    isRateLimited,
    rateLimitRemainingSec,
    currentTrack,
    isPlaying,
    volume,
    queue,
    currentIndex,
    currentPlaylistId,
    loadPlaylist,
    clearPlaylist,
    lockRateLimit,
    nextTrack,
    togglePause,
    setVolume,
    attachPlayer,
  }
}
