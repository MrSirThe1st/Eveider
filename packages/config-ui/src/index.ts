/**
 * Design tokens — mirror docs/blueprint/product/design-dna.md exactly.
 * Refined logistics UI inspired by InPost: flat surfaces, thin borders, bold type.
 */
export const colors = {
  primary: '#09D40B',
  secondary: '#121212',
  surface: '#FFFFFF',
  surfaceSubtle: '#E6F2E1',
  background: '#EBF3E8',
  /** Default structural borders — cards, inputs, dividers. */
  borderSubtle: '#D6E3D2',
  /** Primary / subtle borders. */
  border: '#D6E3D2',
  /** Active accent border. */
  borderStrong: '#09D40B',
  /** Secondary text, inactive labels, placeholders. */
  textMuted: '#707A6A',
  tertiary: '#FF99B2',
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
  width: 1,
  widthStrong: 1,
  style: 'solid',
} as const;

export const radius = {
  card: 16,
  button: 12,
  input: 12,
  badge: 999,
} as const;

export const spacing = {
  buttonHeight: 48,
  inputHeight: 48,
} as const;

export const shadows = {
  none: 'none',
  soft: '0 4px 16px rgba(0, 0, 0, 0.03)',
  card: '0 2px 10px rgba(0, 0, 0, 0.02)',
  hard: '0 4px 16px rgba(0, 0, 0, 0.04)',
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

export const icons = {
  library: 'lucide-react',
  strokeWidth: 2,
} as const;

/** Status badge fills & text colors. */
export const PARCEL_STATUS_FILLS = {
  created: '#F0F4EE',
  in_transit: '#FFE4EC',
  delivered_to_locker: '#FFF3D6',
  ready_for_pickup: '#DCF5D6',
  collected: '#F0F4EE',
} as const;

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
  padding: '0 16px',
  border: borderSubtle(),
  borderRadius: radius.input,
  background: colors.surface,
  color: colors.secondary,
  fontWeight: typography.weights.medium,
  fontSize: '1rem',
} as const;

/** Primary CTA — filled vibrant green, rounded corners, white/dark text. */
export const webPrimaryButtonStyle = {
  background: colors.primary,
  color: '#FFFFFF',
  border: 'none',
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

/** Secondary button — light green/sage fill or soft border. */
export const webSecondaryButtonStyle = {
  background: colors.surfaceSubtle,
  color: colors.secondary,
  border: borderSubtle(),
  borderRadius: radius.button,
  boxShadow: shadows.none,
  fontWeight: typography.weights.semibold,
  cursor: 'pointer',
} as const;

/** Portal default button — secondary style. */
export const webPortalButtonStyle = webSecondaryButtonStyle;

