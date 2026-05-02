import { createMatrixRainRenderer } from './asciiRenderers/matrixRain'

export function useVisualizer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  isPlaying: Ref<boolean>,
) {
  let frame: number | null = null
  const startTs = performance.now()
  const renderer = createMatrixRainRenderer({ cellSize: 14 })

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
      renderer.reset(w, h)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const secs = (performance.now() - startTs) / 1000
    const beatPhase = (secs * 1.8) % 1

    renderer.draw(ctx, w, h, beatPhase, isPlaying.value)

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
