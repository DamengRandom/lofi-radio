import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '../utils/rateLimit'
import { validateSearchQuery } from '~/utils/searchGuards'

const SYSTEM_PROMPT = `You are a music discovery assistant for a 24/7 radio app.

Given a SEED query and a list of queries the app has already exhausted, your job is to propose ONE new YouTube search query that:
- Returns music adjacent in vibe, mood, tempo, or genre family to the SEED.
- Is meaningfully distinct from every query in the EXHAUSTED list (different artists / scenes / sub-genres).
- Stays in the same broad family as the seed — never jump genres entirely (e.g. R&B / Soul → metal is wrong).
- Uses 2 to 6 short search terms separated by spaces.
- Contains only letters, numbers, and spaces. No quotes, no punctuation, no brackets, no URLs.
- Maximum 60 characters total.
- No artist names. No year ranges. No "best of" / "top 10".

Respond with ONLY the query string itself. No JSON, no quotes, no preamble, no trailing period.`

let client: Anthropic | null = null

export default defineEventHandler(async (event) => {
  // Variant generation should be rare (once per ~480 tracks ≈ once per day per
  // listener). 10/min is more than enough headroom even with aggressive testing.
  checkRateLimit(event, { windowMs: 60_000, max: 10, scope: 'expand' })

  const config = useRuntimeConfig()

  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic API key not configured' })
  }

  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey })
  }

  const body = await readBody(event)
  const seed = typeof body?.seed === 'string' ? body.seed.trim() : ''
  const triedRaw: unknown[] = Array.isArray(body?.tried) ? body.tried : []
  const tried: string[] = triedRaw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)

  if (!seed) {
    throw createError({ statusCode: 400, message: 'seed is required' })
  }

  console.log(`\n[expand-query] 🤖 seed="${seed}" tried=[${tried.map((t) => `"${t}"`).join(', ')}]`)
  const t0 = Date.now()

  const userContent =
    `SEED: ${seed}\n` +
    `EXHAUSTED (${tried.length}): ${tried.length === 0 ? '(none)' : tried.join(' | ')}\n\n` +
    `Propose one new query.`

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 60,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: userContent }],
  })

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : ''
  // Strip stray quotes / list markers / surrounding punctuation the model might add.
  const cleaned = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^[-•*\d.)\s]+/, '')
    .replace(/[.!?]+$/, '')
    .trim()

  // Defense in depth: run the same validator the YouTube search endpoint uses,
  // so a misbehaving model can't slip a bad query downstream.
  const result = validateSearchQuery(cleaned)
  if (!result.ok) {
    console.log(`[expand-query] ✗ Rejected "${cleaned}" — ${result.reason}`)
    throw createError({ statusCode: 502, message: `LLM produced invalid query: ${result.reason}` })
  }

  const ms = Date.now() - t0
  const u = message.usage
  console.log(`[expand-query] ✓ "${result.value}" (${ms}ms, in=${u.input_tokens} out=${u.output_tokens} cached_read=${u.cache_read_input_tokens ?? 0})`)

  return { query: result.value }
})
