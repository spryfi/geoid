import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../utils/theme';
import useStore from '../services/store';

const ExploreScreen = ({ navigation }) => {
  const { getHeaderBrand } = useStore();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/images/geoid_logo_splashPin.png')}
            style={styles.headerLogo}
            resizeMode="contain"
          />
          <Text style={styles.headerTitle}>{getHeaderBrand()}</Text>
        </View>
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={28} color={COLORS.deepSlateBlue} />
        </TouchableOpacity>
      </View>

      {/* Placeholder Content */}
      <View style={styles.content}>
        <Ionicons name="map-outline" size={64} color={COLORS.mediumGray} />
        <Text style={styles.title}>Explore Nearby</Text>
        <Text style={styles.subtitle}>
          3D geological maps and nearby features coming soon
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.softOffWhite,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 40,
    height: 40,
    marginRight: SPACING.sm,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
  },
  settingsButton: {
    padding: SPACING.sm,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.mediumGray,
    textAlign: 'center',
  },
});

export default ExploreScreen;
