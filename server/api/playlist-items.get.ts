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

interface YouTubeVideosStatusResponse {
  items?: Array<{
    id: string
    status: {
      privacyStatus: 'public' | 'unlisted' | 'private'
      embeddable: boolean
      uploadStatus: 'processed' | 'uploaded' | 'failed' | 'rejected' | 'deleted'
    }
  }>
}

const UNAVAILABLE_TITLES = new Set(['Private video', 'Deleted video'])
const VIDEOS_BATCH = 50

// Second-pass: verify each video is actually playable in our embedded player.
// Returns the set of videoIds that are public/unlisted, embeddable, and have
// finished processing. Anything missing from the response (404'd, fully
// deleted) is implicitly excluded.
async function filterPlayableIds(
  videoIds: string[],
  accessToken: string,
): Promise<Set<string>> {
  const playable = new Set<string>()

  for (let i = 0; i < videoIds.length; i += VIDEOS_BATCH) {
    const batch = videoIds.slice(i, i + VIDEOS_BATCH)
    const url = new URL('https://www.googleapis.com/youtube/v3/videos')
    url.searchParams.set('part', 'status')
    url.searchParams.set('id', batch.join(','))
    url.searchParams.set('maxResults', String(VIDEOS_BATCH))

    const res = await $fetch<YouTubeVideosStatusResponse>(url.toString(), {
      headers: { authorization: `Bearer ${accessToken}` },
    }).catch((e) => {
      // Don't fail the whole request — log and treat this batch as
      // unverified. Better to risk a few unplayable tracks than block the
      // playlist entirely on a transient lookup error.
      console.error(
        `[/api/playlist-items] videos.list failed for batch ${i}/${videoIds.length}:`,
        e?.data?.error?.message ?? e?.message ?? e,
      )
      return null
    })

    if (!res?.items) {
      // On error, assume the batch is playable (existing title-pass already
      // removed the obvious dead ones). On success-with-empty, leave them out.
      if (res === null) batch.forEach((id) => playable.add(id))
      continue
    }

    for (const v of res.items) {
      if (
        v.status.privacyStatus !== 'private' &&
        v.status.embeddable &&
        v.status.uploadStatus === 'processed'
      ) {
        playable.add(v.id)
      }
    }
  }

  return playable
}

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

  if (tracks.length === 0) return { tracks }

  const playableIds = await filterPlayableIds(
    tracks.map((t) => t.videoId),
    accessToken,
  )
  const playable = tracks.filter((t) => playableIds.has(t.videoId))
  const removed = tracks.length - playable.length

  if (removed > 0) {
    console.log(
      `[/api/playlist-items] playlist=${playlistId}: ${removed} unavailable track(s) filtered (${tracks.length} → ${playable.length})`,
    )
  }

  return { tracks: playable }
})
