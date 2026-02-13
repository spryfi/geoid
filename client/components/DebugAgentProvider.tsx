import React, { useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import * as Sensors from 'expo-sensors';
import DebugReportModal from '@/components/DebugReportModal';
import * as Haptics from 'expo-haptics';
import { AppConfig } from '@/config/appConfig';

const DeviceMotion = Sensors.DeviceMotion;

interface DebugAgentProviderProps {
  children: ReactNode;
  screenshotRef?: React.RefObject<View | null>;
}

const SHAKE_THRESHOLD = 2.5;
const SHAKE_COOLDOWN_MS = 1000;
const TAP_COUNT_REQUIRED = 5;
const TAP_TIMEOUT_MS = 2000;

export default function DebugAgentProvider({ children, screenshotRef }: DebugAgentProviderProps) {
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugEnabled, setDebugEnabled] = useState(AppConfig.isDevMode);
  const tapCountRef = useRef(0);
  const lastTapTimeRef = useRef(0);
  const lastShakeTimeRef = useRef(0);
  const internalScreenshotRef = useRef<View>(null);

  useEffect(() => {
    if (!debugEnabled) return;
    if (Platform.OS === 'web') return;

    let subscription: any = null;
    
    const setupShakeDetection = async () => {
      const isAvailable = await DeviceMotion.isAvailableAsync();
      if (!isAvailable) return;

      DeviceMotion.setUpdateInterval(100);

      subscription = DeviceMotion.addListener((data: Sensors.DeviceMotionMeasurement) => {
        if (!data.acceleration) return;
        
        const { x, y, z } = data.acceleration;
        const totalAcceleration = Math.sqrt((x || 0) * (x || 0) + (y || 0) * (y || 0) + (z || 0) * (z || 0));

        const now = Date.now();
        if (totalAcceleration > SHAKE_THRESHOLD && now - lastShakeTimeRef.current > SHAKE_COOLDOWN_MS) {
          lastShakeTimeRef.current = now;
          handleShake();
        }
      });
    };

    setupShakeDetection();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [debugEnabled]);

  const handleShake = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setShowDebugModal(true);
  }, []);

  const handleTap = useCallback(() => {
    const now = Date.now();
    
    if (now - lastTapTimeRef.current > TAP_TIMEOUT_MS) {
      tapCountRef.current = 0;
    }
    
    tapCountRef.current += 1;
    lastTapTimeRef.current = now;

    if (tapCountRef.current >= TAP_COUNT_REQUIRED) {
      tapCountRef.current = 0;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (!debugEnabled) {
        setDebugEnabled(true);
        setShowDebugModal(true);
      } else {
        setShowDebugModal(true);
      }
    }
  }, [debugEnabled]);

  const handleCloseModal = useCallback(() => {
    setShowDebugModal(false);
  }, []);

  const activeScreenshotRef = screenshotRef || internalScreenshotRef;

  return (
    <View style={styles.container}>
      <View style={styles.container} ref={internalScreenshotRef} collapsable={false}>
        {children}
      </View>
      
      {AppConfig.isDevMode ? (
        <Pressable onPress={handleTap} style={styles.tapArea} />
      ) : null}

      <DebugReportModal
        visible={showDebugModal}
        onClose={handleCloseModal}
        screenshotRef={activeScreenshotRef}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tapArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 50,
    height: 50,
    zIndex: 1000,
  },
});
