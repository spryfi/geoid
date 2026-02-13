import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';

const appVersion = Constants.expoConfig?.version || '1.0.0';

interface ProfileScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isPro = useStore((state) => state.isPro);
  const isBetaTester = useStore((state) => state.isBetaTester);
  const subscriptionStatus = useStore((state) => state.subscriptionStatus);
  const proExpirationDate = useStore((state) => state.proExpirationDate);
  const identifications = useStore((state) => state.identifications);
  const setSubscriptionStatus = useStore((state) => state.setSubscriptionStatus);
  const getProDaysRemaining = useStore((state) => state.getProDaysRemaining);
  const isFieldDebugMode = useStore((state) => state.isFieldDebugMode);
  const setFieldDebugMode = useStore((state) => state.setFieldDebugMode);

  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headerBrand = isPro ? 'GeoID Pro' : 'GeoID';
  const daysRemaining = getProDaysRemaining();

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setShowToast(false));
  };

  const handleVersionTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
    }
    
    if (isFieldDebugMode) {
      showToastMessage('Field Debug Mode is already active');
      return;
    }
    
    const newCount = versionTapCount + 1;
    setVersionTapCount(newCount);
    
    if (newCount >= 7) {
      setFieldDebugMode(true);
      setVersionTapCount(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showToastMessage('Field Debug Mode Activated!');
    } else if (newCount >= 4) {
      showToastMessage(`${7 - newCount} more taps to enable debug mode`);
    }
    
    tapTimeoutRef.current = setTimeout(() => {
      setVersionTapCount(0);
    }, 2000);
  };

  const handleTogglePro = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isPro) {
      setSubscriptionStatus('free');
    } else {
      setSubscriptionStatus('pro');
    }
  };

  const formatExpirationDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getSubscriptionLabel = () => {
    switch (subscriptionStatus) {
      case 'beta':
        return 'Beta Tester';
      case 'trial':
        return 'Free Trial';
      case 'pro':
        return 'Pro Subscriber';
      default:
        return 'Free';
    }
  };

  const settingsItems = [
    { icon: 'gift' as const, label: 'Redeem Code', type: 'arrow', action: 'redeem' },
    { icon: 'bell' as const, label: 'Notifications', type: 'toggle' },
    { icon: 'map-pin' as const, label: 'Location Services', type: 'toggle' },
    { icon: 'download' as const, label: 'Offline Data', type: 'arrow' },
    { icon: 'help-circle' as const, label: 'Help & Support', type: 'arrow' },
    { icon: 'shield' as const, label: 'Privacy Policy', type: 'arrow' },
    { icon: 'info' as const, label: 'About GeoID', type: 'arrow' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/geoid_logo.png')}
            style={styles.headerLogo}
            contentFit="contain"
          />
          <Text style={styles.headerTitle}>{headerBrand}</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Feather name="user" size={40} color={COLORS.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Geology Explorer</Text>
            <Text style={styles.profileStats}>{identifications.length} discoveries</Text>
          </View>
          {isPro && (
            <View style={styles.proBadge}>
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
          )}
        </View>

        {isPro ? (
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <View style={styles.subscriptionBadge}>
                <Feather name="award" size={16} color={COLORS.white} />
                <Text style={styles.subscriptionBadgeText}>{getSubscriptionLabel()}</Text>
              </View>
            </View>
            {proExpirationDate ? (
              <View style={styles.subscriptionDetails}>
                <Text style={styles.subscriptionExpiry}>
                  Expires: {formatExpirationDate(proExpirationDate)}
                </Text>
                {daysRemaining !== null && daysRemaining > 0 ? (
                  <Text style={styles.subscriptionDays}>
                    {daysRemaining} days remaining
                  </Text>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => navigation.navigate('Paywall')}
            testID="upgrade-to-pro-button"
          >
            <View style={styles.upgradeContent}>
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
              <Text style={styles.upgradeSubtitle}>Unlock all features</Text>
            </View>
            <Feather name="chevron-right" size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}

        <View style={styles.devSection}>
          <Text style={styles.devLabel}>Developer Mode</Text>
          <View style={styles.devToggle}>
            <Text style={styles.devToggleLabel}>Pro Status</Text>
            <Switch
              value={isPro}
              onValueChange={handleTogglePro}
              trackColor={{ false: COLORS.lightGray, true: COLORS.sageGreen }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>

        <View style={styles.settingsSection}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.settingsItem}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (item.action === 'redeem') {
                  navigation.navigate('Paywall');
                }
              }}
              testID={item.action === 'redeem' ? 'redeem-code-settings-button' : undefined}
            >
              <View style={styles.settingsItemLeft}>
                <View style={[
                  styles.settingsIcon,
                  item.action === 'redeem' ? styles.settingsIconHighlight : null
                ]}>
                  <Feather 
                    name={item.icon} 
                    size={20} 
                    color={item.action === 'redeem' ? COLORS.primary : COLORS.deepSlateBlue} 
                  />
                </View>
                <Text style={[
                  styles.settingsLabel,
                  item.action === 'redeem' ? styles.settingsLabelHighlight : null
                ]}>{item.label}</Text>
              </View>
              {item.type === 'toggle' ? (
                <Switch
                  value={false}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.sageGreen }}
                  thumbColor={COLORS.white}
                />
              ) : (
                <Feather name="chevron-right" size={20} color={COLORS.mediumGray} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity onPress={handleVersionTap} activeOpacity={0.7}>
          <Text style={[
            styles.version,
            isFieldDebugMode && styles.versionDebugActive
          ]}>
            Version {appVersion}
            {isFieldDebugMode ? ' (Debug Mode)' : ''}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {showToast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  content: {
    padding: SPACING.md,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.deepSlateBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  profileStats: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  proBadge: {
    backgroundColor: COLORS.sageGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
  },
  proBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  subscriptionCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.sageGreen,
    ...SHADOWS.sm,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  subscriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.sageGreen,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
  },
  subscriptionBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginLeft: SPACING.xs,
  },
  subscriptionDetails: {
    marginTop: SPACING.sm,
  },
  subscriptionExpiry: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
  },
  subscriptionDays: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginTop: 4,
  },
  upgradeCard: {
    backgroundColor: COLORS.terracottaOrange,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.md,
  },
  upgradeContent: {
    flex: 1,
  },
  upgradeTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  upgradeSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.white,
    opacity: 0.9,
    marginTop: 4,
  },
  devSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  devLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.mediumGray,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  devToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devToggleLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
  },
  settingsSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  settingsItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.softOffWhite,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.softOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  settingsLabel: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
  },
  settingsIconHighlight: {
    backgroundColor: 'rgba(224, 120, 86, 0.15)',
  },
  settingsLabelHighlight: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  version: {
    textAlign: 'center',
    color: COLORS.mediumGray,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  versionDebugActive: {
    color: COLORS.terracottaOrange,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  toast: {
    position: 'absolute',
    bottom: 100,
    left: SPACING.xl,
    right: SPACING.xl,
    backgroundColor: COLORS.deepSlateBlue,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.md,
  },
  toastText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
