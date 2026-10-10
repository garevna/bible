/**
 * Default look of the app. public/theme.json overrides any of these values
 * without touching the code (see README, "Палітра і стилі").
 *
 * Every value becomes a CSS variable: colors.primary -> --app-primary, sizes.radius -> --app-radius.
 * Hex colors also go to the Vuetify theme, so color="primary" etc. use them.
 */
export const defaultTheme = {
  colors: {
    /** header, footer, main buttons */
    primary: '#4CAF50',
    /** links, active tabs, focus ring, selected dates */
    secondary: '#0090B0',
    /** add / action buttons and icons */
    buttons: '#72BF44',
    /** delete buttons and icons */
    delete: '#990000',
    warning: '#FFAA00',
    /** page background */
    homefone: '#FAFAFA',
    /** cards, verses in lists */
    surface: '#FFFFFF',
    text: '#222222',
    'text-muted': '#888888',
    /** frames of blocks and cards */
    border: '#D0D0D0',
    /** lines between rows */
    'border-light': '#EEEEEE',
    /** background of the calendar header */
    'light-blue': '#E6F4F8',
    hover: '#0090B014',
    /** calendar: days that have notes */
    'available-date': '#E3F2E5',
    /** calendar: the days of an interval */
    'selected-dates': '#CCE9F0',
    /** search: found words */
    mark: '#FFFF0077',
    /** tooltips */
    tooltip: '#222222BB',
    /** scrollbar: the track; the thumb is primary, buttons on hover */
    'scrollbar-track': '#20731C',
    /** text on primary / secondary / buttons / delete */
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-buttons': '#FFFFFF',
    'on-delete': '#FFFFFF'
  },
  sizes: {
    /** blocks, fields, cards */
    radius: '8px',
    /** dialogs */
    'radius-large': '12px',
    /** space between blocks */
    gap: '24px'
  },
  fonts: {
    main: 'Montserrat, Helvetica, sans-serif'
  }
}

export type Theme = typeof defaultTheme
