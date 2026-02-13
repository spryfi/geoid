import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import * as Haptics from 'expo-haptics';

interface RetryPromptModalProps {
  visible: boolean;
  message: string;
  suggestion: string;
  attemptNumber: number;
  suggestedZoom?: number;
  currentZoom?: number;
  onRetry: () => void;
  onCancel: () => void;
  onZoomChange?: (zoom: number) => void;
}

const getZoomLabel = (zoom: number): string => {
  if (zoom === 0) return '1x';
  if (zoom === 0.25) return '2x';
  if (zoom === 0.5) return '4x';
  if (zoom === 0.75) return '8x';
  return `${Math.round((zoom + 1) * 4) / 4}x`;
};

export default function RetryPromptModal({
  visible,
  message,
  suggestion,
  attemptNumber,
  suggestedZoom,
  currentZoom = 0,
  onRetry,
  onCancel,
  onZoomChange,
}: RetryPromptModalProps) {
  const hasZoomSuggestion = suggestedZoom !== undefined && suggestedZoom !== currentZoom;

  const handleRetry = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (hasZoomSuggestion && onZoomChange) {
      onZoomChange(suggestedZoom);
    }
    onRetry();
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <Feather name="camera" size={32} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>{message}</Text>
          <Text style={styles.suggestion}>{suggestion}</Text>

          {hasZoomSuggestion ? (
            <View style={styles.zoomAdjustContainer}>
              <Feather name="zoom-out" size={20} color={COLORS.primary} />
              <Text style={styles.zoomAdjustText}>
                Zoom will adjust: {getZoomLabel(currentZoom)} → {getZoomLabel(suggestedZoom)}
              </Text>
            </View>
          ) : null}

          <View style={styles.attemptIndicator}>
            {[1, 2, 3].map((num) => (
              <View
                key={num}
                style={[
                  styles.attemptDot,
                  num <= attemptNumber && styles.attemptDotFilled,
                ]}
              />
            ))}
          </View>
          <Text style={styles.attemptText}>
            Attempt {attemptNumber} of 3
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Feather name={hasZoomSuggestion ? "zoom-out" : "camera"} size={20} color={COLORS.white} />
              <Text style={styles.retryButtonText}>
                {hasZoomSuggestion ? `Retry at ${getZoomLabel(suggestedZoom)}` : 'Take New Photo'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Use Location Instead</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  suggestion: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.mediumGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  zoomAdjustContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  zoomAdjustText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
  attemptIndicator: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  attemptDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.lightGray,
  },
  attemptDotFilled: {
    backgroundColor: COLORS.primary,
  },
  attemptText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginBottom: SPACING.lg,
  },
  buttonContainer: {
    width: '100%',
    gap: SPACING.sm,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  cancelButton: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.mediumGray,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
