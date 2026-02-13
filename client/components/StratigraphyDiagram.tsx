import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import FormationDetailModal from '@/components/FormationDetailModal';

export interface StratigraphicLayer {
  name: string;
  age: string;
  thickness?: string;
  lithology?: string;
  environment?: string;
  color: string;
  description?: string;
  minMa?: number;
  maxMa?: number;
}

interface StratigraphyDiagramProps {
  layers: StratigraphicLayer[];
  currentRockName?: string;
  locationName?: string;
  userLocation?: { latitude: number; longitude: number } | null;
}

const LAYER_COLORS: { [key: string]: string } = {
  limestone: '#D4C4A8',
  sandstone: '#E8B978',
  shale: '#7A8B7A',
  granite: '#C4B8A8',
  basalt: '#4A4A4A',
  schist: '#8A7A6A',
  gneiss: '#9A8A7A',
  marble: '#E8E4E0',
  quartzite: '#D8D0C8',
  slate: '#5A5A5A',
  conglomerate: '#B8A888',
  dolomite: '#C8C0B0',
  mudstone: '#9A8A7A',
  siltstone: '#B0A898',
  claystone: '#8A9A8A',
  tuff: '#C8B8A0',
  default: '#B8B0A0',
};

function getLayerColor(lithology?: string): string {
  if (!lithology) return LAYER_COLORS.default;
  const lith = lithology.toLowerCase();
  for (const [key, color] of Object.entries(LAYER_COLORS)) {
    if (lith.includes(key)) return color;
  }
  return LAYER_COLORS.default;
}

export default function StratigraphyDiagram({
  layers,
  currentRockName,
  locationName,
  userLocation,
}: StratigraphyDiagramProps) {
  const [showFullColumn, setShowFullColumn] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<StratigraphicLayer | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const handleLayerPress = (layer: StratigraphicLayer) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFormation(layer);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedFormation(null);
  };

  const displayLayers = showFullColumn ? layers : layers.slice(0, 5);
  const hasMoreLayers = layers.length > 5;

  const highlightedIndex = layers.findIndex(
    (layer) =>
      currentRockName &&
      layer.name.toLowerCase().includes(currentRockName.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Feather name="layers" size={18} color={COLORS.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>What's Under My Feet?</Text>
          {locationName ? (
            <Text style={styles.subtitle}>{locationName}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.columnContainer}>
        <View style={styles.depthScale}>
          <Text style={styles.depthLabel}>Surface</Text>
          <View style={styles.depthLine} />
          <Text style={styles.depthLabel}>Deep</Text>
        </View>

        <View style={styles.layersContainer}>
          {displayLayers.map((layer, index) => {
            const isHighlighted = index === highlightedIndex;
            const layerColor = layer.color || getLayerColor(layer.lithology);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.layer,
                  { backgroundColor: layerColor },
                  isHighlighted && styles.layerHighlighted,
                ]}
                onPress={() => handleLayerPress(layer)}
                activeOpacity={0.8}
              >
                <View style={styles.layerContent}>
                  <View style={styles.layerMain}>
                    <Text
                      style={[
                        styles.layerName,
                        isHighlighted && styles.layerNameHighlighted,
                      ]}
                      numberOfLines={1}
                    >
                      {layer.name}
                    </Text>
                    <Text style={styles.layerAge}>{layer.age}</Text>
                  </View>

                  {isHighlighted ? (
                    <View style={styles.highlightBadge}>
                      <Text style={styles.highlightBadgeText}>You Are Here</Text>
                    </View>
                  ) : null}

                  <View style={styles.infoIcon}>
                    <Feather name="info" size={14} color={COLORS.primary} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {hasMoreLayers ? (
        <TouchableOpacity
          style={styles.showMoreButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setShowFullColumn(!showFullColumn);
          }}
        >
          <Text style={styles.showMoreText}>
            {showFullColumn
              ? 'Show Less'
              : `Show ${layers.length - 5} More Layers`}
          </Text>
          <Feather
            name={showFullColumn ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.primary}
          />
        </TouchableOpacity>
      ) : null}

      <View style={styles.legendContainer}>
        <Feather name="info" size={12} color={COLORS.mediumGray} />
        <Text style={styles.legendTitle}>Tap any layer for fossils, facts & details</Text>
      </View>

      <FormationDetailModal
        visible={showDetailModal}
        onClose={handleCloseModal}
        formation={selectedFormation ? {
          name: selectedFormation.name,
          age: selectedFormation.age,
          lithology: selectedFormation.lithology || 'Unknown',
          environment: selectedFormation.environment || 'Unknown',
          thickness: selectedFormation.thickness,
          description: selectedFormation.description,
          minMa: selectedFormation.minMa,
          maxMa: selectedFormation.maxMa,
          color: selectedFormation.color || getLayerColor(selectedFormation.lithology),
        } : null}
        userLocation={userLocation}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  columnContainer: {
    flexDirection: 'row',
  },
  depthScale: {
    width: 40,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  depthLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    transform: [{ rotate: '-90deg' }],
    width: 50,
    textAlign: 'center',
  },
  depthLine: {
    flex: 1,
    width: 2,
    backgroundColor: COLORS.lightGray,
    marginVertical: SPACING.xs,
  },
  layersContainer: {
    flex: 1,
    gap: 2,
  },
  layer: {
    borderRadius: BORDER_RADIUS.sm,
    padding: SPACING.sm,
    minHeight: 50,
  },
  layerHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  layerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  layerMain: {
    flex: 1,
  },
  layerName: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  layerNameHighlighted: {
    color: COLORS.primary,
  },
  layerAge: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  highlightBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.button,
    marginRight: SPACING.sm,
  },
  highlightBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  showMoreText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
  legendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
  },
  legendTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
  },
});
