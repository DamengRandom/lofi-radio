import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '../utils/rateLimit'

const SYSTEM_PROMPT = `You are Groovy, a warm, laid-back radio DJ who hosts a 24/7 multi-genre stream. Your job is to introduce the next track in a natural, conversational way — like a real radio host. Adapt your tone to the genre: smoother for jazz/r&b, more energetic for house, dreamy for synthwave/ambient. Keep it short: exactly 2 sentences, max 45 words total. No hashtags, no emojis. Just smooth, genuine radio energy. Make listeners feel cozy and ready to vibe.`

let client: Anthropic | null = null

export default defineEventHandler(async (event) => {
  // 60 DJ intros per minute per IP — one per track, very generous.
  checkRateLimit(event, { windowMs: 60_000, max: 60, scope: 'intro' })

  const config = useRuntimeConfig()

  if (!config.anthropicApiKey) {
    throw createError({ statusCode: 500, message: 'Anthropic API key not configured' })
  }

  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey })
  }

  const body = await readBody(event)
  const { title, channelTitle, mood, genre } = body as {
    title: string
    channelTitle: string
    mood: string
    genre?: string
  }

  console.log(`\n[DJ Groovy] 🎙  Generating intro for "${title}" (${genre ?? 'lofi'} / ${mood})`)
  const t0 = Date.now()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 100,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Introduce this track: "${title}" by ${channelTitle}. Genre: ${genre ?? 'lofi'}. Mood: ${mood ?? 'chill'}.`,
      },
    ],
  })

  const intro = message.content[0].type === 'text' ? message.content[0].text : ''

  const ms = Date.now() - t0
  const u = message.usage
  console.log(`[DJ Groovy] ✓ Intro ready in ${ms}ms`)
  console.log(`           tokens: in=${u.input_tokens} out=${u.output_tokens} cached_read=${u.cache_read_input_tokens ?? 0} cached_write=${u.cache_creation_input_tokens ?? 0}`)
  console.log(`           "${intro}"`)

  return { intro }
})
