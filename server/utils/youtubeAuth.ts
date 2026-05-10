import type { H3Event } from 'h3'

// Refresh ~30s early so a request that takes a moment to reach Google
// doesn't slip past expiry mid-flight.
const REFRESH_LEEWAY_MS = 30_000

interface RefreshedTokenResponse {
  access_token: string
  expires_in: number
  // Google may or may not rotate the refresh_token on a refresh call.
  refresh_token?: string
}

export async function getAccessToken(event: H3Event): Promise<string> {
  const session = await getUserSession(event)
  const secure = session.secure

  if (!secure?.accessToken) {
    throw createError({ statusCode: 401, message: 'Not signed in.' })
  }

  if (Date.now() < secure.expiresAt - REFRESH_LEEWAY_MS) {
    return secure.accessToken
  }

  // Token has expired (or is about to). Use the refresh_token to mint a new
  // access_token — Google returns a fresh expires_in and *may* rotate the
  // refresh_token, so persist either back into the sealed session.
  const config = useRuntimeConfig()
  const oauth = (config.oauth as unknown as {
    google: { clientId: string; clientSecret: string }
  }).google

  const res = await $fetch<RefreshedTokenResponse>(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: secure.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
  ).catch((e) => {
    console.error('[youtubeAuth] refresh failed:', e?.data ?? e?.message ?? e)
    throw createError({ statusCode: 401, message: 'Session expired. Please sign in again.' })
  })

  const newRefresh = res.refresh_token ?? secure.refreshToken
  const expiresAt = Date.now() + Number(res.expires_in ?? 3600) * 1000

  await setUserSession(event, {
    ...session,
    secure: {
      accessToken: res.access_token,
      refreshToken: newRefresh,
      expiresAt,
    },
  })

  return res.access_token
}
