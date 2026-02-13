import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Line, Path, Defs, Pattern } from 'react-native-svg';

export type LithologyPattern = 
  | 'sandstone' 
  | 'shale' 
  | 'limestone' 
  | 'dolomite'
  | 'clay' 
  | 'tuff' 
  | 'soil' 
  | 'granite'
  | 'basalt'
  | 'conglomerate'
  | 'siltstone'
  | 'mudstone'
  | 'chalk'
  | 'marl'
  | 'generic';

interface RockPatternViewProps {
  pattern: LithologyPattern;
  color: string;
  height: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function getPatternAndColorForLithology(
  formationName: string,
  lithology: string
): { pattern: LithologyPattern; color: string } {
  const nameLower = formationName.toLowerCase();
  const lithLower = lithology.toLowerCase();

  // Priority 1: Formation name keywords
  if (nameLower.includes('tuff') || nameLower.includes('volcanic')) {
    return { pattern: 'tuff', color: '#A1887F' };
  }
  if (nameLower.includes('limestone') || nameLower.includes('edwards')) {
    return { pattern: 'limestone', color: '#E8E4D9' };
  }
  if (nameLower.includes('chalk') || nameLower.includes('austin')) {
    return { pattern: 'chalk', color: '#F5F5F0' };
  }
  if (nameLower.includes('shale') || nameLower.includes('eagle ford')) {
    return { pattern: 'shale', color: '#78909C' };
  }
  if (nameLower.includes('sandstone') || nameLower.includes('carrizo')) {
    return { pattern: 'sandstone', color: '#F5E6C4' };
  }
  if (nameLower.includes('sand') && !nameLower.includes('stone')) {
    return { pattern: 'sandstone', color: '#FFECB3' };
  }

  // Priority 2: Lithology keywords
  if (lithLower.includes('limestone')) {
    return { pattern: 'limestone', color: '#E8E4D9' };
  }
  if (lithLower.includes('dolomite') || lithLower.includes('doloite')) {
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
  if (lithLower.includes('tuff') || lithLower.includes('volcanic')) {
    return { pattern: 'tuff', color: '#9E9E9E' };
  }
  if (lithLower.includes('granite') || lithLower.includes('igneous')) {
    return { pattern: 'granite', color: '#CFD8DC' };
  }
  if (lithLower.includes('basalt')) {
    return { pattern: 'basalt', color: '#455A64' };
  }
  if (lithLower.includes('conglomerate') || lithLower.includes('gravel')) {
    return { pattern: 'conglomerate', color: '#D7CCC8' };
  }
  if (lithLower.includes('soil') || lithLower.includes('alluvium')) {
    return { pattern: 'soil', color: '#8D6E63' };
  }

  // Default fallback
  return { pattern: 'generic', color: '#BDBDBD' };
}

export function RockPatternView({ 
  pattern, 
  color, 
  height, 
  style, 
  children 
}: RockPatternViewProps) {
  const patternElements = useMemo(() => {
    const width = 400;
    const patternId = `pattern-${pattern}-${Math.random().toString(36).substr(2, 9)}`;

    switch (pattern) {
      case 'sandstone':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <Rect width="20" height="20" fill={color} />
                <Circle cx="3" cy="5" r="1" fill="rgba(0,0,0,0.1)" />
                <Circle cx="12" cy="3" r="0.8" fill="rgba(0,0,0,0.08)" />
                <Circle cx="7" cy="12" r="1.2" fill="rgba(0,0,0,0.1)" />
                <Circle cx="16" cy="15" r="0.9" fill="rgba(0,0,0,0.08)" />
                <Circle cx="5" cy="18" r="1" fill="rgba(0,0,0,0.1)" />
                <Circle cx="14" cy="9" r="0.7" fill="rgba(0,0,0,0.08)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'shale':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="40" height="8" patternUnits="userSpaceOnUse">
                <Rect width="40" height="8" fill={color} />
                <Line x1="0" y1="7" x2="40" y2="7" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'limestone':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
                <Rect width="40" height="20" fill={color} />
                <Line x1="0" y1="19" x2="40" y2="19" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                <Line x1="20" y1="0" x2="20" y2="10" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'dolomite':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="30" height="20" patternUnits="userSpaceOnUse">
                <Rect width="30" height="20" fill={color} />
                <Line x1="0" y1="10" x2="30" y2="10" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                <Line x1="0" y1="19" x2="30" y2="19" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
                <Path d="M5,5 L10,2 L15,5 L10,8 Z" fill="rgba(0,0,0,0.06)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'clay':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Rect width="100%" height={height} fill={color} />
          </Svg>
        );

      case 'mudstone':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="30" height="12" patternUnits="userSpaceOnUse">
                <Rect width="30" height="12" fill={color} />
                <Line x1="0" y1="11" x2="30" y2="11" stroke="rgba(0,0,0,0.1)" strokeWidth="0.5" strokeDasharray="3,2" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'siltstone':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
                <Rect width="25" height="25" fill={color} />
                <Circle cx="5" cy="8" r="0.5" fill="rgba(0,0,0,0.08)" />
                <Circle cx="15" cy="5" r="0.4" fill="rgba(0,0,0,0.06)" />
                <Circle cx="10" cy="18" r="0.5" fill="rgba(0,0,0,0.07)" />
                <Circle cx="20" cy="12" r="0.4" fill="rgba(0,0,0,0.06)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'chalk':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <Rect width="20" height="20" fill={color} />
                <Circle cx="10" cy="10" r="2" fill="rgba(255,255,255,0.3)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'marl':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="30" height="15" patternUnits="userSpaceOnUse">
                <Rect width="30" height="15" fill={color} />
                <Line x1="0" y1="14" x2="30" y2="14" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                <Circle cx="15" cy="7" r="1" fill="rgba(0,0,0,0.05)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'tuff':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="25" height="25" patternUnits="userSpaceOnUse">
                <Rect width="25" height="25" fill={color} />
                <Circle cx="5" cy="5" r="2" fill="rgba(0,0,0,0.08)" />
                <Circle cx="18" cy="8" r="1.5" fill="rgba(0,0,0,0.06)" />
                <Circle cx="12" cy="18" r="2.5" fill="rgba(0,0,0,0.07)" />
                <Path d="M3,15 L6,13 L8,16 L5,18 Z" fill="rgba(0,0,0,0.05)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'granite':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                <Rect width="30" height="30" fill={color} />
                <Rect x="2" y="3" width="5" height="4" fill="rgba(255,255,255,0.15)" />
                <Rect x="15" y="8" width="6" height="5" fill="rgba(200,200,200,0.12)" />
                <Rect x="5" y="18" width="4" height="4" fill="rgba(0,0,0,0.08)" />
                <Rect x="20" y="20" width="5" height="4" fill="rgba(255,255,255,0.1)" />
                <Rect x="10" y="2" width="4" height="3" fill="rgba(0,0,0,0.06)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'basalt':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <Rect width="20" height="20" fill={color} />
                <Path d="M5,0 L10,10 L0,10 Z" fill="rgba(0,0,0,0.1)" />
                <Path d="M15,10 L20,20 L10,20 Z" fill="rgba(0,0,0,0.08)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'conglomerate':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <Rect width="40" height="40" fill={color} />
                <Circle cx="8" cy="10" r="5" fill="rgba(0,0,0,0.08)" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
                <Circle cx="25" cy="8" r="4" fill="rgba(0,0,0,0.06)" stroke="rgba(0,0,0,0.1)" strokeWidth="1" />
                <Circle cx="15" cy="28" r="6" fill="rgba(0,0,0,0.07)" stroke="rgba(0,0,0,0.11)" strokeWidth="1" />
                <Circle cx="32" cy="25" r="3" fill="rgba(0,0,0,0.05)" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'soil':
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Defs>
              <Pattern id={patternId} x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <Rect width="20" height="20" fill={color} />
                <Circle cx="5" cy="5" r="0.8" fill="rgba(0,0,0,0.1)" />
                <Circle cx="15" cy="12" r="0.6" fill="rgba(0,0,0,0.08)" />
                <Circle cx="8" cy="16" r="0.7" fill="rgba(0,0,0,0.09)" />
              </Pattern>
            </Defs>
            <Rect width="100%" height={height} fill={`url(#${patternId})`} />
          </Svg>
        );

      case 'generic':
      default:
        return (
          <Svg width="100%" height={height} style={StyleSheet.absoluteFill}>
            <Rect width="100%" height={height} fill={color} />
          </Svg>
        );
    }
  }, [pattern, color, height]);

  return (
    <View style={[styles.container, { height }, style]}>
      {patternElements}
      <View style={styles.childrenContainer}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  childrenContainer: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default RockPatternView;
