import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import { locationService } from '@/services/locationService';
import { usgsService } from '@/services/usgsService';
import { analyticsService } from '@/services/analyticsService';
import { openaiService } from '@/services/openaiService';
import { supabase } from '@/services/supabaseService';
import * as Application from 'expo-application';
import { identificationService, RetryPrompt } from '@/services/identificationService';
import { debugAgentService } from '@/services/debugAgentService';
import { offlineCacheService } from '@/services/offlineCacheService';
import RetryPromptModal from '@/components/RetryPromptModal';

interface ReexamineParams {
  reexamineImage?: string;
  reexamineLocation?: {
    latitude: number;
    longitude: number;
    altitude?: number | null;
  } | null;
}

interface IdentifyScreenProps {
  navigation: NativeStackNavigationProp<any>;
  route?: RouteProp<{ Identify: ReexamineParams }, 'Identify'>;
}

const MOCK_ROCKS = [
  {
    rock_name: 'Navajo Sandstone',
    rock_type: 'Sedimentary',
    description: 'A distinctive, cross-bedded sandstone formation found throughout the American Southwest.',
    origin: 'The Navajo Sandstone formed during the Early Jurassic period, approximately 190-180 million years ago, in a vast desert environment known as an erg. Wind-blown sand dunes accumulated over millions of years, eventually being buried and lithified into rock.',
    formation: 'Cross-bedding patterns visible in the rock indicate it was deposited by ancient wind-blown dunes in a desert environment. The distinctive red and orange colors come from iron oxide coating the sand grains.',
    cool_fact: 'The Navajo Sandstone represents one of the largest sand seas in Earth\'s history, covering an area over 450,000 sq km, larger than modern Sahara dune fields.',
  },
  {
    rock_name: 'Granite',
    rock_type: 'Igneous',
    description: 'A coarse-grained intrusive igneous rock composed mainly of quartz and feldspar.',
    origin: 'Granite forms deep within the Earth\'s crust from the slow crystallization of magma. The process takes millions of years as the molten rock cools and minerals crystallize.',
    formation: 'The characteristic speckled appearance comes from the interlocking crystals of quartz, feldspar, and mica that formed during slow cooling beneath the surface.',
    cool_fact: 'Granite is one of the oldest rocks on Earth - some granite formations are over 3 billion years old, making them witnesses to early Earth history.',
  },
  {
    rock_name: 'Basalt',
    rock_type: 'Igneous',
    description: 'A fine-grained volcanic rock that forms from the rapid cooling of lava.',
    origin: 'Basalt is the most common volcanic rock on Earth and forms when lava erupts at the surface and cools rapidly, creating fine crystals.',
    formation: 'The dark color comes from iron-rich minerals. Basalt often forms distinctive columnar joints as it cools and contracts.',
    cool_fact: 'The ocean floor is almost entirely made of basalt, making it the most abundant rock on Earth\'s surface.',
  },
];

export default function IdentifyScreen({ navigation, route }: IdentifyScreenProps) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [flashMode, setFlashMode] = useState<'off' | 'on'>('off');
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [retryPrompt, setRetryPrompt] = useState<RetryPrompt | null>(null);
  const [analyzingText, setAnalyzingText] = useState('Analyzing Rock');
  const [analyzingSubtext, setAnalyzingSubtext] = useState('Identifying geological features...');
  const [devOverrideLocation, setDevOverrideLocation] = useState<{
    latitude: number;
    longitude: number;
    altitude?: number | null;
  } | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [cacheStatus, setCacheStatus] = useState<{ cached: boolean; regions: number } | null>(null);

  const { addIdentification, isPro } = useStore();

  useEffect(() => {
    identificationService.resetSession();
    
    const checkStatus = async () => {
      const online = await identificationService.checkNetwork();
      setIsOffline(!online);
      const status = await offlineCacheService.getCacheStatus();
      setCacheStatus({ cached: status.currentLocationCached, regions: status.cachedRegionsCount });
    };
    checkStatus();
    
    if (__DEV__ && route?.params?.reexamineImage) {
      setCapturedImage(route.params.reexamineImage);
      if (route.params.reexamineLocation) {
        setDevOverrideLocation(route.params.reexamineLocation);
      }
    }
  }, [route?.params]);

  const takePicture = async () => {
    if (cameraRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setCapturedImage(photo.uri);
      }
    }
  };

  const pickImageFromGallery = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
    }
  };

  const pickGeotaggedImage = async () => {
    if (!__DEV__) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Media library access is needed to import geotagged photos.');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
      exif: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const exif = asset.exif;
      
      if (exif?.GPSLatitude && exif?.GPSLongitude) {
        let latitude = exif.GPSLatitude;
        let longitude = exif.GPSLongitude;
        
        if (exif.GPSLatitudeRef === 'S') latitude = -latitude;
        if (exif.GPSLongitudeRef === 'W') longitude = -longitude;
        
        setDevOverrideLocation({
          latitude,
          longitude,
          altitude: exif.GPSAltitude || null,
        });
        setCapturedImage(asset.uri);
        
        Alert.alert(
          'GPS Found',
          `Location: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\n\nReady to analyze with this location.`,
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'No GPS Data',
          'This image does not contain GPS data. Please select a geotagged photo.',
          [{ text: 'OK' }]
        );
      }
    }
  };

  const analyzePicture = async () => {
    setIsAnalyzing(true);
    setAnalyzingText('Analyzing Rock');
    setAnalyzingSubtext('Identifying geological features...');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const tier = isPro ? 'Pro' : 'Free';
    const appVersion = Application.nativeApplicationVersion || '1.0.0';
    const deviceOs = Platform.OS;

    debugAgentService.logAction('analyze_picture', 'IdentifyScreen', { tier, isPro });
    debugAgentService.setLastPhoto(capturedImage!);

    const networkOnline = await identificationService.checkNetwork();
    setIsOffline(!networkOnline);

    try {
      let location: { latitude: number; longitude: number; altitude?: number | null } | null = null;
      
      if (__DEV__ && devOverrideLocation) {
        location = devOverrideLocation;
        console.log('[DEV] Using override location:', location);
      } else {
        const deviceLocation = await locationService.getLocationWithElevation();
        if (deviceLocation) {
          location = {
            latitude: deviceLocation.latitude,
            longitude: deviceLocation.longitude,
            altitude: deviceLocation.altitude,
          };
        }
      }
      
      if (location) {
        debugAgentService.setLastLocation({
          latitude: location.latitude,
          longitude: location.longitude,
        });
      }

      if (!networkOnline) {
        setAnalyzingText('Offline Mode');
        setAnalyzingSubtext('Using cached geological data...');

        if (!location) {
          setIsAnalyzing(false);
          const offlineNoLocResult = {
            id: Date.now().toString(),
            rock_name: 'Unknown Rock',
            rock_type: 'Unknown',
            confidence_score: 0.1,
            photo_url: capturedImage!,
            description: 'You are offline and no GPS location is available. Connect to the internet or enable location services for identification.',
            origin: 'Unable to determine.',
            formation: 'Unknown.',
            cool_fact: 'GeoID Pro works best with both internet and GPS.',
            created_at: new Date().toISOString(),
            location: null,
            bedrock_formation: null,
            suggested_rocks: [],
            tier,
            identification_method: 'offline_cache',
            user_feedback_accuracy: null,
          };
          addIdentification(offlineNoLocResult);
          identificationService.resetSession();
          navigation.navigate('Results', { identification: offlineNoLocResult });
          return;
        }

        const offlineAttempt = await identificationService.identifyRockOffline({
          latitude: location.latitude,
          longitude: location.longitude,
          elevation: location.altitude,
        });

        const offlineAiResult = offlineAttempt.result!;
        const offlineResult = {
          id: Date.now().toString(),
          rock_name: offlineAiResult.rock_name,
          rock_type: offlineAiResult.rock_type,
          confidence_score: offlineAiResult.confidence_score,
          confidence_level: offlineAiResult.confidence_level,
          identification_method: offlineAiResult.identification_method,
          photo_url: capturedImage!,
          description: offlineAiResult.description,
          origin: offlineAiResult.origin,
          formation: offlineAiResult.formation_process,
          cool_fact: offlineAiResult.cool_fact,
          minerals: offlineAiResult.minerals,
          hardness: offlineAiResult.hardness,
          uses: offlineAiResult.uses,
          why_here: offlineAiResult.why_here,
          what_else: offlineAiResult.what_else,
          location_verified: offlineAiResult.location_verified,
          created_at: new Date().toISOString(),
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            formatted: locationService.formatCoordinates(location.latitude, location.longitude),
            elevation: locationService.formatElevation(location.altitude ?? null),
          },
          bedrock_formation: null,
          suggested_rocks: [],
          tier,
          app_version: appVersion,
          device_os: deviceOs,
          user_feedback_accuracy: null,
        } as any;

        addIdentification(offlineResult);
        setIsAnalyzing(false);
        identificationService.resetSession();
        navigation.navigate('Results', { identification: offlineResult });
        return;
      }

      let usgsData = null;
      let rockSuggestions = { rocks: ['Granite', 'Sandstone', 'Limestone'], description: 'Common rocks.' };
      
      if (location) {
        usgsData = await usgsService.getGeologicalFormation(location.latitude, location.longitude);
        rockSuggestions = usgsService.getRockSuggestions(usgsData.formation);
      }

      const bedrockFormation = usgsData?.formation ? {
        name: usgsData.formation.unitName,
        age: usgsData.formation.unitAge,
        rock_type: usgsData.formation.rockType,
        lithology: usgsData.formation.lithology,
        description: usgsData.formation.description,
        source: usgsData.formation.source,
      } : null;

      let result: any;

      if (isPro) {
        setAnalyzingSubtext('Using AI vision analysis...');
        
        const identificationAttempt = await identificationService.identifyRock(
          capturedImage!,
          location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.altitude,
            bedrockFormation: bedrockFormation ? {
              name: bedrockFormation.name,
              age: bedrockFormation.age,
              rock_type: bedrockFormation.rock_type,
              lithology: bedrockFormation.lithology,
            } : undefined,
          } : undefined,
          isPro,
          zoom
        );

        if (identificationAttempt.needsRetry && identificationAttempt.retryPrompt) {
          setIsAnalyzing(false);
          setRetryPrompt(identificationAttempt.retryPrompt);
          setShowRetryModal(true);
          return;
        }

        if (identificationAttempt.result) {
          const aiResult = identificationAttempt.result;
          
          if (aiResult.dual_ai_verified) {
            setAnalyzingSubtext('Cross-checking with secondary AI...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }

          if (location) {
            identificationService.autoCacheAfterIdentification({
              latitude: location.latitude,
              longitude: location.longitude,
              elevation: location.altitude,
            });
          }

          result = {
            id: Date.now().toString(),
            rock_name: aiResult.rock_name,
            rock_type: aiResult.rock_type,
            confidence_score: aiResult.confidence_score,
            confidence_level: aiResult.confidence_level,
            identification_method: aiResult.identification_method,
            photo_url: capturedImage!,
            description: aiResult.description,
            origin: aiResult.origin,
            formation: aiResult.formation_process,
            cool_fact: aiResult.cool_fact,
            minerals: aiResult.minerals,
            hardness: aiResult.hardness,
            uses: aiResult.uses,
            why_here: aiResult.why_here,
            what_else: aiResult.what_else,
            location_verified: aiResult.location_verified,
            dual_ai_verified: aiResult.dual_ai_verified,
            secondary_ai_result: aiResult.secondary_ai_result,
            ai_agreement: aiResult.ai_agreement,
            stratigraphic_column: aiResult.stratigraphic_column,
            created_at: new Date().toISOString(),
            location: location ? {
              latitude: location.latitude,
              longitude: location.longitude,
              altitude: location.altitude,
              formatted: locationService.formatCoordinates(location.latitude, location.longitude),
              elevation: locationService.formatElevation(location.altitude),
            } : null,
            bedrock_formation: bedrockFormation,
            suggested_rocks: rockSuggestions.rocks,
            tier: 'Pro',
            app_version: appVersion,
            device_os: deviceOs,
            user_feedback_accuracy: null,
          };

          await analyticsService.trackEvent('identification_attempt', {
            tier: 'Pro',
            gps_location: location ? { lat: location.latitude, lng: location.longitude } : null,
            bedrock_formation: bedrockFormation?.name || 'Unknown',
            ai_identification: {
              rock_name: aiResult.rock_name,
              rock_type: aiResult.rock_type,
              confidence: aiResult.confidence_score,
              method: aiResult.identification_method,
              dual_verified: aiResult.dual_ai_verified,
            },
          });

          try {
            if (supabase) {
              await supabase.from('identifications').insert({
                rock_name: aiResult.rock_name,
                rock_type: aiResult.rock_type,
                confidence_score: aiResult.confidence_score,
                photo_url: capturedImage!,
                description: aiResult.description,
                origin: aiResult.origin,
                formation_process: aiResult.formation_process,
                cool_fact: aiResult.cool_fact,
                minerals: aiResult.minerals,
                hardness: aiResult.hardness,
                uses: aiResult.uses,
                latitude: location?.latitude,
                longitude: location?.longitude,
                elevation: location?.altitude,
                bedrock_formation: bedrockFormation?.name,
                bedrock_age: bedrockFormation?.age,
                bedrock_rock_type: bedrockFormation?.rock_type,
                app_version: appVersion,
                device_os: deviceOs,
                tier: 'Pro',
              });
            }
          } catch (dbError) {
            console.warn('Failed to save to Supabase:', dbError);
          }
        } else {
          throw new Error('AI identification failed');
        }
      } else {
        const suggestedRock = rockSuggestions.rocks[Math.floor(Math.random() * rockSuggestions.rocks.length)];
        const matchingMockRock = MOCK_ROCKS.find(r => 
          r.rock_name.toLowerCase().includes(suggestedRock.toLowerCase()) ||
          suggestedRock.toLowerCase().includes(r.rock_type.toLowerCase())
        ) || MOCK_ROCKS[Math.floor(Math.random() * MOCK_ROCKS.length)];

        result = {
          id: Date.now().toString(),
          rock_name: suggestedRock,
          rock_type: matchingMockRock.rock_type,
          confidence_score: 0.75 + Math.random() * 0.20,
          photo_url: capturedImage!,
          description: matchingMockRock.description,
          origin: matchingMockRock.origin,
          formation: matchingMockRock.formation,
          cool_fact: matchingMockRock.cool_fact,
          created_at: new Date().toISOString(),
          location: location ? {
            latitude: location.latitude,
            longitude: location.longitude,
            altitude: location.altitude,
            formatted: locationService.formatCoordinates(location.latitude, location.longitude),
            elevation: locationService.formatElevation(location.altitude),
          } : null,
          bedrock_formation: bedrockFormation,
          suggested_rocks: rockSuggestions.rocks,
          tier: 'Free',
          user_feedback_accuracy: null,
        };

        await analyticsService.trackEvent('identification_attempt', {
          tier: 'Free',
          gps_location: location ? { lat: location.latitude, lng: location.longitude } : null,
          bedrock_formation: bedrockFormation?.name || 'Unknown',
          identified_rock: suggestedRock,
          confidence: result.confidence_score,
        });

        try {
          if (supabase) {
            await supabase.from('identifications').insert({
              rock_name: suggestedRock,
              rock_type: matchingMockRock.rock_type,
              confidence_score: result.confidence_score,
              photo_url: capturedImage!,
              description: matchingMockRock.description,
              origin: matchingMockRock.origin,
              formation_process: matchingMockRock.formation,
              cool_fact: matchingMockRock.cool_fact,
              latitude: location?.latitude,
              longitude: location?.longitude,
              elevation: location?.altitude,
              bedrock_formation: bedrockFormation?.name,
              bedrock_age: bedrockFormation?.age,
              bedrock_rock_type: bedrockFormation?.rock_type,
              app_version: appVersion,
              device_os: deviceOs,
              tier: 'Free',
            });
          }
        } catch (dbError) {
          console.warn('Failed to save Free tier to Supabase:', dbError);
        }

        if (location) {
          identificationService.autoCacheAfterIdentification({
            latitude: location.latitude,
            longitude: location.longitude,
            elevation: location.altitude,
          });
        }
      }

      addIdentification(result);
      setIsAnalyzing(false);
      identificationService.resetSession();
      navigation.navigate('Results', { identification: result });
    } catch (error) {
      console.error('Error during analysis:', error);
      debugAgentService.logAction('analysis_error', 'IdentifyScreen', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      const randomRock = MOCK_ROCKS[Math.floor(Math.random() * MOCK_ROCKS.length)];
      const result = {
        id: Date.now().toString(),
        rock_name: randomRock.rock_name,
        rock_type: randomRock.rock_type,
        confidence_score: 0.70 + Math.random() * 0.15,
        photo_url: capturedImage!,
        description: randomRock.description,
        origin: randomRock.origin,
        formation: randomRock.formation,
        cool_fact: randomRock.cool_fact,
        created_at: new Date().toISOString(),
        location: null,
        bedrock_formation: null,
        suggested_rocks: [randomRock.rock_name],
        tier: tier,
        user_feedback_accuracy: null,
      };

      await analyticsService.trackEvent('identification_attempt', {
        tier: tier,
        gps_location: null,
        bedrock_formation: 'Unknown',
        identified_rock: randomRock.rock_name,
        confidence: result.confidence_score,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      try {
        if (supabase) {
          await supabase.from('identifications').insert({
            rock_name: randomRock.rock_name,
            rock_type: randomRock.rock_type,
            confidence_score: result.confidence_score,
            photo_url: capturedImage!,
            description: randomRock.description,
            origin: randomRock.origin,
            formation_process: randomRock.formation,
            cool_fact: randomRock.cool_fact,
            tier: tier,
          });
        }
      } catch (dbError) {
        console.warn('Failed to save fallback identification to Supabase:', dbError);
      }

      addIdentification(result);
      setIsAnalyzing(false);
      identificationService.resetSession();
      navigation.navigate('Results', { identification: result });
    }
  };

  const handleRetry = () => {
    setShowRetryModal(false);
    setRetryPrompt(null);
    setCapturedImage(null);
    debugAgentService.logAction('retry_photo', 'IdentifyScreen');
  };

  const handleForceLocationFallback = async () => {
    setShowRetryModal(false);
    setRetryPrompt(null);
    setIsAnalyzing(true);
    setAnalyzingText('Using Location Data');
    setAnalyzingSubtext('Identifying based on geological survey...');
    debugAgentService.logAction('force_location_fallback', 'IdentifyScreen');
    
    await analyzePicture();
  };

  const retake = () => {
    setCapturedImage(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const toggleFlash = () => {
    setFlashMode(flashMode === 'off' ? 'on' : 'off');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const openSettings = async () => {
    if (Platform.OS !== 'web') {
      try {
        await Linking.openSettings();
      } catch (error) {
        // openSettings not supported
      }
    }
  };

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    const canAskAgain = permission.canAskAgain;
    
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <View style={styles.permissionIconContainer}>
          <Feather name="camera-off" size={64} color={COLORS.primary} />
        </View>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          GeoID needs camera access to identify rocks and geological features. Your photos are processed securely.
        </Text>
        
        {canAskAgain ? (
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Feather name="camera" size={20} color={COLORS.white} />
            <Text style={styles.permissionButtonText}>Enable Camera</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.settingsHint}>
              Camera access was denied. Please enable it in your device settings.
            </Text>
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.permissionButton} onPress={openSettings}>
                <Feather name="settings" size={20} color={COLORS.white} />
                <Text style={styles.permissionButtonText}>Open Settings</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity style={styles.galleryButtonAlt} onPress={pickImageFromGallery}>
          <Feather name="image" size={20} color={COLORS.primary} />
          <Text style={styles.galleryButtonAltText}>Choose from Gallery</Text>
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity style={styles.devGeotagButton} onPress={pickGeotaggedImage}>
            <Feather name="map-pin" size={18} color={COLORS.terracottaOrange} />
            <Text style={styles.devGeotagButtonText}>Import Geotagged (Dev)</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backButtonAlt}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage) {
    return (
      <View style={styles.container}>
        <Image source={{ uri: capturedImage }} style={styles.preview} contentFit="cover" />

        {isAnalyzing ? (
          <View style={styles.analyzingOverlay}>
            <View style={styles.scannerContainer}>
              <View style={styles.scannerCornerTL} />
              <View style={styles.scannerCornerTR} />
              <View style={styles.scannerCornerBL} />
              <View style={styles.scannerCornerBR} />
              <View style={styles.scannerLine} />
            </View>
            <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
            <Text style={styles.analyzingText}>{analyzingText}</Text>
            <Text style={styles.analyzingSubtext}>{analyzingSubtext}</Text>
          </View>
        ) : (
          <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + SPACING.lg }]}>
            <TouchableOpacity style={styles.retakeButton} onPress={retake}>
              <View style={styles.actionIconContainer}>
                <Feather name="x" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.actionText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.analyzeButton} onPress={analyzePicture}>
              <View style={[styles.actionIconContainer, styles.analyzeIconContainer]}>
                <Feather name="check" size={28} color={COLORS.white} />
              </View>
              <Text style={styles.actionText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[styles.backButton, { top: insets.top + SPACING.sm }]}
          onPress={() => navigation.goBack()}
        >
          <Feather name="arrow-left" size={24} color={COLORS.white} />
        </TouchableOpacity>

        <RetryPromptModal
          visible={showRetryModal}
          message={retryPrompt?.message || ''}
          suggestion={retryPrompt?.suggestion || ''}
          attemptNumber={retryPrompt?.attemptNumber || 1}
          suggestedZoom={retryPrompt?.suggestedZoom}
          currentZoom={zoom}
          onRetry={handleRetry}
          onCancel={handleForceLocationFallback}
          onZoomChange={setZoom}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        zoom={zoom}
        flash={flashMode}
      >
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => navigation.goBack()}
          >
            <Feather name="arrow-left" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Position Rock in Frame</Text>

          <TouchableOpacity style={styles.headerButton} onPress={toggleFlash}>
            <Feather name={flashMode === 'on' ? 'zap' : 'zap-off'} size={24} color={flashMode === 'on' ? COLORS.primary : COLORS.white} />
          </TouchableOpacity>
        </View>

        {isOffline ? (
          <View style={styles.offlineBanner}>
            <Feather name="wifi-off" size={14} color={COLORS.white} />
            <Text style={styles.offlineBannerText}>
              Offline Mode {cacheStatus && cacheStatus.regions > 0 ? `(${cacheStatus.regions} cached)` : '(no cache)'}
            </Text>
          </View>
        ) : null}

        <View style={styles.focusOverlay}>
          <View style={styles.focusFrame}>
            <View style={[styles.focusCorner, styles.focusCornerTL]} />
            <View style={[styles.focusCorner, styles.focusCornerTR]} />
            <View style={[styles.focusCorner, styles.focusCornerBL]} />
            <View style={[styles.focusCorner, styles.focusCornerBR]} />
          </View>
          <Text style={styles.focusHint}>Center the rock within the frame</Text>
        </View>

        <View style={styles.zoomContainer}>
          <Text style={styles.zoomLabel}>Zoom</Text>
          <View style={styles.zoomButtons}>
            {[0, 0.25, 0.5, 0.75].map((z, i) => (
              <TouchableOpacity
                key={z}
                style={[styles.zoomButton, zoom === z && styles.zoomButtonActive]}
                onPress={() => {
                  setZoom(z);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={[styles.zoomText, zoom === z && styles.zoomTextActive]}>
                  {['1x', '2x', '4x', '8x'][i]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.captureContainer, { paddingBottom: insets.bottom + SPACING.xl }]}>
          <TouchableOpacity style={styles.galleryButton} onPress={pickImageFromGallery}>
            <Feather name="image" size={24} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
            <View style={styles.captureButtonInner}>
              <Feather name="aperture" size={32} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          {__DEV__ ? (
            <TouchableOpacity style={styles.devGeotagCameraButton} onPress={pickGeotaggedImage}>
              <Feather name="map-pin" size={20} color={COLORS.terracottaOrange} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholderButton} />
          )}
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepSlateBlue,
  },
  permissionContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(224, 120, 86, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  permissionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 24,
    paddingHorizontal: SPACING.md,
  },
  settingsHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  permissionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.button,
    marginBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  permissionButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  galleryButtonAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.button,
    marginBottom: SPACING.md,
  },
  galleryButtonAltText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  devGeotagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.terracottaOrange + '15',
    borderWidth: 1,
    borderColor: COLORS.terracottaOrange,
    borderStyle: 'dashed',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.button,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  devGeotagButtonText: {
    color: COLORS.terracottaOrange,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  backButtonAlt: {
    padding: SPACING.md,
  },
  backButtonAltText: {
    color: COLORS.lightGray,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  camera: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  focusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusFrame: {
    width: 280,
    height: 280,
    position: 'relative',
  },
  focusCorner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: COLORS.primary,
  },
  focusCornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  focusCornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  focusCornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  focusCornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  focusHint: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginTop: SPACING.lg,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoomContainer: {
    position: 'absolute',
    bottom: 160,
    alignSelf: 'center',
    alignItems: 'center',
  },
  zoomLabel: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.sm,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  zoomButtons: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.button,
    padding: 4,
    gap: SPACING.xs,
  },
  zoomButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  zoomButtonActive: {
    backgroundColor: COLORS.primary,
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
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  galleryButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  devGeotagCameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.terracottaOrange + '40',
    borderWidth: 2,
    borderColor: COLORS.terracottaOrange,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderButton: {
    width: 50,
    height: 50,
  },
  preview: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    left: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: 200,
    height: 200,
    position: 'relative',
    marginBottom: SPACING.xl,
  },
  scannerCornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
    borderTopLeftRadius: 8,
  },
  scannerCornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 30,
    height: 30,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
    borderTopRightRadius: 8,
  },
  scannerCornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: COLORS.primary,
    borderBottomLeftRadius: 8,
  },
  scannerCornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: COLORS.primary,
    borderBottomRightRadius: 8,
  },
  scannerLine: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: COLORS.primary,
    top: '50%',
  },
  loader: {
    marginBottom: SPACING.md,
  },
  analyzingText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  analyzingSubtext: {
    color: COLORS.lightGray,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginTop: SPACING.sm,
  },
  actionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingTop: SPACING.xl,
  },
  retakeButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  analyzeButton: {
    alignItems: 'center',
    padding: SPACING.md,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  analyzeIconContainer: {
    backgroundColor: COLORS.primary,
  },
  actionText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(224, 120, 86, 0.9)',
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    gap: 6,
    zIndex: 20,
  },
  offlineBannerText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
