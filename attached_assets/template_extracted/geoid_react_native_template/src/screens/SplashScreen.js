import React, { useEffect } from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../utils/theme';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Navigate to Home after 2 seconds
    const timer = setTimeout(() => {
      navigation.replace('MainTabs');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/geoid_logo_splashPin.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepSlateBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.5,
    height: height * 0.3,
  },
});

export default SplashScreen;
