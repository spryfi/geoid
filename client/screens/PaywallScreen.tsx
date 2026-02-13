import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import betaTokenService from '@/services/betaTokenService';

interface PaywallScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

const proFeatures = [
  { 
    icon: 'zap' as const, 
    title: 'Unlimited Identifications',
    description: 'No daily limits on rock identification'
  },
  { 
    icon: 'cpu' as const, 
    title: 'AI-Powered Analysis',
    description: 'GPT-4 Vision for accurate identification'
  },
  { 
    icon: 'layers' as const, 
    title: 'Deep Dive Data',
    description: 'Detailed mineralogy and geology info'
  },
  { 
    icon: 'map-pin' as const, 
    title: 'Smart Context Mode',
    description: '"Why Here?" and "What Else" insights'
  },
  { 
    icon: 'download-cloud' as const, 
    title: 'Offline Maps',
    description: 'Access maps without internet'
  },
  { 
    icon: 'slash' as const, 
    title: 'Ad-Free Experience',
    description: 'Focus on discovery, not ads'
  },
];

export default function PaywallScreen({ navigation }: PaywallScreenProps) {
  const insets = useSafeAreaInsets();
  const { setSubscriptionStatus, activateProWithToken, user } = useStore();
  
  const [showRedeemInput, setShowRedeemInput] = useState(false);
  const [tokenCode, setTokenCode] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<{ days: number; expDate: string } | null>(null);

  const handleStartTrial = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSubscriptionStatus('trial');
    navigation.goBack();
  };

  const handleViewPlans = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRedeemCode = async () => {
    if (!tokenCode.trim()) {
      setRedeemError('Please enter a code');
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);

    try {
      const userId = user?.id || 'anonymous-' + Date.now();
      const result = await betaTokenService.redeemToken(tokenCode, userId);

      if (result.success && result.expirationDate) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        activateProWithToken(result.expirationDate, result.grantedDays || 365);
        
        setRedeemSuccess({
          days: result.grantedDays || 365,
          expDate: betaTokenService.formatExpirationDate(result.expirationDate),
        });
        
        setTimeout(() => {
          navigation.goBack();
        }, 2000);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setRedeemError(result.error || 'Invalid code');
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setRedeemError('Failed to redeem code');
    } finally {
      setIsRedeeming(false);
    }
  };

  const toggleRedeemInput = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowRedeemInput(!showRedeemInput);
    setRedeemError(null);
    setTokenCode('');
  };

  return (
    <ImageBackground
      source={require('../../assets/images/home_header.png')}
      style={styles.background}
      blurRadius={3}
    >
      <KeyboardAvoidingView 
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <TouchableOpacity
          style={[styles.closeButton, { top: insets.top + SPACING.sm }]}
          onPress={() => navigation.goBack()}
          testID="close-paywall-button"
        >
          <Feather name="x" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 60, paddingBottom: insets.bottom + SPACING.xl }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <BlurView intensity={60} style={styles.card}>
            <View style={styles.headerSection}>
              <View style={styles.proBadge}>
                <Feather name="award" size={20} color={COLORS.white} />
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
              <Text style={styles.title}>GeoID Pro</Text>
              <Text style={styles.subtitle}>Unlock the full power of rock identification</Text>
            </View>

            <View style={styles.featuresContainer}>
              {proFeatures.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={styles.featureIcon}>
                    <Feather name={feature.icon} size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>{feature.title}</Text>
                    <Text style={styles.featureDescription}>{feature.description}</Text>
                  </View>
                </View>
              ))}
            </View>

            {redeemSuccess ? (
              <View style={styles.successContainer}>
                <Feather name="check-circle" size={48} color={COLORS.success} />
                <Text style={styles.successTitle}>Pro Access Activated!</Text>
                <Text style={styles.successText}>
                  Enjoy {redeemSuccess.days} days of Pro access
                </Text>
                <Text style={styles.successExpiry}>
                  Valid until {redeemSuccess.expDate}
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.trialButton}
                  onPress={handleStartTrial}
                  testID="start-trial-button"
                >
                  <Text style={styles.trialButtonText}>Start 7-Day Free Trial</Text>
                  <Text style={styles.trialSubtext}>Then $4.99/month</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.plansButton}
                  onPress={handleViewPlans}
                  testID="view-plans-button"
                >
                  <Text style={styles.plansButtonText}>View All Plans</Text>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>OR</Text>
                  <View style={styles.dividerLine} />
                </View>

                {showRedeemInput ? (
                  <View style={styles.redeemContainer}>
                    <TextInput
                      style={[
                        styles.redeemInput,
                        redeemError ? styles.redeemInputError : null
                      ]}
                      placeholder="Enter beta or promo code"
                      placeholderTextColor="rgba(255,255,255,0.5)"
                      value={tokenCode}
                      onChangeText={(text) => {
                        setTokenCode(text.toUpperCase());
                        setRedeemError(null);
                      }}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!isRedeeming}
                      testID="redeem-code-input"
                    />
                    
                    {redeemError ? (
                      <Text style={styles.errorText}>{redeemError}</Text>
                    ) : null}

                    <View style={styles.redeemActions}>
                      <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={toggleRedeemInput}
                        disabled={isRedeeming}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={[
                          styles.redeemButton,
                          isRedeeming ? styles.redeemButtonDisabled : null
                        ]}
                        onPress={handleRedeemCode}
                        disabled={isRedeeming}
                        testID="submit-redeem-button"
                      >
                        {isRedeeming ? (
                          <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                          <Text style={styles.redeemButtonText}>Redeem</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.redeemCodeButton}
                    onPress={toggleRedeemInput}
                    testID="have-code-button"
                  >
                    <Feather name="gift" size={18} color={COLORS.primary} />
                    <Text style={styles.redeemCodeText}>Have a promo or beta code?</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </BlurView>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.7)',
  },
  closeButton: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginBottom: SPACING.sm,
  },
  proBadgeText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginLeft: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  trialButton: {
    backgroundColor: COLORS.info,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  trialButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  trialSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: 4,
  },
  plansButton: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  plansButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginHorizontal: SPACING.md,
  },
  redeemCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  redeemCodeText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginLeft: SPACING.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  redeemContainer: {
    marginTop: SPACING.sm,
  },
  redeemInput: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
    letterSpacing: 2,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  redeemInputError: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  redeemActions: {
    flexDirection: 'row',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  redeemButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  redeemButtonDisabled: {
    opacity: 0.6,
  },
  redeemButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  successTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginTop: SPACING.md,
  },
  successText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: 'rgba(255,255,255,0.8)',
    marginTop: SPACING.sm,
  },
  successExpiry: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.6)',
    marginTop: SPACING.xs,
  },
});
