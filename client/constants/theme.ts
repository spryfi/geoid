import { Platform } from "react-native";

export const COLORS = {
  primary: '#E07856',
  terracottaOrange: '#E07856',
  accent: '#2C3E50',
  deepSlateBlue: '#2C3E50',
  deepCharcoal: '#2C3E50',
  background: '#F5E6D3',
  warmBeige: '#F5E6D3',
  sageGreen: '#27AE60',
  softOffWhite: '#F8F9FA',
  darkGray: '#34495E',
  mediumGray: '#7F8C8D',
  lightGray: '#BDC3C7',
  white: '#FFFFFF',
  error: '#E74C3C',
  warning: '#F39C12',
  success: '#27AE60',
  info: '#3498DB',
};

export const Colors = {
  light: {
    text: COLORS.deepCharcoal,
    buttonText: COLORS.white,
    tabIconDefault: COLORS.mediumGray,
    tabIconSelected: COLORS.primary,
    link: COLORS.primary,
    backgroundRoot: COLORS.warmBeige,
    backgroundDefault: COLORS.white,
    backgroundSecondary: '#F0E4D4',
    backgroundTertiary: '#E8DCC8',
  },
  dark: {
    text: '#ECEDEE',
    buttonText: COLORS.white,
    tabIconDefault: '#9BA1A6',
    tabIconSelected: COLORS.primary,
    link: COLORS.primary,
    backgroundRoot: '#1F2123',
    backgroundDefault: '#2A2C2E',
    backgroundSecondary: '#353739',
    backgroundTertiary: '#404244',
  },
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
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  inputHeight: 48,
  buttonHeight: 52,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const BorderRadius = {
  xs: 8,
  sm: 12,
  md: 12,
  lg: 12,
  xl: 12,
  "2xl": 12,
  "3xl": 12,
  full: 9999,
};

export const BORDER_RADIUS = {
  sm: 8,
  md: 12,
  lg: 12,
  xl: 12,
  card: 12,
  button: 12,
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

export const Typography = {
  h1: {
    fontSize: 32,
    lineHeight: 40,
    fontWeight: "700" as const,
  },
  h2: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: "700" as const,
  },
  h3: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: "600" as const,
  },
  h4: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "600" as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "400" as const,
  },
  link: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "400" as const,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    serif: "ui-serif",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export const GLASSMORPHISM = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  ...SHADOWS.md,
};
