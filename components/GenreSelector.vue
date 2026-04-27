<script setup lang="ts">
import { GENRES, type Genre } from '~/composables/useGenres'

const props = defineProps<{ modelValue: string; disabled: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const open = ref(false)
const selected = computed<Genre>(
  () => GENRES.find((g) => g.id === props.modelValue) ?? GENRES[0],
)

const dropdownRef = ref<HTMLElement | null>(null)

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function pick(g: Genre) {
  emit('update:modelValue', g.id)
  open.value = false
}

function onClickOutside(e: MouseEvent) {
  if (!dropdownRef.value) return
  if (!dropdownRef.value.contains(e.target as Node)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>

<template>
  <div ref="dropdownRef" class="relative w-64">
    <button
      type="button"
      :disabled="disabled"
      :class="[
        'w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border border-white/15 bg-white/[0.04] backdrop-blur text-white transition-all',
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/[0.08] hover:border-white/25 cursor-pointer',
      ]"
      @click="toggle"
    >
      <span class="flex items-center gap-2">
        <span class="text-lg">{{ selected.emoji }}</span>
        <span class="text-sm font-medium">{{ selected.label }}</span>
      </span>
      <svg
        xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
        :class="['w-4 h-4 text-white/50 transition-transform', open && 'rotate-180']"
      >
        <path fill-rule="evenodd" d="M12.53 16.28a.75.75 0 0 1-1.06 0l-7.5-7.5a.75.75 0 0 1 1.06-1.06L12 14.69l6.97-6.97a.75.75 0 1 1 1.06 1.06l-7.5 7.5Z" clip-rule="evenodd" />
      </svg>
    </button>

    <Transition
      enter-active-class="transition-all duration-150 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-100 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="open"
        class="absolute z-30 left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-black/95 backdrop-blur-xl shadow-2xl py-1.5"
      >
        <button
          v-for="g in GENRES"
          :key="g.id"
          type="button"
          :class="[
            'w-full flex items-center gap-2.5 px-4 py-2 text-sm text-left transition-colors',
            g.id === modelValue
              ? 'bg-white/10 text-white'
              : 'text-white/70 hover:bg-white/5 hover:text-white',
          ]"
          @click="pick(g)"
        >
          <span class="text-base">{{ g.emoji }}</span>
          <span class="font-medium">{{ g.label }}</span>
          <svg
            v-if="g.id === modelValue"
            xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
            class="w-3.5 h-3.5 ml-auto text-white/60"
          >
            <path fill-rule="evenodd" d="M19.916 4.626a.75.75 0 0 1 .208 1.04l-9 13.5a.75.75 0 0 1-1.154.114l-6-6a.75.75 0 0 1 1.06-1.06l5.353 5.353 8.493-12.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </Transition>
  </div>
</template>
