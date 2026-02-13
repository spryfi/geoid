import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/constants/theme';

interface Point {
  x: number;
  y: number;
}

interface PathData {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
}

interface AnnotationCanvasProps {
  imageUri: string;
  onAnnotationComplete: (annotatedImageUri: string) => void;
  onCancel: () => void;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_PADDING = SPACING.lg * 2;
const CANVAS_WIDTH = SCREEN_WIDTH - CANVAS_PADDING;

export default function AnnotationCanvas({
  imageUri,
  onAnnotationComplete,
  onCancel,
}: AnnotationCanvasProps) {
  const [paths, setPaths] = useState<PathData[]>([]);
  const [currentPath, setCurrentPath] = useState<PathData | null>(null);
  const [strokeColor] = useState('#FF3B30');
  const [strokeWidth] = useState(4);
  const [imageSize, setImageSize] = useState({ width: CANVAS_WIDTH, height: 300 });
  const viewRef = useRef<View>(null);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const newPath: PathData = {
      id: generateId(),
      points: [{ x: locationX, y: locationY }],
      color: strokeColor,
      strokeWidth,
    };
    setCurrentPath(newPath);
  }, [strokeColor, strokeWidth]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    if (!currentPath) return;
    const { locationX, locationY } = event.nativeEvent;
    setCurrentPath(prev => {
      if (!prev) return null;
      return {
        ...prev,
        points: [...prev.points, { x: locationX, y: locationY }],
      };
    });
  }, [currentPath]);

  const handleTouchEnd = useCallback(() => {
    if (currentPath && currentPath.points.length > 1) {
      setPaths(prev => [...prev, currentPath]);
    }
    setCurrentPath(null);
  }, [currentPath]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouchStart,
      onPanResponderMove: handleTouchMove,
      onPanResponderRelease: handleTouchEnd,
      onPanResponderTerminate: handleTouchEnd,
    })
  ).current;

  const handleUndo = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPaths([]);
    setCurrentPath(null);
  };

  const handleDone = () => {
    onAnnotationComplete(imageUri);
  };

  const pointsToPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    const [first, ...rest] = points;
    let d = `M ${first.x} ${first.y}`;
    for (const point of rest) {
      d += ` L ${point.x} ${point.y}`;
    }
    return d;
  };

  const handleImageLoad = (event: any) => {
    const { width, height } = event.source || { width: CANVAS_WIDTH, height: 300 };
    const aspectRatio = width / height;
    const newWidth = CANVAS_WIDTH;
    const newHeight = newWidth / aspectRatio;
    setImageSize({ width: newWidth, height: Math.min(newHeight, 400) });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.headerButton}>
          <Feather name="x" size={20} color={COLORS.deepSlateBlue} />
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Annotate Screenshot</Text>
        <TouchableOpacity onPress={handleDone} style={styles.headerButton}>
          <Text style={[styles.headerButtonText, styles.doneText]}>Done</Text>
          <Feather name="check" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <Text style={styles.instructions}>
        Draw on the image to highlight the issue
      </Text>

      <View 
        ref={viewRef}
        style={[styles.canvasContainer, { height: imageSize.height }]}
        {...panResponder.panHandlers}
      >
        <Image
          source={{ uri: imageUri }}
          style={[styles.image, { width: imageSize.width, height: imageSize.height }]}
          contentFit="contain"
          onLoad={handleImageLoad}
        />
        <Svg 
          style={[StyleSheet.absoluteFill, { width: imageSize.width, height: imageSize.height }]}
        >
          {paths.map(path => (
            <Path
              key={path.id}
              d={pointsToPath(path.points)}
              stroke={path.color}
              strokeWidth={path.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {currentPath ? (
            <Path
              d={pointsToPath(currentPath.points)}
              stroke={currentPath.color}
              strokeWidth={currentPath.strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </Svg>
      </View>

      <View style={styles.toolbar}>
        <View style={styles.toolGroup}>
          <View style={styles.colorIndicator}>
            <View style={[styles.colorDot, { backgroundColor: strokeColor }]} />
            <Text style={styles.toolLabel}>Red Pen</Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            onPress={handleUndo} 
            style={[styles.actionButton, paths.length === 0 && styles.actionButtonDisabled]}
            disabled={paths.length === 0}
          >
            <Feather 
              name="corner-up-left" 
              size={20} 
              color={paths.length === 0 ? COLORS.lightGray : COLORS.deepSlateBlue} 
            />
            <Text style={[
              styles.actionButtonText,
              paths.length === 0 && styles.actionButtonTextDisabled
            ]}>
              Undo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleClear}
            style={[styles.actionButton, paths.length === 0 && styles.actionButtonDisabled]}
            disabled={paths.length === 0}
          >
            <Feather 
              name="trash-2" 
              size={20} 
              color={paths.length === 0 ? COLORS.lightGray : COLORS.error} 
            />
            <Text style={[
              styles.actionButtonText,
              paths.length === 0 && styles.actionButtonTextDisabled,
              paths.length > 0 && { color: COLORS.error }
            ]}>
              Clear
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: SPACING.xs,
  },
  headerButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
  },
  doneText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  instructions: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  canvasContainer: {
    width: CANVAS_WIDTH,
    alignSelf: 'center',
    backgroundColor: COLORS.lightGray + '40',
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  image: {
    position: 'absolute',
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  toolGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.lightGray + '40',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.button,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  toolLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.lightGray + '40',
    borderRadius: BORDER_RADIUS.button,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.deepSlateBlue,
  },
  actionButtonTextDisabled: {
    color: COLORS.lightGray,
  },
});
