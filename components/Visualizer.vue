<script setup lang="ts">
import type { Mood } from '~/composables/useVisualizer'

const props = defineProps<{ mood: Mood; isPlaying: boolean }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const moodRef = computed(() => props.mood)
const isPlayingRef = computed(() => props.isPlaying)

const { start, stop } = useVisualizer(canvasRef, moodRef, isPlayingRef)

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <canvas ref="canvasRef" class="w-full h-full block" />
</template>
