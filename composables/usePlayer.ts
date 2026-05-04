import type { Track } from '~/server/api/tracks.get'
import { GENRES } from '~/constants/genres'

export type Phase = 'idle' | 'loading' | 'intro' | 'playing'

const log = {
  group: (label: string, color: string) => {
    console.groupCollapsed(`%c${label}`, `color:${color};font-weight:bold;`)
  },
  end: () => console.groupEnd(),
  info: (...args: any[]) => console.log(...args),
}

export function usePlayer() {
  const genre = ref<string>('R&B / Soul')
  const searchQuery = ref<string>('')
  const queue = ref<Track[]>([])
  const currentIndex = ref(0)
  const phase = ref<Phase>('idle')
  const introText = ref('')
  const volume = ref(0.8)
  const djEnabled = ref(false)
  const errorMessage = ref('')

  const nextPageToken = ref<string | null>(null)
  const seenVideoIds = ref<Set<string>>(new Set())

  // Seed = the human-readable query the listener picked (e.g. "R & B / Soul hip hop").
  // Variant = a Claude-generated adjacent query used after the seed's catalog
  // is exhausted. variantsTried always starts with the seed so the LLM never
  // proposes the seed itself, then grows by one each time we exhaust again.
  const originalSeed = ref<string>('')
  const activeVariant = ref<string>('')
  const variantsTried = ref<string[]>([])

  // Server-issued cool-down window. While `now < rateLimitedUntil`, every
  // user-initiated action (genre, search, skip) is gated.
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

  const { speak, stop: stopSpeech, currentWordIndex } = useSpeech()

  let ytPlayer: ReturnType<typeof useYouTubePlayer> | null = null

  function attachPlayer(player: ReturnType<typeof useYouTubePlayer>) {
    ytPlayer = player
    ytPlayer.onEnded(() => nextTrack())
    ytPlayer.setVolume(volume.value)
    console.log('%c[Player] ✓ YouTube player attached & ready', 'color:#22c55e;font-weight:bold;')
  }

  function trackQuery() {
    // An active LLM-generated variant overrides both the genre and the user's
    // original search — the YouTube fetch uses the variant as a free-text query.
    if (activeVariant.value) return { q: activeVariant.value }
    return searchQuery.value
      ? { q: searchQuery.value }
      : { genre: genre.value }
  }

  // Resolve the human-readable seed for the current selection. Used as the
  // anchor we send to the LLM ("stay adjacent to THIS, not the latest variant")
  // so the radio doesn't drift across many hops.
  function resolveSeed(): string {
    if (searchQuery.value) return searchQuery.value
    return GENRES.find((g) => g.id === genre.value)?.query ?? genre.value
  }

  // Pull the next batch of tracks for the active query.
  // - reset=true        → user changed query (genre/search): clear pagination + variant state
  // - forceVariant=true → visible queue ended: jump straight to a fresh LLM variant
  //                       instead of paginating the same query (more variety per session)
  // - default           → catalog continuation: paginate with the stored token; if a fetch
  //                       returns only already-seen tracks AND has no further pages,
  //                       fall back to a variant request inside the loop
  async function fetchTracks(opts: { reset?: boolean; forceVariant?: boolean } = {}): Promise<Track[]> {
    const { reset = false, forceVariant = false } = opts

    if (reset) {
      nextPageToken.value = null
      seenVideoIds.value = new Set()
      originalSeed.value = resolveSeed()
      activeVariant.value = ''
      variantsTried.value = [originalSeed.value]
    }

    if (forceVariant) {
      const seedToSend = originalSeed.value || resolveSeed()
      const triedToSend = [...variantsTried.value]
      console.log(
        `%c[Player] → /api/expand-query seed="${seedToSend}" tried=${JSON.stringify(triedToSend)}`,
        'color:#a855f7;',
      )
      try {
        const { query: newVariant } = await $fetch<{ query: string }>('/api/expand-query', {
          method: 'POST',
          body: { seed: seedToSend, tried: triedToSend },
        })
        console.log(`%c[Player] 🤖 Queue-end variant: "${newVariant}"`, 'color:#10b981;font-weight:bold;')
        activeVariant.value = newVariant
        variantsTried.value = [...variantsTried.value, newVariant]
        nextPageToken.value = null
      } catch (e: any) {
        // LLM endpoint down/quota'd / bad request — fall through to ordinary
        // pagination so the radio keeps playing. The in-loop exhaustion branch
        // will retry a variant request when YouTube returns no fresh tracks.
        const status = e?.statusCode ?? e?.response?.status ?? '?'
        const detail = e?.data?.message ?? e?.statusMessage ?? e?.message ?? '(no detail)'
        console.log(
          `%c[Player] ⚠ Queue-end variant failed (${status}): ${detail} — paginating current query`,
          'color:#ef4444;',
        )
      }
    }

    for (let attempt = 0; attempt < 2; attempt++) {
      const params = nextPageToken.value
        ? { ...trackQuery(), pageToken: nextPageToken.value }
        : trackQuery()

      const { tracks, nextPageToken: newToken } = await $fetch<{
        tracks: Track[]
        nextPageToken: string | null
      }>('/api/tracks', { query: params })

      nextPageToken.value = newToken ?? null

      const fresh = tracks.filter((t) => !seenVideoIds.value.has(t.videoId))
      fresh.forEach((t) => seenVideoIds.value.add(t.videoId))

      if (fresh.length > 0) {
        console.log(
          `%c[Player] 📥 ${fresh.length} fresh tracks (pool: ${seenVideoIds.value.size}, nextPage: ${newToken ? 'yes' : 'end'}, variant: ${activeVariant.value || '(seed)'})`,
          'color:#0ea5e9;font-weight:bold;',
        )
        return fresh
      }

      // Catalog exhausted — ask Claude for an adjacent query, keep seenVideoIds
      // populated so the new variant's tracks are also deduped against history.
      console.log('%c[Player] 🔄 Catalog exhausted — requesting variant from LLM', 'color:#a855f7;')

      try {
        const { query: newVariant } = await $fetch<{ query: string }>('/api/expand-query', {
          method: 'POST',
          body: {
            seed: originalSeed.value || resolveSeed(),
            tried: variantsTried.value,
          },
        })

        console.log(`%c[Player] 🤖 New variant: "${newVariant}"`, 'color:#10b981;font-weight:bold;')
        activeVariant.value = newVariant
        variantsTried.value = [...variantsTried.value, newVariant]
        nextPageToken.value = null
        // Intentionally do NOT clear seenVideoIds — variants share the dedupe
        // pool so we never repeat a track even across query hops.
      } catch (e: any) {
        // Fallback: behave like before — clear the seen list and loop the seed.
        // Keeps the radio alive even if the LLM endpoint is down or quota'd.
        const status = e?.statusCode ?? e?.response?.status ?? '?'
        const detail = e?.data?.message ?? e?.statusMessage ?? e?.message ?? '(no detail)'
        console.log(
          `%c[Player] ⚠ Variant request failed (${status}): ${detail} — falling back to seen-list reset`,
          'color:#ef4444;',
        )
        nextPageToken.value = null
        seenVideoIds.value = new Set()
        activeVariant.value = ''
      }
    }

    return []
  }

  async function reload() {
    phase.value = 'loading'
    errorMessage.value = ''

    stopSpeech()

    ytPlayer?.pause()

    const label = searchQuery.value
      ? `[Player] 🎚 Loading search="${searchQuery.value}"`
      : `[Player] 🎚 Loading genre="${genre.value}"`
    log.group(label, '#a855f7')

    const t0 = performance.now()

    try {
      const tracks = await fetchTracks({ reset: true })
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
    } catch (e: any) {
      log.info('✗ Failed to load tracks:', e)
      log.end()
      phase.value = 'idle'
      // Pull a friendly message off the FetchError if Nitro provided one
      // (rate-limit 429s and validation 400s ship statusMessage / data.message).
      const msg =
        e?.data?.message ||
        e?.statusMessage ||
        e?.message ||
        'Something went wrong loading tracks.'

      errorMessage.value = String(msg)

      // If the server sent a 429, lock the UI until the retry window passes.
      if (e?.statusCode === 429 || e?.response?.status === 429) {
        const retryAfter = Number(e?.response?.headers?.get?.('retry-after'))
        const fromHeader = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 0
        const fromMsg = Number((/(\d+)\s*s/.exec(String(msg)) ?? [])[1] ?? 0)
        const seconds = fromHeader || fromMsg || 30
        rateLimitedUntil.value = Date.now() + seconds * 1000
      }
    }
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

  async function setGenre(newGenre: string) {
    if (blockedByRateLimit()) return
    genre.value = newGenre
    searchQuery.value = ''
    await reload()
  }

  async function setSearch(query: string) {
    if (blockedByRateLimit()) return
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
    if (blockedByRateLimit()) return
    stopSpeech()
    ytPlayer?.pause()

    if (currentIndex.value < queue.value.length - 1) {
      currentIndex.value++
    } else {
      console.log('%c[Player] 🔁 Queue ended — requesting fresh playlist variant', 'color:#a855f7;')

      try {
        const tracks = await fetchTracks({ forceVariant: true })
        if (tracks.length === 0) {
          console.log('%c[Player] ⚠ No tracks returned — bailing', 'color:#ef4444;')
          phase.value = 'idle'
          errorMessage.value = 'Out of tracks — try a different genre or search.'
          return
        }
        queue.value = shuffle(tracks)
        currentIndex.value = 0
      } catch (e: any) {
        console.log('%c[Player] ✗ Failed to fetch next playlist', 'color:#ef4444;', e)
        phase.value = 'idle'
        errorMessage.value =
          e?.data?.message || e?.statusMessage || e?.message || 'Could not load the next playlist.'
        return
      }
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
      // First-time play: nothing loaded yet → fetch tracks for current genre
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

  // ---------------------------------------------------------------------------
  // DEV-ONLY TEST HELPERS — REMOVE BEFORE MERGE
  // Exposes __player and two helpers on window so we can verify the
  // LLM-variant flows without waiting for natural queue/catalog exhaustion:
  //   __endQueue()      → jump to the last track; next skip triggers the
  //                       queue-end variant path (fresh LLM playlist)
  //   __forceExhaust()  → also marks every queued track as already seen, so
  //                       the in-loop catalog-exhaustion branch fires too
  // ---------------------------------------------------------------------------
  if (import.meta.dev && typeof window !== 'undefined') {
    ;(window as any).__player = {
      originalSeed,
      activeVariant,
      variantsTried,
      seenVideoIds,
      nextPageToken,
      queue,
      currentIndex,
    }
    ;(window as any).__endQueue = () => {
      // Collapse the queue to just the current track so the very next
      // nextTrack() click hits the queue-end branch and requests a fresh
      // LLM variant (no need to also mark tracks as seen).
      const cur = queue.value[currentIndex.value]
      queue.value = cur ? [cur] : []
      currentIndex.value = 0
      console.log(
        '%c[DEV] ⏭ Queue end primed — next skip requests a fresh LLM playlist',
        'color:#a855f7;font-weight:bold;',
      )
    }
    ;(window as any).__forceExhaust = () => {
      // Same as __endQueue, plus mark every queued track as already seen and
      // null the page token so the in-loop catalog-exhaustion branch also
      // fires. Useful for stress-testing the dedupe pool across hops.
      queue.value.forEach((t) => seenVideoIds.value.add(t.videoId))
      nextPageToken.value = null
      const cur = queue.value[currentIndex.value]
      queue.value = cur ? [cur] : []
      currentIndex.value = 0
      console.log(
        '%c[DEV] 💥 Forced catalog exhaustion — next skip should trigger variant',
        'color:#ef4444;font-weight:bold;',
      )
    }
  }

  return {
    genre,
    searchQuery,
    djEnabled,
    phase,
    introText,
    errorMessage,
    isRateLimited,
    rateLimitRemainingSec,
    currentWordIndex,
    currentTrack,
    isPlaying,
    volume,
    queue,
    currentIndex,
    setGenre,
    setSearch,
    lockRateLimit,
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
