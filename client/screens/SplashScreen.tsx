import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { COLORS } from '@/constants/theme';
import useStore from '@/services/store';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const loadFromStorage = useStore((state) => state.loadFromStorage);

  useEffect(() => {
    const initApp = async () => {
      await loadFromStorage();
      const timer = setTimeout(() => {
        navigation.replace('Main');
      }, 2000);

      return () => clearTimeout(timer);
    };

    initApp();
  }, [navigation, loadFromStorage]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/geoid_logo_splash.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.6,
    height: height * 0.4,
  },
});
