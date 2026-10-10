import { defaultTheme, type Theme } from './defaults'

const HEX_COLOR = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

type PartialTheme = { [K in keyof Theme]?: Partial<Theme[K]> }

/** public/theme.json, or nothing when it is missing or broken */
async function fetchOverrides(): Promise<PartialTheme> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}theme.json`, { cache: 'no-cache' })
    return response.ok ? await response.json() : {}
  } catch {
    return {}
  }
}

export function mergeTheme(overrides: PartialTheme): Theme {
  return {
    colors: { ...defaultTheme.colors, ...overrides.colors },
    sizes: { ...defaultTheme.sizes, ...overrides.sizes },
    fonts: { ...defaultTheme.fonts, ...overrides.fonts }
  }
}

/** --app-primary, --app-radius, --app-font-main, ... on :root */
function applyCssVariables(theme: Theme) {
  const style = document.documentElement.style
  Object.entries(theme.colors).forEach(([name, value]) => style.setProperty(`--app-${name}`, value))
  Object.entries(theme.sizes).forEach(([name, value]) => style.setProperty(`--app-${name}`, value))
  Object.entries(theme.fonts).forEach(([name, value]) => style.setProperty(`--app-font-${name}`, value))
}

/** Vuetify accepts hex colors only */
export const vuetifyColors = (theme: Theme) =>
  Object.fromEntries(
    Object.entries({ ...theme.colors, background: theme.colors.homefone }).filter(([, value]) =>
      HEX_COLOR.test(value)
    )
  )

/** Loads public/theme.json over the defaults and applies it; returns the colors for Vuetify */
export async function loadTheme() {
  const theme = mergeTheme(await fetchOverrides())
  applyCssVariables(theme)
  return vuetifyColors(theme)
}
