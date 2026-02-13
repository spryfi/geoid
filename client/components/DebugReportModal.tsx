import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { captureRef } from 'react-native-view-shot';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { debugAgentService } from '@/services/debugAgentService';
import * as Haptics from 'expo-haptics';
import AnnotationCanvas from './AnnotationCanvas';

interface DebugReportModalProps {
  visible: boolean;
  onClose: () => void;
  screenshotRef?: React.RefObject<View | null>;
}

type ModalStep = 'capture' | 'annotate' | 'describe' | 'generating' | 'result';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function DebugReportModal({ visible, onClose, screenshotRef }: DebugReportModalProps) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<ModalStep>('describe');
  const [description, setDescription] = useState('');
  const [screenshotUri, setScreenshotUri] = useState<string | null>(null);
  const [annotatedScreenshot, setAnnotatedScreenshot] = useState<string | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showSmsInput, setShowSmsInput] = useState(false);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  const recentActions = debugAgentService.getLastActions(5);

  useEffect(() => {
    if (visible) {
      captureScreenshot();
    } else {
      resetState();
    }
  }, [visible]);

  const resetState = () => {
    setStep('describe');
    setDescription('');
    setScreenshotUri(null);
    setAnnotatedScreenshot(null);
    setGeneratedPrompt(null);
    setError(null);
    setCopied(false);
    setPhoneNumber('');
    setShowSmsInput(false);
    setSmsResult(null);
  };

  const captureScreenshot = async () => {
    if (screenshotRef?.current && Platform.OS !== 'web') {
      try {
        const uri = await captureRef(screenshotRef.current, {
          format: 'png',
          quality: 0.8,
        });
        setScreenshotUri(uri);
      } catch (err) {
        console.log('Screenshot capture failed:', err);
      }
    }
  };

  const handleAnnotatePress = () => {
    if (screenshotUri) {
      setStep('annotate');
    }
  };

  const handleAnnotationComplete = (uri: string) => {
    setAnnotatedScreenshot(uri);
    setStep('describe');
  };

  const handleAnnotationCancel = () => {
    setStep('describe');
  };

  const handleGeneratePrompt = async () => {
    if (!description.trim()) {
      setError('Please describe the issue');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setStep('generating');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const screenshotToUse = annotatedScreenshot || screenshotUri;
    let base64Screenshot: string | undefined;

    if (screenshotToUse && Platform.OS !== 'web') {
      try {
        const response = await fetch(screenshotToUse);
        const blob = await response.blob();
        const reader = new FileReader();
        base64Screenshot = await new Promise((resolve) => {
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data.split(',')[1]);
          };
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.log('Failed to convert screenshot to base64:', err);
      }
    }

    const result = await debugAgentService.generateDebugPrompt(description, base64Screenshot);

    setIsGenerating(false);

    if (result.success && result.prompt) {
      setGeneratedPrompt(result.prompt);
      setStep('result');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setError(result.error || 'Failed to generate prompt');
      setStep('describe');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (generatedPrompt) {
      await Clipboard.setStringAsync(generatedPrompt);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendSms = async () => {
    if (!phoneNumber.trim()) {
      setSmsResult({ success: false, message: 'Please enter a phone number' });
      return;
    }

    setSendingSms(true);
    const result = await debugAgentService.sendPromptViaSMS(phoneNumber, generatedPrompt || '');
    setSendingSms(false);

    if (result.success) {
      setSmsResult({ success: true, message: 'SMS sent successfully!' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSmsResult({ success: false, message: result.error || 'Failed to send SMS' });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString();
  };

  const renderDescribeStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {screenshotUri ? (
        <TouchableOpacity style={styles.screenshotPreview} onPress={handleAnnotatePress}>
          <View style={styles.screenshotPlaceholder}>
            <Feather name="image" size={24} color={COLORS.mediumGray} />
            <Text style={styles.screenshotText}>Screenshot captured</Text>
            <Text style={styles.annotateHint}>Tap to annotate</Text>
          </View>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.label}>What went wrong?</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the issue you encountered..."
        placeholderTextColor={COLORS.mediumGray}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />

      {error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={16} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Recent Actions</Text>
      <View style={styles.actionsContainer}>
        {recentActions.length > 0 ? (
          recentActions.map((action, index) => (
            <View key={index} style={styles.actionItem}>
              <Text style={styles.actionTime}>
                {formatTimestamp(action.timestamp)}
              </Text>
              <Text style={styles.actionText}>
                {action.action}
                {action.screen ? ` (${action.screen})` : ''}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noActions}>No recent actions recorded</Text>
        )}
      </View>

      <Text style={styles.infoText}>
        This will use AI to generate a detailed bug fix prompt based on your description, screenshot annotations, and device data.
      </Text>

      <TouchableOpacity
        style={[styles.generateButton, !description.trim() && styles.buttonDisabled]}
        onPress={handleGeneratePrompt}
        disabled={!description.trim()}
      >
        <Feather name="zap" size={20} color={COLORS.white} />
        <Text style={styles.generateButtonText}>Generate Replit Prompt</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderGeneratingStep = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.generatingText}>Analyzing issue...</Text>
      <Text style={styles.generatingSubtext}>AI is generating your bug fix prompt</Text>
    </View>
  );

  const renderResultStep = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <Feather name="file-text" size={20} color={COLORS.primary} />
          <Text style={styles.resultTitle}>Generated Replit Prompt</Text>
        </View>
        <ScrollView style={styles.promptContainer} nestedScrollEnabled>
          <Text style={styles.promptText}>{generatedPrompt}</Text>
        </ScrollView>
      </View>

      <View style={styles.deliveryButtons}>
        <TouchableOpacity
          style={[styles.deliveryButton, copied && styles.deliveryButtonSuccess]}
          onPress={handleCopyToClipboard}
        >
          <Feather 
            name={copied ? "check" : "copy"} 
            size={20} 
            color={copied ? COLORS.white : COLORS.primary} 
          />
          <Text style={[styles.deliveryButtonText, copied && styles.deliveryButtonTextSuccess]}>
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deliveryButton}
          onPress={() => setShowSmsInput(!showSmsInput)}
        >
          <Feather name="smartphone" size={20} color={COLORS.primary} />
          <Text style={styles.deliveryButtonText}>Send via SMS</Text>
        </TouchableOpacity>
      </View>

      {showSmsInput ? (
        <View style={styles.smsContainer}>
          <TextInput
            style={styles.phoneInput}
            placeholder="Enter phone number (e.g., +1234567890)"
            placeholderTextColor={COLORS.mediumGray}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />
          <TouchableOpacity
            style={[styles.sendSmsButton, sendingSms && styles.buttonDisabled]}
            onPress={handleSendSms}
            disabled={sendingSms}
          >
            {sendingSms ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <>
                <Feather name="send" size={16} color={COLORS.white} />
                <Text style={styles.sendSmsButtonText}>Send</Text>
              </>
            )}
          </TouchableOpacity>
          {smsResult ? (
            <Text style={[
              styles.smsResultText,
              smsResult.success ? styles.smsResultSuccess : styles.smsResultError
            ]}>
              {smsResult.message}
            </Text>
          ) : null}
        </View>
      ) : null}

      <TouchableOpacity style={styles.doneButton} onPress={handleClose}>
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderContent = () => {
    switch (step) {
      case 'annotate':
        return screenshotUri ? (
          <AnnotationCanvas
            imageUri={screenshotUri}
            onAnnotationComplete={handleAnnotationComplete}
            onCancel={handleAnnotationCancel}
          />
        ) : null;
      case 'generating':
        return renderGeneratingStep();
      case 'result':
        return renderResultStep();
      default:
        return renderDescribeStep();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={[styles.modal, { paddingBottom: insets.bottom + SPACING.lg }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.debugBadge}>
                <Feather name="tool" size={16} color={COLORS.white} />
              </View>
              <Text style={styles.title}>
                {step === 'annotate' ? 'Annotate' : step === 'result' ? 'Your Prompt' : 'Field Debugger'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={24} color={COLORS.deepSlateBlue} />
            </TouchableOpacity>
          </View>

          {renderContent()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    maxHeight: '90%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  debugBadge: {
    backgroundColor: COLORS.terracottaOrange,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  screenshotPreview: {
    marginBottom: SPACING.md,
  },
  screenshotPlaceholder: {
    backgroundColor: COLORS.lightGray + '40',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderStyle: 'dashed',
  },
  screenshotText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: SPACING.sm,
  },
  annotateHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.lightGray + '30',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    minHeight: 100,
    marginBottom: SPACING.md,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.mediumGray,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionsContainer: {
    backgroundColor: COLORS.lightGray + '30',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  actionItem: {
    flexDirection: 'row',
    marginBottom: SPACING.xs,
  },
  actionTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    width: 70,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    flex: 1,
  },
  noActions: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginBottom: SPACING.lg,
    lineHeight: 18,
  },
  generateButton: {
    backgroundColor: COLORS.terracottaOrange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    marginBottom: SPACING.lg,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  generatingText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    marginTop: SPACING.lg,
  },
  generatingSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: SPACING.sm,
  },
  resultCard: {
    backgroundColor: COLORS.lightGray + '20',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  resultTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  promptContainer: {
    maxHeight: 200,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
  },
  promptText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 20,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  deliveryButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  deliveryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.white,
  },
  deliveryButtonSuccess: {
    backgroundColor: COLORS.sageGreen,
    borderColor: COLORS.sageGreen,
  },
  deliveryButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  deliveryButtonTextSuccess: {
    color: COLORS.white,
  },
  smsContainer: {
    backgroundColor: COLORS.lightGray + '30',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  phoneInput: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
  },
  sendSmsButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.button,
  },
  sendSmsButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  smsResultText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  smsResultSuccess: {
    color: COLORS.sageGreen,
  },
  smsResultError: {
    color: COLORS.error,
  },
  doneButton: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    marginBottom: SPACING.lg,
  },
  doneButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
