// TRATO Brand Colors and Theme Constants
export const TRATO_COLORS = {
  // Primary Orange Palette
  orange: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Main orange
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  
  // Secondary Green Palette
  green: {
    50: '#f7fee7',
    100: '#ecfccb',
    200: '#d9f99d',
    300: '#bef264',
    400: '#a3e635',
    500: '#84cc16', // Main green
    600: '#65a30d',
    700: '#4d7c0f',
    800: '#365314',
    900: '#1a2e05',
  },
  
  // Semantic Colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  
  // Neutral Colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// Gradients for TRATO
export const TRATO_GRADIENTS = {
  primary: 'linear-gradient(135deg, #f97316 0%, #84cc16 100%)',
  soft: 'linear-gradient(135deg, #ffedd5 0%, #ecfccb 100%)',
  warm: 'linear-gradient(135deg, #fff7ed 0%, #f7fee7 100%)',
  orangeGlow: 'linear-gradient(135deg, #f97316 0%, #fb923c 50%, #fdba74 100%)',
  greenGlow: 'linear-gradient(135deg, #84cc16 0%, #a3e635 50%, #bef264 100%)',
  sunset: 'linear-gradient(135deg, #ea580c 0%, #f97316 25%, #fb923c 50%, #fdba74 75%, #84cc16 100%)',
} as const;

// Shadow styles for TRATO
export const TRATO_SHADOWS = {
  sm: '0 1px 2px 0 rgba(249, 115, 22, 0.05)',
  md: '0 4px 6px -1px rgba(249, 115, 22, 0.1), 0 2px 4px -1px rgba(249, 115, 22, 0.06)',
  lg: '0 10px 15px -3px rgba(249, 115, 22, 0.1), 0 4px 6px -2px rgba(249, 115, 22, 0.05)',
  xl: '0 20px 25px -5px rgba(249, 115, 22, 0.1), 0 10px 10px -5px rgba(249, 115, 22, 0.04)',
  glow: '0 0 20px rgba(249, 115, 22, 0.3)',
  greenGlow: '0 0 20px rgba(132, 204, 22, 0.3)',
} as const;

// Role-specific colors
export const ROLE_COLORS = {
  comprador: {
    primary: TRATO_COLORS.orange[500],
    secondary: TRATO_COLORS.orange[100],
    accent: TRATO_COLORS.orange[50],
    text: TRATO_COLORS.orange[700],
    border: TRATO_COLORS.orange[200],
  },
  vendedor: {
    primary: TRATO_COLORS.green[500],
    secondary: TRATO_COLORS.green[100],
    accent: TRATO_COLORS.green[50],
    text: TRATO_COLORS.green[700],
    border: TRATO_COLORS.green[200],
  },
  repartidor: {
    primary: TRATO_COLORS.orange[600],
    secondary: TRATO_COLORS.orange[100],
    accent: TRATO_COLORS.orange[50],
    text: TRATO_COLORS.orange[800],
    border: TRATO_COLORS.orange[300],
  },
} as const;

// Status colors for orders and notifications
export const STATUS_COLORS = {
  pending: {
    bg: '#fef3c7',
    text: '#92400e',
    border: '#f59e0b',
  },
  processing: {
    bg: '#dbeafe',
    text: '#1e40af',
    border: '#3b82f6',
  },
  confirmed: {
    bg: TRATO_COLORS.green[100],
    text: TRATO_COLORS.green[700],
    border: TRATO_COLORS.green[500],
  },
  preparing: {
    bg: TRATO_COLORS.orange[100],
    text: TRATO_COLORS.orange[700],
    border: TRATO_COLORS.orange[500],
  },
  ready: {
    bg: '#dcfce7',
    text: '#166534',
    border: '#22c55e',
  },
  delivered: {
    bg: '#dcfce7',
    text: '#15803d',
    border: '#16a34a',
  },
  cancelled: {
    bg: '#fee2e2',
    text: '#991b1b',
    border: '#ef4444',
  },
} as const;

// Theme configuration
export const TRATO_THEME = {
  colors: TRATO_COLORS,
  gradients: TRATO_GRADIENTS,
  shadows: TRATO_SHADOWS,
  roleColors: ROLE_COLORS,
  statusColors: STATUS_COLORS,
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    full: '9999px',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
  },
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },
} as const;

// Helper functions
export const getTratoColor = (color: keyof typeof TRATO_COLORS.orange, shade: keyof typeof TRATO_COLORS.orange = 500) => {
  return TRATO_COLORS.orange[shade];
};

export const getTratoGreen = (shade: keyof typeof TRATO_COLORS.green = 500) => {
  return TRATO_COLORS.green[shade];
};

export const getRoleColor = (role: keyof typeof ROLE_COLORS, property: keyof typeof ROLE_COLORS.comprador = 'primary') => {
  return ROLE_COLORS[role]?.[property] || TRATO_COLORS.orange[500];
};

export const getStatusColor = (status: keyof typeof STATUS_COLORS, property: keyof typeof STATUS_COLORS.pending = 'bg') => {
  return STATUS_COLORS[status]?.[property] || STATUS_COLORS.pending[property];
};

// Export default theme
export default TRATO_THEME;