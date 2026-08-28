/**
 * SmartCare design tokens — mirrors the web app's CSS custom properties exactly.
 */
export const colors = {
  // backgrounds
  bg:           '#f0f4f8',
  surface:      '#ffffff',
  surface2:     '#f7f9fc',

  // borders
  border:       '#e2e8f0',
  border2:      '#cbd5e1',

  // brand
  primary:      '#0f4c81',
  primaryLight: '#1a69b3',
  primaryGhost: '#e8f0fb',

  // accent (green)
  accent:       '#00a878',
  accentLight:  '#e6f7f3',

  // semantic
  danger:       '#dc2626',
  dangerLight:  '#fef2f2',
  warn:         '#d97706',
  warnLight:    '#fffbeb',

  // text
  text:         '#0f172a',
  text2:        '#475569',
  text3:        '#94a3b8',

  // gradient (login background)
  gradientStart: '#0f4c81',
  gradientMid:   '#1a69b3',
  gradientEnd:   '#00a878',

  white: '#ffffff',
};

export const radius = {
  sm:  6,
  md:  10,
  lg:  16,
  xl:  20,
  full: 999,
};

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
};

export const font = {
  // weight shortcuts
  regular: '400' as const,
  medium:  '500' as const,
  semibold:'600' as const,
  bold:    '700' as const,
};
