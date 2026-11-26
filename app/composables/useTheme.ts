export type ThemePreference = 'system' | 'light' | 'dark'

const ORDER: ThemePreference[] = ['system', 'light', 'dark']

/**
 * Theme preference kept in a cookie so the server renders the right
 * `data-theme` attribute and the page never flashes the wrong colours.
 * "system" leaves the attribute off and lets `prefers-color-scheme` decide.
 */
export function useTheme() {
  const preference = useCookie<ThemePreference>('jt-theme', {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  function cycle() {
    const index = ORDER.indexOf(preference.value)
    preference.value = ORDER[(index + 1) % ORDER.length]!
  }

  return { preference, cycle }
}
