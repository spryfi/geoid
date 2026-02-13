import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import useStore from '../services/store';

const PaywallScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('annual');
  const { setSubscriptionStatus } = useStore();

  const handleSubscribe = () => {
    // TODO: Implement actual payment processing
    // For now, just simulate a successful subscription
    setSubscriptionStatus('pro');
    navigation.goBack();
  };

  const handleStartTrial = () => {
    setSubscriptionStatus('trial');
    navigation.goBack();
  };

  const features = [
    { icon: 'infinite', text: 'Unlimited identifications', free: false },
    { icon: 'eye', text: '"Show Me Where" AR feature', free: false },
    { icon: 'map', text: '3D geological maps', free: false },
    { icon: 'download', text: 'Offline geological data', free: false },
    { icon: 'analytics', text: 'Deep dive analysis', free: false },
    { icon: 'share-social', text: 'Share discoveries', free: true },
    { icon: 'bookmark', text: 'Save to collection', free: true },
  ];

  return (
    <ImageBackground
      source={require('../../assets/images/geoid_pro_home_scenic_mockup.png')}
      style={styles.background}
      blurRadius={10}
    >
      <View style={styles.container}>
        {/* Close Button */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={28} color={COLORS.white} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Text style={styles.title}>Unlock the Full{'\n'}Geological Experience</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to all premium features
          </Text>

          {/* Glassmorphism Card */}
          <BlurView intensity={80} style={styles.card}>
            {/* Plan Selection */}
            <View style={styles.plansContainer}>
              <TouchableOpacity
                style={[
                  styles.planButton,
                  selectedPlan === 'monthly' && styles.planButtonActive,
                ]}
                onPress={() => setSelectedPlan('monthly')}
              >
                <Text
                  style={[
                    styles.planText,
                    selectedPlan === 'monthly' && styles.planTextActive,
                  ]}
                >
                  Monthly
                </Text>
                <Text
                  style={[
                    styles.planPrice,
                    selectedPlan === 'monthly' && styles.planPriceActive,
                  ]}
                >
                  $9.99/mo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  selectedPlan === 'annual' && styles.planButtonActive,
                ]}
                onPress={() => setSelectedPlan('annual')}
              >
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>Save 40%</Text>
                </View>
                <Text
                  style={[
                    styles.planText,
                    selectedPlan === 'annual' && styles.planTextActive,
                  ]}
                >
                  Annual
                </Text>
                <Text
                  style={[
                    styles.planPrice,
                    selectedPlan === 'annual' && styles.planPriceActive,
                  ]}
                >
                  $59.99/yr
                </Text>
              </TouchableOpacity>
            </View>

            {/* Features List */}
            <View style={styles.featuresContainer}>
              <Text style={styles.featuresTitle}>What You Get:</Text>
              {features.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View
                    style={[
                      styles.featureIcon,
                      { backgroundColor: feature.free ? COLORS.lightGray : COLORS.sageGreen },
                    ]}
                  >
                    <Ionicons
                      name={feature.icon}
                      size={20}
                      color={COLORS.white}
                    />
                  </View>
                  <Text style={styles.featureText}>{feature.text}</Text>
                  {!feature.free && (
                    <View style={styles.proBadge}>
                      <Text style={styles.proBadgeText}>PRO</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>

            {/* CTA Buttons */}
            <TouchableOpacity
              style={styles.subscribeButton}
              onPress={handleSubscribe}
            >
              <Text style={styles.subscribeButtonText}>
                Subscribe Now
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.trialButton}
              onPress={handleStartTrial}
            >
              <Text style={styles.trialButtonText}>
                Start 7-Day Free Trial
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreButton}>
              <Text style={styles.restoreButtonText}>Restore Purchase</Text>
            </TouchableOpacity>
          </BlurView>

          {/* Legal Text */}
          <Text style={styles.legalText}>
            Subscription automatically renews unless cancelled 24 hours before the end of the
            current period. Cancel anytime in Settings.
          </Text>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: 'rgba(44, 62, 80, 0.8)',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: SPACING.md,
    zIndex: 10,
    padding: SPACING.sm,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingTop: 100,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    opacity: 0.9,
  },
  card: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    ...SHADOWS.lg,
  },
  plansContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  planButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  planButtonActive: {
    backgroundColor: COLORS.terracottaOrange,
    borderColor: COLORS.white,
  },
  saveBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.sageGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  saveText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  planText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  planTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  planPrice: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textAlign: 'center',
  },
  planPriceActive: {
    fontSize: TYPOGRAPHY.fontSize.xl,
  },
  featuresContainer: {
    marginBottom: SPACING.xl,
  },
  featuresTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.white,
  },
  proBadge: {
    backgroundColor: COLORS.terracottaOrange,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  proBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  subscribeButton: {
    backgroundColor: COLORS.terracottaOrange,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  subscribeButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  trialButton: {
    backgroundColor: COLORS.sageGreen,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  trialButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  restoreButton: {
    padding: SPACING.sm,
    alignItems: 'center',
  },
  restoreButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textDecorationLine: 'underline',
  },
  legalText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.white,
    textAlign: 'center',
    marginTop: SPACING.lg,
    opacity: 0.7,
    lineHeight: 18,
  },
});

export default PaywallScreen;
