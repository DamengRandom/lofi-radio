// Module augmentation for nuxt-auth-utils — tells TypeScript the shape of
// the `user` and `secure` blobs we store via setUserSession so consumers
// get types instead of `unknown`.
declare module '#auth-utils' {
  interface User {
    email?: string
    name?: string
    picture?: string
  }

  interface SecureSessionData {
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
}

export {}
