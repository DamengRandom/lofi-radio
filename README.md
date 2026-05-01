# Groovy Radio — AI music player 24/7

A Nuxt 3 web app that streams random searchable music from YouTube with an AI radio DJ ("Groovy") who introduces every track using Claude Haiku and the browser's built-in text-to-speech.

## Features

- **AI DJ "Groovy"** — Claude Haiku generates a unique 2-sentence intro for every track. Browser Web Speech API speaks it aloud.
- **4 mood channels** — focus / chill / sleep / study, each maps to a curated YouTube search.
- **Animated visualizer** — canvas-rendered frequency bars with mood-based color gradients, glow, and reflections.
- **YouTube IFrame playback** — music plays from YouTube's servers (legal, no re-hosting).
- **Auto-queue** — when a track ends, fetch a new intro and play the next track. Reloads fresh tracks when the queue empties.
- **Each visitor gets their own player** — independent playback, controls, mood selection.

## Stack

| Layer | Tech |
|---|---|
| Framework | Nuxt 3 (Vue 3 + Nitro) |
| Styling | Tailwind CSS v3 |
| State | Composables only (no Pinia) |
| Server fetching | `$fetch` (Nitro) |
| Music | YouTube Data API v3 + IFrame Player API |
| AI DJ | Claude Haiku 4.5 (`@anthropic-ai/sdk`) |
| Voice | Browser Web Speech API |
| Visualizer | Canvas + simulated waveform |

## Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Get API keys

- **YouTube Data API v3 key** — https://console.cloud.google.com/ → enable "YouTube Data API v3" → create API key
- **Anthropic API key** — https://console.anthropic.com/ → create key

### 3. Configure environment

```bash
cp .env.example .env
# edit .env and paste both keys
```

### 4. Run

```bash
pnpm dev
```

Open http://localhost:3000

## How It Works

```
User picks mood → /api/tracks fetches music videos from YouTube (filtered by mood)
                ↓
For each track in queue:
    /api/intro → Claude Haiku generates DJ intro
                ↓
    Browser speaks intro via speechSynthesis
                ↓
    YouTube IFrame plays the track
                ↓
    Track ends → next track → repeat
```

## File Structure

```
sound-agent/
├── server/api/
│   ├── tracks.get.ts      # YouTube search by mood
│   └── intro.post.ts      # Claude Haiku DJ intro
├── composables/
│   ├── usePlayer.ts       # Core player state machine
│   ├── useYouTubePlayer.ts # IFrame API wrapper
│   ├── useSpeech.ts       # Web Speech API wrapper
│   └── useVisualizer.ts   # Canvas visualizer renderer
├── components/
│   ├── MoodSelector.vue
│   ├── DJIntro.vue        # Animated intro panel with typewriter effect
│   ├── Visualizer.vue
│   ├── TrackInfo.vue      # Track title + spinning disc thumbnail
│   └── PlayerControls.vue # Play/pause/skip/volume
├── pages/index.vue        # Main player page
└── nuxt.config.ts
```

## Cost

At continuous 24/7 playback (~360 tracks/day):
- Claude Haiku: ~$0.04/day
- YouTube Data API: free (10k units/day quota)
- Web Speech API: free
- Vercel hosting: free tier

## Deployment (Vercel)

```bash
# Push to GitHub
# Connect repo to Vercel
# Add env vars in Vercel dashboard:
#   YOUTUBE_API_KEY
#   ANTHROPIC_API_KEY
# Deploy
```

Nitro auto-deploys as serverless functions on Vercel.

## Notes

- The visualizer is a **simulated** waveform — YouTube IFrame's CORS restrictions prevent direct audio analysis. The animation is multi-frequency sine wave composition with mood-based gradients, glow, and bottom reflection. Looks great, no audio access needed.
- The Web Speech API voice quality varies by OS. macOS has the best built-in voices ("Daniel", "Alex"). On other systems, the DJ intro still plays but the voice may sound more synthetic. Upgrade path: swap `useSpeech` to call ElevenLabs/OpenAI TTS in `/api/tts`.
- YouTube tracks are filtered for relevance; result quality depends on the search query. Tune the queries in `server/api/tracks.get.ts` if you want different vibes.
