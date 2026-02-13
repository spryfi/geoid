import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Magnetometer } from 'expo-sensors';
import { GeologicalPOI, Coordinate, GeologicalFeature } from '@/services/geoPOIService';
import { COLORS, SHADOWS } from '@/constants/theme';

interface MapViewNativeProps {
  mapRef: React.RefObject<MapView>;
  region: Region;
  pois: GeologicalPOI[];
  geologicalFeatures?: GeologicalFeature[];
  onMarkerPress: (poi: GeologicalPOI) => void;
  onFeaturePress?: (feature: GeologicalFeature) => void;
  getMarkerColor: (type: GeologicalPOI['type']) => string;
  getMarkerIcon: (type: GeologicalPOI['type']) => string;
  headingTracking?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
}

function getMarkerConfig(type: GeologicalPOI['type']): { icon: string; bgColor: string; ringColor: string; label: string } {
  switch (type) {
    case 'fossil_site':
      return { icon: 'bone', bgColor: '#8B6F47', ringColor: '#A8895E', label: 'Fossil Site' };
    case 'outcrop':
      return { icon: 'image-filter-hdr', bgColor: '#5A6E5A', ringColor: '#7A8E7A', label: 'Outcrop' };
    case 'mineral_deposit':
      return { icon: 'diamond-stone', bgColor: '#7E57B5', ringColor: '#9E77D5', label: 'Mineral\nDeposit' };
    case 'landmark':
      return { icon: 'terrain', bgColor: '#CD7F4B', ringColor: '#DD9F6B', label: 'Geological\nLandmark' };
    case 'formation':
      return { icon: 'layers', bgColor: '#E07856', ringColor: '#F09876', label: 'Formation' };
    default:
      return { icon: 'map-marker', bgColor: '#FF6347', ringColor: '#FF8367', label: 'Site' };
  }
}

function getMidpoint(coordinates: Coordinate[]): Coordinate {
  const mid = Math.floor(coordinates.length / 2);
  return coordinates[mid] || coordinates[0];
}

function computeHeading(x: number, y: number): number {
  let angle = Math.atan2(y, x) * (180 / Math.PI);
  angle = 90 - angle;
  return (angle + 360) % 360;
}

const SMOOTHING = 0.12;
const MIN_HEADING_DELTA = 1.0;
const TARGET_PITCH = 60;
const TARGET_ALTITUDE = 1000;

export default function MapViewNative({
  mapRef,
  region,
  pois,
  geologicalFeatures = [],
  onMarkerPress,
  onFeaturePress,
  headingTracking = false,
  userLocation,
}: MapViewNativeProps) {
  const lastHeadingRef = useRef<number>(0);
  const userInteractingRef = useRef(false);
  const interactionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const headingBufferRef = useRef<number[]>([]);
  const localMapRef = useRef<MapView | null>(null);
  const pitchAppliedRef = useRef(false);

  const onMapReady = useCallback(() => {
    const map = localMapRef.current;
    if (!map || pitchAppliedRef.current) return;
    pitchAppliedRef.current = true;

    setTimeout(() => {
      localMapRef.current?.animateCamera({
        center: { latitude: region.latitude, longitude: region.longitude },
        pitch: TARGET_PITCH,
        heading: 0,
        altitude: TARGET_ALTITUDE,
        zoom: 15,
      }, { duration: 0 });
    }, 1000);
  }, [region.latitude, region.longitude]);

  useEffect(() => {
    if (!headingTracking || Platform.OS === 'web') return;

    Magnetometer.setUpdateInterval(100);
    const subscription = Magnetometer.addListener((data) => {
      if (userInteractingRef.current || !localMapRef.current || !pitchAppliedRef.current) return;

      const rawHeading = computeHeading(data.x, data.y);

      const buffer = headingBufferRef.current;
      buffer.push(rawHeading);
      if (buffer.length > 5) buffer.shift();

      let sinSum = 0, cosSum = 0;
      for (const h of buffer) {
        sinSum += Math.sin(h * Math.PI / 180);
        cosSum += Math.cos(h * Math.PI / 180);
      }
      const avgHeading = ((Math.atan2(sinSum, cosSum) * 180 / Math.PI) + 360) % 360;

      const prev = lastHeadingRef.current;
      let diff = avgHeading - prev;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;

      if (Math.abs(diff) < MIN_HEADING_DELTA) return;

      const smoothed = prev + diff * SMOOTHING;
      const finalHeading = ((smoothed % 360) + 360) % 360;
      lastHeadingRef.current = finalHeading;

      const center = userLocation || { latitude: region.latitude, longitude: region.longitude };
      localMapRef.current?.animateCamera({
        center,
        heading: finalHeading,
        pitch: TARGET_PITCH,
      }, { duration: 150 });
    });

    return () => {
      subscription.remove();
      headingBufferRef.current = [];
    };
  }, [headingTracking, userLocation]);

  const onPanDrag = useCallback(() => {
    userInteractingRef.current = true;
    if (interactionTimerRef.current) clearTimeout(interactionTimerRef.current);
    interactionTimerRef.current = setTimeout(() => {
      userInteractingRef.current = false;
    }, 4000);
  }, []);

  const setRef = useCallback((node: MapView | null) => {
    localMapRef.current = node;
    if (mapRef && 'current' in mapRef) {
      (mapRef as React.MutableRefObject<MapView | null>).current = node;
    }
  }, [mapRef]);

  return (
    <MapView
      ref={setRef}
      style={styles.map}
      provider={PROVIDER_DEFAULT}
      initialRegion={region}
      mapType="hybridFlyover"
      showsUserLocation
      showsMyLocationButton={false}
      showsCompass={false}
      pitchEnabled
      rotateEnabled
      showsBuildings
      showsScale={false}
      zoomEnabled
      scrollEnabled
      loadingEnabled
      loadingIndicatorColor={COLORS.primary}
      onMapReady={onMapReady}
      onPanDrag={onPanDrag}
    >
      {geologicalFeatures.length > 0 ? (
        geologicalFeatures.map((feature) => {
          const ageStatus = feature.properties?.ageStatus;
          const isActive = ageStatus === 'Active';
          const isPotentiallyActive = ageStatus === 'Potentially Active';
          const strokeWidth = isActive ? 3 : isPotentiallyActive ? 2.5 : 2;
          const opacity = isActive ? 'CC' : isPotentiallyActive ? '99' : '60';
          const dashPattern = feature.featureType === 'thrust_fault' ? [8, 4] : 
            ageStatus === 'Inactive' ? [4, 6] : undefined;
          
          return (
            <React.Fragment key={feature.id}>
              <Polyline
                coordinates={feature.coordinates}
                strokeColor={feature.color + opacity}
                strokeWidth={strokeWidth}
                tappable={true}
                onPress={() => onFeaturePress?.(feature)}
                lineDashPattern={dashPattern}
              />
            </React.Fragment>
          );
        })
      ) : null}

      {pois.map((poi) => {
        const config = getMarkerConfig(poi.type);
        return (
          <Marker
            key={poi.id}
            coordinate={{ latitude: poi.latitude, longitude: poi.longitude }}
            onPress={() => onMarkerPress(poi)}
            anchor={{ x: 0.5, y: 1.0 }}
            tracksViewChanges={false}
          >
            <View style={styles.markerWrapper}>
              <View style={styles.markerShadow} />
              <View style={[styles.markerPin, { backgroundColor: config.bgColor }]}>
                <View style={[styles.markerIconRing, { borderColor: config.ringColor }]}>
                  <MaterialCommunityIcons
                    name={config.icon as any}
                    size={26}
                    color="#FFFFFF"
                  />
                </View>
              </View>
              <View style={styles.markerStem}>
                <View style={[styles.markerStemLine, { backgroundColor: config.bgColor }]} />
                <View style={[styles.markerDot, { backgroundColor: config.bgColor }]} />
              </View>
              <Text style={styles.markerLabel}>{config.label}</Text>
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerWrapper: {
    alignItems: 'center',
    width: 100,
  },
  markerShadow: {
    position: 'absolute',
    bottom: 14,
    width: 30,
    height: 8,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.25)',
    transform: [{ scaleX: 1.5 }],
  },
  markerPin: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  markerIconRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  markerStem: {
    alignItems: 'center',
    marginTop: -1,
  },
  markerStemLine: {
    width: 2,
    height: 10,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  markerLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 3,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    lineHeight: 14,
    letterSpacing: 0.3,
  },
  faultLabelMarker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...SHADOWS.sm,
  },
});
