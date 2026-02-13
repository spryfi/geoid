import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  TextInput,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import Animated, { SlideInDown } from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import { geoPOIService, GeologicalPOI, GeologicalFeature, FaultDeepDiveContent, Coordinate, ViewportBounds, MacrostratFormation } from '@/services/geoPOIService';
import { analyticsService } from '@/services/analyticsService';
import { AppConfig } from '@/config/appConfig';
import ProBadge from '@/components/ProBadge';

const MapViewNative = Platform.OS !== 'web' 
  ? lazy(() => import('@/components/MapViewNative'))
  : null;

const DEMO_LOCATION = { latitude: 30.0658, longitude: -97.7745 };
const { width, height } = Dimensions.get('window');

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface ExploreScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

const POI_TYPE_FILTERS = [
  { type: 'all', label: 'All', icon: 'layers' },
  { type: 'formation', label: 'Formations', icon: 'layers' },
  { type: 'fossil_site', label: 'Fossils', icon: 'archive' },
  { type: 'mineral_deposit', label: 'Minerals', icon: 'hexagon' },
  { type: 'outcrop', label: 'Outcrops', icon: 'map-pin' },
  { type: 'landmark', label: 'Landmarks', icon: 'flag' },
];

export default function ExploreScreen({ navigation }: ExploreScreenProps) {
  const insets = useSafeAreaInsets();
  const isPro = useStore((state) => state.isPro);
  const mapRef = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pois, setPois] = useState<GeologicalPOI[]>([]);
  const [filteredPois, setFilteredPois] = useState<GeologicalPOI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<GeologicalPOI | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: DEMO_LOCATION.latitude,
    longitude: DEMO_LOCATION.longitude,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [geologicalFeatures, setGeologicalFeatures] = useState<GeologicalFeature[]>([]);
  const [macrostratFormations, setMacrostratFormations] = useState<MacrostratFormation[]>([]);
  const lastFetchedBoundsRef = useRef<ViewportBounds | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<GeologicalFeature | null>(null);
  const [featureDeepDive, setFeatureDeepDive] = useState<FaultDeepDiveContent | null>(null);
  const [loadingDeepDive, setLoadingDeepDive] = useState(false);
  const [showDeepDive, setShowDeepDive] = useState(false);
  const [headingTracking, setHeadingTracking] = useState(true);

  const headerBrand = isPro ? 'GeoID Pro' : 'GeoID';

  useEffect(() => {
    if (isPro || AppConfig.isDevMode) {
      initializeMap();
    }
  }, [isPro]);

  useEffect(() => {
    filterPOIs();
  }, [pois, activeFilter, searchQuery]);

  const filterPOIs = () => {
    let filtered = [...pois];
    
    if (activeFilter !== 'all') {
      filtered = filtered.filter(poi => poi.type === activeFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(poi => 
        poi.name.toLowerCase().includes(query) ||
        poi.description.toLowerCase().includes(query) ||
        (poi.rockType?.toLowerCase().includes(query)) ||
        (poi.period?.toLowerCase().includes(query))
      );
    }
    
    setFilteredPois(filtered);
  };

  const initializeMap = async () => {
    setLoading(true);
    setError(null);

    let latitude: number = DEMO_LOCATION.latitude;
    let longitude: number = DEMO_LOCATION.longitude;

    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          try {
            const location = await Promise.race([
              Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
              new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Location timeout')), 10000)
              )
            ]);
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;
          } catch (locError) {
            console.log('Location failed, using demo location');
          }
        }
      }

      setUserLocation({ latitude, longitude });
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      });

      const nearbyPOIs = await geoPOIService.getNearbyPOIs(latitude, longitude, 50);
      setPois(nearbyPOIs);

      const bounds: ViewportBounds = {
        minLat: latitude - 0.15,
        minLng: longitude - 0.15,
        maxLat: latitude + 0.15,
        maxLng: longitude + 0.15,
      };
      lastFetchedBoundsRef.current = bounds;
      const { features, formations } = await geoPOIService.getGeologicalFeatures(bounds);
      setGeologicalFeatures(features);
      setMacrostratFormations(formations);

      await analyticsService.trackEvent('feature_used', {
        feature_name: 'explore_nearby',
        lat: latitude,
        lng: longitude,
        pois_count: nearbyPOIs.length,
      });
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Unable to load map data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (poi: GeologicalPOI) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedPOI(poi);
    setSelectedFeature(null);
  };

  const closeDetailSheet = () => {
    setSelectedPOI(null);
  };

  const handleFeaturePress = (feature: GeologicalFeature) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFeature(feature);
    setSelectedPOI(null);
    setShowDeepDive(false);
    setFeatureDeepDive(null);
  };

  const closeFeatureSheet = () => {
    setSelectedFeature(null);
    setShowDeepDive(false);
    setFeatureDeepDive(null);
  };

  const loadDeepDive = async () => {
    if (!selectedFeature || loadingDeepDive) return;
    setLoadingDeepDive(true);
    setShowDeepDive(true);
    try {
      const content = await geoPOIService.getFaultDeepDive(
        selectedFeature.name,
        selectedFeature.properties,
        userLocation?.latitude,
        userLocation?.longitude,
        macrostratFormations.length > 0 ? macrostratFormations : undefined
      );
      setFeatureDeepDive(content);
    } catch (err) {
      console.error('Deep dive error:', err);
    } finally {
      setLoadingDeepDive(false);
    }
  };

  const centerOnUser = () => {
    if (userLocation && mapRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setHeadingTracking(true);
      mapRef.current.animateCamera({
        center: userLocation,
        pitch: 65,
        altitude: 8000,
        zoom: 14,
      }, { duration: 1000 });
    }
  };

  const toggleHeadingTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHeadingTracking(prev => !prev);
  };

  const getDirections = async () => {
    if (!selectedPOI) return;
    const url = Platform.select({
      ios: `maps://app?daddr=${selectedPOI.latitude},${selectedPOI.longitude}`,
      android: `geo:${selectedPOI.latitude},${selectedPOI.longitude}?q=${selectedPOI.latitude},${selectedPOI.longitude}(${encodeURIComponent(selectedPOI.name)})`,
      default: `https://www.google.com/maps/dir/?api=1&destination=${selectedPOI.latitude},${selectedPOI.longitude}`,
    });
    
    try {
      await Linking.openURL(url);
    } catch (err) {
      console.error('Could not open maps:', err);
    }
  };

  const getGeologyIcon = (type: GeologicalPOI['type']): { name: string; color: string } => {
    switch (type) {
      case 'fossil_site':
        return { name: 'bone', color: '#8B4513' };
      case 'outcrop':
        return { name: 'image-filter-hdr', color: '#696969' };
      case 'mineral_deposit':
        return { name: 'diamond-stone', color: '#9370DB' };
      case 'landmark':
        return { name: 'terrain', color: '#CD853F' };
      case 'formation':
        return { name: 'layers', color: '#E07856' };
      default:
        return { name: 'map-marker', color: '#FF6347' };
    }
  };

  const getMarkerIcon = (type: GeologicalPOI['type']) => {
    return getGeologyIcon(type).name;
  };

  const getMarkerColor = (type: GeologicalPOI['type']) => {
    return geoPOIService.getColorForType(type);
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance < 1 ? `${(distance * 5280).toFixed(0)} ft` : `${distance.toFixed(1)} mi`;
  };

  if (!AppConfig.isDevMode && !isPro) {
    return (
      <View style={[styles.container, styles.lockedContainer]}>
        <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/images/geoid_logo.png')}
              style={styles.headerLogo}
              contentFit="contain"
            />
            <Text style={styles.headerTitle}>{headerBrand}</Text>
          </View>
        </View>
        <View style={styles.lockedContent}>
          <Feather name="lock" size={64} color={COLORS.lightGray} />
          <Text style={styles.lockedTitle}>Pro Feature</Text>
          <Text style={styles.lockedSubtext}>
            Upgrade to GeoID Pro to explore nearby geological features and hotspots
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={() => navigation.navigate('Paywall')}
          >
            <Text style={styles.upgradeButtonText}>Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Finding geological features...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeMap}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : Platform.OS === 'web' ? (
        <WebFallbackView
          pois={filteredPois}
          onSelectPOI={handleMarkerPress}
          insets={insets}
          navigation={navigation}
        />
      ) : (
        <>
          {MapViewNative ? (
            <Suspense fallback={
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            }>
              <MapViewNative
                mapRef={mapRef}
                region={region}
                pois={filteredPois}
                geologicalFeatures={geologicalFeatures}
                onMarkerPress={handleMarkerPress}
                onFeaturePress={handleFeaturePress}
                getMarkerColor={getMarkerColor}
                getMarkerIcon={getMarkerIcon}
                headingTracking={headingTracking}
                userLocation={userLocation}
              />
            </Suspense>
          ) : null}

          <View style={[styles.searchContainer, { top: insets.top + SPACING.sm }]}>
            <View style={styles.searchBar}>
              <Feather name="search" size={20} color={COLORS.mediumGray} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search a location..."
                placeholderTextColor={COLORS.mediumGray}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Feather name="x" size={18} color={COLORS.mediumGray} />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.filterButton, { bottom: (selectedPOI || selectedFeature) ? 130 : 40 }]}
            onPress={() => setShowFilterModal(true)}
          >
            <View style={styles.filterButtonInner}>
              <Feather name="filter" size={20} color={COLORS.deepSlateBlue} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rightButtons, { bottom: (selectedPOI || selectedFeature) ? 130 : 40 }]}>
            <TouchableOpacity onPress={toggleHeadingTracking}>
              <View style={[
                styles.compassButton,
                headingTracking ? styles.compassButtonActive : null,
              ]}>
                <Feather name="compass" size={20} color={headingTracking ? COLORS.white : COLORS.deepSlateBlue} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={centerOnUser}>
              <View style={styles.locationButtonRing}>
                <Feather name="crosshair" size={22} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Legend hidden for cleaner map view */}
        </>
      )}

      {selectedPOI ? (
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.infoCard, { paddingBottom: insets.bottom + SPACING.sm }]}
        >
          <TouchableOpacity
            style={styles.poiCardRow}
            activeOpacity={0.7}
            onPress={() => {
              closeDetailSheet();
              navigation.navigate('POIDetail', { poi: selectedPOI });
            }}
          >
            <View style={[styles.poiThumbnail, { backgroundColor: getGeologyIcon(selectedPOI.type).color + '20' }]}>
              <MaterialCommunityIcons name={getGeologyIcon(selectedPOI.type).name as any} size={32} color={getGeologyIcon(selectedPOI.type).color} />
            </View>
            <View style={styles.poiCardInfo}>
              <Text style={styles.poiCardName} numberOfLines={1}>{selectedPOI.name}</Text>
              <Text style={styles.poiCardTypeLabel}>{geoPOIService.getTypeLabel(selectedPOI.type)}</Text>
              {userLocation ? (
                <Text style={styles.poiCardDistance}>
                  {calculateDistance(userLocation.latitude, userLocation.longitude, selectedPOI.latitude, selectedPOI.longitude)} away
                </Text>
              ) : null}
            </View>
            <Feather name="chevron-right" size={20} color={COLORS.mediumGray} />
          </TouchableOpacity>
        </Animated.View>
      ) : null}

      {selectedFeature ? (
        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.featureCard, { paddingBottom: insets.bottom + SPACING.md }]}
        >
          <TouchableOpacity style={styles.cardCloseButton} onPress={closeFeatureSheet}>
            <Feather name="x" size={20} color={COLORS.mediumGray} />
          </TouchableOpacity>
          
          <ScrollView style={styles.featureScrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.featureCardHeader}>
              <View style={[styles.featureTypeIndicator, { backgroundColor: selectedFeature.color }]}>
                <MaterialCommunityIcons 
                  name={selectedFeature.featureType === 'thrust_fault' ? 'arrow-collapse-up' : 
                        selectedFeature.featureType === 'strike_slip_fault' ? 'swap-horizontal' : 'vector-line'} 
                  size={20} 
                  color="#FFFFFF" 
                />
              </View>
              <View style={styles.featureCardTitleContainer}>
                <Text style={styles.featureCardTitle}>{selectedFeature.name}</Text>
                <Text style={styles.featureCardSubtitle}>
                  {geoPOIService.getFeatureTypeLabel(selectedFeature.featureType)}
                  {selectedFeature.properties?.source ? ` · ${selectedFeature.properties.source}` : ''}
                </Text>
              </View>
            </View>

            {selectedFeature.properties?.ageStatus ? (
              <View style={[styles.ageStatusBadge, { 
                backgroundColor: selectedFeature.properties.ageStatus === 'Active' ? '#FFEBEE' : 
                  selectedFeature.properties.ageStatus === 'Potentially Active' ? '#FFF3E0' : '#F5F5F5',
                borderLeftColor: selectedFeature.color,
              }]}>
                <View style={styles.ageStatusRow}>
                  <View style={[styles.ageStatusDot, { backgroundColor: selectedFeature.color }]} />
                  <Text style={[styles.ageStatusText, { color: selectedFeature.color }]}>
                    {selectedFeature.properties.ageStatus}
                  </Text>
                </View>
                <Text style={styles.ageDescriptionText}>
                  {selectedFeature.properties.ageDescription || selectedFeature.properties.age || 'Age unknown'}
                </Text>
              </View>
            ) : null}

            <Text style={styles.featureDescription}>{selectedFeature.description}</Text>

            {selectedFeature.properties ? (
              <View style={styles.featurePropsRow}>
                {selectedFeature.properties.slipRate ? (
                  <View style={styles.featurePropChip}>
                    <Feather name="activity" size={12} color={COLORS.deepSlateBlue} />
                    <Text style={styles.featurePropText}>Slip: {selectedFeature.properties.slipRate}</Text>
                  </View>
                ) : null}
                {selectedFeature.properties.dipDirection ? (
                  <View style={styles.featurePropChip}>
                    <Feather name="compass" size={12} color={COLORS.deepSlateBlue} />
                    <Text style={styles.featurePropText}>Dip: {selectedFeature.properties.dipDirection}</Text>
                  </View>
                ) : null}
                {selectedFeature.properties.faultType ? (
                  <View style={styles.featurePropChip}>
                    <MaterialCommunityIcons name="vector-line" size={12} color={COLORS.deepSlateBlue} />
                    <Text style={styles.featurePropText}>{selectedFeature.properties.faultType}</Text>
                  </View>
                ) : null}
                {selectedFeature.properties.vertexCount ? (
                  <View style={styles.featurePropChip}>
                    <Feather name="maximize-2" size={12} color={COLORS.deepSlateBlue} />
                    <Text style={styles.featurePropText}>{selectedFeature.properties.vertexCount} pts</Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {!showDeepDive ? (
              <TouchableOpacity style={styles.learnMoreButton} onPress={loadDeepDive}>
                <Feather name="book-open" size={16} color={COLORS.white} />
                <Text style={styles.learnMoreButtonText}>Learn More</Text>
              </TouchableOpacity>
            ) : null}

            {showDeepDive ? (
              loadingDeepDive ? (
                <View style={styles.deepDiveLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.deepDiveLoadingText}>Generating insights...</Text>
                </View>
              ) : featureDeepDive ? (
                <View style={styles.deepDiveContent}>
                  <View style={styles.deepDiveSection}>
                    <View style={styles.deepDiveSectionHeader}>
                      <Feather name="clock" size={14} color={COLORS.primary} />
                      <Text style={styles.deepDiveSectionTitle}>What Happened Here</Text>
                    </View>
                    <Text style={styles.deepDiveText}>{featureDeepDive.whatHappened || featureDeepDive.formation_story}</Text>
                  </View>

                  <View style={styles.deepDiveSection}>
                    <View style={styles.deepDiveSectionHeader}>
                      <MaterialCommunityIcons name="image-filter-hdr" size={14} color="#8B6F47" />
                      <Text style={styles.deepDiveSectionTitle}>Landscape Impact</Text>
                    </View>
                    <Text style={styles.deepDiveText}>{featureDeepDive.landscape}</Text>
                  </View>

                  <View style={styles.deepDiveSection}>
                    <View style={styles.deepDiveSectionHeader}>
                      <Feather name="cloud" size={14} color="#5B9BD5" />
                      <Text style={styles.deepDiveSectionTitle}>Weather Effects</Text>
                    </View>
                    <Text style={styles.deepDiveText}>{featureDeepDive.weather}</Text>
                  </View>

                  <View style={styles.deepDiveSection}>
                    <View style={styles.deepDiveSectionHeader}>
                      <MaterialCommunityIcons name="tree" size={14} color="#2E8B57" />
                      <Text style={styles.deepDiveSectionTitle}>Ecosystems</Text>
                    </View>
                    <Text style={styles.deepDiveText}>{featureDeepDive.ecosystems || featureDeepDive.ecological_impact}</Text>
                  </View>

                  <View style={styles.deepDiveSection}>
                    <View style={styles.deepDiveSectionHeader}>
                      <Feather name="droplet" size={14} color="#4169E1" />
                      <Text style={styles.deepDiveSectionTitle}>Water Systems</Text>
                    </View>
                    <Text style={styles.deepDiveText}>{featureDeepDive.water || featureDeepDive.water_connection}</Text>
                  </View>

                  {(featureDeepDive.funFacts || featureDeepDive.fun_facts)?.length > 0 ? (
                    <View style={styles.deepDiveSection}>
                      <View style={styles.deepDiveSectionHeader}>
                        <Feather name="zap" size={14} color="#FFB300" />
                        <Text style={styles.deepDiveSectionTitle}>Did You Know?</Text>
                      </View>
                      {(featureDeepDive.funFacts || featureDeepDive.fun_facts || []).map((fact: string, i: number) => (
                        <View key={i} style={styles.funFactRow}>
                          <View style={styles.funFactBullet} />
                          <Text style={styles.deepDiveText}>{fact}</Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {featureDeepDive.sources ? (
                    <Text style={styles.sourcesText}>Sources: {featureDeepDive.sources}</Text>
                  ) : null}
                </View>
              ) : null
            ) : null}
          </ScrollView>
        </Animated.View>
      ) : null}

      <Modal
        visible={showFilterModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowFilterModal(false)}
          />
          <View style={[styles.filterModal, { paddingBottom: insets.bottom + SPACING.lg }]}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter by Type</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Feather name="x" size={24} color={COLORS.mediumGray} />
              </TouchableOpacity>
            </View>
            
            {POI_TYPE_FILTERS.map((filter) => (
              <TouchableOpacity
                key={filter.type}
                style={[
                  styles.filterOption,
                  activeFilter === filter.type && styles.filterOptionActive
                ]}
                onPress={() => {
                  setActiveFilter(filter.type);
                  setShowFilterModal(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Feather 
                  name={filter.icon as any} 
                  size={20} 
                  color={activeFilter === filter.type ? COLORS.primary : COLORS.mediumGray} 
                />
                <Text style={[
                  styles.filterOptionText,
                  activeFilter === filter.type && styles.filterOptionTextActive
                ]}>
                  {filter.label}
                </Text>
                {activeFilter === filter.type ? (
                  <Feather name="check" size={20} color={COLORS.primary} />
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getWebGeologyIcon(type: GeologicalPOI['type']): { name: string; color: string } {
  switch (type) {
    case 'fossil_site':
      return { name: 'bone', color: '#8B4513' };
    case 'outcrop':
      return { name: 'image-filter-hdr', color: '#696969' };
    case 'mineral_deposit':
      return { name: 'diamond-stone', color: '#9370DB' };
    case 'landmark':
      return { name: 'terrain', color: '#CD853F' };
    case 'formation':
      return { name: 'layers', color: '#E07856' };
    default:
      return { name: 'map-marker', color: '#FF6347' };
  }
}

function WebFallbackView({ 
  pois, 
  onSelectPOI, 
  insets, 
  navigation 
}: { 
  pois: GeologicalPOI[]; 
  onSelectPOI: (poi: GeologicalPOI) => void;
  insets: any;
  navigation: any;
}) {
  return (
    <View style={styles.webFallback}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={24} color={COLORS.deepSlateBlue} />
        </TouchableOpacity>
        <Text style={styles.headerTitleCenter}>Explore Nearby</Text>
        {AppConfig.isDevMode ? <ProBadge size="small" style={{ marginLeft: 8 }} /> : null}
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.webNoticeCard}>
        <Feather name="map" size={32} color={COLORS.primary} />
        <Text style={styles.webNoticeTitle}>Map View Available in App</Text>
        <Text style={styles.webNoticeText}>
          Scan the QR code in Expo Go to view the interactive map with geological features.
        </Text>
      </View>

      <ScrollView style={styles.poiListContainer} contentContainerStyle={styles.poiList}>
        <Text style={styles.poiListTitle}>{pois.length} Geological Sites Nearby</Text>
        {pois.map((poi) => {
          const iconConfig = getWebGeologyIcon(poi.type);
          return (
            <TouchableOpacity
              key={poi.id}
              style={styles.poiCard}
              onPress={() => onSelectPOI(poi)}
            >
              <View style={[styles.poiTypeIcon, { backgroundColor: '#FFFFFF', borderWidth: 2, borderColor: iconConfig.color }]}>
                <MaterialCommunityIcons name={iconConfig.name as any} size={20} color={iconConfig.color} />
              </View>
              <View style={styles.poiCardContent}>
                <Text style={styles.poiCardTitle}>{poi.name}</Text>
                <Text style={styles.poiCardType}>{geoPOIService.getTypeLabel(poi.type)}</Text>
                {poi.period ? <Text style={styles.poiCardPeriod}>{poi.period}</Text> : null}
              </View>
              <Feather name="chevron-right" size={20} color={COLORS.mediumGray} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.warmBeige,
  },
  lockedContainer: {
    backgroundColor: COLORS.deepSlateBlue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
    zIndex: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 32,
    height: 32,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.primary,
  },
  headerTitleCenter: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  lockedContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  lockedTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  lockedSubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  upgradeButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  upgradeButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.base,
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
    color: COLORS.darkGray,
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
  map: {
    flex: 1,
  },
  searchContainer: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    ...SHADOWS.md,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.deepSlateBlue,
    paddingVertical: 4,
  },
  filterButton: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 10,
  },
  filterButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  rightButtons: {
    position: 'absolute',
    right: SPACING.md,
    zIndex: 10,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  compassButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  compassButtonActive: {
    backgroundColor: COLORS.primary,
  },
  locationButtonRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    ...SHADOWS.lg,
  },
  legendCard: {
    position: 'absolute',
    left: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    ...SHADOWS.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendLine: {
    width: 20,
    height: 4,
    backgroundColor: '#FFA500',
    borderRadius: 2,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  customMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.white,
    ...SHADOWS.md,
  },
  infoCard: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.lg,
  },
  poiCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poiThumbnail: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  poiCardInfo: {
    flex: 1,
  },
  poiCardName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  poiCardTypeLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  poiCardDistance: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    marginTop: 2,
  },
  cardCloseButton: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    zIndex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  filterModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  filterModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  filterOptionActive: {
    backgroundColor: COLORS.softOffWhite,
  },
  filterOptionText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
  },
  filterOptionTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  webFallback: {
    flex: 1,
    backgroundColor: COLORS.warmBeige,
  },
  webNoticeCard: {
    backgroundColor: COLORS.white,
    margin: SPACING.md,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.sm,
  },
  webNoticeTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  webNoticeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  poiListContainer: {
    flex: 1,
  },
  poiList: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  poiListTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
  },
  poiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  poiTypeIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  poiCardContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  poiCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  poiCardType: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  poiCardPeriod: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    marginTop: 2,
  },
  featureCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    ...SHADOWS.lg,
  },
  featureScrollContent: {
    maxHeight: 500,
  },
  featureCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  featureTypeIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  featureCardTitleContainer: {
    flex: 1,
  },
  featureCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  featureCardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
    marginTop: 2,
  },
  featureDescription: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.darkGray,
    lineHeight: 22,
    marginBottom: SPACING.md,
  },
  featurePropsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  featurePropChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warmBeige,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  featurePropText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  ageStatusBadge: {
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
    borderLeftWidth: 3,
  },
  ageStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  ageStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  ageStatusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  ageDescriptionText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    marginLeft: 14,
  },
  sourcesText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontStyle: 'italic',
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: 8,
    marginTop: SPACING.sm,
  },
  learnMoreButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  deepDiveLoading: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  deepDiveLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.mediumGray,
  },
  deepDiveContent: {
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  deepDiveSection: {
    backgroundColor: COLORS.warmBeige,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  deepDiveSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SPACING.xs,
  },
  deepDiveSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  deepDiveText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.darkGray,
    lineHeight: 20,
    flex: 1,
  },
  funFactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
  },
  funFactBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB300',
    marginTop: 7,
  },
  dynamicLegendCard: {
    position: 'absolute',
    right: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    ...SHADOWS.md,
    maxWidth: 200,
  },
  dynamicLegendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 3,
  },
  dynamicLegendLine: {
    width: 20,
    height: 3,
    borderRadius: 1.5,
  },
  dynamicLegendText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.deepSlateBlue,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
});
