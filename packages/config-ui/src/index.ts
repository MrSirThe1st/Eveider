/**
 * Design tokens — Eveider logistics UI.
 *
 * Light: cool gray canvas, white cards, green used sparingly (~5%).
 * Dark: forest ink — green-tinted charcoal, not OLED black. Same hierarchy:
 * canvas < card < muted fill, with the brand green as a *light* accent.
 *
 * Web colors resolve through CSS variables so `data-theme` switches palettes.
 * React Native should import `nativeColors` (hex), not `colors` (CSS vars).
 */

export type ColorTokens = {
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  onPrimary: string;
  secondary: string;
  surface: string;
  surfaceSubtle: string;
  surfaceMuted: string;
  background: string;
  borderSubtle: string;
  border: string;
  borderStrong: string;
  borderHover: string;
  surfaceHover: string;
  textMuted: string;
  textDisabled: string;
  tertiary: string;
  success: string;
  successMuted: string;
  successFg: string;
  warning: string;
  warningMuted: string;
  warningFg: string;
  danger: string;
  dangerHover: string;
  dangerMuted: string;
  dangerFg: string;
  info: string;
  infoMuted: string;
  infoFg: string;
  focusRing: string;
  focusRingDanger: string;
};

export type ShadowTokens = {
  soft: string;
  card: string;
  hard: string;
};

const lightColors: ColorTokens = {
  primary: '#09D40B',
  primaryHover: '#08BD0A',
  primaryMuted: 'rgba(9, 212, 11, 0.15)',
  onPrimary: '#121212',
  secondary: '#121212',
  surface: '#FFFFFF',
  surfaceSubtle: '#F3F4F6',
  surfaceMuted: '#EEF0F3',
  background: '#F7F8FA',
  borderSubtle: '#E5E7EB',
  border: '#E5E7EB',
  borderStrong: '#09D40B',
  borderHover: '#D1D5DB',
  surfaceHover: '#E5E7EB',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  tertiary: '#FF99B2',
  success: '#09D40B',
  successMuted: '#E8FCE8',
  successFg: '#067A07',
  warning: '#FFB800',
  warningMuted: '#FFF3D6',
  warningFg: '#9A6B00',
  danger: '#E53935',
  dangerHover: '#C62828',
  dangerMuted: '#FDECEC',
  dangerFg: '#C62828',
  info: '#1677FF',
  infoMuted: '#E8F1FF',
  infoFg: '#0B5ED7',
  focusRing: 'rgba(9, 212, 11, 0.15)',
  focusRingDanger: 'rgba(229, 57, 53, 0.15)',
};

/** Forest ink: green-gray charcoal, lifted cards, mint mutes — not #000. */
const darkColors: ColorTokens = {
  primary: '#09D40B',
  primaryHover: '#2AE02C',
  primaryMuted: 'rgba(9, 212, 11, 0.18)',
  onPrimary: '#121212',
  secondary: '#F1F4F2',
  surface: '#1A1E1C',
  surfaceSubtle: '#222825',
  surfaceMuted: '#2B322F',
  background: '#111413',
  borderSubtle: '#2C3330',
  border: '#2C3330',
  borderStrong: '#09D40B',
  borderHover: '#3D4742',
  surfaceHover: '#2B322F',
  textMuted: '#9AA49E',
  textDisabled: '#6B756F',
  tertiary: '#FF99B2',
  success: '#09D40B',
  successMuted: '#16351A',
  successFg: '#7EE07F',
  warning: '#FFC53D',
  warningMuted: '#3A2E12',
  warningFg: '#FFD36A',
  danger: '#F0716C',
  dangerHover: '#FF8A86',
  dangerMuted: '#3A1A19',
  dangerFg: '#FF9B97',
  info: '#5B9DFF',
  infoMuted: '#152A48',
  infoFg: '#8BB8FF',
  focusRing: 'rgba(9, 212, 11, 0.28)',
  focusRingDanger: 'rgba(240, 113, 108, 0.28)',
};

const lightShadows: ShadowTokens = {
  soft: '0 1px 2px rgba(16, 24, 40, 0.05), 0 4px 16px rgba(16, 24, 40, 0.06)',
  card: '0 1px 2px rgba(16, 24, 40, 0.04), 0 2px 8px rgba(16, 24, 40, 0.05)',
  hard: '0 2px 4px rgba(16, 24, 40, 0.06), 0 8px 24px rgba(16, 24, 40, 0.08)',
};

const darkShadows: ShadowTokens = {
  soft: '0 1px 0 rgba(255, 255, 255, 0.04), 0 8px 24px rgba(0, 0, 0, 0.35)',
  card: '0 1px 0 rgba(255, 255, 255, 0.04)',
  hard: '0 12px 40px rgba(0, 0, 0, 0.45)',
};

export const colorPalettes = {
  light: lightColors,
  dark: darkColors,
} as const;

const COLOR_CSS_VARS: Record<keyof ColorTokens, string> = {
  primary: '--color-primary',
  primaryHover: '--color-primary-hover',
  primaryMuted: '--color-primary-muted',
  onPrimary: '--color-on-primary',
  secondary: '--color-secondary',
  surface: '--color-surface',
  surfaceSubtle: '--color-surface-subtle',
  surfaceMuted: '--color-surface-muted',
  background: '--color-background',
  borderSubtle: '--color-border-subtle',
  border: '--color-border',
  borderStrong: '--color-border-strong',
  borderHover: '--border-hover',
  surfaceHover: '--surface-hover',
  textMuted: '--color-text-muted',
  textDisabled: '--color-text-disabled',
  tertiary: '--color-tertiary',
  success: '--color-success',
  successMuted: '--color-success-muted',
  successFg: '--color-success-fg',
  warning: '--color-warning',
  warningMuted: '--color-warning-muted',
  warningFg: '--color-warning-fg',
  danger: '--color-danger',
  dangerHover: '--color-danger-hover',
  dangerMuted: '--color-danger-muted',
  dangerFg: '--color-danger-fg',
  info: '--color-info',
  infoMuted: '--color-info-muted',
  infoFg: '--color-info-fg',
  focusRing: '--color-focus-ring',
  focusRingDanger: '--color-focus-ring-danger',
};

function cssVar(name: string): string {
  return `var(${name})`;
}

function serializeColors(palette: ColorTokens): string {
  return (Object.keys(COLOR_CSS_VARS) as (keyof ColorTokens)[])
    .map((key) => `${COLOR_CSS_VARS[key]}: ${palette[key]};`)
    .join('\n  ');
}

function serializeShadows(palette: ShadowTokens): string {
  return [
    `--shadow-soft: ${palette.soft};`,
    `--shadow-card: ${palette.card};`,
    `--shadow-hard: ${palette.hard};`,
    `--shadow-focus: 0 0 0 3px var(--color-focus-ring);`,
    `--shadow-focus-danger: 0 0 0 3px var(--color-focus-ring-danger);`,
  ].join('\n  ');
}

/** Injected in the document head so light/dark stay a single source of truth. */
export const THEME_STYLE_SHEET = `:root,
html[data-theme='light'] {
  color-scheme: light;
  ${serializeColors(lightColors)}
  ${serializeShadows(lightShadows)}
}

html[data-theme='dark'] {
  color-scheme: dark;
  ${serializeColors(darkColors)}
  ${serializeShadows(darkShadows)}
}
`;

/* ── Color system (web — follows data-theme) ──────────────────── */

export const colors: ColorTokens = {
  primary: cssVar(COLOR_CSS_VARS.primary),
  primaryHover: cssVar(COLOR_CSS_VARS.primaryHover),
  primaryMuted: cssVar(COLOR_CSS_VARS.primaryMuted),
  onPrimary: cssVar(COLOR_CSS_VARS.onPrimary),
  secondary: cssVar(COLOR_CSS_VARS.secondary),
  surface: cssVar(COLOR_CSS_VARS.surface),
  surfaceSubtle: cssVar(COLOR_CSS_VARS.surfaceSubtle),
  surfaceMuted: cssVar(COLOR_CSS_VARS.surfaceMuted),
  background: cssVar(COLOR_CSS_VARS.background),
  borderSubtle: cssVar(COLOR_CSS_VARS.borderSubtle),
  border: cssVar(COLOR_CSS_VARS.border),
  borderStrong: cssVar(COLOR_CSS_VARS.borderStrong),
  borderHover: cssVar(COLOR_CSS_VARS.borderHover),
  surfaceHover: cssVar(COLOR_CSS_VARS.surfaceHover),
  textMuted: cssVar(COLOR_CSS_VARS.textMuted),
  textDisabled: cssVar(COLOR_CSS_VARS.textDisabled),
  tertiary: cssVar(COLOR_CSS_VARS.tertiary),
  success: cssVar(COLOR_CSS_VARS.success),
  successMuted: cssVar(COLOR_CSS_VARS.successMuted),
  successFg: cssVar(COLOR_CSS_VARS.successFg),
  warning: cssVar(COLOR_CSS_VARS.warning),
  warningMuted: cssVar(COLOR_CSS_VARS.warningMuted),
  warningFg: cssVar(COLOR_CSS_VARS.warningFg),
  danger: cssVar(COLOR_CSS_VARS.danger),
  dangerHover: cssVar(COLOR_CSS_VARS.dangerHover),
  dangerMuted: cssVar(COLOR_CSS_VARS.dangerMuted),
  dangerFg: cssVar(COLOR_CSS_VARS.dangerFg),
  info: cssVar(COLOR_CSS_VARS.info),
  infoMuted: cssVar(COLOR_CSS_VARS.infoMuted),
  infoFg: cssVar(COLOR_CSS_VARS.infoFg),
  focusRing: cssVar(COLOR_CSS_VARS.focusRing),
  focusRingDanger: cssVar(COLOR_CSS_VARS.focusRingDanger),
};

/** Hex palette for React Native (CSS variables are not supported). */
export const nativeColors: ColorTokens = lightColors;

export function readCssColor(token: keyof ColorTokens, theme: 'light' | 'dark' = 'light'): string {
  const global = globalThis as {
    document?: { documentElement: object };
    getComputedStyle?: (element: object) => { getPropertyValue: (name: string) => string };
  };
  if (!global.document || !global.getComputedStyle) {
    return colorPalettes[theme][token];
  }
  const value = global.getComputedStyle(global.document.documentElement).getPropertyValue(COLOR_CSS_VARS[token]).trim();
  return value || colorPalettes[theme][token];
}

/* ── Typography hierarchy ─────────────────────────────────────── */

export const typography = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  pageTitle: {
    fontSize: '1.5rem',
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  sectionTitle: {
    fontSize: '1.125rem',
    lineHeight: 1.35,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  itemTitle: {
    fontSize: '1rem',
    lineHeight: 1.4,
    fontWeight: 700,
  },
  body: {
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  bodySm: {
    fontSize: '0.875rem',
    lineHeight: 1.45,
    fontWeight: 500,
  },
  label: {
    fontSize: '0.875rem',
    lineHeight: 1.4,
    fontWeight: 600,
  },
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    fontWeight: 500,
  },
  overline: {
    fontSize: '0.6875rem',
    lineHeight: 1.3,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
  },
} as const;

/* ── Borders ──────────────────────────────────────────────────── */

export const borders = {
  width: 1,
  widthStrong: 1,
  style: 'solid',
} as const;

/* ── Radius ───────────────────────────────────────────────────── */

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  button: 12,
  input: 12,
  badge: 999,
} as const;

/* ── Spacing (4/8 system) ─────────────────────────────────────── */

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  buttonHeight: 48,
  buttonHeightSm: 36,
  inputHeight: 48,
} as const;

/* ── Shadows ──────────────────────────────────────────────────── */

export const shadows = {
  none: 'none',
  soft: 'var(--shadow-soft)',
  card: 'var(--shadow-card)',
  hard: 'var(--shadow-hard)',
  focus: 'var(--shadow-focus)',
  focusDanger: 'var(--shadow-focus-danger)',
} as const;

/** React Native shadow. */
export const nativeShadow = {
  hard: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

/* ── Icons ────────────────────────────────────────────────────── */

export const icons = {
  library: 'lucide-react',
  strokeWidth: 2,
  sizeSm: 16,
  sizeMd: 20,
  sizeLg: 24,
} as const;

/* ── Domain status fills ──────────────────────────────────────── */

export const PARCEL_STATUS_FILLS = {
  created: '#F3F4F6',
  in_transit: '#FFE4EC',
  delivered_to_locker: '#FFF3D6',
  ready_for_pickup: '#DCF5D6',
  collected: '#F3F4F6',
} as const;

export const PARCEL_STATUS_FILLS_DARK = {
  created: '#2B322F',
  in_transit: '#3A2430',
  delivered_to_locker: '#3A2E12',
  ready_for_pickup: '#16351A',
  collected: '#2B322F',
} as const;

/* ── Style helpers (backward compatible) ──────────────────────── */

export function borderSubtle(width: number = borders.width): string {
  return `${width}px ${borders.style} ${colors.borderSubtle}`;
}

export function borderStrong(width: number = borders.widthStrong): string {
  return `${width}px ${borders.style} ${colors.borderSubtle}`;
}

export const webCardStyle = {
  background: colors.surface,
  border: borderSubtle(),
  borderRadius: radius.card,
  boxShadow: shadows.soft,
} as const;

export const webInputStyle = {
  display: 'block',
  width: '100%',
  height: spacing.inputHeight,
  padding: `0 ${spacing[4]}px`,
  border: borderSubtle(),
  borderRadius: radius.input,
  background: colors.surface,
  color: colors.secondary,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.medium,
  fontSize: typography.body.fontSize,
} as const;

export const webPrimaryButtonStyle = {
  background: colors.primary,
  color: colors.onPrimary,
  border: 'none',
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

export const webSecondaryButtonStyle = {
  background: colors.surfaceSubtle,
  color: colors.secondary,
  border: borderSubtle(),
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

export const webDangerButtonStyle = {
  background: colors.danger,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

export const webGhostButtonStyle = {
  background: 'transparent',
  color: colors.secondary,
  border: 'none',
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

export const webPortalButtonStyle = webSecondaryButtonStyle;
