import React from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import useStore from '../services/store';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const { isPro, getHeaderBrand, getRemainingIdentifications } = useStore();

  const handleIdentify = () => {
    const canIdentify = useStore.getState().canIdentify();
    if (!canIdentify) {
      navigation.navigate('Paywall');
    } else {
      navigation.navigate('Identify');
    }
  };

  const handleExplore = () => {
    if (!isPro) {
      navigation.navigate('Paywall');
    } else {
      navigation.navigate('Explore');
    }
  };

  return (
    <View style={styles.container}>
      {/* Scenic Header - 40% height */}
      <View style={styles.headerContainer}>
        <Image
          source={require('../../assets/images/geoid_pro_home_scenic_mockup.png')}
          style={styles.scenicImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.3)', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Image
                source={require('../../assets/images/geoid_logo_splashPin.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>{getHeaderBrand()}</Text>
            </View>
            <TouchableOpacity style={styles.settingsButton}>
              <Ionicons name="settings-outline" size={28} color={COLORS.white} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Floating Action Button - Overlapping */}
        <TouchableOpacity
          style={styles.fab}
          onPress={handleIdentify}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={32} color={COLORS.white} />
          <Text style={styles.fabText}>Identify Feature</Text>
        </TouchableOpacity>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Daily Limit Counter (Free users only) */}
          {!isPro && (
            <View style={styles.limitBanner}>
              <Text style={styles.limitText}>
                {getRemainingIdentifications()} identifications remaining today
              </Text>
            </View>
          )}

          {/* Feature Cards */}
          <View style={styles.cardsContainer}>
            {/* My Collection Card */}
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('Collection')}
              activeOpacity={0.7}
            >
              <View style={[styles.cardIcon, { backgroundColor: COLORS.deepSlateBlue }]}>
                <Ionicons name="layers" size={32} color={COLORS.white} />
              </View>
              <Text style={styles.cardTitle}>My Collection</Text>
              <Text style={styles.cardDescription}>
                Ereart my geological cairns for collections and mons.
              </Text>
              <Ionicons name="chevron-forward" size={24} color={COLORS.mediumGray} style={styles.cardArrow} />
            </TouchableOpacity>

            {/* Explore Nearby Card */}
            <TouchableOpacity
              style={[styles.card, !isPro && styles.cardLocked]}
              onPress={handleExplore}
              activeOpacity={0.7}
            >
              {!isPro && (
                <View style={styles.proBadge}>
                  <Text style={styles.proBadgeText}>PRO</Text>
                </View>
              )}
              <View style={[styles.cardIcon, { backgroundColor: COLORS.terracottaOrange }]}>
                <Ionicons name="compass" size={32} color={COLORS.white} />
              </View>
              <Text style={[styles.cardTitle, !isPro && styles.cardTitleFaded]}>
                Explore Nearby
              </Text>
              <Text style={[styles.cardDescription, !isPro && styles.cardDescriptionFaded]}>
                Explore nearby with geological lovm, and explore on.
              </Text>
              <Ionicons
                name="chevron-forward"
                size={24}
                color={!isPro ? COLORS.lightGray : COLORS.mediumGray}
                style={styles.cardArrow}
              />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
  },
  headerContainer: {
    height: height * 0.4,
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
    height: 120,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    marginTop: -BORDER_RADIUS.md,
    position: 'relative',
  },
  fab: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    backgroundColor: COLORS.terracottaOrange,
    width: 140,
    height: 140,
    borderRadius: 70,
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
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
    position: 'relative',
    ...SHADOWS.md,
  },
  cardLocked: {
    opacity: 0.7,
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
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
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
    bottom: SPACING.lg,
    right: SPACING.lg,
  },
});

export default HomeScreen;
