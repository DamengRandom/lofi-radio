<script setup lang="ts">
import type { Mood } from '~/composables/useVisualizer'

const props = defineProps<{ modelValue: Mood; disabled: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [Mood] }>()

const moods: { id: Mood; label: string; emoji: string; desc: string }[] = [
  { id: 'focus', label: 'Focus', emoji: '⚡', desc: 'Deep work mode' },
  { id: 'chill', label: 'Chill', emoji: '🌊', desc: 'Easy vibes' },
  { id: 'sleep', label: 'Sleep', emoji: '🌙', desc: 'Wind down' },
  { id: 'study', label: 'Study', emoji: '📚', desc: 'Learn & create' },
]

const colors: Record<Mood, string> = {
  focus: 'border-blue-500 bg-blue-500/10 text-blue-400',
  chill: 'border-purple-500 bg-purple-500/10 text-purple-400',
  sleep: 'border-indigo-500 bg-indigo-500/10 text-indigo-400',
  study: 'border-green-500 bg-green-500/10 text-green-400',
}
const inactiveColors: Record<Mood, string> = {
  focus: 'hover:border-blue-500/40 hover:text-blue-400/70',
  chill: 'hover:border-purple-500/40 hover:text-purple-400/70',
  sleep: 'hover:border-indigo-500/40 hover:text-indigo-400/70',
  study: 'hover:border-green-500/40 hover:text-green-400/70',
}
</script>

<template>
  <div class="grid grid-cols-4 gap-2 sm:gap-3 w-full max-w-md">
    <button
      v-for="m in moods"
      :key="m.id"
      :disabled="disabled"
      :class="[
        'flex flex-col items-center gap-1 px-2 sm:px-5 py-2 sm:py-3 rounded-xl border transition-all duration-200 text-xs sm:text-sm font-medium select-none min-w-0',
        modelValue === m.id
          ? colors[m.id]
          : 'border-white/10 text-white/40 ' + inactiveColors[m.id],
        disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
      ]"
      @click="emit('update:modelValue', m.id)"
    >
      <span class="text-lg">{{ m.emoji }}</span>
      <span>{{ m.label }}</span>
      <span class="text-[10px] font-normal opacity-60">{{ m.desc }}</span>
    </button>
  </div>
</template>
