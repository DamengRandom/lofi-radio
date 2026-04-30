<script setup lang="ts">
const props = defineProps<{ isPlaying: boolean }>()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const isPlayingRef = computed(() => props.isPlaying)

const { start, stop } = useVisualizer(canvasRef, isPlayingRef)

onMounted(start)
onUnmounted(stop)
</script>

<template>
  <canvas ref="canvasRef" class="w-full h-full block" />
</template>
