<script setup lang="ts">
const props = defineProps<{
  isPlaying: boolean
  thumbnail?: string | null
}>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isPlayingRef = computed(() => props.isPlaying)
const thumbnailRef = computed(() => props.thumbnail ?? null)

const { start, stop } = useVisualizer(canvasRef, isPlayingRef, thumbnailRef)

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <canvas
    ref="canvasRef"
    class="fixed inset-0 w-screen h-screen block bg-black pointer-events-none z-0"
  />
</template>
