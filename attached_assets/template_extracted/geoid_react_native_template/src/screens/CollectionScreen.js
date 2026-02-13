import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../utils/theme';
import useStore from '../services/store';

const CollectionScreen = ({ navigation }) => {
  const { identifications, getHeaderBrand } = useStore();

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('Results', { identification: item })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.photo_url }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.rock_name}</Text>
        <View style={styles.cardFooter}>
          <View style={styles.confidenceTag}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.sageGreen} />
            <Text style={styles.confidenceText}>
              {Math.round(item.confidence_score * 100)}%
            </Text>
          </View>
          <Text style={styles.dateText}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

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

      {/* Collection Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>My Collection</Text>
        <Text style={styles.subtitle}>{identifications.length} discoveries</Text>
      </View>

      {/* Collection Grid */}
      {identifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="layers-outline" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>No discoveries yet</Text>
          <Text style={styles.emptySubtext}>
            Start identifying rocks to build your collection
          </Text>
        </View>
      ) : (
        <FlatList
          data={identifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  titleContainer: {
    padding: SPACING.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.mediumGray,
  },
  grid: {
    padding: SPACING.md,
  },
  card: {
    flex: 1,
    margin: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardImage: {
    width: '100%',
    height: 150,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.deepSlateBlue,
    marginBottom: SPACING.sm,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confidenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.sageGreen,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  dateText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.mediumGray,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.mediumGray,
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});

export default CollectionScreen;
