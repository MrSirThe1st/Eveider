/**
 * Design tokens — mirror docs/blueprint/product/design-dna.md exactly.
 * Industrial Neo-Brutalist system inspired by InPost logistics UI.
 */
export const colors = {
  primary: '#09D40B',
  secondary: '#121212',
  surface: '#FFFFFF',
  background: '#F5F6F7',
  /** Structural borders — 2px solid #121212 on cards, inputs, buttons. */
  border: '#121212',
  /** Secondary text, inactive labels, placeholders. */
  textMuted: '#475569',
  success: '#09D40B',
  warning: '#FFB800',
  danger: '#E53935',
  info: '#1677FF',
} as const;

export const typography = {
  fontFamily: 'Inter, system-ui, sans-serif',
  weights: {
    medium: 500,
    semibold: 600,
    bold: 700,
  },
} as const;

export const borders = {
  width: 2,
  style: 'solid',
  color: colors.border,
} as const;

export const radius = {
  card: 8,
  button: 8,
  badge: 999,
} as const;

export const spacing = {
  buttonHeight: 52,
} as const;

export const shadows = {
  none: 'none',
  hard: '3px 3px 0 #121212',
} as const;

/** React Native hard shadow — offset block, no blur. */
export const nativeShadow = {
  hard: {
    shadowColor: colors.border,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
} as const;

export const icons = {
  library: 'lucide-react',
  strokeWidth: 2,
} as const;

/** Status badge fill colors — black outlined pills with status-specific fills. */
export const PARCEL_STATUS_FILLS = {
  created: colors.surface,
  in_transit: colors.surface,
  delivered_to_locker: colors.warning,
  ready_for_pickup: colors.primary,
  collected: colors.background,
} as const;

/** Web card shell — white surface, 2px border, hard offset shadow. */
export const webCardStyle = {
  background: colors.surface,
  border: `${borders.width}px ${borders.style} ${borders.color}`,
  borderRadius: radius.card,
  boxShadow: shadows.hard,
} as const;

/**
 * Portal (admin / business) button — outline only.
 * No fill, no hard shadow; keep 2px high-contrast border.
 * Landing / marketing CTAs should keep filled green + hard shadow.
 */
export const webPortalButtonStyle = {
  background: 'transparent',
  color: colors.secondary,
  border: `${borders.width}px ${borders.style} ${borders.color}`,
  borderRadius: radius.button,
  boxShadow: 'none',
  fontWeight: 700,
  letterSpacing: '0.06em',
  textTransform: 'uppercase' as const,
  cursor: 'pointer',
} as const;
