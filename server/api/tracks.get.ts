export interface Track {
  videoId: string
  title: string
  channelTitle: string
  thumbnail: string
}

const GENRE_QUERIES: Record<string, string> = {
  'lofi':       'lofi hip hop',
  'chillhop':   'chillhop instrumental beats',
  'rnb':        'r&b soul slow chill',
  'chinese-rnb': 'chinese mandarin r&b 中文 慢歌',
  'jazz':       'smooth jazz instrumental cafe',
  'house':      'house music',
  'deep-house': 'deep house',
  'tech-house': 'tech house',
  'dj-mix':     'dj live set club',
  'synthwave':  'synthwave retrowave',
  'ambient':    'ambient music',
  'classical':  'classical piano',
  'bossa-nova': 'bossa nova brazilian jazz',
  'kpop-chill': 'k-pop chill playlist',
  'relax-edm':  'relaxing edm chill electronic',
}

const MOOD_MODIFIERS: Record<string, string> = {
  focus: 'focus study',
  chill: 'chill relax',
  sleep: 'sleep calm',
  study: 'study concentration',
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const query = getQuery(event)
  const genre = (query.genre as string) || 'lofi'
  const mood = (query.mood as string) || 'chill'
  const freeQuery = ((query.q as string) || '').trim()

  if (!config.youtubeApiKey) {
    throw createError({ statusCode: 500, message: 'YouTube API key not configured' })
  }

  let searchQuery: string
  if (freeQuery) {
    searchQuery = `${freeQuery} mix no copyright`
  } else {
    const genrePart = GENRE_QUERIES[genre] ?? GENRE_QUERIES.lofi
    const moodPart = MOOD_MODIFIERS[mood] ?? MOOD_MODIFIERS.chill
    searchQuery = `${genrePart} ${moodPart} mix no copyright`
  }

  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search')
  searchUrl.searchParams.set('part', 'snippet')
  searchUrl.searchParams.set('q', searchQuery)
  searchUrl.searchParams.set('type', 'video')
  searchUrl.searchParams.set('videoCategoryId', '10')
  searchUrl.searchParams.set('maxResults', '24')
  searchUrl.searchParams.set('order', 'relevance')
  searchUrl.searchParams.set('key', config.youtubeApiKey)

  if (freeQuery) {
    console.log(`\n[YouTube] 🔍 free-search="${freeQuery}" → "${searchQuery}"`)
  } else {
    console.log(`\n[YouTube] 🔍 genre="${genre}" mood="${mood}" → "${searchQuery}"`)
  }

  const res = await $fetch<any>(searchUrl.toString())

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

  console.log(`[YouTube] ✓ Fetched ${tracks.length} tracks (quota cost: 100 units)`)
  console.table(
    tracks.slice(0, 10).map((t, i) => ({
      '#': i + 1,
      videoId: t.videoId,
      title: t.title.length > 60 ? t.title.slice(0, 57) + '...' : t.title,
      channel: t.channelTitle,
    })),
  )

  if (tracks.length > 10) console.log(`   ...and ${tracks.length - 10} more`)

  return tracks
})
