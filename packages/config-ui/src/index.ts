/**
 * Design tokens — mirror docs/blueprint/product/design-dna.md exactly.
 */
export const colors = {
  primary: '#09D40B',
  secondary: '#121212',
  surface: '#FFFFFF',
  background: '#F5F6F7',
  border: '#E7EAEC',
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

export const radius = {
  card: 12,
  button: 10,
} as const;

export const spacing = {
  buttonHeight: 52,
} as const;

export const icons = {
  library: 'lucide-react',
  strokeWidth: 2,
} as const;
