import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Defs, ClipPath, Rect, Line, Circle, Pattern as SvgPattern, Polygon } from 'react-native-svg';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '@/constants/theme';
import {
  macrostratService,
  StratigraphicColumn,
  StratigraphicUnit,
  LithologyEntry,
} from '@/services/macrostratService';
import { analyticsService } from '@/services/analyticsService';
import { AppConfig } from '@/config/appConfig';
import ProBadge from '@/components/ProBadge';
import {
  calculateAdaptiveHeight,
  isKnownAquifer,
  getFormationFact,
  metersToFeet,
  isBedrock,
  getMaxDepthForLocation,
  getRockHardness,
  getLayerWidth,
  getPrimaryLithology,
  detectBoundaryType,
  getLithologyPatternType,
} from '@/lib/geologyHelpers';

const DEMO_LOCATION = { lat: 30.0658, lng: -97.7745 };

const { width, height: screenHeight } = Dimensions.get('window');
const DEPTH_SCALE_WIDTH = 50;
const LAYER_MAX_WIDTH = width - DEPTH_SCALE_WIDTH - SPACING.md * 2 - 20;

const INITIAL_VIEW_HEIGHT_RATIO = 0.6;
const KT_BOUNDARY_AGE = 66;

export type LithologyPattern =
  | 'sandstone' | 'shale' | 'limestone' | 'dolomite'
  | 'clay' | 'tuff' | 'soil' | 'granite' | 'basalt'
  | 'conglomerate' | 'siltstone' | 'mudstone' | 'chalk' | 'marl' | 'generic';

const ICONS = {
  waterDrop: require('@/assets/icons/icon_water_drop.png'),
  fossil: require('@/assets/icons/icon_fossil.png'),
  dinoSkull: require('@/assets/icons/icon_dino_skull.png'),
};

const getPatternAndColor = (name: string, lith: string, lithArray?: LithologyEntry[]): { pattern: LithologyPattern; color: string } => {
  if (lithArray && lithArray.length > 0) {
    const primaryName = lithArray[0].name.toLowerCase();
    const lithMap: Record<string, { pattern: LithologyPattern; color: string }> = {
      'sandstone': { pattern: 'sandstone', color: '#F5E6C4' },
      'limestone': { pattern: 'limestone', color: '#E8E4D9' },
      'dolomite': { pattern: 'dolomite', color: '#D7CCC8' },
      'dolostone': { pattern: 'dolomite', color: '#D7CCC8' },
      'shale': { pattern: 'shale', color: '#78909C' },
      'mudstone': { pattern: 'mudstone', color: '#8D6E63' },
      'siltstone': { pattern: 'siltstone', color: '#A1887F' },
      'clay': { pattern: 'clay', color: '#A1887F' },
      'chalk': { pattern: 'chalk', color: '#F5F5F0' },
      'marl': { pattern: 'marl', color: '#BCAAA4' },
      'granite': { pattern: 'granite', color: '#CFD8DC' },
      'gneiss': { pattern: 'granite', color: '#CFD8DC' },
      'basalt': { pattern: 'basalt', color: '#455A64' },
      'tuff': { pattern: 'tuff', color: '#A1887F' },
      'conglomerate': { pattern: 'conglomerate', color: '#D7CCC8' },
      'gravel': { pattern: 'conglomerate', color: '#D7CCC8' },
      'sand': { pattern: 'sandstone', color: '#FFECB3' },
      'soil': { pattern: 'soil', color: '#8D6E63' },
      'alluvium': { pattern: 'soil', color: '#8D6E63' },
    };
    for (const [key, value] of Object.entries(lithMap)) {
      if (primaryName.includes(key)) {
        return value;
      }
    }
  }

  const nameLower = name.toLowerCase();
  const lithLower = lith.toLowerCase();

  if (nameLower.includes('tuff') || nameLower.includes('volcanic')) {
    return { pattern: 'tuff', color: '#A1887F' };
  }
  if (nameLower.includes('limestone') || nameLower.includes('edwards') || nameLower.includes('georgetown')) {
    return { pattern: 'limestone', color: '#E8E4D9' };
  }
  if (nameLower.includes('chalk') || nameLower.includes('austin')) {
    return { pattern: 'chalk', color: '#F5F5F0' };
  }
  if (nameLower.includes('shale') || nameLower.includes('eagle ford')) {
    return { pattern: 'shale', color: '#78909C' };
  }
  if (nameLower.includes('sandstone') || nameLower.includes('carrizo') || nameLower.includes('oakville') || nameLower.includes('wilcox')) {
    return { pattern: 'sandstone', color: '#F5E6C4' };
  }
  if (nameLower.includes('lagarto') || nameLower.includes('yegua') || nameLower.includes('reklaw')) {
    return { pattern: 'clay', color: '#A1887F' };
  }

  if (lithLower === 'unnamed' || lithLower === 'unknown' || lithLower.includes('soil') || lithLower.includes('alluvium')) {
    return { pattern: 'soil', color: '#8D6E63' };
  }
  if (lithLower.includes('tuff') || lithLower.includes('ash')) {
    return { pattern: 'tuff', color: '#9E9E9E' };
  }
  if (lithLower.includes('limestone')) {
    return { pattern: 'limestone', color: '#E8E4D9' };
  }
  if (lithLower.includes('dolomite') || lithLower.includes('dolostone')) {
    return { pattern: 'dolomite', color: '#D7CCC8' };
  }
  if (lithLower.includes('sandstone')) {
    return { pattern: 'sandstone', color: '#F5E6C4' };
  }
  if (lithLower.includes('shale')) {
    return { pattern: 'shale', color: '#78909C' };
  }
  if (lithLower.includes('mudstone') || lithLower.includes('mud')) {
    return { pattern: 'mudstone', color: '#8D6E63' };
  }
  if (lithLower.includes('siltstone') || lithLower.includes('silt')) {
    return { pattern: 'siltstone', color: '#A1887F' };
  }
  if (lithLower.includes('chalk')) {
    return { pattern: 'chalk', color: '#F5F5F0' };
  }
  if (lithLower.includes('marl')) {
    return { pattern: 'marl', color: '#BCAAA4' };
  }
  if (lithLower.includes('clay')) {
    return { pattern: 'clay', color: '#A1887F' };
  }
  if (lithLower.includes('sand') && !lithLower.includes('stone')) {
    return { pattern: 'sandstone', color: '#FFECB3' };
  }
  if (lithLower.includes('granite') || lithLower.includes('gneiss') || lithLower.includes('igneous')) {
    return { pattern: 'granite', color: '#CFD8DC' };
  }
  if (lithLower.includes('basalt') || lithLower.includes('lava') || lithLower.includes('volcanic')) {
    return { pattern: 'basalt', color: '#455A64' };
  }
  if (lithLower.includes('conglomerate') || lithLower.includes('gravel')) {
    return { pattern: 'conglomerate', color: '#D7CCC8' };
  }

  return { pattern: 'generic', color: '#BDBDBD' };
};

const sanitizeLayerName = (name: string, epoch: string, index: number, latitude?: number, longitude?: number, Fm?: string): string => {
  if (Fm && Fm.trim() !== '') {
    return Fm.replace(/ Fm$/, ' Formation').replace(/Fm$/, ' Formation');
  }
  if (name.toLowerCase() === 'unnamed' || name.toLowerCase() === 'unknown' || name.trim() === '') {
    if (index === 0) {
      if (latitude && longitude &&
        latitude > 29.0 && latitude < 31.5 &&
        longitude > -100.0 && longitude < -97.0) {
        return 'Caliche / Topsoil';
      }
      return 'Surface Soil & Alluvium';
    }
    return `${epoch} Formation`;
  }

  return name.replace(/ Fm$/, ' Formation').replace(/Fm$/, ' Formation');
};

const generateIrregularPath = (effectiveWidth: number, layerHeight: number, seed: number): string => {
  const waveAmplitude = 18;
  const baseIndent = 20;

  const points: { x: number; y: number }[] = [];
  points.push({ x: 0, y: 0 });
  points.push({ x: effectiveWidth, y: 0 });

  const numSegments = Math.max(4, Math.floor(layerHeight / 25));
  for (let i = 0; i <= numSegments; i++) {
    const progress = i / numSegments;
    const y = progress * layerHeight;
    const primaryWave = Math.sin((progress * 2.5 + seed * 0.7) * Math.PI) * waveAmplitude;
    const secondaryWave = Math.sin((progress * 5 + seed * 1.3) * Math.PI) * (waveAmplitude * 0.4);
    const jitter = Math.sin(seed * (i + 0.5) * 2.1) * 5;
    const x = effectiveWidth - baseIndent + primaryWave + secondaryWave + jitter;
    points.push({
      x: Math.max(effectiveWidth - baseIndent - waveAmplitude * 1.5, Math.min(effectiveWidth + 5, x)),
      y,
    });
  }

  points.push({ x: effectiveWidth, y: layerHeight });
  points.push({ x: 0, y: layerHeight });

  let path = `M ${points[0].x} ${points[0].y}`;
  path += ` L ${points[1].x} ${points[1].y}`;

  for (let i = 2; i < points.length - 2; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    const cpY = (prev.y + curr.y) / 2;
    path += ` Q ${prev.x} ${prev.y} ${cpX} ${cpY}`;
  }

  path += ` L ${points[points.length - 2].x} ${points[points.length - 2].y}`;
  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  path += ' Z';

  return path;
};

interface StratigraphicColumnScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

interface BoundaryResult {
  type: 'kt' | 'permian-triassic' | 'great-unconformity' | 'major-unconformity' | 'none';
  label: string;
  color: string;
  age: number;
}

interface ProcessedUnit extends StratigraphicUnit {
  cumulativeDepth: number;
  cumulativeDepthFeet: number;
  thicknessFeet: number;
  displayThickness: number;
  displayName: string;
  isAquifer: boolean;
  hasFossils: boolean;
  hasKtBoundary: boolean;
  pattern: LithologyPattern;
  patternColor: string;
  fascinatingFact: string;
  factCategory: 'volcanic' | 'marine' | 'terrestrial' | 'glacial' | 'aquifer' | 'fossil' | 'general';
  isTerminator?: boolean;
  hardness: number;
  widthProportion: number;
  primaryLithology: string;
}

const BEDROCK_TERMINATOR_THICKNESS = 200;

const isKtBoundary = (unit: StratigraphicUnit): boolean => {
  return unit.t_age <= KT_BOUNDARY_AGE && unit.b_age >= KT_BOUNDARY_AGE;
};

interface LayerTextStyles {
  titleSize: number;
  subtitleSize: number;
  showSubtitle: boolean;
  showThickness: boolean;
}

const getStylesForHeight = (height: number): LayerTextStyles => {
  if (height >= 60) {
    return { titleSize: 16, subtitleSize: 12, showSubtitle: true, showThickness: true };
  } else if (height >= 50) {
    return { titleSize: 14, subtitleSize: 11, showSubtitle: true, showThickness: true };
  } else if (height >= 40) {
    return { titleSize: 13, subtitleSize: 10, showSubtitle: true, showThickness: true };
  } else if (height >= 30) {
    return { titleSize: 12, subtitleSize: 0, showSubtitle: false, showThickness: true };
  } else {
    return { titleSize: 10, subtitleSize: 0, showSubtitle: false, showThickness: false };
  }
};

const BedrockTerminator = ({ height, depthFeet, depthLabel }: { height: number; depthFeet: number; depthLabel: string }) => (
  <View style={[bedrockStyles.container, { height }]}>
    <Svg width={LAYER_MAX_WIDTH} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgPattern id="bedrock-pattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
          <Rect width="30" height="30" fill="#2C3E50" />
          <Rect x="2" y="3" width="6" height="5" fill="rgba(255,255,255,0.12)" />
          <Rect x="15" y="8" width="7" height="6" fill="rgba(200,200,200,0.1)" />
          <Rect x="5" y="18" width="5" height="5" fill="rgba(0,0,0,0.15)" />
          <Rect x="20" y="20" width="6" height="5" fill="rgba(255,255,255,0.08)" />
          <Rect x="10" y="12" width="4" height="4" fill="rgba(100,100,100,0.1)" />
        </SvgPattern>
      </Defs>
      <Rect width={LAYER_MAX_WIDTH} height={height} fill="url(#bedrock-pattern)" />
    </Svg>
    <View style={bedrockStyles.overlay}>
      <View style={bedrockStyles.iconContainer}>
        <Feather name="anchor" size={32} color="rgba(255,255,255,0.6)" />
      </View>
      <Text style={bedrockStyles.title}>You've Reached Bedrock</Text>
      <Text style={bedrockStyles.subtitle}>The ancient foundation of the continent</Text>
      <Text style={bedrockStyles.ageText}>Over 541 million years old</Text>
      <View style={bedrockStyles.depthBadge}>
        <Text style={bedrockStyles.depthText}>Depth: {depthLabel}+</Text>
      </View>
    </View>
  </View>
);

const bedrockStyles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#2C3E50',
    borderBottomLeftRadius: BORDER_RADIUS.lg,
    borderBottomRightRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  iconContainer: {
    marginBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: SPACING.xs,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ageText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },
  depthBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    marginTop: SPACING.md,
  },
  depthText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

const renderSvgPattern = (
  pattern: LithologyPattern,
  color: string,
  layerHeight: number,
  layerWidth: number,
  unitId: number
): React.ReactNode => {
  const patternId = `pattern-${unitId}-${pattern}`;

  switch (pattern) {
    case 'sandstone':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <Rect width="24" height="24" fill={color} />
              <Circle cx="3" cy="4" r="1.5" fill="#A0522D" opacity="0.4" />
              <Circle cx="14" cy="2" r="1" fill="#8B4513" opacity="0.35" />
              <Circle cx="8" cy="9" r="1.8" fill="#A0522D" opacity="0.3" />
              <Circle cx="20" cy="6" r="1.2" fill="#8B4513" opacity="0.4" />
              <Circle cx="5" cy="15" r="1" fill="#A0522D" opacity="0.35" />
              <Circle cx="16" cy="14" r="1.6" fill="#8B4513" opacity="0.3" />
              <Circle cx="11" cy="20" r="1.3" fill="#A0522D" opacity="0.4" />
              <Circle cx="22" cy="18" r="0.9" fill="#8B4513" opacity="0.35" />
              <Circle cx="2" cy="22" r="1.1" fill="#A0522D" opacity="0.3" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'shale':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="60" height="14" patternUnits="userSpaceOnUse">
              <Rect width="60" height="14" fill={color} />
              <Line x1="0" y1="2" x2="60" y2="2" stroke="#5D4037" strokeWidth="1.2" opacity="0.55" />
              <Line x1="0" y1="5" x2="40" y2="5" stroke="#8B4513" strokeWidth="1.5" opacity="0.5" />
              <Line x1="10" y1="8" x2="60" y2="8" stroke="#A0522D" strokeWidth="1.8" opacity="0.45" />
              <Line x1="0" y1="11" x2="50" y2="11" stroke="#5D4037" strokeWidth="1" opacity="0.5" />
              <Rect x="0" y="4" width="60" height="3" fill="#8B4513" opacity="0.12" />
              <Rect x="0" y="9" width="60" height="2" fill="#A0522D" opacity="0.1" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'limestone':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
              <Rect width="40" height="20" fill={color} />
              <Line x1="0" y1="0" x2="40" y2="0" stroke="#9E9E9E" strokeWidth="1.2" opacity="0.5" />
              <Line x1="0" y1="10" x2="40" y2="10" stroke="#9E9E9E" strokeWidth="1.2" opacity="0.5" />
              <Line x1="20" y1="0" x2="20" y2="10" stroke="#9E9E9E" strokeWidth="1" opacity="0.45" />
              <Line x1="0" y1="10" x2="0" y2="20" stroke="#9E9E9E" strokeWidth="1" opacity="0.45" />
              <Line x1="40" y1="10" x2="40" y2="20" stroke="#9E9E9E" strokeWidth="1" opacity="0.45" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'dolomite':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="30" height="20" patternUnits="userSpaceOnUse">
              <Rect width="30" height="20" fill={color} />
              <Line x1="0" y1="10" x2="30" y2="10" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
              <Line x1="0" y1="19" x2="30" y2="19" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
              <Path d="M5,5 L10,2 L15,5 L10,8 Z" fill="rgba(0,0,0,0.06)" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'tuff':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <Rect width="30" height="30" fill="#EADDCA" />
              <Path d="M5 5 L8 3 L7 8 Z" fill="#7D7D7D" opacity="0.5" />
              <Path d="M18 8 L22 6 L20 12 Z" fill="#6B6B6B" opacity="0.45" />
              <Path d="M12 18 L15 16 L14 21 Z" fill="#8A8A8A" opacity="0.4" />
              <Path d="M3 22 L6 20 L5 25 Z" fill="#757575" opacity="0.5" />
              <Path d="M25 15 L28 13 L27 18 Z" fill="#696969" opacity="0.45" />
              <Path d="M8 12 L11 10 L10 14 Z" fill="#787878" opacity="0.4" />
              <Circle cx="22" cy="24" r="2" fill="#9E9E9E" opacity="0.3" />
              <Circle cx="4" cy="14" r="1.5" fill="#8D8D8D" opacity="0.35" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'granite':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <Rect width="30" height="30" fill={color} />
              <Rect x="2" y="3" width="5" height="4" fill="rgba(255,255,255,0.15)" />
              <Rect x="15" y="8" width="6" height="5" fill="rgba(200,200,200,0.12)" />
              <Rect x="5" y="18" width="4" height="4" fill="rgba(0,0,0,0.08)" />
              <Rect x="20" y="20" width="5" height="4" fill="rgba(255,255,255,0.1)" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'basalt':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <Rect width="20" height="20" fill={color} />
              <Path d="M5,0 L10,10 L0,10 Z" fill="rgba(0,0,0,0.1)" />
              <Path d="M15,10 L20,20 L10,20 Z" fill="rgba(0,0,0,0.08)" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'conglomerate':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
              <Rect width="40" height="40" fill={color} />
              <Circle cx="8" cy="10" r="5" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
              <Circle cx="25" cy="8" r="4" fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
              <Circle cx="15" cy="28" r="6" fill="rgba(0,0,0,0.07)" stroke="rgba(0,0,0,0.11)" strokeWidth="1" />
              <Circle cx="32" cy="25" r="3" fill="rgba(0,0,0,0.05)" strokeWidth="1" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'chalk':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <Rect width="20" height="20" fill={color} />
              <Circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.3)" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'marl':
    case 'mudstone':
    case 'siltstone':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="30" height="12" patternUnits="userSpaceOnUse">
              <Rect width="30" height="12" fill={color} />
              <Line x1="0" y1="11" x2="30" y2="11" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="3,2" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'soil':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
              <Rect width="28" height="28" fill={color} />
              <Path d="M2 5 Q5 3 8 6" stroke="#4E342E" strokeWidth="0.8" fill="none" opacity="0.4" />
              <Path d="M18 12 Q21 10 24 13" stroke="#3E2723" strokeWidth="0.6" fill="none" opacity="0.35" />
              <Circle cx="6" cy="14" r="1.5" fill="#5D4037" opacity="0.25" />
              <Circle cx="16" cy="6" r="1.8" fill="#6D4C41" opacity="0.2" />
              <Circle cx="22" cy="22" r="2" fill="#4E342E" opacity="0.22" />
              <Circle cx="4" cy="24" r="1.2" fill="#5D4037" opacity="0.28" />
              <Circle cx="14" cy="20" r="1" fill="#6D4C41" opacity="0.25" />
              <Circle cx="10" cy="10" r="2.5" fill="#8D6E63" opacity="0.2" stroke="#795548" strokeWidth="0.5" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'clay':
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="50" height="16" patternUnits="userSpaceOnUse">
              <Rect width="50" height="16" fill="#8D8741" />
              <Path d="M0 4 Q10 2 20 4 T40 4 T50 4" stroke="#6B6B3A" strokeWidth="1" fill="none" opacity="0.4" />
              <Path d="M0 10 Q12 8 24 10 T48 10" stroke="#5D5D32" strokeWidth="0.8" fill="none" opacity="0.35" />
              <Path d="M0 14 Q8 13 16 14 T32 14 T50 14" stroke="#6B6B3A" strokeWidth="0.6" fill="none" opacity="0.3" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );

    case 'generic':
    default:
      return (
        <Svg width={layerWidth} height={layerHeight} style={StyleSheet.absoluteFill}>
          <Defs>
            <SvgPattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <Rect width="20" height="20" fill={color} />
              <Circle cx="10" cy="10" r="1" fill="rgba(0,0,0,0.08)" />
            </SvgPattern>
          </Defs>
          <Rect width={layerWidth} height={layerHeight} fill={`url(#${patternId})`} />
        </Svg>
      );
  }
};

const MIN_LAYER_HEIGHT = 35;
const HEADER_HEIGHT = 80;
const FOOTER_PADDING = 40;
const MAX_LAYERS_BEFORE_SCROLL = 20;
const BEDROCK_TERMINATOR_MIN_HEIGHT = 100;
const TRAPEZOID_HEIGHT = 12;

const calculateFitToScreenHeights = (
  units: ProcessedUnit[],
  availableHeight: number
): number[] => {
  if (units.length === 0 || availableHeight <= 0) return [];

  const regularUnits = units.filter(u => !u.isTerminator);
  const hasTerminator = units.some(u => u.isTerminator);

  const heightForLayers = hasTerminator
    ? availableHeight - BEDROCK_TERMINATOR_MIN_HEIGHT
    : availableHeight;

  const logValues = regularUnits.map(unit => Math.log(Math.max(unit.thicknessFeet, 1) + 1));
  const totalLogValue = logValues.reduce((sum, val) => sum + val, 0);

  if (totalLogValue === 0) {
    const regularHeights = regularUnits.map(() => heightForLayers / Math.max(regularUnits.length, 1));
    return hasTerminator ? [...regularHeights, BEDROCK_TERMINATOR_MIN_HEIGHT] : regularHeights;
  }

  let heights = logValues.map(logVal => {
    const proportionalHeight = (logVal / totalLogValue) * heightForLayers;
    return Math.max(MIN_LAYER_HEIGHT, proportionalHeight);
  });

  const totalHeight = heights.reduce((sum, h) => sum + h, 0);
  if (totalHeight > 0) {
    const normalizationFactor = heightForLayers / totalHeight;
    heights = heights.map(h => Math.max(MIN_LAYER_HEIGHT, h * normalizationFactor));
  }

  if (hasTerminator) {
    heights.push(BEDROCK_TERMINATOR_MIN_HEIGHT);
  }

  return heights;
};

const formatDepthValue = (meters: number, useFeet: boolean): string => {
  if (useFeet) {
    const feet = metersToFeet(meters);
    if (feet >= 1000) {
      return `${(feet / 1000).toFixed(1)}k ft`;
    }
    return `${Math.round(feet)} ft`;
  }
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}k m`;
  }
  return `${Math.round(meters)} m`;
};

const formatThicknessValue = (thicknessFeet: number, useFeet: boolean): string => {
  if (useFeet) {
    return `${Math.round(thicknessFeet)} ft`;
  }
  const meters = thicknessFeet / 3.28084;
  return `${Math.round(meters)} m`;
};

const formatDepthFeetValue = (depthFeet: number, useFeet: boolean): string => {
  if (useFeet) {
    return `${Math.round(depthFeet).toLocaleString()} ft`;
  }
  const meters = depthFeet / 3.28084;
  return `${Math.round(meters).toLocaleString()} m`;
};

const LITH_COLORS: Record<string, string> = {
  'sandstone': '#F5E6C4',
  'limestone': '#E8E4D9',
  'dolomite': '#D7CCC8',
  'shale': '#78909C',
  'mudstone': '#8D6E63',
  'siltstone': '#A1887F',
  'clay': '#A1887F',
  'chalk': '#F5F5F0',
  'marl': '#BCAAA4',
  'granite': '#CFD8DC',
  'basalt': '#455A64',
  'tuff': '#EADDCA',
  'conglomerate': '#D7CCC8',
  'sand': '#FFECB3',
  'soil': '#8D6E63',
  'gravel': '#D7CCC8',
};

export default function StratigraphicColumnScreen({ navigation }: StratigraphicColumnScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [column, setColumn] = useState<StratigraphicColumn | null>(null);
  const [processedUnits, setProcessedUnits] = useState<ProcessedUnit[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<ProcessedUnit | null>(null);
  const [showKTModal, setShowKTModal] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const scrollOffsetRef = useRef(0);
  const [availableColumnHeight, setAvailableColumnHeight] = useState(0);
  const [useFeet, setUseFeet] = useState(true);
  const [selectedBoundary, setSelectedBoundary] = useState<BoundaryResult | null>(null);
  const hasAnimatedRef = useRef(false);
  const lastLayoutHeightRef = useRef(0);

  const fitToScreenHeights = useMemo(() => {
    return calculateFitToScreenHeights(processedUnits, availableColumnHeight);
  }, [processedUnits, availableColumnHeight]);

  const needsScrolling = processedUnits.length > MAX_LAYERS_BEFORE_SCROLL;

  useEffect(() => {
    fetchStratigraphicData();
  }, []);

  const fetchStratigraphicData = async () => {
    setLoading(true);
    setError(null);

    let lat: number = DEMO_LOCATION.lat;
    let lng: number = DEMO_LOCATION.lng;
    let usingFallback = false;

    try {
      if (Platform.OS === 'web' && AppConfig.isDevMode) {
        console.log('Web dev mode: using demo location');
        usingFallback = true;
        setLocation({ lat, lng });
      } else {
        try {
          const permissionPromise = Location.requestForegroundPermissionsAsync();
          const permissionResult = await Promise.race([
            permissionPromise,
            new Promise<{ status: string }>((resolve) =>
              setTimeout(() => resolve({ status: 'timeout' }), 5000)
            )
          ]);

          if (permissionResult.status === 'granted') {
            try {
              const locationResult = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
                new Promise<never>((_, reject) =>
                  setTimeout(() => reject(new Error('Location timeout')), 8000)
                )
              ]);
              lat = locationResult.coords.latitude;
              lng = locationResult.coords.longitude;
              setLocation({ lat, lng });
            } catch (locError) {
              console.log('Location fetch failed, using fallback');
              usingFallback = true;
              setLocation({ lat, lng });
            }
          } else {
            if (AppConfig.isDevMode) {
              console.log('Permission denied/timeout, using demo location');
              usingFallback = true;
              setLocation({ lat, lng });
            } else {
              setError('Location permission is required to see what\'s beneath you.');
              setLoading(false);
              return;
            }
          }
        } catch (permError) {
          console.log('Permission error, using fallback:', permError);
          usingFallback = true;
          setLocation({ lat, lng });
        }
      }

      const columnData = await macrostratService.getStratigraphicColumn(lat, lng);

      if (!columnData || columnData.units.length === 0) {
        setError('No stratigraphic data available for this location. Try moving to a different area.');
        setLoading(false);
        return;
      }

      setColumn(columnData);
      const processed = processUnitsWithDepths(columnData.units, lat, lng);
      setProcessedUnits(processed);

      await analyticsService.trackEvent('feature_used', {
        feature_name: 'whats_under_my_feet',
        lat,
        lng,
        units_count: columnData.units.length,
      });
    } catch (err) {
      console.error('Error fetching stratigraphic data:', err);
      setError('Unable to load geological data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const processUnitsWithDepths = (units: StratigraphicUnit[], latitude: number, longitude: number): ProcessedUnit[] => {
    let cumulativeDepth = 0;
    let cumulativeDepthFeet = 0;

    const { maxDepthFeet: locationMaxDepth } = getMaxDepthForLocation(latitude, longitude);

    const bedrockIndex = units.findIndex(unit => isBedrock({
      unit_name: unit.unit_name,
      lith: unit.lith,
      t_age: unit.t_age,
      b_age: unit.b_age,
    }));

    let displayUnits = bedrockIndex !== -1 ? units.slice(0, bedrockIndex) : units;

    const processedLayers: ProcessedUnit[] = [];

    for (let index = 0; index < displayUnits.length; index++) {
      const unit = displayUnits[index];
      const thickness = unit.max_thick || 50;
      const thicknessFeet = metersToFeet(thickness);

      if (cumulativeDepthFeet + thicknessFeet > locationMaxDepth) {
        break;
      }

      const prevDepth = cumulativeDepth;
      const prevDepthFeet = cumulativeDepthFeet;
      cumulativeDepth += thickness;
      cumulativeDepthFeet += thicknessFeet;

      const displayThickness = calculateAdaptiveHeight(thickness);
      const period = macrostratService.getGeologicPeriod(unit.t_age);
      const displayName = sanitizeLayerName(unit.unit_name, period, index, latitude, longitude, unit.Fm);
      const aquifer = isKnownAquifer(unit.unit_name);
      const hasFossils = unit.pbdb_collections > 0;
      const hasKtBoundary = isKtBoundary(unit);
      const { pattern, color } = getPatternAndColor(unit.unit_name, unit.lith, unit.lithArray);
      const factResult = getFormationFact(unit.unit_name, period);
      const hardness = getRockHardness(unit.lithArray, unit.lith);
      const widthProportion = getLayerWidth(hardness);
      const primaryLithology = getPrimaryLithology(unit.lithArray, unit.lith);

      processedLayers.push({
        ...unit,
        cumulativeDepth: prevDepth,
        cumulativeDepthFeet: prevDepthFeet,
        thicknessFeet,
        displayThickness,
        displayName,
        isAquifer: aquifer,
        hasFossils,
        hasKtBoundary,
        pattern,
        patternColor: color,
        fascinatingFact: factResult.fact,
        factCategory: factResult.category,
        isTerminator: false,
        hardness,
        widthProportion,
        primaryLithology,
      });
    }

    const terminatorDisplayThickness = calculateAdaptiveHeight(BEDROCK_TERMINATOR_THICKNESS);
    const bedrockTerminator: ProcessedUnit = {
      unit_id: -1,
      unit_name: 'Precambrian Basement Rock',
      strat_name_long: 'Precambrian Basement Rock',
      lith: 'crystalline',
      lithArray: [],
      environ: 'continental',
      environArray: [],
      color: '#2C3E50',
      t_age: 541,
      b_age: 4600,
      min_thick: BEDROCK_TERMINATOR_THICKNESS,
      max_thick: BEDROCK_TERMINATOR_THICKNESS,
      pbdb_collections: 0,
      col_id: 0,
      outcrop: '',
      econ: '',
      notes: '',
      t_int_name: '',
      b_int_name: '',
      Fm: '',
      Gp: '',
      clat: 0,
      clng: 0,
      cumulativeDepth: cumulativeDepth,
      cumulativeDepthFeet: cumulativeDepthFeet,
      thicknessFeet: metersToFeet(BEDROCK_TERMINATOR_THICKNESS),
      displayThickness: terminatorDisplayThickness,
      displayName: 'Precambrian Basement Rock',
      isAquifer: false,
      hasFossils: false,
      hasKtBoundary: false,
      pattern: 'granite',
      patternColor: '#2C3E50',
      fascinatingFact: "Earth's earliest rocks, from when only simple life forms existed.",
      factCategory: 'general',
      isTerminator: true,
      hardness: 10,
      widthProportion: 1.0,
      primaryLithology: 'Crystalline',
    };

    processedLayers.push(bedrockTerminator);

    return processedLayers;
  };

  const handleUnitPress = (unit: ProcessedUnit) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedUnit(unit);
  };

  const closeModal = () => {
    setSelectedUnit(null);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const handleBoundaryPress = (boundary: BoundaryResult) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (boundary.type === 'kt') {
      setShowKTModal(true);
    } else {
      setSelectedBoundary(boundary);
    }
  };

  const renderDepthScale = () => {
    if (processedUnits.length === 0 || fitToScreenHeights.length === 0) return null;

    let visualY = 0;
    const layerMarkers = processedUnits.map((unit, index) => {
      const marker = {
        depthFeet: unit.cumulativeDepthFeet,
        depthMeters: unit.cumulativeDepth,
        visualY,
        thicknessFeet: unit.thicknessFeet
      };
      visualY += fitToScreenHeights[index] || MIN_LAYER_HEIGHT;
      return marker;
    });

    return (
      <View style={styles.depthScaleContainer}>
        <View style={styles.depthScaleTrack}>
          {layerMarkers.map((marker, index) => (
            <View
              key={index}
              style={[styles.depthMarkerRow, { top: marker.visualY }]}
            >
              <Text style={styles.depthMarkerText}>
                {useFeet ? `${Math.round(marker.depthFeet)}ft` : `${Math.round(marker.depthMeters)}m`}
              </Text>
              <View style={styles.depthTickMark} />
            </View>
          ))}
        </View>
      </View>
    );
  };

  const ktBoundaryPixelY = useMemo(() => {
    if (processedUnits.length === 0 || fitToScreenHeights.length === 0) return null;

    const nonTerminatorUnits = processedUnits.filter(u => !u.isTerminator);
    let cumulativeHeight = 0;

    for (let i = 0; i < nonTerminatorUnits.length; i++) {
      const unit = nonTerminatorUnits[i];
      const unitHeight = fitToScreenHeights[i] || MIN_LAYER_HEIGHT;

      if (KT_BOUNDARY_AGE >= unit.t_age && KT_BOUNDARY_AGE <= unit.b_age) {
        const layerAgeSpan = unit.b_age - unit.t_age;
        if (layerAgeSpan > 0) {
          const positionWithinLayer = (KT_BOUNDARY_AGE - unit.t_age) / layerAgeSpan;
          return cumulativeHeight + (positionWithinLayer * unitHeight);
        }
        return cumulativeHeight;
      }
      cumulativeHeight += unitHeight;
    }
    return null;
  }, [processedUnits, fitToScreenHeights]);

  const renderTransitionEdge = (widthAbove: number, widthBelow: number, colorAbove: string, colorBelow: string) => {
    const svgWidth = LAYER_MAX_WIDTH;
    const transHeight = TRAPEZOID_HEIGHT;

    const wider = Math.max(widthAbove, widthBelow);
    const narrower = Math.min(widthAbove, widthBelow);
    const isNarrowing = widthAbove > widthBelow;

    return (
      <View style={{ height: transHeight, width: svgWidth }}>
        <Svg width={svgWidth} height={transHeight}>
          <Polygon
            points={`0,0 ${widthAbove},0 ${widthBelow},${transHeight} 0,${transHeight}`}
            fill={isNarrowing ? colorAbove : colorBelow}
            opacity="0.7"
          />
          <Line
            x1={widthAbove} y1="0"
            x2={widthBelow} y2={transHeight}
            stroke="rgba(0,0,0,0.3)"
            strokeWidth="1.5"
          />
          {wider > narrower + 20 ? (
            <Polygon
              points={isNarrowing
                ? `${widthBelow},${transHeight} ${widthAbove},0 ${wider},0 ${wider},${transHeight}`
                : `${widthAbove},0 ${widthBelow},${transHeight} ${wider},${transHeight} ${wider},0`
              }
              fill="#C4A882"
              opacity="0.6"
            />
          ) : null}
        </Svg>
      </View>
    );
  };

  const renderBoundaryMarker = (boundary: BoundaryResult) => {
    return (
      <TouchableOpacity
        style={styles.boundaryMarkerContainer}
        onPress={() => handleBoundaryPress(boundary)}
        activeOpacity={0.8}
      >
        <View style={[styles.boundaryLine, { borderColor: boundary.color }]} />
        <View style={[styles.boundaryBadge, { backgroundColor: boundary.color }]}>
          {boundary.type === 'kt' ? (
            <Image
              source={ICONS.dinoSkull}
              style={styles.boundaryIcon}
              contentFit="contain"
            />
          ) : null}
          <Text style={styles.boundaryLabel} numberOfLines={1}>{boundary.label}</Text>
        </View>
        <View style={[styles.boundaryLine, { borderColor: boundary.color }]} />
      </TouchableOpacity>
    );
  };

  const renderGeologicalLayer = (unit: ProcessedUnit, index: number, height: number) => {
    const shouldAnimate = !hasAnimatedRef.current;

    if (unit.isTerminator) {
      const depthLabel = formatDepthFeetValue(unit.cumulativeDepthFeet, useFeet);
      return (
        <Animated.View
          key="bedrock-terminator"
          entering={shouldAnimate ? FadeInDown.delay(index * 30).duration(300) : undefined}
          style={[styles.layerWrapper, { height }]}
        >
          <BedrockTerminator
            height={height}
            depthFeet={unit.cumulativeDepthFeet}
            depthLabel={depthLabel}
          />
        </Animated.View>
      );
    }

    const period = unit.t_int_name ? unit.t_int_name : macrostratService.getGeologicPeriod(unit.t_age);
    const effectiveWidth = LAYER_MAX_WIDTH * unit.widthProportion;
    const irregularPath = generateIrregularPath(effectiveWidth, height, index * 1.5 + 0.3);
    const textStyles = getStylesForHeight(height);

    return (
      <Animated.View
        key={unit.unit_id}
        entering={shouldAnimate ? FadeInDown.delay(index * 30).duration(300) : undefined}
        style={[styles.layerWrapper, { height }]}
      >
        <TouchableOpacity
          style={styles.layerTouchable}
          onPress={() => handleUnitPress(unit)}
          activeOpacity={0.85}
        >
          <View style={[styles.layerClipContainer, { height }]}>
            <Svg
              width={effectiveWidth + 10}
              height={height}
              style={StyleSheet.absoluteFill}
            >
              <Path
                d={irregularPath}
                fill={unit.patternColor}
              />
            </Svg>

            <View
              style={[
                styles.texturedLayer,
                {
                  height,
                  width: effectiveWidth,
                }
              ]}
            >
              {renderSvgPattern(unit.pattern, unit.patternColor, height, effectiveWidth, unit.unit_id)}

              <View style={styles.layerBorder} />

              <View style={styles.layerOverlay}>
                <View style={styles.layerTextContent}>
                  <Text
                    style={[styles.layerName, { fontSize: textStyles.titleSize }]}
                    numberOfLines={1}
                  >
                    {unit.displayName}
                  </Text>
                  {textStyles.showSubtitle ? (
                    <Text style={[styles.layerEpoch, { fontSize: textStyles.subtitleSize }]}>
                      {period}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.layerRightContent}>
                  {textStyles.showThickness && unit.thicknessFeet > 0 ? (
                    <Text style={styles.layerThickness}>
                      {formatThicknessValue(unit.thicknessFeet, useFeet)}
                    </Text>
                  ) : null}

                  {unit.isAquifer ? (
                    <View style={styles.aquiferBadge}>
                      <Image
                        source={ICONS.waterDrop}
                        style={styles.aquiferIcon}
                        contentFit="contain"
                      />
                    </View>
                  ) : null}

                  {unit.hasFossils ? (
                    <View style={styles.fossilBadge}>
                      <Image
                        source={ICONS.fossil}
                        style={styles.fossilIcon}
                        contentFit="contain"
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderLayersWithConnectors = () => {
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < processedUnits.length; i++) {
      const unit = processedUnits[i];
      const height = fitToScreenHeights[i] || MIN_LAYER_HEIGHT;

      elements.push(renderGeologicalLayer(unit, i, height));

      if (i < processedUnits.length - 1) {
        const nextUnit = processedUnits[i + 1];

        const boundary = detectBoundaryType(unit, nextUnit);
        if (boundary.type !== 'none') {
          elements.push(
            <View key={`boundary-${i}`}>
              {renderBoundaryMarker(boundary)}
            </View>
          );
        }

        if (!unit.isTerminator && !nextUnit.isTerminator) {
          const currentWidth = LAYER_MAX_WIDTH * unit.widthProportion;
          const nextWidth = LAYER_MAX_WIDTH * nextUnit.widthProportion;
          if (Math.abs(currentWidth - nextWidth) > 8) {
            elements.push(
              <View key={`trans-${i}`}>
                {renderTransitionEdge(currentWidth, nextWidth, unit.patternColor, nextUnit.patternColor)}
              </View>
            );
          }
        }
      }
    }

    if (elements.length > 0 && !hasAnimatedRef.current) {
      setTimeout(() => { hasAnimatedRef.current = true; }, 600);
    }

    return elements;
  };

  const getBoundaryModalContent = (boundary: BoundaryResult) => {
    switch (boundary.type) {
      case 'permian-triassic':
        return {
          title: 'The Great Dying',
          subtitle: 'Permian-Triassic Extinction (~252 Ma)',
          text1: 'The most devastating mass extinction in Earth\'s history. Approximately 96% of all marine species and 70% of terrestrial vertebrate species were wiped out.',
          text2: 'Massive volcanic eruptions in Siberia released enormous amounts of greenhouse gases, causing extreme global warming, ocean acidification, and oxygen depletion.',
          highlight: 'It took over 10 million years for life to fully recover from this catastrophe, the longest recovery from any extinction event.',
          colorBar: '#FF4500',
        };
      case 'great-unconformity':
        return {
          title: 'The Great Unconformity',
          subtitle: 'Billions of Years Missing',
          text1: 'One of the most puzzling features in geology: a gap of over a billion years in the rock record, where young Cambrian rocks sit directly on ancient Precambrian basement.',
          text2: 'Scientists debate whether massive erosion during Snowball Earth glaciations removed the missing rock, or if it was never deposited in the first place.',
          highlight: 'This boundary marks the transition from a world of simple microbial life to the Cambrian Explosion, when complex animal life first appeared.',
          colorBar: '#8B4513',
        };
      case 'major-unconformity':
        return {
          title: 'Major Unconformity',
          subtitle: `Time Gap of ~${Math.round(boundary.age)} Million Years`,
          text1: 'An unconformity represents a significant gap in the geological record. The missing time could be due to erosion wearing away previously deposited layers, or a period when no sediment was deposited.',
          text2: 'These gaps tell us about changes in sea level, tectonic uplift, or shifts in the environment that interrupted the normal accumulation of sediment.',
          highlight: 'Unconformities are like missing chapters in Earth\'s history book, leaving geologists to piece together what happened during the lost time.',
          colorBar: '#D2691E',
        };
      default:
        return {
          title: 'Geological Boundary',
          subtitle: '',
          text1: 'A significant transition in the rock record.',
          text2: '',
          highlight: '',
          colorBar: '#999999',
        };
    }
  };

  const renderLithologyBars = (lithArray: LithologyEntry[]) => {
    if (!lithArray || lithArray.length === 0) return null;

    return (
      <View style={styles.lithBarsContainer}>
        <Text style={styles.lithSectionTitle}>Lithology Composition</Text>
        {lithArray.map((entry, idx) => {
          const proportion = entry.prop || 0;
          const barColor = LITH_COLORS[entry.name.toLowerCase()] || '#BDBDBD';
          return (
            <View key={idx} style={styles.lithBarRow}>
              <Text style={styles.lithBarName} numberOfLines={1}>
                {entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}
              </Text>
              <View style={styles.lithBarTrack}>
                <View style={[styles.lithBarFill, { width: `${Math.round(proportion * 100)}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.lithBarPercent}>{Math.round(proportion * 100)}%</Text>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={COLORS.deepSlateBlue} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>What's Under My Feet?</Text>
            {AppConfig.isDevMode ? <ProBadge size="small" style={styles.proBadge} /> : null}
          </View>
          {location ? (
            <Text style={styles.headerSubtitle}>
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.unitToggle}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setUseFeet(prev => !prev);
          }}
        >
          <Text style={styles.unitToggleText}>{useFeet ? 'ft' : 'm'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={fetchStratigraphicData}
        >
          <Feather name="refresh-cw" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Digging deep...</Text>
          <Text style={styles.loadingSubtext}>Fetching geological layers</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchStratigraphicData}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : column ? (
        <View style={styles.mainContent}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + SPACING.xl },
            ]}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <View style={styles.surfaceIndicator}>
              <View style={styles.surfaceGrassLine}>
                <View style={styles.grassBlade} />
                <View style={[styles.grassBlade, { height: 10 }]} />
                <View style={styles.grassBlade} />
                <View style={[styles.grassBlade, { height: 8 }]} />
                <View style={styles.grassBlade} />
              </View>
              <Text style={styles.surfaceText}>Ground Surface</Text>
              <View style={styles.surfaceGrassLine}>
                <View style={styles.grassBlade} />
                <View style={[styles.grassBlade, { height: 10 }]} />
                <View style={styles.grassBlade} />
                <View style={[styles.grassBlade, { height: 8 }]} />
                <View style={styles.grassBlade} />
              </View>
            </View>

            <View
              style={styles.crossSectionContainer}
              onLayout={(event) => {
                const containerHeight = event.nativeEvent.layout.height;
                if (Math.abs(containerHeight - lastLayoutHeightRef.current) > 10) {
                  lastLayoutHeightRef.current = containerHeight;
                  setAvailableColumnHeight(containerHeight);
                }
              }}
            >
              {renderDepthScale()}

              <View style={styles.layersColumn}>
                {renderLayersWithConnectors()}
              </View>

              {ktBoundaryPixelY !== null ? (
                <TouchableOpacity
                  style={[styles.ktOverlayMarker, { top: ktBoundaryPixelY }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowKTModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={styles.ktMarkerLabel}>
                    <Image
                      source={ICONS.dinoSkull}
                      style={styles.ktMarkerIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.ktMarkerText}>DINOSAUR EXTINCTION (66 Ma)</Text>
                  </View>
                  <View style={styles.ktMarkerLine} />
                </TouchableOpacity>
              ) : null}
            </View>

            <Text style={styles.attribution}>
              Data from Macrostrat.org (CC BY 4.0)
            </Text>
          </ScrollView>
        </View>
      ) : null}

      <Modal
        visible={selectedUnit !== null}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeModal}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.modalContent}
          >
            {selectedUnit ? (
              <>
                <View
                  style={[
                    styles.modalColorBar,
                    { backgroundColor: selectedUnit.color || '#8B7355' },
                  ]}
                />
                <ScrollView style={styles.modalScrollBody} bounces={false}>
                  <View style={styles.modalBody}>
                    <View style={styles.modalHeader}>
                      <Text style={styles.modalTitle}>
                        {selectedUnit.Fm ? selectedUnit.Fm.replace(/ Fm$/, ' Formation').replace(/Fm$/, ' Formation') : selectedUnit.displayName}
                      </Text>
                      <TouchableOpacity onPress={closeModal}>
                        <Feather name="x" size={24} color={COLORS.mediumGray} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.modalPeriod}>
                      {selectedUnit.t_int_name ? selectedUnit.t_int_name : macrostratService.getGeologicPeriod(selectedUnit.t_age)}
                      {selectedUnit.Gp ? ` \u2022 ${selectedUnit.Gp} Group` : ''}
                    </Text>

                    {renderLithologyBars(selectedUnit.lithArray)}

                    <View style={styles.modalDetails}>
                      <View style={styles.detailRow}>
                        <Feather name="arrow-down" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Depth:</Text>
                        <Text style={styles.detailValue}>
                          {formatDepthFeetValue(selectedUnit.cumulativeDepthFeet, useFeet)} - {formatDepthFeetValue(selectedUnit.cumulativeDepthFeet + selectedUnit.thicknessFeet, useFeet)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="layers" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Thickness:</Text>
                        <Text style={styles.detailValue}>
                          {selectedUnit.min_thick > 0
                            ? `${formatThicknessValue(metersToFeet(selectedUnit.min_thick), useFeet)} - ${formatThicknessValue(selectedUnit.thicknessFeet, useFeet)}`
                            : `Up to ${formatThicknessValue(selectedUnit.thicknessFeet, useFeet)}`}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="clock" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Age:</Text>
                        <Text style={styles.detailValue}>
                          {macrostratService.formatAge(selectedUnit.t_age)} - {macrostratService.formatAge(selectedUnit.b_age)}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="box" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Lithology:</Text>
                        <Text style={styles.detailValue}>{selectedUnit.primaryLithology}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="map" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Environment:</Text>
                        <Text style={styles.detailValue}>
                          {selectedUnit.environArray.length > 0
                            ? selectedUnit.environArray.map(e => e.name).join(', ')
                            : selectedUnit.environ}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Feather name="shield" size={16} color={COLORS.primary} />
                        <Text style={styles.detailLabel}>Hardness:</Text>
                        <Text style={styles.detailValue}>{selectedUnit.hardness}/10</Text>
                      </View>

                      {selectedUnit.econ ? (
                        <View style={styles.detailRow}>
                          <Feather name="dollar-sign" size={16} color={COLORS.primary} />
                          <Text style={styles.detailLabel}>Resources:</Text>
                          <Text style={styles.detailValue}>{selectedUnit.econ}</Text>
                        </View>
                      ) : null}

                      {selectedUnit.outcrop ? (
                        <View style={styles.detailRow}>
                          <Feather name="eye" size={16} color={COLORS.primary} />
                          <Text style={styles.detailLabel}>Outcrop:</Text>
                          <Text style={styles.detailValue}>{selectedUnit.outcrop}</Text>
                        </View>
                      ) : null}

                      {selectedUnit.isAquifer ? (
                        <View style={styles.detailRow}>
                          <Image source={ICONS.waterDrop} style={styles.detailIcon} contentFit="contain" />
                          <Text style={styles.detailLabel}>Aquifer:</Text>
                          <Text style={[styles.detailValue, { color: '#2196F3' }]}>Water-bearing formation</Text>
                        </View>
                      ) : null}

                      {selectedUnit.pbdb_collections > 0 ? (
                        <View style={styles.detailRow}>
                          <Image source={ICONS.fossil} style={styles.detailIcon} contentFit="contain" />
                          <Text style={styles.detailLabel}>Fossil Sites:</Text>
                          <Text style={styles.detailValue}>
                            {selectedUnit.pbdb_collections} collections
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={styles.factSection}>
                      <Text style={styles.factTitle}>Fascinating Fact</Text>
                      <Text style={styles.factText}>{selectedUnit.fascinatingFact}</Text>
                    </View>

                    {selectedUnit.notes ? (
                      <View style={styles.notesSection}>
                        <Text style={styles.notesTitle}>Notes</Text>
                        <Text style={styles.notesText}>{selectedUnit.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>
              </>
            ) : null}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showKTModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowKTModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowKTModal(false)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.ktModalContent}
          >
            <View style={styles.ktModalColorBar} />
            <View style={styles.ktModalBody}>
              <View style={styles.modalHeader}>
                <View style={styles.ktModalTitleRow}>
                  <Image source={ICONS.dinoSkull} style={styles.ktModalIcon} contentFit="contain" />
                  <Text style={styles.ktModalTitle}>What is the K-T Boundary?</Text>
                </View>
                <TouchableOpacity onPress={() => setShowKTModal(false)}>
                  <Feather name="x" size={24} color={COLORS.mediumGray} />
                </TouchableOpacity>
              </View>

              <Text style={styles.ktModalText}>
                Imagine a giant space rock, bigger than a mountain, hitting the Earth! It made a huge explosion that changed the weather all over the world.
              </Text>

              <Text style={styles.ktModalText}>
                This was very bad for the dinosaurs, and they all disappeared. This red line shows the layer of dust and rock from that explosion.
              </Text>

              <Text style={styles.ktModalHighlight}>
                Everything below this line is from the time of dinosaurs, and everything above it is from the world after they were gone.
              </Text>

              <Text style={styles.ktModalAge}>About 66 million years ago</Text>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={selectedBoundary !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBoundary(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBoundary(null)}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.ktModalContent}
          >
            {selectedBoundary ? (() => {
              const content = getBoundaryModalContent(selectedBoundary);
              return (
                <>
                  <View style={[styles.ktModalColorBar, { backgroundColor: content.colorBar }]} />
                  <View style={styles.ktModalBody}>
                    <View style={styles.modalHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ktModalTitle}>{content.title}</Text>
                        {content.subtitle ? (
                          <Text style={styles.boundaryModalSubtitle}>{content.subtitle}</Text>
                        ) : null}
                      </View>
                      <TouchableOpacity onPress={() => setSelectedBoundary(null)}>
                        <Feather name="x" size={24} color={COLORS.mediumGray} />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.ktModalText}>{content.text1}</Text>

                    {content.text2 ? (
                      <Text style={styles.ktModalText}>{content.text2}</Text>
                    ) : null}

                    {content.highlight ? (
                      <Text style={[styles.ktModalHighlight, { borderLeftColor: content.colorBar, backgroundColor: `${content.colorBar}15` }]}>
                        {content.highlight}
                      </Text>
                    ) : null}
                  </View>
                </>
              );
            })() : null}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEBE9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.warmBeige,
    borderBottomWidth: 1,
    borderBottomColor: '#D4C4B0',
  },
  backButton: {
    padding: SPACING.sm,
    marginRight: SPACING.sm,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  proBadge: {
    marginLeft: SPACING.xs,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  unitToggle: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  unitToggleText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
  },
  loadingSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.button,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  mainContent: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  surfaceIndicator: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  surfaceGrassLine: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  grassBlade: {
    width: 3,
    height: 12,
    backgroundColor: '#4CAF50',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  surfaceText: {
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#8BC34A',
  },
  crossSectionContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  depthScaleContainer: {
    width: DEPTH_SCALE_WIDTH,
    backgroundColor: 'rgba(245, 230, 211, 0.9)',
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
    paddingTop: SPACING.sm,
  },
  depthScaleTrack: {
    position: 'relative',
    paddingLeft: SPACING.xs,
  },
  depthMarkerRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 4,
  },
  depthMarkerText: {
    fontSize: 10,
    color: '#5D4037',
    fontWeight: '600',
    marginRight: 2,
  },
  depthTickMark: {
    width: 8,
    height: 1,
    backgroundColor: '#8D6E63',
  },
  layersColumn: {
    flex: 1,
    backgroundColor: '#C4A882',
  },
  layerWrapper: {
    width: '100%',
  },
  layerTouchable: {
    flex: 1,
  },
  layerClipContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  texturedLayer: {
    overflow: 'hidden',
  },
  textureImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.9,
  },
  layerOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: SPACING.sm,
    paddingRight: 40,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  layerTextContent: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  layerName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  layerEpoch: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  layerRightContent: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  layerThickness: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.white,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  aquiferBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(33, 150, 243, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aquiferIcon: {
    width: 20,
    height: 20,
  },
  fossilBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(139, 90, 43, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fossilIcon: {
    width: 18,
    height: 18,
  },
  layerBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  boundaryMarkerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  boundaryLine: {
    flex: 1,
    height: 0,
    borderTopWidth: 2,
    borderStyle: 'dashed',
  },
  boundaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BORDER_RADIUS.full,
    marginHorizontal: 6,
  },
  boundaryIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
    tintColor: '#FFFFFF',
  },
  boundaryLabel: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.3,
  },
  attribution: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalColorBar: {
    height: 8,
  },
  modalScrollBody: {
    flexGrow: 0,
  },
  modalBody: {
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    flex: 1,
    paddingRight: SPACING.md,
  },
  modalPeriod: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.primary,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  modalDetails: {
    gap: SPACING.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  detailIcon: {
    width: 16,
    height: 16,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    width: 90,
  },
  detailValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    flex: 1,
  },
  lithBarsContainer: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  lithSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
  },
  lithBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lithBarName: {
    fontSize: 12,
    color: COLORS.darkGray,
    width: 80,
  },
  lithBarTrack: {
    flex: 1,
    height: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    borderRadius: 5,
    overflow: 'hidden',
    marginHorizontal: 6,
  },
  lithBarFill: {
    height: 10,
    borderRadius: 5,
  },
  lithBarPercent: {
    fontSize: 11,
    color: COLORS.mediumGray,
    width: 32,
    textAlign: 'right',
  },
  factSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  factTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  factText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    lineHeight: 22,
    fontStyle: 'italic',
  },
  notesSection: {
    marginTop: SPACING.md,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  notesTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.mediumGray,
    marginBottom: SPACING.xs,
  },
  notesText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 20,
  },
  ktModalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  ktModalColorBar: {
    height: 8,
    backgroundColor: 'rgba(255, 82, 82, 0.9)',
  },
  ktModalBody: {
    padding: SPACING.lg,
  },
  ktModalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  ktModalIcon: {
    width: 32,
    height: 32,
  },
  ktModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    flex: 1,
  },
  ktModalText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  ktModalHighlight: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: SPACING.md,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderLeftWidth: 4,
    borderLeftColor: 'rgba(255, 82, 82, 0.8)',
  },
  ktModalAge: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  boundaryModalSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  ktOverlayMarker: {
    position: 'absolute',
    left: DEPTH_SCALE_WIDTH + 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  ktMarkerLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  ktMarkerIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    tintColor: '#FFFFFF',
  },
  ktMarkerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  ktMarkerLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#FFFFFF',
    borderStyle: 'dashed',
  },
});
