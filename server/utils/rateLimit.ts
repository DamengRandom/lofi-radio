import type { H3Event } from 'h3'

// Simple in-memory sliding-window rate limiter, keyed by IP.
// Good enough for a single-instance Nuxt server. If you scale horizontally,
// swap the Map for Redis / Upstash.

type Bucket = { timestamps: number[] }
const buckets = new Map<string, Bucket>()

// Periodic cleanup so the Map doesn't grow forever.
let lastSweep = 0

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < 60_000) return
  
  lastSweep = now

  for (const [key, bucket] of buckets) {
    bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs)
    if (bucket.timestamps.length === 0) buckets.delete(key)
  }
}

function getClientIp(event: H3Event): string {
  const fwd = getRequestHeader(event, 'x-forwarded-for')
  
  if (fwd) return fwd.split(',')[0]!.trim()

  const real = getRequestHeader(event, 'x-real-ip')
  
  if (real) return real
  
  return event.node.req.socket?.remoteAddress ?? 'unknown'
}

export interface RateLimitOptions {
  windowMs: number
  max: number
  scope?: string
}

export function checkRateLimit(event: H3Event, opts: RateLimitOptions) {
  const now = Date.now()
  sweep(now, opts.windowMs)

  const key = `${opts.scope ?? 'default'}:${getClientIp(event)}`
  const bucket = buckets.get(key) ?? { timestamps: [] }
  
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < opts.windowMs)

  if (bucket.timestamps.length >= opts.max) {
    const oldest = bucket.timestamps[0]!
    const retryMs = opts.windowMs - (now - oldest)
    const retrySec = Math.max(1, Math.ceil(retryMs / 1000))
    
    setResponseHeader(event, 'Retry-After', Number(retrySec))

    throw createError({
      statusCode: 429,
      statusMessage: `Slow down — try again in ${retrySec}s.`,
      message: `Slow down — try again in ${retrySec}s.`,
    })
  }

  bucket.timestamps.push(now)
  buckets.set(key, bucket)
}
