import type { PlaylistSummary } from '~/server/api/playlists.get'

const playlists = ref<PlaylistSummary[]>([])
const loading = ref(false)
const error = ref('')
const loaded = ref(false)

export function usePlaylists() {
  async function fetchPlaylists(force = false) {
    if (loading.value) return
    if (loaded.value && !force) return

    loading.value = true
    error.value = ''

    try {
      const { playlists: items } = await $fetch<{ playlists: PlaylistSummary[] }>(
        '/api/playlists',
      )
      playlists.value = items
      loaded.value = true
    } catch (e: any) {
      error.value =
        e?.data?.message || e?.statusMessage || e?.message || 'Failed to load playlists.'
    } finally {
      loading.value = false
    }
  }

  function reset() {
    playlists.value = []
    loaded.value = false
    error.value = ''
  }

  return {
    playlists,
    loading,
    error,
    loaded,
    fetchPlaylists,
    refresh: () => fetchPlaylists(true),
    reset,
  }
}
