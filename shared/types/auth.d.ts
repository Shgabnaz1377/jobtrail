declare module '#auth-utils' {
  interface User {
    id: string
    name: string
    email: string
    isDemo: boolean
  }

  interface UserSession {
    loggedInAt: number
  }
}

export {}
