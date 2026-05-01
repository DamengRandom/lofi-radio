// Shared search-query guardrails. Auto-imported on both client and server
// by Nuxt — keep validation identical in both places (defense in depth).

export const SEARCH_LIMITS = {
  MIN_LENGTH: 2,
  MAX_LENGTH: 80,
  MAX_WORDS: 12,
} as const

// Phrases / patterns that are clearly not music searches and would waste
// downstream tokens (Anthropic intro generation) and YouTube API quota.
const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /https?:\/\//i, reason: 'Links are not allowed in the search.' },
  { pattern: /\b\S+@\S+\.\S+\b/, reason: 'Email addresses are not allowed.' },
  { pattern: /<[^>]+>/, reason: 'HTML tags are not allowed.' },
  { pattern: /[`{}[\]\\<>]/, reason: 'Special code characters are not allowed.' },
  {
    pattern: /\b(ignore|disregard|forget)\s+(all|previous|prior)\b/i,
    reason: 'That phrase looks like a prompt injection — please describe a music vibe instead.',
  },
  {
    pattern: /\b(system\s*prompt|jailbreak|act\s+as|you\s+are\s+now)\b/i,
    reason: 'Please describe music or a vibe — not instructions.',
  },
]

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; reason: string }

export function validateSearchQuery(raw: string): ValidationResult {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ')

  if (!value) {
    return { ok: false, reason: 'Type something to search.' }
  }
  
  if (value.length < SEARCH_LIMITS.MIN_LENGTH) {
    return { ok: false, reason: `At least ${SEARCH_LIMITS.MIN_LENGTH} characters, please.` }
  }

  if (value.length > SEARCH_LIMITS.MAX_LENGTH) {
    return {
      ok: false,
      reason: `Too long — keep it under ${SEARCH_LIMITS.MAX_LENGTH} characters.`,
    }
  }

  const wordCount = value.split(/\s+/).length
  if (wordCount > SEARCH_LIMITS.MAX_WORDS) {
    return {
      ok: false,
      reason: `Too many words — keep it under ${SEARCH_LIMITS.MAX_WORDS} (try a short vibe like "rainy R & B / Soul night").`,
    }
  }

  // Reject obviously repeated character spam ("aaaaaaaaaa", "!!!!!!").
  // Reject 4+ repeated characters ("aaaa", "!!!!"), and queries that are
  // entirely a single character class with no vowels (e.g. "xxx", "qqqq").
  if (/(.)\1{3,}/.test(value)) {
    return { ok: false, reason: 'Looks like spam — try real words.' }
  }
  if (!/[aeiouAEIOU]/.test(value) && value.length < 6) {
    return { ok: false, reason: 'Try a real word or vibe (e.g. "R & B / Soul rain").' }
  }

  for (const { pattern, reason } of BLOCKED_PATTERNS) {
    if (pattern.test(value)) return { ok: false, reason }
  }

  return { ok: true, value }
}
