/** Pages reachable without an account. */
const PUBLIC_ROUTES = new Set(['/', '/login', '/register'])
/** Pages that make no sense once signed in. */
const GUEST_ONLY_ROUTES = new Set(['/login', '/register'])

export default defineNuxtRouteMiddleware((to) => {
  const { loggedIn } = useUserSession()

  if (loggedIn.value && GUEST_ONLY_ROUTES.has(to.path)) {
    return navigateTo(HOME_ROUTE)
  }

  if (!loggedIn.value && !PUBLIC_ROUTES.has(to.path)) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
