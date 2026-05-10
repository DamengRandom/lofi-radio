<script setup lang="ts">
defineProps<{
  name?: string
  picture?: string
}>()

const emit = defineEmits<{ signOut: [] }>()

const open = ref(false)
const wrapperEl = ref<HTMLElement | null>(null)

function onDocClick(e: MouseEvent) {
  if (!wrapperEl.value) return
  if (!wrapperEl.value.contains(e.target as Node)) open.value = false
}

onMounted(() => {
  if (typeof document !== 'undefined') {
    document.addEventListener('click', onDocClick)
  }
})

onBeforeUnmount(() => {
  if (typeof document !== 'undefined') {
    document.removeEventListener('click', onDocClick)
  }
})
</script>

<template>
  <div ref="wrapperEl" class="relative">
    <button
      type="button"
      class="flex items-center gap-2 rounded-full pl-1 pr-3 py-1 border border-white/10 hover:border-white/30 transition-colors"
      @click="open = !open"
    >
      <img
        v-if="picture"
        :src="picture"
        :alt="name ?? 'Account'"
        class="w-6 h-6 rounded-full"
        referrerpolicy="no-referrer"
      />
      <span v-else class="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] uppercase">
        {{ (name ?? '?').slice(0, 1) }}
      </span>
      <span class="text-xs text-white/70 max-w-[8rem] truncate">{{ name ?? 'Account' }}</span>
    </button>

    <div
      v-if="open"
      class="absolute right-0 mt-2 w-44 rounded-md border border-white/10 bg-black/90 backdrop-blur p-1 shadow-lg z-20"
    >
      <button
        type="button"
        class="w-full text-left text-xs px-3 py-2 rounded hover:bg-white/10 text-white/80"
        @click="open = false; emit('signOut')"
      >
        Sign out
      </button>
    </div>
  </div>
</template>
