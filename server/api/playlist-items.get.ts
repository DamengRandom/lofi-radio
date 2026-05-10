import type { Track } from '~/types/track'
import { getAccessToken } from '../utils/youtubeAuth'

const MAX_PAGES = 4
const PAGE_SIZE = 50

interface YouTubeItemsResponse {
  items?: Array<{
    snippet: {
      title: string
      videoOwnerChannelTitle?: string
      channelTitle?: string
      thumbnails?: Record<string, { url: string }>
      resourceId: { videoId: string }
    }
    contentDetails?: { videoId?: string }
  }>
  nextPageToken?: string
}

const UNAVAILABLE_TITLES = new Set(['Private video', 'Deleted video'])

export default defineEventHandler(async (event): Promise<{ tracks: Track[] }> => {
  const playlistId = String(getQuery(event).playlistId ?? '').trim()

  if (!playlistId) {
    throw createError({ statusCode: 400, message: 'playlistId is required.' })
  }

  const accessToken = await getAccessToken(event)

  const tracks: Track[] = []
  let pageToken: string | undefined

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
    url.searchParams.set('part', 'snippet,contentDetails')
    url.searchParams.set('playlistId', playlistId)
    url.searchParams.set('maxResults', String(PAGE_SIZE))
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await $fetch<YouTubeItemsResponse>(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
    }).catch((e) => {
      const status = e?.response?.status ?? 502
      const ytMessage = e?.data?.error?.message
      const ytReason = e?.data?.error?.errors?.[0]?.reason
      console.error(
        `[/api/playlist-items] YouTube ${status}: reason=${ytReason ?? '?'} — ${ytMessage ?? e?.message ?? '(no detail)'}`,
      )
      throw createError({
        statusCode: status,
        statusMessage: ytReason ?? 'YouTube error',
        message: ytMessage || 'Failed to fetch playlist items from YouTube.',
      })
    })

    for (const item of res.items ?? []) {
      const videoId = item.snippet.resourceId?.videoId ?? item.contentDetails?.videoId
      const title = item.snippet.title

      if (!videoId || UNAVAILABLE_TITLES.has(title)) continue

      tracks.push({
        videoId,
        title,
        channelTitle:
          item.snippet.videoOwnerChannelTitle ?? item.snippet.channelTitle ?? '',
        thumbnail:
          item.snippet.thumbnails?.maxres?.url ??
          item.snippet.thumbnails?.high?.url ??
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          '',
      })
    }

    if (!res.nextPageToken) break
    pageToken = res.nextPageToken
  }

  return { tracks }
})
