// Brightness ramp from dark → bright. The leading space is intentional: the
// darkest cells render nothing so the matrix rain shows through cleanly.
const RAMP = ' .\'`,:;-~+*=ixzaqwepo#%@'
const FONT_STACK = `'JetBrains Mono', ui-monospace, Menlo, monospace`

// Source-grid resolution we sample the thumbnail into. Independent of viewport
// — viewport-sized resampling happens in draw(). Higher = more detail when
// the user has a wide window; YouTube thumbs are 1280×720 so 128×72 is plenty.
const SRC_COLS = 128
const SRC_ROWS = 72

export type AsciiArt = {
  cols: number
  rows: number
  brightness: number[][]
  chars: string[][]
}

export async function loadAsciiArtFromUrl(url: string, signal?: AbortSignal): Promise<AsciiArt | null> {
  if (typeof window === 'undefined') return null

  const img = new Image()
  img.crossOrigin = 'anonymous'

  const loaded = new Promise<HTMLImageElement>((resolve, reject) => {
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('image load failed'))
  })

  img.src = url

  let bitmap: HTMLImageElement

  try {
    bitmap = await loaded
  } catch {
    return null
  }

  if (signal?.aborted) return null

  const off = document.createElement('canvas')
  
  off.width = SRC_COLS
  off.height = SRC_ROWS

  const ctx = off.getContext('2d', { willReadFrequently: true })
  
  if (!ctx) return null

  // Center-crop the source image into our 16:9-ish target so we don't squash
  // square thumbnails or letterbox wide ones.
  const targetAspect = SRC_COLS / SRC_ROWS
  const imgAspect = bitmap.width / bitmap.height
  let sx = 0
  let sy = 0
  let sw = bitmap.width
  let sh = bitmap.height

  if (imgAspect > targetAspect) {
    sw = bitmap.height * targetAspect
    sx = (bitmap.width - sw) / 2
  } else {
    sh = bitmap.width / targetAspect
    sy = (bitmap.height - sh) / 2
  }

  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, SRC_COLS, SRC_ROWS)

  let pixels: Uint8ClampedArray

  try {
    pixels = ctx.getImageData(0, 0, SRC_COLS, SRC_ROWS).data
  } catch {
    // Tainted canvas — host didn't send CORS headers. Skip silently.
    return null
  }

  const brightness: number[][] = []
  const chars: string[][] = []

  for (let y = 0; y < SRC_ROWS; y++) {
    const bRow: number[] = []
    const cRow: string[] = []

    for (let x = 0; x < SRC_COLS; x++) {
      const i = (y * SRC_COLS + x) * 4
      const r = pixels[i]
      const g = pixels[i + 1]
      const b = pixels[i + 2]
      const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
      
      bRow.push(lum)
      
      const idx = Math.min(RAMP.length - 1, Math.floor(lum * RAMP.length))
      
      cRow.push(RAMP[idx])
    }
    
    brightness.push(bRow)
    chars.push(cRow)
  }

  return { cols: SRC_COLS, rows: SRC_ROWS, brightness, chars }
}

type AsciiArtRendererOptions = {
  cellSize?: number
  baseAlpha?: number
  pulseAlpha?: number
  widthPct?: number
  color?: string
  crossfadeMs?: number
}

export function createAsciiArtRenderer(opts: AsciiArtRendererOptions = {}) {
  const cellSize = opts.cellSize ?? 14
  const baseAlpha = opts.baseAlpha ?? 0.32
  const pulseAlpha = opts.pulseAlpha ?? 0.28
  const widthPct = opts.widthPct ?? 0.55
  const color = opts.color ?? '#a8ffb6'
  const crossfadeMs = opts.crossfadeMs ?? 700

  let current: AsciiArt | null = null
  let previous: AsciiArt | null = null
  let crossfadeStart = 0

  function setArt(next: AsciiArt | null) {
    if (next === current) return

    previous = current
    current = next
    crossfadeStart = performance.now()
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    beatPhase: number,
    isPlaying: boolean,
  ) {
    if (!current && !previous) return

    const targetCols = Math.max(8, Math.floor((w * widthPct) / cellSize))
    const targetRows = Math.max(5, Math.floor(targetCols * (SRC_ROWS / SRC_COLS)))
    const ox = Math.floor((w - targetCols * cellSize) / 2)
    const oy = Math.floor((h - targetRows * cellSize) / 2)

    const beatBoost = isPlaying ? Math.pow(1 - beatPhase, 3) : 0
    const layerAlpha = baseAlpha + pulseAlpha * beatBoost

    const fadeProgress = Math.min(1, (performance.now() - crossfadeStart) / crossfadeMs)

    ctx.font = `${cellSize}px ${FONT_STACK}`
    ctx.textBaseline = 'top'
    ctx.fillStyle = color

    const paint = (art: AsciiArt | null, weight: number) => {
      if (!art || weight <= 0.01) return

      for (let y = 0; y < targetRows; y++) {
        const sy = Math.min(art.rows - 1, Math.floor((y / targetRows) * art.rows))

        for (let x = 0; x < targetCols; x++) {
          const sx = Math.min(art.cols - 1, Math.floor((x / targetCols) * art.cols))
          const lum = art.brightness[sy][sx]

          if (lum < 0.18) continue
          
          ctx.globalAlpha = layerAlpha * lum * weight
          ctx.fillText(art.chars[sy][sx], ox + x * cellSize, oy + y * cellSize)
        }
      }
    }

    paint(previous, 1 - fadeProgress)
    paint(current, fadeProgress)

    ctx.globalAlpha = 1

    if (fadeProgress >= 1 && previous) previous = null
  }

  return { draw, setArt }
}
