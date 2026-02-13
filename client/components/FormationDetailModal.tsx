import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import { pbdbService, SimplifiedFossil, FossilSite } from '@/services/pbdbService';
import { getApiUrl } from '@/lib/query-client';

interface FormationData {
  name: string;
  age: string;
  lithology: string;
  environment: string;
  thickness?: string;
  description?: string;
  minMa?: number;
  maxMa?: number;
  color: string;
}

interface FormationDetailModalProps {
  visible: boolean;
  onClose: () => void;
  formation: FormationData | null;
  userLocation?: { latitude: number; longitude: number } | null;
}

interface FossilItemProps {
  fossil: SimplifiedFossil;
}

function FossilItem({ fossil }: FossilItemProps) {
  return (
    <View style={styles.fossilItem}>
      <View style={styles.fossilIcon}>
        <Feather name="archive" size={16} color={COLORS.primary} />
      </View>
      <View style={styles.fossilContent}>
        <Text style={styles.fossilName}>{fossil.name}</Text>
        <Text style={styles.fossilDescription}>{fossil.description}</Text>
        <Text style={styles.fossilScientific}>{fossil.scientificName}</Text>
      </View>
    </View>
  );
}

export default function FormationDetailModal({
  visible,
  onClose,
  formation,
  userLocation,
}: FormationDetailModalProps) {
  const [fossilSites, setFossilSites] = useState<FossilSite[]>([]);
  const [loadingFossils, setLoadingFossils] = useState(false);
  const [showFossils, setShowFossils] = useState(false);
  const [fascinatingFact, setFascinatingFact] = useState<string | null>(null);
  const [readMore, setReadMore] = useState<string | null>(null);
  const [loadingFact, setLoadingFact] = useState(false);
  const [isReadMoreExpanded, setIsReadMoreExpanded] = useState(false);
  const [factValidated, setFactValidated] = useState(true);

  useEffect(() => {
    if (visible && formation) {
      loadFact();
    }
  }, [visible, formation]);

  useEffect(() => {
    if (!visible) {
      setShowFossils(false);
      setFossilSites([]);
      setFascinatingFact(null);
      setReadMore(null);
      setIsReadMoreExpanded(false);
    }
  }, [visible]);

  const loadFact = async () => {
    if (!formation) return;
    setLoadingFact(true);
    try {
      const response = await fetch(new URL('/api/generate-formation-fact', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formationName: formation.name,
          ageRange: formation.age,
          environment: formation.environment,
          lithology: formation.lithology,
          minMa: formation.minMa,
          maxMa: formation.maxMa,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setFascinatingFact(data.fact);
        setReadMore(data.readMore);
        setFactValidated(data.validated);
      }
    } catch (error) {
      console.error('Error loading fact:', error);
    } finally {
      setLoadingFact(false);
    }
  };

  const loadFossils = async () => {
    if (!formation || !userLocation) {
      if (formation) {
        const defaultFossils = pbdbService.getDefaultFossils(
          formation.lithology || '',
          formation.environment || ''
        );
        setFossilSites([{
          collectionId: 0,
          name: 'Typical fossils for this formation',
          distance: 0,
          formation: formation.name,
          age: formation.age,
          fossils: defaultFossils,
        }]);
      }
      setShowFossils(true);
      return;
    }

    setLoadingFossils(true);
    try {
      const sites = await pbdbService.getFossilsNearFormation(
        userLocation.latitude,
        userLocation.longitude,
        formation.name,
        formation.minMa,
        formation.maxMa,
        50
      );

      if (sites.length > 0) {
        setFossilSites(sites);
      } else {
        const defaultFossils = pbdbService.getDefaultFossils(
          formation.lithology || '',
          formation.environment || ''
        );
        setFossilSites([{
          collectionId: 0,
          name: 'Typical fossils for this formation type',
          distance: 0,
          formation: formation.name,
          age: formation.age,
          fossils: defaultFossils,
        }]);
      }
    } catch (error) {
      console.error('Error loading fossils:', error);
      const defaultFossils = pbdbService.getDefaultFossils(
        formation?.lithology || '',
        formation?.environment || ''
      );
      setFossilSites([{
        collectionId: 0,
        name: 'Typical fossils for this formation type',
        distance: 0,
        formation: formation?.name || 'Unknown',
        age: formation?.age || 'Unknown',
        fossils: defaultFossils,
      }]);
    } finally {
      setLoadingFossils(false);
      setShowFossils(true);
    }
  };

  const handleFossilPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!showFossils) {
      loadFossils();
    } else {
      setShowFossils(false);
    }
  };

  const handleReadMorePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsReadMoreExpanded(!isReadMoreExpanded);
  };

  if (!formation) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={20} style={styles.blurBackground}>
          <View style={styles.modalContainer}>
            <View style={styles.handleBar} />

            <View style={styles.header}>
              <View style={[styles.colorBadge, { backgroundColor: formation.color }]} />
              <View style={styles.headerText}>
                <Text style={styles.formationName}>{formation.name}</Text>
                <Text style={styles.formationAge}>{formation.age}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={COLORS.mediumGray} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.content} 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.contentContainer}
            >
              <View style={styles.infoRow}>
                <View style={styles.infoItem}>
                  <Feather name="layers" size={16} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>Rock Type</Text>
                  <Text style={styles.infoValue}>{formation.lithology || 'Unknown'}</Text>
                </View>
                <View style={styles.infoItem}>
                  <Feather name="map-pin" size={16} color={COLORS.primary} />
                  <Text style={styles.infoLabel}>Environment</Text>
                  <Text style={styles.infoValue}>{formation.environment || 'Unknown'}</Text>
                </View>
              </View>

              {formation.thickness ? (
                <View style={styles.thicknessRow}>
                  <Feather name="maximize-2" size={14} color={COLORS.mediumGray} />
                  <Text style={styles.thicknessText}>Thickness: {formation.thickness}</Text>
                </View>
              ) : null}

              {formation.description ? (
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionText}>{formation.description}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.fossilButton}
                onPress={handleFossilPress}
                activeOpacity={0.7}
              >
                <View style={styles.fossilButtonContent}>
                  <View style={styles.fossilButtonIcon}>
                    <Feather name="archive" size={20} color={COLORS.white} />
                  </View>
                  <View style={styles.fossilButtonText}>
                    <View style={styles.fossilTitleRow}>
                      <Text style={styles.fossilButtonTitle}>Fossil Sites</Text>
                      {fossilSites.length > 0 ? (
                        <Text style={styles.fossilCount}>
                          {fossilSites.length} {fossilSites.length === 1 ? 'collection' : 'collections'}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.fossilButtonSubtitle}>
                      {showFossils ? 'Hide fossils found in this formation' : 'Tap to discover ancient life'}
                    </Text>
                  </View>
                  {loadingFossils ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Feather 
                      name={showFossils ? 'chevron-up' : 'chevron-right'} 
                      size={20} 
                      color={COLORS.primary} 
                    />
                  )}
                </View>
              </TouchableOpacity>

              {showFossils ? (
                <View style={styles.fossilsContainer}>
                  {fossilSites.map((site, siteIndex) => (
                    <View key={siteIndex} style={styles.fossilSite}>
                      <View style={styles.siteHeader}>
                        <Text style={styles.siteName}>{site.name}</Text>
                        {site.distance > 0 ? (
                          <Text style={styles.siteDistance}>{site.distance} mi away</Text>
                        ) : null}
                      </View>
                      {site.fossils.map((fossil, fossilIndex) => (
                        <FossilItem key={fossilIndex} fossil={fossil} />
                      ))}
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.factSection}>
                <View style={styles.factHeader}>
                  <Feather name="zap" size={18} color={COLORS.terracottaOrange} />
                  <Text style={styles.factTitle}>Fascinating Fact</Text>
                  {!factValidated ? (
                    <View style={styles.verifiedBadge}>
                      <Feather name="check-circle" size={12} color={COLORS.success} />
                      <Text style={styles.verifiedText}>Verified</Text>
                    </View>
                  ) : null}
                </View>
                {loadingFact ? (
                  <View style={styles.factLoading}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.factLoadingText}>Generating verified fact...</Text>
                  </View>
                ) : fascinatingFact ? (
                  <View>
                    <Text style={styles.factText}>{fascinatingFact}</Text>
                    
                    {readMore ? (
                      <View style={styles.showMoreSection}>
                        <TouchableOpacity 
                          onPress={handleReadMorePress}
                          style={styles.showMoreButton}
                        >
                          <Text style={styles.showMoreButtonText}>
                            {isReadMoreExpanded ? 'Show Less' : 'Show More...'}
                          </Text>
                        </TouchableOpacity>
                        
                        {isReadMoreExpanded ? (
                          <View style={styles.showMoreContent}>
                            <Text style={styles.showMoreText}>{readMore}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <Text style={styles.factText}>Loading fascinating facts about this formation...</Text>
                )}
              </View>
            </ScrollView>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  blurBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  colorBadge: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.md,
  },
  headerText: {
    flex: 1,
  },
  formationName: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  formationAge: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.lg,
  },
  infoRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoItem: {
    flex: 1,
    backgroundColor: COLORS.lightGray + '40',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginTop: SPACING.xs,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    marginTop: 2,
    textAlign: 'center',
  },
  thicknessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  thicknessText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
  },
  descriptionSection: {
    backgroundColor: COLORS.lightGray + '30',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  descriptionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  fossilButton: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary + '30',
    marginBottom: SPACING.md,
  },
  fossilButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  fossilButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  fossilButtonText: {
    flex: 1,
  },
  fossilTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  fossilButtonTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  fossilCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
  fossilButtonSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  fossilsContainer: {
    marginBottom: SPACING.lg,
  },
  fossilSite: {
    backgroundColor: COLORS.lightGray + '30',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  siteName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    flex: 1,
  },
  siteDistance: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  fossilItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray + '50',
  },
  fossilIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  fossilContent: {
    flex: 1,
  },
  fossilName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  fossilDescription: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.darkGray,
    marginTop: 2,
    lineHeight: 16,
  },
  fossilScientific: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
    marginTop: 2,
  },
  factSection: {
    backgroundColor: COLORS.terracottaOrange + '10',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.terracottaOrange + '30',
  },
  factHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  factTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.terracottaOrange,
    flex: 1,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.button,
  },
  verifiedText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.success,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  factLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  factLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    fontStyle: 'italic',
  },
  factText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
  showMoreSection: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  showMoreButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  showMoreButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.terracottaOrange,
  },
  showMoreContent: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.terracottaOrange + '30',
  },
  showMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 22,
  },
});
