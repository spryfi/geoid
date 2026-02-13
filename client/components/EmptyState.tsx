import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';

interface EmptyStateProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'light' | 'dark';
}

export default function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  variant = 'light',
}: EmptyStateProps) {
  const isDark = variant === 'dark';

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, isDark && styles.iconContainerDark]}>
        <Feather
          name={icon}
          size={48}
          color={isDark ? COLORS.lightGray : COLORS.mediumGray}
        />
      </View>
      <Text style={[styles.title, isDark && styles.titleDark]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, isDark && styles.subtitleDark]}>
          {subtitle}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.softOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  iconContainerDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
  },
  titleDark: {
    color: COLORS.white,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  subtitleDark: {
    color: COLORS.lightGray,
  },
  actionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    marginTop: SPACING.xl,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
