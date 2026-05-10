declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export type PlayerState = 'idle' | 'buffering' | 'playing' | 'paused' | 'ended'

export function useYouTubePlayer(containerId: string) {
  const playerState = ref<PlayerState>('idle')
  const isReady = ref(false)

  let player: any = null
  let onEndedCallback: (() => void) | null = null
  let onErrorCallback: ((code: number) => void) | null = null
  let readyPromise: Promise<void> | null = null
  let resolveReady: (() => void) | null = null

  function loadApi(): Promise<void> {
    return new Promise((resolve) => {
      if (window.YT?.Player) { resolve(); return }

      const script = document.createElement('script')

      script.src = 'https://www.youtube.com/iframe_api'

      document.head.appendChild(script)

      window.onYouTubeIframeAPIReady = resolve
    })
  }

  async function init(): Promise<void> {
    if (typeof window === 'undefined') return

    await loadApi()

    readyPromise = new Promise<void>((resolve) => { resolveReady = resolve })

    player = new window.YT.Player(containerId, {
      height: '1',
      width: '1',
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          isReady.value = true
          resolveReady?.()
        },
        onStateChange: (event: any) => {
          const states: Record<number, PlayerState> = {
            [-1]: 'idle',
            [0]: 'ended',
            [1]: 'playing',
            [2]: 'paused',
            [3]: 'buffering',
          }
          const next = states[event.data] ?? 'idle'
          playerState.value = next
          if (next === 'ended' && onEndedCallback) onEndedCallback()
        },
        // YT.PlayerError codes:
        //   2   = invalid parameter
        //   5   = HTML5 player error
        //   100 = video not found / removed
        //   101 = embedding disabled by uploader
        //   150 = same as 101
        onError: (event: any) => {
          if (onErrorCallback) onErrorCallback(Number(event.data))
        },
      },
    })

    // Wait for the player to actually be ready before resolving init().
    // Without this, calls like setVolume() fire before YT attaches its methods.
    await readyPromise
  }

  function safeCall(method: string, ...args: any[]) {
    if (player && typeof player[method] === 'function') {
      try { return player[method](...args) }
      catch { /* player not ready or destroyed */ }
    }
  }

  async function loadAndPlay(videoId: string) {
    if (readyPromise) await readyPromise
    safeCall('loadVideoById', videoId)
  }

  function pause() { safeCall('pauseVideo') }
  function resume() { safeCall('playVideo') }
  function setVolume(v: number) { safeCall('setVolume', Math.round(v * 100)) }
  function onEnded(cb: () => void) { onEndedCallback = cb }
  function onError(cb: (code: number) => void) { onErrorCallback = cb }

  return { init, loadAndPlay, pause, resume, setVolume, onEnded, onError, playerState, isReady }
}
