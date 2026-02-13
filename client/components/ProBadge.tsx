import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY, BORDER_RADIUS } from '@/constants/theme';

interface ProBadgeProps {
  size?: 'small' | 'medium' | 'large';
  style?: object;
}

export default function ProBadge({ size = 'medium', style }: ProBadgeProps) {
  const sizeStyles = {
    small: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      fontSize: 10,
    },
    medium: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      fontSize: 12,
    },
    large: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      fontSize: 14,
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: currentSize.paddingHorizontal,
          paddingVertical: currentSize.paddingVertical,
        },
        style,
      ]}
    >
      <Text style={[styles.text, { fontSize: currentSize.fontSize }]}>PRO</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.sm,
  },
  text: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1,
  },
});
