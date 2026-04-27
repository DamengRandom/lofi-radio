export interface Genre {
  id: string
  label: string
  emoji: string
  query: string
}

export const GENRES: Genre[] = [
  { id: 'lofi',       label: 'Lofi',          emoji: '☕', query: 'lofi hip hop' },
  { id: 'chillhop',   label: 'Chillhop',      emoji: '🎧', query: 'chillhop instrumental beats' },
  { id: 'rnb',        label: 'R&B / Soul',    emoji: '💜', query: 'r&b soul slow chill' },
  { id: 'chinese-rnb', label: 'Chinese R&B',   emoji: '🏮', query: 'chinese mandarin r&b 中文 慢歌' },
  { id: 'jazz',       label: 'Jazz',          emoji: '🎷', query: 'smooth jazz instrumental cafe' },
  { id: 'house',      label: 'House',         emoji: '🏠', query: 'house music mix' },
  { id: 'deep-house', label: 'Deep House',    emoji: '🌊', query: 'deep house mix' },
  { id: 'tech-house', label: 'Tech House',    emoji: '⚡', query: 'tech house mix' },
  { id: 'dj-mix',     label: 'DJ Mix',        emoji: '🎛️', query: 'dj live set club mix' },
  { id: 'synthwave',  label: 'Synthwave',     emoji: '🌆', query: 'synthwave retrowave mix' },
  { id: 'ambient',    label: 'Ambient',       emoji: '🌫', query: 'ambient music background' },
  { id: 'classical',  label: 'Classical',     emoji: '🎻', query: 'classical music piano' },
  { id: 'bossa-nova', label: 'Bossa Nova',    emoji: '🌴', query: 'bossa nova brazilian jazz' },
  { id: 'kpop-chill', label: 'K-Pop Chill',   emoji: '✨', query: 'k-pop chill playlist' },
  { id: 'relax-edm',  label: 'Relax EDM',     emoji: '💫', query: 'relaxing edm chill electronic' },
]

export function useGenres() {
  return { GENRES }
}
