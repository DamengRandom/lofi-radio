const COLORS = { from: '#a855f7', to: '#e9d5ff' }

export function useVisualizer(
  canvasRef: Ref<HTMLCanvasElement | null>,
  isPlaying: Ref<boolean>,
) {
  let frame: number | null = null
  const startTs = performance.now()

  function barAmplitude(t: number, secs: number, playing: boolean): number {
    if (!playing) {
      return 0.12 + Math.sin(t * Math.PI * 2 + secs * 0.4) * 0.05
    }
    const beatPhase = (secs * 1.8) % 1
    const beat = Math.pow(1 - beatPhase, 6) * 0.45 * (1 - t * 0.7)

    const bass = (Math.sin(t * Math.PI * 1.8 + secs * 1.1) + 1) * 0.18 * (1 - t * 0.6)
    const mid = (Math.sin(t * Math.PI * 4 + secs * 1.6) + 1) * 0.14
    const high = (Math.sin(t * Math.PI * 9 + secs * 2.4) + 1) * 0.10 * (0.4 + t * 0.6)

    const tempo = 0.75 + (Math.sin(secs * 0.35) + 1) * 0.125
    const envelope = 0.4 + Math.sin(t * Math.PI) * 0.6

    return Math.min(1, (beat + bass + mid + high) * envelope * tempo)
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
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const secs = (performance.now() - startTs) / 1000

    const barCount = 64
    const gap = 4
    const barW = (w - gap * (barCount - 1)) / barCount

    for (let i = 0; i < barCount; i++) {
      const t = i / (barCount - 1)
      const amp = barAmplitude(t, secs, isPlaying.value)
      const barH = Math.max(2, amp * h * 0.92)
      const x = i * (barW + gap)
      const y = h - barH

      const grad = ctx.createLinearGradient(0, h, 0, y)
      grad.addColorStop(0, COLORS.from)
      grad.addColorStop(1, COLORS.to)
      ctx.fillStyle = grad

      const safeBarW = Math.max(0, barW)
      const r = Math.max(0, Math.min(safeBarW * 0.5, 4))
      ctx.beginPath()
      ctx.roundRect(x, y, safeBarW, barH, [r, r, 1, 1])
      ctx.fill()
    }

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
