import { createMatrixRainRenderer } from './asciiRenderers/matrixRain'
import { createAsciiArtRenderer, loadAsciiArtFromUrl, type AsciiArt } from './asciiRenderers/asciiArt'

export function useVisualizer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  isPlaying: Ref<boolean>,
  thumbnailUrl?: Ref<string | null | undefined>,
) {
  let frame: number | null = null
  const startTs = performance.now()
  const cellSize = 14
  const rain = createMatrixRainRenderer({ cellSize })
  const art = createAsciiArtRenderer({ cellSize })

  let loadToken = 0
  const cache = new Map<string, AsciiArt>()

  async function loadThumbnail(url: string | null | undefined) {
    const myToken = ++loadToken
    if (!url) {
      art.setArt(null)
      return
    }
    const cached = cache.get(url)
    if (cached) {
      art.setArt(cached)
      return
    }
    const loaded = await loadAsciiArtFromUrl(url)
    // Newer track started loading while we were awaiting — discard.
    if (myToken !== loadToken) return
    if (loaded) {
      cache.set(url, loaded)
      art.setArt(loaded)
    }
  }

  if (thumbnailUrl) {
    watch(thumbnailUrl, (next) => { loadThumbnail(next) }, { immediate: true })
  }

  function draw() {
    const canvas = canvasRef.value
    if (!canvas) {
      frame = requestAnimationFrame(draw)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr
      canvas.height = h * dpr
      rain.reset(w, h)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const secs = (performance.now() - startTs) / 1000
    const beatPhase = (secs * 1.8) % 1

    rain.draw(ctx, w, h, beatPhase, isPlaying.value)
    art.draw(ctx, w, h, beatPhase, isPlaying.value)

    frame = requestAnimationFrame(draw)
  }

  function start() {
    if (typeof window === 'undefined') return
    if (frame) cancelAnimationFrame(frame)
    draw()
  }

  function stop() {
    if (frame) cancelAnimationFrame(frame)
    frame = null
  }

  onUnmounted(stop)

  return { start, stop }
}
