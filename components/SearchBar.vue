<script setup lang="ts">
const props = defineProps<{ modelValue: string; disabled: boolean }>()
const emit = defineEmits<{
  'update:modelValue': [string]
  search: [string]
}>()

const draft = ref(props.modelValue)

watch(
  () => props.modelValue,
  (v) => { draft.value = v },
)

function submit() {
  if (props.disabled) return
  const q = draft.value.trim()
  if (!q) return
  emit('update:modelValue', q)
  emit('search', q)
}

function clear() {
  draft.value = ''
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
  </div>
</template>
