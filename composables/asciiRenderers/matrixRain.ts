const CHAR_POOL = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜｦﾝ0123456789:・."=*+-<>'
const FONT_STACK = `'JetBrains Mono', ui-monospace, Menlo, monospace`

type Column = {
  y: number
  speed: number
  headChar: string
  spawnDelay: number
}

type RainOptions = {
  cellSize?: number
  trailColor?: string
  headColor?: string
  bgFadeAlpha?: number
}

export function createMatrixRainRenderer(opts: RainOptions = {}) {
  const cellSize = opts.cellSize ?? 14
  const trailColor = opts.trailColor ?? '#00ff66'
  const headColor = opts.headColor ?? '#d6ffe4'
  const bgFadeAlpha = opts.bgFadeAlpha ?? 0.08

  let columns: Column[] = []
  let lastWidth = 0
  let lastHeight = 0
  let primed = false

  function pickChar() {
    return CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)]
  }

  function rebuildColumns(w: number, h: number) {
    const colCount = Math.max(1, Math.floor(w / cellSize))
    columns = new Array(colCount).fill(0).map(() => ({
      y: -Math.random() * h,
      speed: cellSize * (0.18 + Math.random() * 0.28),
      headChar: pickChar(),
      spawnDelay: Math.random() * 60,
    }))
    lastWidth = w
    lastHeight = h
    primed = false
  }

  function reset(w: number, h: number) {
    rebuildColumns(w, h)
  }

  function draw(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    beatPhase: number,
    isPlaying: boolean,
  ) {
    if (w !== lastWidth || h !== lastHeight || columns.length === 0) {
      rebuildColumns(w, h)
    }

    if (!primed) {
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, w, h)
      primed = true
    }

    ctx.fillStyle = `rgba(0, 0, 0, ${bgFadeAlpha})`
    ctx.fillRect(0, 0, w, h)

    ctx.font = `${cellSize}px ${FONT_STACK}`
    ctx.textBaseline = 'top'

    const beatBoost = isPlaying ? Math.pow(1 - beatPhase, 4) * 0.8 : 0
    const speedScale = isPlaying ? 1 + beatBoost * 0.4 : 0.3

    for (let i = 0; i < columns.length; i++) {
      const col = columns[i]
      const x = i * cellSize

      if (col.spawnDelay > 0) {
        col.spawnDelay -= 1
        continue
      }

      if (Math.random() < 0.06) col.headChar = pickChar()

      // Draw a faint trail char one cell behind the head so the green stays
      // visible after the bright head moves on.
      if (col.y - cellSize >= 0) {
        ctx.fillStyle = trailColor
        ctx.fillText(pickChar(), x, col.y - cellSize)
      }

      // Bright head leads the column.
      ctx.fillStyle = headColor
      ctx.fillText(col.headChar, x, col.y)

      col.y += col.speed * speedScale

      if (col.y > h + cellSize * 2) {
        col.y = -cellSize * (2 + Math.random() * 8)
        col.speed = cellSize * (0.18 + Math.random() * 0.28)
        col.spawnDelay = Math.random() * 30
      }
    }
  }

  return { draw, reset }
}
