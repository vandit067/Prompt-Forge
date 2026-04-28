// Design System — centralized tokens and style objects
// Maps to tailwind.config.js colors

export const colors = {
  // Backgrounds
  bg: '#09090b',
  bgCard: '#0f0f12',
  bgHover: '#16161a',
  bgInput: '#18181b',
  bgMuted: '#0a0a0d',

  // Borders
  border: '#1c1c22',
  borderLight: '#27272a',

  // Text
  fg: '#fafafa',
  fgMuted: '#71717a',
  fgDim: '#52525b',
  fgSubtle: '#a1a1aa',
  fgHover: '#d4d4d8',

  // Semantic
  success: '#22c55e',
  error: '#ef4444',
  blue: '#3b82f6',
  blueLight: '#93c5fd',
  blueBg: '#1e3a5f',
  amber: '#f59e0b',
  purple: '#a855f7',
  purpleBg: '#3b1f5e',
  purpleLight: '#c4b5fd',
  cyan: '#06b6d4',
  teal: '#14b8a6',
  pink: '#ec4899',
  orange: '#f97316',

  // Status colors
  successBg: '#0f3d1a',
  errorBg: '#200d0d',
  warningBg: '#1f2208',
  infoBg: '#1e3a5f',
};

// Fonts
export const fonts = {
  mono: '"JetBrains Mono", ui-monospace, monospace',
  sans: '"Inter", system-ui, -apple-system, sans-serif',
};

// Common border radius values
export const radius = {
  sm: '5px',
  md: '7px',
  lg: '8px',
  xl: '12px',
};

// Common spacing values
export const space = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
};

// Common transitions
export const transitions = {
  fast: 'all 0.12s ease-in-out',
  normal: 'all 0.15s ease-in-out',
  slow: 'all 0.3s ease-in-out',
};

// Style object factories
export const styles = {
  // Cards
  card: {
    background: colors.bgCard,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.xl,
    padding: `${space.lg}`,
  },

  // Input fields
  input: {
    background: colors.bgInput,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    padding: '7px 10px',
    color: colors.fg,
    fontSize: '12px',
    fontFamily: fonts.mono,
    transition: transitions.fast,
  },

  // Buttons
  button: {
    padding: '7px 12px',
    borderRadius: radius.md,
    border: 'none',
    background: colors.bgInput,
    color: colors.fgSubtle,
    fontSize: '12px',
    fontFamily: fonts.sans,
    cursor: 'pointer',
    transition: transitions.fast,
  },

  // Text sizes
  text: {
    h1: { fontSize: '14px', fontWeight: 600, color: colors.fg },
    h2: { fontSize: '13px', fontWeight: 600, color: colors.fg },
    body: { fontSize: '12px', fontWeight: 400, color: colors.fg },
    small: { fontSize: '11px', fontWeight: 400, color: colors.fgMuted },
    xs: { fontSize: '10px', fontWeight: 400, color: colors.fgDim },
  },

  // Flex helpers
  flex: {
    center: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    between: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    col: {
      display: 'flex',
      flexDirection: 'column',
    },
  },
};

// Utility functions
export function buildStyle(...styleObjects: (Record<string, unknown> | undefined)[]): React.CSSProperties {
  return styleObjects.reduce((acc, obj) => ({ ...acc, ...obj }), {}) as React.CSSProperties;
}
