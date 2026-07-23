/**
 * Design tokens — Eveider logistics UI (sage canvas, InPost-inspired).
 * Runtime look: sage background `#EBF3E8` (preferred over blueprint grey).
 * Keep CSS vars in apps/web-manager/src/app/globals.css in sync with this file.
 */

/* ── Color system ─────────────────────────────────────────────── */

export const colors = {
  /** Primary brand — CTAs & ready states only (~5% of UI). */
  primary: '#09D40B',
  primaryHover: '#08BD0A',
  primaryMuted: 'rgba(9, 212, 11, 0.15)',

  /** Neutrals */
  secondary: '#121212',
  surface: '#FFFFFF',
  surfaceSubtle: '#E6F2E1',
  surfaceMuted: '#F0F4EE',
  background: '#EBF3E8',
  borderSubtle: '#D6E3D2',
  border: '#D6E3D2',
  borderStrong: '#09D40B',
  textMuted: '#707A6A',
  textDisabled: '#A3ADA0',

  /** Accent (sparingly) */
  tertiary: '#FF99B2',

  /** Semantic */
  success: '#09D40B',
  successMuted: '#E8FCE8',
  warning: '#FFB800',
  warningMuted: '#FFF3D6',
  danger: '#E53935',
  dangerHover: '#C62828',
  dangerMuted: '#FDECEC',
  info: '#1677FF',
  infoMuted: '#E8F1FF',

  focusRing: 'rgba(9, 212, 11, 0.15)',
  focusRingDanger: 'rgba(229, 57, 53, 0.15)',
} as const;

/* ── Typography hierarchy ─────────────────────────────────────── */

export const typography = {
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  /** Page title (h1) */
  pageTitle: {
    fontSize: '1.5rem',
    lineHeight: 1.25,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  /** Section title (h2) */
  sectionTitle: {
    fontSize: '1.125rem',
    lineHeight: 1.35,
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  /** Card / list item title */
  itemTitle: {
    fontSize: '1rem',
    lineHeight: 1.4,
    fontWeight: 700,
  },
  /** Default body */
  body: {
    fontSize: '0.9375rem',
    lineHeight: 1.5,
    fontWeight: 500,
  },
  /** Secondary body / meta */
  bodySm: {
    fontSize: '0.875rem',
    lineHeight: 1.45,
    fontWeight: 500,
  },
  /** Form labels */
  label: {
    fontSize: '0.875rem',
    lineHeight: 1.4,
    fontWeight: 600,
  },
  /** Captions, timestamps, counts */
  caption: {
    fontSize: '0.75rem',
    lineHeight: 1.4,
    fontWeight: 500,
  },
  /** Overline / eyebrow */
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
  /** Base unit — 4px */
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
  /** Control heights */
  buttonHeight: 48,
  buttonHeightSm: 36,
  inputHeight: 48,
} as const;

/* ── Shadows ──────────────────────────────────────────────────── */

export const shadows = {
  none: 'none',
  soft: '0 4px 16px rgba(0, 0, 0, 0.03)',
  card: '0 2px 10px rgba(0, 0, 0, 0.02)',
  hard: '0 4px 16px rgba(0, 0, 0, 0.04)',
  focus: `0 0 0 3px ${colors.focusRing}`,
  focusDanger: `0 0 0 3px ${colors.focusRingDanger}`,
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

/** Status badge fills & text colors. */
export const PARCEL_STATUS_FILLS = {
  created: '#F0F4EE',
  in_transit: '#FFE4EC',
  delivered_to_locker: '#FFF3D6',
  ready_for_pickup: '#DCF5D6',
  collected: '#F0F4EE',
} as const;

/* ── Style helpers (backward compatible) ──────────────────────── */

export function borderSubtle(width: number = borders.width): string {
  return `${width}px ${borders.style} ${colors.borderSubtle}`;
}

export function borderStrong(width: number = borders.widthStrong): string {
  return `${width}px ${borders.style} ${colors.borderSubtle}`;
}

/** Web card — white surface on light sage canvas, subtle border, soft shadow. */
export const webCardStyle = {
  background: colors.surface,
  border: borderSubtle(),
  borderRadius: radius.card,
  boxShadow: shadows.soft,
} as const;

/** Web text input — rounded, soft subtle border. */
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

/** Primary CTA — filled vibrant green. */
export const webPrimaryButtonStyle = {
  background: colors.primary,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontFamily: typography.fontFamily,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

/** Secondary button — light sage fill + soft border. */
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

/** Danger / destructive button. */
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

/** Ghost / tertiary — no fill. */
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

/** Portal default button — secondary style. */
export const webPortalButtonStyle = webSecondaryButtonStyle;
