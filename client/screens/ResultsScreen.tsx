import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import { openaiService, DeepDiveContent } from '@/services/openaiService';
import { AppConfig } from '@/config/appConfig';
import ProBadge from '@/components/ProBadge';
import { analyticsService } from '@/services/analyticsService';
import { getApiUrl } from '@/lib/query-client';
import { supabase } from '@/services/supabaseService';
import StratigraphyDiagram from '@/components/StratigraphyDiagram';

const { width } = Dimensions.get('window');

interface ResultsScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route: RouteProp<{ Results: { identification: any } }, 'Results'>;
}

export default function ResultsScreen({ route, navigation }: ResultsScreenProps) {
  const { identification } = route.params;
  const insets = useSafeAreaInsets();
  const { isPro } = useStore();
  const [expandedSection, setExpandedSection] = useState<string | null>('origin');
  
  const [deepDiveContent, setDeepDiveContent] = useState<DeepDiveContent[]>([]);
  const [deepDiveLevel, setDeepDiveLevel] = useState(0);
  const [isLoadingDeepDive, setIsLoadingDeepDive] = useState(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);
  
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(
    identification.user_feedback_accuracy !== null
  );
  const [selectedFeedback, setSelectedFeedback] = useState<string | null>(
    identification.user_feedback_accuracy
  );

  const submitFeedback = async (feedback: 'correct' | 'incorrect' | 'unsure') => {
    if (feedbackSubmitted) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFeedback(feedback);
    setFeedbackSubmitted(true);

    try {
      await fetch(new URL('/api/feedback', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identification_id: identification.id,
          feedback,
        }),
      });

      try {
        if (supabase) {
          await supabase.from('identifications').update({
            user_feedback_accuracy: feedback,
          }).eq('id', identification.id);
        }
      } catch (dbError) {
        console.warn('Failed to update Supabase:', dbError);
      }

      await analyticsService.trackEvent('feedback_submitted', {
        identification_id: identification.id,
        rock_name: identification.rock_name,
        feedback,
      });
    } catch (error) {
      console.error('Feedback submission error:', error);
    }
  };

  const toggleSection = (section: string) => {
    // In dev mode, all sections are accessible
    if (section === 'origin' || section === 'location' || AppConfig.isDevMode || isPro) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setExpandedSection(expandedSection === section ? null : section);
    } else {
      navigation.navigate('Paywall');
    }
  };

  const loadDeepDive = async () => {
    if (deepDiveContent.length > 0) {
      revealNextLevel();
      return;
    }

    setIsLoadingDeepDive(true);
    setDeepDiveError(null);

    try {
      const result = await openaiService.generateDeepDive(
        identification.rock_name,
        identification.rock_type,
        {
          description: identification.description,
          origin: identification.origin,
          formation: identification.formation,
          cool_fact: identification.cool_fact,
          minerals: identification.minerals,
          hardness: identification.hardness,
          uses: identification.uses,
        },
        identification.bedrock_formation ? {
          name: identification.bedrock_formation.name,
          age: identification.bedrock_formation.age,
          rock_type: identification.bedrock_formation.rock_type,
        } : undefined
      );

      if (result.success && result.levels) {
        setDeepDiveContent(result.levels);
        setDeepDiveLevel(1);
        
        await analyticsService.trackEvent('feature_used', {
          feature_name: 'deep_dive',
          level: 1,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setDeepDiveError(result.error || 'Failed to load content');
      }
    } catch (error) {
      setDeepDiveError('Failed to load deep dive content');
    } finally {
      setIsLoadingDeepDive(false);
    }
  };

  const revealNextLevel = async () => {
    if (deepDiveLevel < 4) {
      const nextLevel = deepDiveLevel + 1;
      setDeepDiveLevel(nextLevel);
      
      await analyticsService.trackEvent('feature_used', {
        feature_name: 'deep_dive',
        level: nextLevel,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const confidencePercent = Math.round(identification.confidence_score * 100);

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 1: return 'file-text';
      case 2: return 'layers';
      case 3: return 'globe';
      case 4: return 'star';
      default: return 'file-text';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: identification.photo_url }}
            style={styles.image}
            contentFit="cover"
          />

          <BlurView intensity={80} style={styles.resultCard}>
            <View style={styles.resultCardContent}>
              <View style={styles.rockNameRow}>
                <Text style={styles.rockName}>{identification.rock_name}</Text>
                {(AppConfig.isDevMode || identification.tier === 'Pro') ? (
                  <ProBadge size="small" style={styles.proBadge} />
                ) : null}
              </View>
              <Text style={styles.rockType}>{identification.rock_type}</Text>
              {identification.dual_ai_verified && identification.ai_agreement ? (
                <View style={styles.dualAiBadge}>
                  <Feather name="check-circle" size={12} color={COLORS.success} />
                  <Text style={styles.dualAiBadgeText}>Verified by Dual AI</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceRing}>
                <Text style={styles.confidencePercent}>{confidencePercent}%</Text>
              </View>
            </View>
          </BlurView>

          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + SPACING.sm }]}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          {!isPro && identification.tier === 'Free' && (
            <View style={[styles.tierBadge, { top: insets.top + SPACING.sm }]}>
              <Text style={styles.tierBadgeText}>FREE TIER</Text>
            </View>
          )}
        </View>

        <View style={[styles.content, { paddingBottom: insets.bottom + SPACING.xl }]}>
          {identification.location && (
            <TouchableOpacity
              style={styles.section}
              onPress={() => toggleSection('location')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Feather name="map-pin" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Location</Text>
                <Feather
                  name={expandedSection === 'location' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={COLORS.deepSlateBlue}
                />
              </View>
              {expandedSection === 'location' && (
                <View style={styles.locationContent}>
                  <View style={styles.locationRow}>
                    <Feather name="navigation" size={16} color={COLORS.mediumGray} />
                    <Text style={styles.locationText}>
                      {identification.location.formatted}
                    </Text>
                  </View>
                  {identification.location.elevation ? (
                    <View style={styles.locationRow}>
                      <Feather name="trending-up" size={16} color={COLORS.mediumGray} />
                      <Text style={styles.locationText}>
                        Elevation: {identification.location.elevation}
                      </Text>
                    </View>
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          )}

          {identification.bedrock_formation && (
            <View style={styles.formationCard}>
              <View style={styles.formationHeader}>
                <Feather name="layers" size={20} color={COLORS.primary} />
                <Text style={styles.formationTitle}>Geological Formation</Text>
              </View>
              <Text style={styles.formationName}>
                {identification.bedrock_formation.name}
              </Text>
              <View style={styles.formationDetails}>
                <View style={styles.formationDetail}>
                  <Text style={styles.formationLabel}>Age</Text>
                  <Text style={styles.formationValue}>
                    {identification.bedrock_formation.age}
                  </Text>
                </View>
                <View style={styles.formationDetail}>
                  <Text style={styles.formationLabel}>Rock Type</Text>
                  <Text style={styles.formationValue}>
                    {identification.bedrock_formation.rock_type}
                  </Text>
                </View>
              </View>
              {identification.bedrock_formation.description ? (
                <Text style={styles.formationDescription}>
                  {identification.bedrock_formation.description}
                </Text>
              ) : null}
              <Text style={styles.formationSource}>
                Source: {identification.bedrock_formation.source}
              </Text>
            </View>
          )}

          {identification.dual_ai_verified && !identification.ai_agreement && identification.secondary_ai_result ? (
            <View style={styles.multiplePossibilitiesCard}>
              <View style={styles.multiplePossibilitiesHeader}>
                <Feather name="git-branch" size={20} color={COLORS.terracottaOrange} />
                <Text style={styles.multiplePossibilitiesTitle}>Multiple Possibilities Found</Text>
              </View>
              <Text style={styles.multiplePossibilitiesSubtitle}>
                Two AI models analyzed this rock and had different opinions:
              </Text>
              <View style={styles.aiResultsRow}>
                <View style={styles.aiResultCard}>
                  <Text style={styles.aiResultLabel}>Primary Analysis</Text>
                  <Text style={styles.aiResultValue}>{identification.rock_name}</Text>
                  <View style={styles.aiResultBadge}>
                    <Text style={styles.aiResultBadgeText}>GPT-4o</Text>
                  </View>
                </View>
                <View style={styles.aiResultCard}>
                  <Text style={styles.aiResultLabel}>Secondary Analysis</Text>
                  <Text style={styles.aiResultValue}>{identification.secondary_ai_result}</Text>
                  <View style={[styles.aiResultBadge, styles.aiResultBadgeSecondary]}>
                    <Text style={styles.aiResultBadgeText}>Gemini</Text>
                  </View>
                </View>
              </View>
              <Text style={styles.multiplePossibilitiesNote}>
                Both identifications are plausible. Consider the geological context or consult a local expert.
              </Text>
            </View>
          ) : null}

          {identification.suggested_rocks && identification.suggested_rocks.length > 1 ? (
            <View style={styles.suggestionsCard}>
              <Text style={styles.suggestionsTitle}>Other Possible Rocks</Text>
              <View style={styles.suggestionsRow}>
                {identification.suggested_rocks
                  .filter((rock: string) => rock !== identification.rock_name)
                  .slice(0, 3)
                  .map((rock: string, index: number) => (
                    <View key={index} style={styles.suggestionChip}>
                      <Text style={styles.suggestionText}>{rock}</Text>
                    </View>
                  ))}
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.section}
            onPress={() => toggleSection('origin')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Feather name="clock" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>The Origin</Text>
              <Feather
                name={expandedSection === 'origin' ? 'chevron-up' : 'chevron-down'}
                size={24}
                color={COLORS.deepSlateBlue}
              />
            </View>
            {expandedSection === 'origin' && (
              <Text style={styles.sectionContent}>
                {identification.origin}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.section, !isPro && styles.sectionLocked]}
            onPress={() => toggleSection('formation')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Feather name="layers" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>The Formation Process</Text>
              <View style={styles.sectionRight}>
                {!isPro && (
                  <View style={styles.lockBadge}>
                    <Feather name="lock" size={14} color={COLORS.white} />
                  </View>
                )}
                <Feather
                  name={expandedSection === 'formation' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={!isPro ? COLORS.lightGray : COLORS.deepSlateBlue}
                />
              </View>
            </View>
            {!isPro ? (
              <View style={styles.lockedContent}>
                <Feather name="lock" size={28} color={COLORS.primary} />
                <Text style={styles.lockedText}>Unlock with GeoID Pro</Text>
              </View>
            ) : (
              expandedSection === 'formation' && (
                <Text style={styles.sectionContent}>
                  {identification.formation}
                </Text>
              )
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.section, !isPro && styles.sectionLocked]}
            onPress={() => toggleSection('fact')}
            activeOpacity={0.7}
          >
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIcon}>
                <Feather name="star" size={20} color={COLORS.primary} />
              </View>
              <Text style={styles.sectionTitle}>Cool Fact</Text>
              <View style={styles.sectionRight}>
                {!isPro && (
                  <View style={styles.lockBadge}>
                    <Feather name="lock" size={14} color={COLORS.white} />
                  </View>
                )}
                <Feather
                  name={expandedSection === 'fact' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={!isPro ? COLORS.lightGray : COLORS.deepSlateBlue}
                />
              </View>
            </View>
            {!isPro ? (
              <View style={styles.lockedContent}>
                <Feather name="lock" size={28} color={COLORS.primary} />
                <Text style={styles.lockedText}>Unlock with GeoID Pro</Text>
              </View>
            ) : (
              expandedSection === 'fact' && (
                <Text style={styles.sectionContent}>
                  {identification.cool_fact}
                </Text>
              )
            )}
          </TouchableOpacity>

          {isPro && identification.why_here && (
            <TouchableOpacity
              style={styles.section}
              onPress={() => toggleSection('whyHere')}
              activeOpacity={0.7}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIcon}>
                  <Feather name="help-circle" size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.sectionTitle}>Why Here?</Text>
                <Feather
                  name={expandedSection === 'whyHere' ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={COLORS.deepSlateBlue}
                />
              </View>
              {expandedSection === 'whyHere' && (
                <Text style={styles.sectionContent}>
                  {identification.why_here}
                </Text>
              )}
            </TouchableOpacity>
          )}

          {isPro && identification.what_else && identification.what_else.length > 0 ? (
            <View style={styles.whatElseCard}>
              <View style={styles.whatElseHeader}>
                <Feather name="compass" size={20} color={COLORS.primary} />
                <Text style={styles.whatElseTitle}>What Else Might You Find?</Text>
              </View>
              <Text style={styles.whatElseSubtitle}>
                Other rocks commonly found in this geological area:
              </Text>
              <View style={styles.whatElseRow}>
                {identification.what_else.map((rock: string, index: number) => (
                  <View key={index} style={styles.whatElseChip}>
                    <Feather name="circle" size={8} color={COLORS.primary} />
                    <Text style={styles.whatElseText}>{rock}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {isPro && identification.stratigraphic_column && identification.stratigraphic_column.length > 0 ? (
            <StratigraphyDiagram
              layers={identification.stratigraphic_column}
              currentRockName={identification.rock_name}
              locationName={identification.location?.formatted}
              userLocation={identification.location ? {
                latitude: identification.location.latitude,
                longitude: identification.location.longitude,
              } : null}
            />
          ) : null}

          {isPro && identification.tier === 'Pro' && (
            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackTitle}>Was this identification helpful?</Text>
              {feedbackSubmitted ? (
                <View style={styles.feedbackSubmitted}>
                  <Feather name="check-circle" size={20} color={COLORS.sageGreen} />
                  <Text style={styles.feedbackSubmittedText}>
                    Thanks for your feedback!
                  </Text>
                </View>
              ) : (
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    style={[
                      styles.feedbackButton,
                      styles.feedbackCorrect,
                      selectedFeedback === 'correct' && styles.feedbackSelected,
                    ]}
                    onPress={() => submitFeedback('correct')}
                  >
                    <Text style={styles.feedbackIcon}>Correct</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.feedbackButton,
                      styles.feedbackIncorrect,
                      selectedFeedback === 'incorrect' && styles.feedbackSelected,
                    ]}
                    onPress={() => submitFeedback('incorrect')}
                  >
                    <Text style={styles.feedbackIcon}>Incorrect</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.feedbackButton,
                      styles.feedbackUnsure,
                      selectedFeedback === 'unsure' && styles.feedbackSelected,
                    ]}
                    onPress={() => submitFeedback('unsure')}
                  >
                    <Text style={styles.feedbackIcon}>Unsure</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {isPro && (
            <View style={styles.deepDiveSection}>
              <View style={styles.deepDiveHeader}>
                <View style={styles.deepDiveIconContainer}>
                  <Feather name="book-open" size={24} color={COLORS.white} />
                </View>
                <View style={styles.deepDiveHeaderText}>
                  <Text style={styles.deepDiveTitle}>Deep Dive</Text>
                  <Text style={styles.deepDiveSubtitle}>
                    {deepDiveLevel === 0 
                      ? 'Explore 4 levels of geological knowledge'
                      : `Level ${deepDiveLevel} of 4 unlocked`}
                  </Text>
                </View>
              </View>

              {deepDiveLevel > 0 && deepDiveContent.length > 0 && (
                <View style={styles.deepDiveLevels}>
                  {deepDiveContent.slice(0, deepDiveLevel).map((level, index) => (
                    <Animated.View
                      key={level.level}
                      entering={FadeInDown.delay(index * 100).duration(400)}
                      style={styles.deepDiveLevelCard}
                    >
                      <View style={styles.levelHeader}>
                        <View style={styles.levelIconContainer}>
                          <Feather name={getLevelIcon(level.level)} size={16} color={COLORS.primary} />
                        </View>
                        <Text style={styles.levelTitle}>{level.title}</Text>
                        <View style={styles.levelBadge}>
                          <Text style={styles.levelBadgeText}>Level {level.level}</Text>
                        </View>
                      </View>
                      <Text style={styles.levelContent}>{level.content}</Text>
                    </Animated.View>
                  ))}
                </View>
              )}

              {deepDiveError ? (
                <View style={styles.deepDiveError}>
                  <Feather name="alert-circle" size={20} color={COLORS.error} />
                  <Text style={styles.deepDiveErrorText}>{deepDiveError}</Text>
                </View>
              ) : null}

              {deepDiveLevel < 4 && (
                <TouchableOpacity
                  style={[
                    styles.tellMeMoreButton,
                    isLoadingDeepDive && styles.tellMeMoreButtonDisabled
                  ]}
                  onPress={loadDeepDive}
                  disabled={isLoadingDeepDive}
                  activeOpacity={0.8}
                >
                  {isLoadingDeepDive ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <>
                      <Feather name="plus-circle" size={20} color={COLORS.white} />
                      <Text style={styles.tellMeMoreText}>
                        {deepDiveLevel === 0 ? 'Tell Me More' : 'Continue Learning'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {deepDiveLevel === 4 && (
                <View style={styles.deepDiveComplete}>
                  <Feather name="check-circle" size={20} color={COLORS.sageGreen} />
                  <Text style={styles.deepDiveCompleteText}>Deep dive complete!</Text>
                </View>
              )}
            </View>
          )}

          {!isPro && (
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => navigation.navigate('Paywall')}
            >
              <View style={styles.upgradeContent}>
                <Feather name="zap" size={24} color={COLORS.white} />
                <View style={styles.upgradeTextContainer}>
                  <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
                  <Text style={styles.upgradeSubtitle}>
                    Unlock Deep Dive, AI identification & unlimited IDs
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={24} color={COLORS.white} />
            </TouchableOpacity>
          )}

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.primary }]}>
                <Feather name="share" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.actionButtonText}>Share Discovery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <View style={[styles.actionButtonIcon, { backgroundColor: COLORS.deepSlateBlue }]}>
                <Feather name="bookmark" size={20} color={COLORS.white} />
              </View>
              <Text style={styles.actionButtonText}>Save to Collection</Text>
            </TouchableOpacity>
          </View>

          {__DEV__ && identification.photo_url && (
            <TouchableOpacity
              style={styles.devReexamineButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Identify', {
                  reexamineImage: identification.photo_url,
                  reexamineLocation: identification.location ? {
                    latitude: identification.location.latitude,
                    longitude: identification.location.longitude,
                    altitude: identification.location.altitude,
                  } : null,
                });
              }}
            >
              <Feather name="refresh-cw" size={18} color={COLORS.terracottaOrange} />
              <Text style={styles.devReexamineText}>Re-Examine (Dev Only)</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warmBeige,
  },
  imageContainer: {
    width: '100%',
    height: 420,
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
    borderRadius: BORDER_RADIUS.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCardContent: {
    flex: 1,
  },
  rockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rockName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  proBadge: {
    marginLeft: SPACING.xs,
  },
  rockType: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  dualAiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.3)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.button,
    marginTop: SPACING.xs,
    gap: 4,
  },
  dualAiBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.success,
  },
  confidenceContainer: {
    marginLeft: SPACING.md,
  },
  confidenceRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: COLORS.sageGreen,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(39, 174, 96, 0.2)',
  },
  confidencePercent: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  tierBadge: {
    position: 'absolute',
    right: SPACING.md,
    backgroundColor: COLORS.info,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.button,
  },
  tierBadgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  content: {
    padding: SPACING.md,
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  sectionLocked: {
    opacity: 0.9,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.warmBeige,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  sectionTitle: {
    flex: 1,
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
    backgroundColor: COLORS.primary,
    padding: 6,
    borderRadius: BORDER_RADIUS.sm,
  },
  sectionContent: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    lineHeight: 24,
  },
  locationContent: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  locationText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
  },
  lockedContent: {
    marginTop: SPACING.md,
    padding: SPACING.xl,
    alignItems: 'center',
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.card,
  },
  lockedText: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
  },
  formationCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    ...SHADOWS.sm,
  },
  formationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  formationTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  formationName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.md,
  },
  formationDetails: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.md,
  },
  formationDetail: {
    flex: 1,
  },
  formationLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginBottom: 4,
  },
  formationValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  formationDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 20,
    marginBottom: SPACING.sm,
  },
  formationSource: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.lightGray,
    fontStyle: 'italic',
  },
  multiplePossibilitiesCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.terracottaOrange,
    ...SHADOWS.sm,
  },
  multiplePossibilitiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  multiplePossibilitiesTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.terracottaOrange,
  },
  multiplePossibilitiesSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginBottom: SPACING.md,
  },
  aiResultsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiResultCard: {
    flex: 1,
    backgroundColor: COLORS.warmBeige + '40',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  aiResultLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginBottom: 4,
  },
  aiResultValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  aiResultBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.button,
  },
  aiResultBadgeSecondary: {
    backgroundColor: COLORS.info,
  },
  aiResultBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  multiplePossibilitiesNote: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  suggestionsCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginBottom: SPACING.sm,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  suggestionChip: {
    backgroundColor: COLORS.warmBeige,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.button,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  deepDiveSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.primary,
    ...SHADOWS.md,
  },
  deepDiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  deepDiveIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.card,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  deepDiveHeaderText: {
    flex: 1,
  },
  deepDiveTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  deepDiveSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  deepDiveLevels: {
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  deepDiveLevelCard: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  levelIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  levelTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  levelBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  levelBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  levelContent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  deepDiveError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderRadius: BORDER_RADIUS.card,
    marginBottom: SPACING.md,
  },
  deepDiveErrorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.error,
  },
  tellMeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.button,
  },
  tellMeMoreButtonDisabled: {
    opacity: 0.7,
  },
  tellMeMoreText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  deepDiveComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
    borderRadius: BORDER_RADIUS.card,
  },
  deepDiveCompleteText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.sageGreen,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  upgradeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  upgradeTextContainer: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  upgradeTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  upgradeSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.card,
    ...SHADOWS.sm,
  },
  actionButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  actionButtonText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  devReexamineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.terracottaOrange + '15',
    borderWidth: 1,
    borderColor: COLORS.terracottaOrange,
    borderStyle: 'dashed',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.card,
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  devReexamineText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.terracottaOrange,
  },
  whatElseCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.sageGreen,
    ...SHADOWS.sm,
  },
  whatElseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  whatElseTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  whatElseSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginBottom: SPACING.md,
  },
  whatElseRow: {
    flexDirection: 'column',
    gap: SPACING.sm,
  },
  whatElseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  whatElseText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
  },
  feedbackSection: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  feedbackTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.md,
  },
  feedbackButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  feedbackButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    borderWidth: 1,
  },
  feedbackCorrect: {
    borderColor: COLORS.sageGreen,
    backgroundColor: 'rgba(39, 174, 96, 0.1)',
  },
  feedbackIncorrect: {
    borderColor: COLORS.error,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },
  feedbackUnsure: {
    borderColor: COLORS.warning,
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
  },
  feedbackSelected: {
    opacity: 0.6,
  },
  feedbackIcon: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.darkGray,
  },
  feedbackSubmitted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  feedbackSubmittedText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.sageGreen,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
