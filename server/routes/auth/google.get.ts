// OAuth handler — also serves as the redirect target for the consent flow.
// Configure the redirect URI in Google Cloud Console to point to this exact
// path (e.g. http://localhost:3762/auth/google).
export default defineOAuthGoogleEventHandler({
  config: {
    scope: [
      'email',
      'profile',
      'https://www.googleapis.com/auth/youtube.readonly',
    ],
    authorizationParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
  },

  async onSuccess(event, { user, tokens }) {
    const expiresIn = Number(tokens.expires_in ?? 3600)

    console.log(
      `[auth/google] Sign-in OK for ${user.email}. Granted scopes: ${tokens.scope ?? '(none reported)'}`,
    )

    await setUserSession(event, {
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture,
      },
      secure: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: Date.now() + expiresIn * 1000,
      },
    })

    return sendRedirect(event, '/')
  },

  onError(event, error) {
    console.error('[auth/google] OAuth error:', error)
    return sendRedirect(event, '/?auth_error=1')
  },
})
