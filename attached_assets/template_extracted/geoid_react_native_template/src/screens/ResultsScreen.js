import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import useStore from '../services/store';

const { width } = Dimensions.get('window');

const ResultsScreen = ({ route, navigation }) => {
  const { identification } = route.params;
  const { isPro } = useStore();
  const [expandedSection, setExpandedSection] = useState('origin');

  const toggleSection = (section) => {
    if (section === 'origin' || isPro) {
      setExpandedSection(expandedSection === section ? null : section);
    } else {
      navigation.navigate('Paywall');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* AR-Style Header with Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: identification.photo_url }}
            style={styles.image}
            resizeMode="cover"
          />
          
          {/* Glassmorphism Result Card */}
          <BlurView intensity={80} style={styles.resultCard}>
            <Text style={styles.rockName}>{identification.rock_name}</Text>
            <View style={styles.confidenceContainer}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.sageGreen} />
              <Text style={styles.confidenceText}>
                {Math.round(identification.confidence_score * 100)}% Confidence
              </Text>
            </View>
          </BlurView>

          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Progressive Disclosure Sections */}
        <View style={styles.content}>
          {/* The Origin - Free */}
          <TouchableOpacity
            style={styles.section}
            onPress={() => toggleSection('origin')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>The Origin</Text>
              <Ionicons
                name={expandedSection === 'origin' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={COLORS.deepSlateBlue}
              />
            </View>
            {expandedSection === 'origin' && (
              <Text style={styles.sectionContent}>
                Sandstone is a sedimentary rock formed from sand-sized mineral particles or rock
                fragments. It typically forms in environments where sand accumulates, such as
                beaches, deserts, and river beds, over millions of years.
              </Text>
            )}
          </TouchableOpacity>

          {/* The Formation - Pro */}
          <TouchableOpacity
            style={[styles.section, !isPro && styles.sectionLocked]}
            onPress={() => toggleSection('formation')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>The Formation</Text>
              <View style={styles.sectionRight}>
                {!isPro && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={16} color={COLORS.white} />
                  </View>
                )}
                <Ionicons
                  name={expandedSection === 'formation' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={!isPro ? COLORS.lightGray : COLORS.deepSlateBlue}
                />
              </View>
            </View>
            {!isPro ? (
              <BlurView intensity={20} style={styles.lockedContent}>
                <Ionicons name="lock-closed" size={32} color={COLORS.terracottaOrange} />
                <Text style={styles.lockedText}>Unlock with GeoID Pro</Text>
              </BlurView>
            ) : (
              expandedSection === 'formation' && (
                <Text style={styles.sectionContent}>
                  This sandstone formed during the Jurassic period, approximately 150-200 million
                  years ago. The cross-bedding patterns visible in the rock indicate it was
                  deposited by ancient wind-blown dunes in a desert environment.
                </Text>
              )
            )}
          </TouchableOpacity>

          {/* Cool Fact - Pro */}
          <TouchableOpacity
            style={[styles.section, !isPro && styles.sectionLocked]}
            onPress={() => toggleSection('fact')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cool Fact</Text>
              <View style={styles.sectionRight}>
                {!isPro && (
                  <View style={styles.lockBadge}>
                    <Ionicons name="lock-closed" size={16} color={COLORS.white} />
                  </View>
                )}
                <Ionicons
                  name={expandedSection === 'fact' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={!isPro ? COLORS.lightGray : COLORS.deepSlateBlue}
                />
              </View>
            </View>
            {!isPro ? (
              <BlurView intensity={20} style={styles.lockedContent}>
                <Ionicons name="lock-closed" size={32} color={COLORS.terracottaOrange} />
                <Text style={styles.lockedText}>Unlock with GeoID Pro</Text>
              </BlurView>
            ) : (
              expandedSection === 'fact' && (
                <Text style={styles.sectionContent}>
                  The Navajo Sandstone, a famous formation in the American Southwest, is so pure
                  that it's used to make glass! Its distinctive red color comes from iron oxide
                  coating the sand grains.
                </Text>
              )
            )}
          </TouchableOpacity>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="bookmark-outline" size={24} color={COLORS.deepSlateBlue} />
              <Text style={styles.actionButtonText}>Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="share-outline" size={24} color={COLORS.deepSlateBlue} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
  },
  imageContainer: {
    width: '100%',
    height: 400,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  resultCard: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.md,
    right: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  rockName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  confidenceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: BORDER_RADIUS.full,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionLocked: {
    opacity: 0.8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lockBadge: {
    backgroundColor: COLORS.terracottaOrange,
    padding: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  sectionContent: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    lineHeight: 24,
  },
  lockedContent: {
    marginTop: SPACING.md,
    padding: SPACING.xl,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  lockedText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.terracottaOrange,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
  },
  actionButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  actionButtonText: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});

export default ResultsScreen;
