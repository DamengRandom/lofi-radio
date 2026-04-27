<script setup lang="ts">
import { validateSearchQuery } from '~/utils/searchGuards'

const props = defineProps<{ modelValue: string; disabled: boolean; serverError?: string }>()
const emit = defineEmits<{
  'update:modelValue': [string]
  search: [string]
  throttle: [number]
}>()

const draft = ref(props.modelValue)
const error = ref<string>('')

// Client-side rate limit: max 2 searches per rolling 60s window.
const SEARCH_RATE_MAX = 2
const SEARCH_RATE_WINDOW_MS = 60_000
const submitTimestamps: number[] = []

function checkClientRateLimit(): { message: string; retrySec: number } | null {
  const now = Date.now()

  while (submitTimestamps.length && now - submitTimestamps[0]! >= SEARCH_RATE_WINDOW_MS) {
    submitTimestamps.shift()
  }

  if (submitTimestamps.length >= SEARCH_RATE_MAX) {
    const retrySec = Math.ceil(
      (SEARCH_RATE_WINDOW_MS - (now - submitTimestamps[0]!)) / 1000,
    )

    return { message: `Slow down — try again in ${retrySec}s.`, retrySec }
  }
  submitTimestamps.push(now)

  return null
}

// Surface server-side errors (e.g. 429 from rate limiter) into the same
// inline error slot so the user sees one consistent message location.
watch(
  () => props.serverError,
  (msg) => {
    // Skip rate-limit messages — the global banner already shows them.
    if (msg && !/slow down/i.test(msg)) error.value = msg
  },
)

watch(
  () => props.modelValue,
  (v) => { draft.value = v },
)

// Live char counter — turns amber near the limit, red over it.
const charCount = computed(() => draft.value.length)
const counterClass = computed(() => {
  if (charCount.value > SEARCH_LIMITS.MAX_LENGTH) return 'text-red-400'
  if (charCount.value > SEARCH_LIMITS.MAX_LENGTH - 10) return 'text-amber-400'

  return 'text-white/30'
})

// Clear the error as soon as the user keeps typing — feels less punishing.
watch(draft, () => {
  if (error.value) error.value = ''
})

function submit() {
  if (props.disabled) return

  const result = validateSearchQuery(draft.value)

  if (!result.ok) {
    error.value = result.reason
    return
  }

  const throttle = checkClientRateLimit()

  if (throttle) {
    // Don't set local error — the global rate-limit banner will display
    // the same message; showing both is noisy.
    emit('throttle', throttle.retrySec)
    return
  }

  error.value = ''
  draft.value = result.value

  emit('update:modelValue', result.value)
  emit('search', result.value)
}

function clear() {
  draft.value = ''
  error.value = ''

  emit('update:modelValue', '')
}
</script>

<template>
  <div class="relative w-80">
    <div
      :class="[
        'flex items-center gap-2 px-3 py-2 rounded-xl border bg-white/[0.04] backdrop-blur transition-all',
        disabled
          ? 'border-white/10 opacity-40'
          : error
            ? 'border-red-500/50 focus-within:border-red-500/70'
            : 'border-white/15 focus-within:border-white/30 focus-within:bg-white/[0.06]',
      ]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
        class="w-4 h-4 text-white/40 shrink-0"
      >
        <path fill-rule="evenodd" d="M10.5 3.75a6.75 6.75 0 1 0 4.13 12.087l4.267 4.267a.75.75 0 1 0 1.06-1.06l-4.267-4.267A6.75 6.75 0 0 0 10.5 3.75Zm-5.25 6.75a5.25 5.25 0 1 1 10.5 0 5.25 5.25 0 0 1-10.5 0Z" clip-rule="evenodd" />
      </svg>

      <input
        v-model="draft"
        type="text"
        :disabled="disabled"
        :maxlength="SEARCH_LIMITS.MAX_LENGTH + 20"
        :aria-invalid="!!error"
        aria-describedby="search-error"
        placeholder="What do you want to hear today?"
        class="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none disabled:cursor-not-allowed"
        @keydown.enter.prevent="submit"
      />

      <button
        v-if="draft"
        type="button"
        :disabled="disabled"
        class="text-white/30 hover:text-white/70 transition-colors p-1 rounded"
        aria-label="Clear search"
        @click="clear"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-3.5 h-3.5">
          <path d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      <button
        type="button"
        :disabled="disabled || !draft.trim()"
        :class="[
          'text-xs font-medium px-3 py-1.5 rounded-lg transition-all',
          disabled || !draft.trim()
            ? 'bg-white/5 text-white/30 cursor-not-allowed'
            : 'bg-white text-black hover:bg-white/90 cursor-pointer',
        ]"
        @click="submit"
      >
        Play
      </button>
    </div>

    <div class="mt-1.5 px-1 flex items-start justify-between gap-2 min-h-[16px]">
      <p
        v-if="error"
        id="search-error"
        role="alert"
        class="text-xs text-red-400 leading-tight flex-1"
      >
        {{ error }}
      </p>
      <span v-else class="flex-1" />
      <span :class="['text-[10px] tabular-nums shrink-0', counterClass]">
        {{ charCount }}/{{ SEARCH_LIMITS.MAX_LENGTH }}
      </span>
    </div>
  </div>
</template>
