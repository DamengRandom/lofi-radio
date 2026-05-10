<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ phase: string; volume: number; disabled?: boolean }>()
const isLocked = computed(() => props.disabled || props.phase === 'loading')
const emit = defineEmits<{
  skip: []
  togglePause: []
  'update:volume': [number]
}>()
</script>

<template>
  <div class="flex flex-col items-center gap-5">
    <div class="flex items-center gap-4">
      <!-- Play/Pause -->
      <button
        :disabled="isLocked"
        :class="[
          'w-14 h-14 rounded-full flex items-center justify-center border transition-all duration-200',
          phase === 'playing'
            ? 'bg-white text-black border-white hover:bg-white/90'
            : 'bg-white/10 text-white border-white/20 hover:bg-white/20',
          (isLocked) && 'opacity-30 cursor-not-allowed',
        ]"
        @click="emit('togglePause')"
      >
        <svg v-if="phase === 'playing'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clip-rule="evenodd" />
        </svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5 translate-x-0.5">
          <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
        </svg>
      </button>

      <!-- Skip -->
      <button
        :disabled="isLocked"
        :class="[
          'w-10 h-10 rounded-full flex items-center justify-center border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-all duration-200',
          (isLocked) && 'opacity-30 cursor-not-allowed',
        ]"
        @click="emit('skip')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
          <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.347 12 7.25 12 8.69v2.34L5.055 7.06Z" />
        </svg>
      </button>
    </div>

    <!-- Volume -->
    <div class="flex items-center gap-3 w-48">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4 text-white/30 shrink-0">
        <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 0 0 1.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06ZM18.584 5.106a.75.75 0 0 1 1.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 0 1-1.06-1.06 8.25 8.25 0 0 0 0-11.668.75.75 0 0 1 0-1.06Z" />
      </svg>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        :value="volume"
        class="flex-1 h-1 rounded-full accent-white cursor-pointer"
        @input="emit('update:volume', +($event.target as HTMLInputElement).value)"
      />
    </div>
  </div>
</template>
