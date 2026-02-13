import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import useStore from '../services/store';

const IdentifyScreen = ({ navigation }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(0);

  const { addIdentification } = useStore();

  React.useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      const photo = await cameraRef.takePictureAsync();
      setCapturedImage(photo.uri);
    }
  };

  const analyzePicture = async () => {
    setIsAnalyzing(true);
    
    // TODO: Implement AI identification logic
    // This is a placeholder - will be implemented with OpenAI Vision API
    setTimeout(() => {
      const mockResult = {
        id: Date.now().toString(),
        rock_name: 'Sandstone',
        confidence_score: 0.85,
        photo_url: capturedImage,
        created_at: new Date().toISOString(),
      };
      
      addIdentification(mockResult);
      setIsAnalyzing(false);
      navigation.navigate('Results', { identification: mockResult });
    }, 2000);
  };

  const retake = () => {
    setCapturedImage(null);
  };

  if (hasPermission === null) {
    return <View style={styles.container} />;
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>No access to camera</Text>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.preview} />
        
        {isAnalyzing ? (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={COLORS.terracottaOrange} />
            <Text style={styles.analyzingText}>Analyzing...</Text>
          </View>
        ) : (
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <Ionicons name="close-circle" size={32} color={COLORS.white} />
              <Text style={styles.actionText}>Retake</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.analyzeButton} onPress={analyzePicture}>
              <Ionicons name="checkmark-circle" size={32} color={COLORS.white} />
              <Text style={styles.actionText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        ref={(ref) => setCameraRef(ref)}
        zoom={zoom}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={28} color={COLORS.white} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.helpButton}>
            <Ionicons name="help-circle-outline" size={28} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {/* Zoom Controls */}
        <View style={styles.zoomContainer}>
          <TouchableOpacity
            style={[styles.zoomButton, zoom === 0 && styles.zoomButtonActive]}
            onPress={() => setZoom(0)}
          >
            <Text style={[styles.zoomText, zoom === 0 && styles.zoomTextActive]}>1x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.zoomButton, zoom === 0.5 && styles.zoomButtonActive]}
            onPress={() => setZoom(0.5)}
          >
            <Text style={[styles.zoomText, zoom === 0.5 && styles.zoomTextActive]}>2x</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.zoomButton, zoom === 1 && styles.zoomButtonActive]}
            onPress={() => setZoom(1)}
          >
            <Text style={[styles.zoomText, zoom === 1 && styles.zoomTextActive]}>3x</Text>
          </TouchableOpacity>
        </View>

        {/* Capture Button */}
        <View style={styles.captureContainer}>
          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepSlateBlue,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  helpButton: {
    padding: SPACING.sm,
  },
  zoomContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  zoomButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  zoomButtonActive: {
    backgroundColor: COLORS.terracottaOrange,
  },
  zoomText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  zoomTextActive: {
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  captureContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.white,
  },
  preview: {
    flex: 1,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  analyzingText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: SPACING.md,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
  },
  retakeButton: {
    alignItems: 'center',
  },
  analyzeButton: {
    alignItems: 'center',
  },
  actionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: SPACING.xs,
  },
  permissionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    textAlign: 'center',
  },
});

export default IdentifyScreen;
