# YouTube Playlists Mode — Design

**Date:** 2026-05-10
**Status:** Approved (in implementation)

## Goal

Replace the genre-picker + LLM-variant radio loop with a single, simpler flow: the listener signs in with Google, sees their own YouTube playlists exactly as YouTube shows them, picks one, and that playlist plays on loop.

## Why this replaces the existing flow

The genre picker, free-text search, and Claude-driven query expansion were all in service of "keep music adjacent to a seed playing forever." When the listener brings their own curated playlists, that machinery isn't needed — playlists are already curated and finite, and looping them is a clearer user model than wandering through LLM-suggested variants.

## User flow

1. Visit `/` while not signed in → centred "Sign in with YouTube" button. Header still shows logo + Live 24/7 chip; the controls and visualizer are hidden.
2. Click sign in → redirect to Google's consent screen → return to `/` with a session cookie.
3. App fetches the user's playlists and renders them as a grid (thumbnail, title, item count). The header gains an account chip with avatar + "Sign out" dropdown.
4. Click a playlist card → server fetches that playlist's items → first track plays. The grid is replaced by the existing player UI (`TrackInfo`, `PlayerControls`, `Visualizer`) plus a "← Back to playlists" button.
5. When the playlist's last track ends, playback loops to track #1.

## Architecture

### Removals

- `components/GenreSelector.vue`
- `constants/genres.ts`
- `server/api/expand-query.post.ts`
- `server/api/tracks.get.ts`
- `utils/searchGuards.ts`
- All variant/seed state in `usePlayer.ts`: `originalSeed`, `activeVariant`, `variantsTried`, `seenVideoIds`, `nextPageToken`, `fetchTracks`, `setGenre`, `resolveSeed`, `trackQuery`
- Dev helpers `__player`, `__endQueue`, `__forceExhaust`

### Additions

**Dependency:** `nuxt-auth-utils` (sealed-cookie sessions, built-in Google OAuth handler).

**Types:** `types/track.ts` — shared `Track` interface (was previously declared in `tracks.get.ts`).

**Server:**
- `server/routes/auth/google.get.ts` — `defineOAuthGoogleEventHandler` with scopes `email profile https://www.googleapis.com/auth/youtube.readonly`, `accessType: 'offline'`, `prompt: 'consent'`. On success stores `{ user: { email, name, picture }, secure: { accessToken, refreshToken, expiresAt } }` in the session and redirects to `/`.
- `server/routes/auth/logout.post.ts` — clears the session.
- `server/utils/youtubeAuth.ts` — `getAccessToken(event)`. Reads session, refreshes if `expiresAt < now`, persists the rotated token, returns the bearer string. Throws 401 if no session.
- `server/api/playlists.get.ts` — calls `youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50` with the bearer token. Returns `{ playlists: [{ id, title, description, thumbnail, itemCount }] }`. Filters out playlists with `itemCount === 0`.
- `server/api/playlist-items.get.ts` — accepts `?playlistId=…`. Calls `youtube/v3/playlistItems?part=snippet,contentDetails` with `maxResults=50`, paginates up to 4 pages (200 items max). Filters out `Private video` / `Deleted video` entries. Returns `{ tracks: Track[] }`.

**Client:**
- `composables/usePlaylists.ts` — fetches `/api/playlists` once, caches in module-scope ref. Exposes `playlists`, `loading`, `error`, `refresh()`.
- `components/SignInButton.vue` — a single anchor to `/auth/google` styled to match the app aesthetic.
- `components/PlaylistGrid.vue` — renders the playlist cards and emits `select(playlistId)` on click.
- `components/AccountChip.vue` — avatar + dropdown with "Sign out" (POSTs `/auth/logout`, then refreshes session).
- `pages/index.vue` — three-state render: not-signed-in → SignInButton; signed-in + no current playlist → PlaylistGrid; playing → existing player UI + back button.

**Player changes (`composables/usePlayer.ts`):**
- New `loadPlaylist(playlistId: string)` — fetches `/api/playlist-items?playlistId=…`, replaces `queue`, sets `currentIndex = 0`, calls `playCurrentTrack()`.
- `nextTrack()` simplifies: increment index; if past the end, wrap to 0 (loop). No more variant/exhaustion logic.
- `Phase` stays `'idle' | 'loading' | 'playing'`.

## OAuth setup (one-time, by hand)

1. In Google Cloud Console, ensure the **YouTube Data API v3** is enabled in the project that owns the existing API key.
2. Configure the OAuth consent screen — External, Testing mode, add yourself as a test user. Scopes: `userinfo.email`, `userinfo.profile`, `youtube.readonly`.
3. Create an OAuth 2.0 Client ID (Web application) with redirect URIs:
   - `http://localhost:3762/auth/google` (dev — matches the project's dev port)
   - prod URL when applicable
4. Add to `.env`:
   ```
   NUXT_OAUTH_GOOGLE_CLIENT_ID=…
   NUXT_OAUTH_GOOGLE_CLIENT_SECRET=…
   NUXT_SESSION_PASSWORD=…(32+ random chars)
   ```

## Defaults

- **Order:** playlists play in their stored order (no shuffle).
- **No previous-track button** in MVP — current UI doesn't have one.
- **Playlist list cached** per session; "Refresh" icon re-fetches from YouTube.
- **No persistence** of which playlist was playing across reloads — sign-in shows the grid each time.
- **Pagination cap** of 200 items per playlist. Long playlists past 200 won't be fully loaded; acceptable for v1.

## Out of scope

- Editing playlists, adding tracks, creating playlists.
- Cross-tab session sync.
- Public-playlist-by-URL ingestion.
- Shuffle, repeat-one.
- Showing the YouTube account that owns the playlist beyond a single avatar chip.
