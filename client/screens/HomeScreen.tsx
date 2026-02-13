import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import { AppConfig, isProUnlocked } from '@/config/appConfig';
import DevModeBanner from '@/components/DevModeBanner';
import { offlineCacheService, CacheStatus } from '@/services/offlineCacheService';

const { width, height } = Dimensions.get('window');

interface HomeScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const isPro = useStore((state) => state.isPro);
  const canIdentify = useStore((state) => state.canIdentify);
  const getRemainingIdentifications = useStore((state) => state.getRemainingIdentifications);
  const [networkStatus, setNetworkStatus] = useState<{ isOnline: boolean; cachedRegions: number }>({ isOnline: true, cachedRegions: 0 });

  useFocusEffect(
    useCallback(() => {
      const check = async () => {
        const status = await offlineCacheService.getCacheStatus();
        setNetworkStatus({ isOnline: status.isOnline, cachedRegions: status.cachedRegionsCount });
      };
      check();
    }, [])
  );

  const showAsProUnlocked = isProUnlocked(isPro);

  const headerBrand = isPro ? 'GeoID Pro' : 'GeoID';

  const handleIdentify = () => {
    if (!canIdentify()) {
      navigation.navigate('Paywall');
    } else {
      navigation.navigate('Identify');
    }
  };

  const handleExplore = () => {
    // In dev mode, bypass Pro check
    if (!AppConfig.isDevMode && !isPro) {
      navigation.navigate('Paywall');
    } else {
      navigation.navigate('Explore');
    }
  };

  const handleWhatsUnder = () => {
    navigation.navigate('StratigraphicColumn');
  };

  return (
    <View style={styles.container}>
      <DevModeBanner position="top" />
      <View style={styles.headerContainer}>
        <Image
          source={require('../../assets/images/mitten_buttes_scenic_clean.jpg')}
          style={styles.scenicImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={[styles.headerContent, { paddingTop: insets.top + SPACING.sm }]}>
            <View style={styles.brandingContainer}>
              <View style={styles.logoContainer}>
                <Image
                  source={require('../../assets/images/geoid_logo_splashPin.png')}
                  style={styles.headerLogo}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.headerTitle}>{headerBrand}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Feather name="settings" size={24} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.mainContent}>
        <TouchableOpacity
          style={styles.fab}
          onPress={handleIdentify}
          activeOpacity={0.8}
        >
          <Feather name="camera" size={28} color={COLORS.white} />
          <Text style={styles.fabText}>Identify{'\n'}Feature</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: tabBarHeight + SPACING.xl }
          ]}
          showsVerticalScrollIndicator={false}
        >
          {!networkStatus.isOnline ? (
            <View style={styles.offlineBanner}>
              <Feather name="wifi-off" size={14} color={COLORS.white} />
              <Text style={styles.offlineBannerText}>
                Offline Mode {networkStatus.cachedRegions > 0 ? `- ${networkStatus.cachedRegions} area${networkStatus.cachedRegions !== 1 ? 's' : ''} cached` : '- No cached data'}
              </Text>
            </View>
          ) : null}

          {!isPro ? (
            <View style={styles.limitBanner}>
              <Text style={styles.limitText}>
                {getRemainingIdentifications()} identifications remaining today
              </Text>
            </View>
          ) : null}

          <View style={styles.cardsContainer}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Collection')}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: COLORS.deepSlateBlue }]}>
                <Feather name="layers" size={28} color={COLORS.white} />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>My Collection</Text>
                <Text style={styles.cardDescription}>
                  View my geological discoveries and collections.
                </Text>
              </View>
              <Feather name="chevron-right" size={24} color={COLORS.mediumGray} style={styles.cardArrow} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, !showAsProUnlocked && styles.cardLocked]}
              onPress={handleExplore}
              activeOpacity={0.7}
            >
              {!showAsProUnlocked && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              <View style={[styles.cardIcon, { backgroundColor: COLORS.terracottaOrange }]}>
                <Feather name="compass" size={28} color={COLORS.white} />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={[styles.cardTitle, !showAsProUnlocked && styles.cardTitleFaded]}>
                  Explore Nearby
                </Text>
                <Text style={[styles.cardDescription, !showAsProUnlocked && styles.cardDescriptionFaded]}>
                  Explore nearby geological features and hotspots.
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={24}
                color={!showAsProUnlocked ? COLORS.lightGray : COLORS.mediumGray}
                style={styles.cardArrow}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={handleWhatsUnder}
              activeOpacity={0.7}
              testID="button-whats-under"
            >
              <View style={[styles.cardIcon, { backgroundColor: COLORS.sageGreen }]}>
                <Feather name="chevrons-down" size={28} color={COLORS.white} />
              </View>
              <View style={styles.cardTextContent}>
                <Text style={styles.cardTitle}>What's Under My Feet?</Text>
                <Text style={styles.cardDescription}>
                  See the rock layers beneath your current location.
                </Text>
              </View>
              <Feather name="chevron-right" size={24} color={COLORS.mediumGray} style={styles.cardArrow} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warmBeige,
  },
  headerContainer: {
    height: height * 0.42,
    width: '100%',
    position: 'relative',
  },
  scenicImage: {
    width: '100%',
    height: '100%',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  brandingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
  },
  headerLogo: {
    width: 56,
    height: 56,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.deepSlateBlue,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.warmBeige,
    borderTopLeftRadius: BORDER_RADIUS.card,
    borderTopRightRadius: BORDER_RADIUS.card,
    marginTop: -BORDER_RADIUS.card,
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    top: -55,
    left: '50%',
    marginLeft: -60,
    backgroundColor: COLORS.primary,
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...SHADOWS.lg,
  },
  fabText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 90,
    paddingHorizontal: SPACING.md,
  },
  limitBanner: {
    backgroundColor: COLORS.info,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
  },
  limitText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textAlign: 'center',
  },
  cardsContainer: {
    gap: SPACING.md,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.md,
  },
  cardLocked: {
    opacity: 0.85,
  },
  proBadge: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.sageGreen,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  proBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  cardTextContent: {
    flex: 1,
    paddingRight: SPACING.lg,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.xs,
  },
  cardTitleFaded: {
    color: COLORS.mediumGray,
  },
  cardDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    lineHeight: 20,
  },
  cardDescriptionFaded: {
    color: COLORS.lightGray,
  },
  cardArrow: {
    position: 'absolute',
    right: SPACING.md,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.terracottaOrange,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
    gap: 8,
  },
  offlineBannerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
