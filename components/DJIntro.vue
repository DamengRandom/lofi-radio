<script setup lang="ts">
const props = defineProps<{
  text: string
  visible: boolean
  currentWordIndex: number
}>()

const emit = defineEmits<{ skipIntro: [] }>()

const words = computed(() => props.text.split(/\s+/).filter(Boolean))
</script>

<template>
  <Transition
    enter-active-class="transition-all duration-500 ease-out"
    enter-from-class="opacity-0 translate-y-4"
    enter-to-class="opacity-100 translate-y-0"
    leave-active-class="transition-all duration-300 ease-in"
    leave-from-class="opacity-100 translate-y-0"
    leave-to-class="opacity-0 translate-y-2"
  >
    <div v-if="visible && text" class="w-full max-w-xl mx-auto">
      <div class="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-6 py-5">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-semibold uppercase tracking-widest text-white/30">DJ Groovy</span>
          <span class="flex gap-[3px] items-end h-3">
            <span
              v-for="i in 3"
              :key="i"
              class="w-[3px] rounded-full bg-white/40 animate-pulse-slow"
              :style="`height: ${8 + i * 3}px; animation-delay: ${i * 0.2}s`"
            />
          </span>
          <button
            type="button"
            class="ml-auto group flex items-center gap-1.5 px-2.5 py-1 -my-1 -mr-1 rounded-md text-xs font-medium text-white/40 hover:text-white hover:bg-white/10 transition-all"
            @click="emit('skipIntro')"
          >
            <span>Skip intro</span>
            <svg
              xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"
              class="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5"
            >
              <path d="M5.055 7.06C3.805 6.347 2.25 7.25 2.25 8.69v8.122c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.347 12 7.25 12 8.69v2.34L5.055 7.06Z" />
            </svg>
          </button>
        </div>
        <p class="text-base leading-relaxed font-light flex flex-wrap gap-x-1.5">
          <span
            v-for="(word, i) in words"
            :key="i"
            :class="[
              'transition-all duration-200',
              i < currentWordIndex
                ? 'text-white/70'
                : i === currentWordIndex
                ? 'text-white font-medium scale-110 inline-block'
                : 'text-white/25',
            ]"
            :style="i === currentWordIndex ? 'text-shadow: 0 0 18px rgba(255,255,255,0.6);' : ''"
          >{{ word }}</span>
        </p>
      </div>
    </div>
  </Transition>
</template>
