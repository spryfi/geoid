import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';

type ErrorType = 'network' | 'permission' | 'notFound' | 'server' | 'generic';

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

const ERROR_MESSAGES: Record<ErrorType, { title: string; message: string; icon: keyof typeof Feather.glyphMap }> = {
  network: {
    title: 'Connection Issue',
    message: 'Could not connect to the server. Please check your internet connection and try again.',
    icon: 'wifi-off',
  },
  permission: {
    title: 'Permission Required',
    message: 'This feature requires additional permissions. Please enable them in your device settings.',
    icon: 'lock',
  },
  notFound: {
    title: 'Not Found',
    message: 'The requested data could not be found. It may have been moved or deleted.',
    icon: 'search',
  },
  server: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again in a few moments.',
    icon: 'server',
  },
  generic: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
    icon: 'alert-circle',
  },
};

export default function ErrorState({
  type = 'generic',
  title,
  message,
  onRetry,
  retryLabel = 'Try Again',
}: ErrorStateProps) {
  const errorConfig = ERROR_MESSAGES[type];
  const displayTitle = title || errorConfig.title;
  const displayMessage = message || errorConfig.message;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Feather name={errorConfig.icon} size={48} color={COLORS.error} />
      </View>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.message}>{displayMessage}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Feather name="refresh-cw" size={18} color={COLORS.white} />
          <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function getErrorType(error: Error | string): ErrorType {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerMessage = errorMessage.toLowerCase();

  if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('offline') || lowerMessage.includes('fetch')) {
    return 'network';
  }
  if (lowerMessage.includes('permission') || lowerMessage.includes('denied') || lowerMessage.includes('access')) {
    return 'permission';
  }
  if (lowerMessage.includes('not found') || lowerMessage.includes('404')) {
    return 'notFound';
  }
  if (lowerMessage.includes('server') || lowerMessage.includes('500') || lowerMessage.includes('internal')) {
    return 'server';
  }
  return 'generic';
}

export function getUserFriendlyMessage(error: Error | string): string {
  const type = getErrorType(error);
  return ERROR_MESSAGES[type].message;
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
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.mediumGray,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: SPACING.md,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    marginTop: SPACING.xl,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
