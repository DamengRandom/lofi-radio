import { getAccessToken } from '../utils/youtubeAuth'

export interface PlaylistSummary {
  id: string
  title: string
  description: string
  thumbnail: string
  itemCount: number
}

interface YouTubePlaylistsResponse {
  items?: Array<{
    id: string
    snippet: {
      title: string
      description: string
      thumbnails?: Record<string, { url: string }>
    }
    contentDetails: { itemCount: number }
  }>
  nextPageToken?: string
}

export default defineEventHandler(async (event): Promise<{ playlists: PlaylistSummary[] }> => {
  const accessToken = await getAccessToken(event)

  const url = new URL('https://www.googleapis.com/youtube/v3/playlists')
  url.searchParams.set('part', 'snippet,contentDetails')
  url.searchParams.set('mine', 'true')
  url.searchParams.set('maxResults', '50')

  const res = await $fetch<YouTubePlaylistsResponse>(url.toString(), {
    headers: { authorization: `Bearer ${accessToken}` },
  }).catch((e) => {
    const status = e?.response?.status ?? 502
    const ytMessage = e?.data?.error?.message
    const ytReason = e?.data?.error?.errors?.[0]?.reason
    console.error(
      `[/api/playlists] YouTube ${status}: reason=${ytReason ?? '?'} — ${ytMessage ?? e?.message ?? '(no detail)'}`,
    )
    throw createError({
      statusCode: status,
      statusMessage: ytReason ?? 'YouTube error',
      message: ytMessage || 'Failed to fetch playlists from YouTube.',
    })
  })

  const playlists: PlaylistSummary[] = (res.items ?? [])
    .filter((p) => p.contentDetails.itemCount > 0)
    .map((p) => ({
      id: p.id,
      title: p.snippet.title,
      description: p.snippet.description,
      thumbnail:
        p.snippet.thumbnails?.maxres?.url ??
        p.snippet.thumbnails?.high?.url ??
        p.snippet.thumbnails?.medium?.url ??
        p.snippet.thumbnails?.default?.url ??
        '',
      itemCount: p.contentDetails.itemCount,
    }))

  return { playlists }
})
