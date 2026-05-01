import { checkRateLimit } from "../utils/rateLimit"
import { validateSearchQuery } from '~/utils/searchGuards'

export interface Track {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
}

const GENRE_QUERIES: Record<string, string> = {
  'chillhop':   'chillhop instrumental beats',
  'rnb':        'r&b soul slow chill',
  'chinese-rnb': 'chinese mandarin r&b 中文 慢歌',
  'jazz':       'smooth jazz instrumental cafe',
  'house':      'house music',
  'dj-mix':     'dj live set club',
  'synthwave':  'synthwave retrowave',
  'ambient':    'ambient music',
  'classical':  'classical piano',
  'bossa-nova': 'bossa nova brazilian jazz',
  'relax-edm':  'relaxing edm chill electronic',
}

export default defineEventHandler(async (event) => {
  // 30 track-loads per minute per IP — covers normal genre flips with headroom.
  checkRateLimit(event, { windowMs: 60_000, max: 30, scope: 'tracks' })

  const config = useRuntimeConfig()
  const query = getQuery(event)
  const genre = (query.genre as string) || 'R&B / Soul'
  const freeQuery = ((query.q as string) || '').trim()
  const pageToken = ((query.pageToken as string) || '').trim()

  if (!config.youtubeApiKey) {
    throw createError({ statusCode: 500, message: 'YouTube API key not configured' })
  }

  let searchQuery: string

  if (freeQuery) {
    const result = validateSearchQuery(freeQuery)
    
    if (!result.ok) {
      throw createError({ statusCode: 400, statusMessage: result.reason, message: result.reason })
    }

    searchQuery = result.value
  } else {
    const genrePart = GENRE_QUERIES[genre] ?? GENRE_QUERIES.rnb

    searchQuery = `${genrePart} mix no copyright`
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', searchQuery)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '24')
  searchUrl.searchParams.set('order', 'relevance')
  searchUrl.searchParams.set('key', config.youtubeApiKey)
  if (pageToken) searchUrl.searchParams.set('pageToken', pageToken)

  if (freeQuery) {
    console.log(`\n[YouTube] 🔍 free-search="${freeQuery}" → "${searchQuery}"`)
  } else {
    console.log(`\n[YouTube] 🔍 genre="${genre}" → "${searchQuery}"`)
  }
  if (pageToken) console.log(`           page=${pageToken.slice(0, 16)}…`)

  const httpRes = await fetch(searchUrl.toString())
  if (!httpRes.ok) {
    throw createError({
      statusCode: httpRes.status,
      message: `YouTube search failed (${httpRes.status})`,
    })
  }
  const res = (await httpRes.json()) as {
    items?: any[]
    nextPageToken?: string
  }

  const tracks: Track[] = (res.items ?? [])
    .filter((item: any) => item.id?.videoId)
    .map((item: any) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail:
        item.snippet.thumbnails?.maxres?.url ??
        item.snippet.thumbnails?.high?.url ??
        item.snippet.thumbnails?.medium?.url ??
        '',
    }))

  const nextToken: string | null = res.nextPageToken ?? null

  console.log(`[YouTube] ✓ Fetched ${tracks.length} tracks (quota cost: 100 units, nextPage: ${nextToken ? 'yes' : 'end'})`)
  console.table(
    tracks.slice(0, 10).map((t, i) => ({
      '#': i + 1,
      videoId: t.videoId,
      title: t.title.length > 60 ? t.title.slice(0, 57) + '...' : t.title,
      channel: t.channelTitle,
    })),
  )

  if (tracks.length > 10) console.log(`   ...and ${tracks.length - 10} more`)

  return { tracks, nextPageToken: nextToken }
})
