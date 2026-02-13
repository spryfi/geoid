// GeoID Pro - Scientific Elegance Design System

export const COLORS = {
  // Primary Palette
  deepSlateBlue: '#2C3E50',
  terracottaOrange: '#E67E22',
  sageGreen: '#27AE60',
  softOffWhite: '#F8F9FA',
  
  // Neutrals
  darkGray: '#34495E',
  mediumGray: '#7F8C8D',
  lightGray: '#BDC3C7',
  white: '#FFFFFF',
  
  // Functional
  error: '#E74C3C',
  warning: '#F39C12',
  success: '#27AE60',
  info: '#3498DB',
};

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12, // Standard 12pt corner radius
  lg: 16,
  xl: 24,
  full: 9999,
};

export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Glassmorphism effect for premium features
export const GLASSMORPHISM = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  ...SHADOWS.md,
};
