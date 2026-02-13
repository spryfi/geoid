import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppConfig } from '@/config/appConfig';
import { SPACING } from '@/constants/theme';

interface DevModeBannerProps {
  position?: 'top' | 'bottom';
}

export default function DevModeBanner({ position = 'bottom' }: DevModeBannerProps) {
  const insets = useSafeAreaInsets();

  if (!AppConfig.isDevMode) {
    return null;
  }

  return (
    <View
      style={[
        styles.container,
        position === 'top'
          ? { paddingTop: insets.top + 4 }
          : { paddingBottom: insets.bottom > 0 ? insets.bottom : 8 },
      ]}
    >
      <Feather name="tool" size={14} color="#000" style={styles.icon} />
      <Text style={styles.text}>DEV MODE - All Pro Features Enabled</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFC107',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    color: '#000',
  },
});
