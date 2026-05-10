<script setup lang="ts">
defineProps<{ error?: boolean }>()
</script>

<template>
  <div class="flex flex-col items-center gap-6 max-w-sm text-center">
    <div class="flex flex-col items-center gap-3">
      <h1 class="text-2xl font-semibold tracking-tight">Your YouTube playlists, on loop.</h1>
      <p class="text-sm text-white/50 leading-relaxed">
        Sign in with Google to play any of your YouTube playlists here. Read-only —
        we never modify or post on your behalf.
      </p>
    </div>

    <a
      href="/auth/google"
      class="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white text-black hover:bg-white/90 transition-colors font-medium text-sm"
    >
      <svg viewBox="0 0 24 24" class="w-4 h-4" aria-hidden="true">
        <path fill="#4285F4" d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.996 3.018v2.51h3.232c1.891-1.742 2.982-4.305 2.982-7.351z" />
        <path fill="#34A853" d="M12 22c2.7 0 4.964-.895 6.618-2.422l-3.232-2.51c-.895.6-2.04.955-3.386.955-2.605 0-4.81-1.76-5.596-4.123H3.064v2.59A9.996 9.996 0 0 0 12 22z" />
        <path fill="#FBBC05" d="M6.404 13.9a6.005 6.005 0 0 1 0-3.8V7.51H3.064a10.001 10.001 0 0 0 0 8.98l3.34-2.59z" />
        <path fill="#EA4335" d="M12 5.977c1.469 0 2.787.505 3.823 1.495l2.868-2.868C16.96 3.005 14.696 2 12 2A9.996 9.996 0 0 0 3.064 7.51l3.34 2.59C7.19 7.737 9.395 5.977 12 5.977z" />
      </svg>
      Sign in with YouTube
    </a>

    <p
      v-if="error"
      class="text-xs text-red-400/80"
      role="status"
    >
      Sign-in didn't complete. Please try again.
    </p>
  </div>
</template>
