import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants/theme';

interface LoadingStateProps {
  title?: string;
  subtitle?: string;
  icon?: keyof typeof Feather.glyphMap;
  size?: 'small' | 'large';
}

export default function LoadingState({
  title = 'Loading...',
  subtitle,
  icon,
  size = 'large',
}: LoadingStateProps) {
  return (
    <View style={styles.container}>
      {icon ? (
        <View style={styles.iconContainer}>
          <Feather name={icon} size={48} color={COLORS.primary} />
        </View>
      ) : null}
      <ActivityIndicator
        size={size}
        color={COLORS.primary}
        style={styles.spinner}
      />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
    marginBottom: SPACING.lg,
  },
  spinner: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
});
