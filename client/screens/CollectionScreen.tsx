import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '@/constants/theme';
import useStore from '@/services/store';
import { supabaseService } from '@/services/supabaseService';
import { analyticsService } from '@/services/analyticsService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.md * 3) / 2;

type SortOption = 'date_desc' | 'date_asc' | 'name_asc' | 'name_desc';

interface CollectionScreenProps {
  navigation: NativeStackNavigationProp<any>;
}

export default function CollectionScreen({ navigation }: CollectionScreenProps) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const identifications = useStore((state) => state.identifications);
  const setIdentifications = useStore((state) => state.setIdentifications);
  const isLoadingIdentifications = useStore((state) => state.isLoadingIdentifications);
  const setIsLoadingIdentifications = useStore((state) => state.setIsLoadingIdentifications);
  const isPro = useStore((state) => state.isPro);
  const user = useStore((state) => state.user);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('date_desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const headerBrand = isPro ? 'GeoID Pro' : 'GeoID';

  const loadIdentifications = useCallback(async () => {
    try {
      setIsLoadingIdentifications(true);
      
      if (user?.id && supabaseService.isConfigured) {
        const { data, error } = await supabaseService.getUserIdentifications(user.id);
        if (!error && data) {
          setIdentifications(data);
        }
      }

      if (supabaseService.isConfigured) {
        await analyticsService.trackEvent('screen_viewed', {
          screen_name: 'Collection',
          identifications_count: identifications.length,
        });
      }
    } catch (error) {
      console.error('Error loading identifications:', error);
    } finally {
      setIsLoadingIdentifications(false);
    }
  }, [user?.id, setIdentifications, setIsLoadingIdentifications]);

  useFocusEffect(
    useCallback(() => {
      loadIdentifications();
    }, [loadIdentifications])
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadIdentifications();
    setIsRefreshing(false);
  };

  const filteredAndSortedIdentifications = useMemo(() => {
    let result = [...identifications];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const rockName = (item.rock_name || '').toLowerCase();
        const rockType = (item.rock_type || '').toLowerCase();
        const description = (item.description || '').toLowerCase();
        const locationName = (item.location_name || '').toLowerCase();
        return (
          rockName.includes(query) ||
          rockType.includes(query) ||
          description.includes(query) ||
          locationName.includes(query)
        );
      });
    }

    result.sort((a, b) => {
      switch (sortOption) {
        case 'date_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'date_asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'name_asc':
          return (a.rock_name || '').localeCompare(b.rock_name || '');
        case 'name_desc':
          return (b.rock_name || '').localeCompare(a.rock_name || '');
        default:
          return 0;
      }
    });

    return result;
  }, [identifications, searchQuery, sortOption]);

  const handleSortPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSortMenu(!showSortMenu);
  };

  const selectSortOption = (option: SortOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSortOption(option);
    setShowSortMenu(false);
  };

  const getSortLabel = () => {
    switch (sortOption) {
      case 'date_desc':
        return 'Newest First';
      case 'date_asc':
        return 'Oldest First';
      case 'name_asc':
        return 'A to Z';
      case 'name_desc':
        return 'Z to A';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('Results', { identification: item });
      }}
      activeOpacity={0.8}
      testID={`collection-item-${item.id}`}
    >
      <Image
        source={{ uri: item.image_url || item.photo_url }}
        style={styles.cardImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.cardGradient}
      >
        <Text style={styles.cardName} numberOfLines={1}>
          {item.rock_name}
        </Text>
        <View style={styles.cardMeta}>
          <View style={styles.cardTypeTag}>
            <Text style={styles.cardTypeText}>{item.rock_type}</Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(item.created_at)}</Text>
        </View>
      </LinearGradient>
      {item.is_favorite ? (
        <View style={styles.favoriteIcon}>
          <Feather name="heart" size={16} color={COLORS.primary} />
        </View>
      ) : null}
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (isLoadingIdentifications) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your collection...</Text>
        </View>
      );
    }

    if (searchQuery.trim() && identifications.length > 0) {
      return (
        <View style={styles.emptyState}>
          <Feather name="search" size={64} color={COLORS.lightGray} />
          <Text style={styles.emptyText}>No matches found</Text>
          <Text style={styles.emptySubtext}>
            Try a different search term
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.emptyButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Feather name="layers" size={64} color={COLORS.lightGray} />
        <Text style={styles.emptyText}>No discoveries yet</Text>
        <Text style={styles.emptySubtext}>
          Start identifying rocks to build your collection
        </Text>
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={() => navigation.navigate('Identify')}
          testID="start-identifying-button"
        >
          <Text style={styles.emptyButtonText}>Start Identifying</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
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

      <View style={styles.titleContainer}>
        <Text style={styles.title}>My Collection</Text>
        <Text style={styles.subtitle}>
          {identifications.length} {identifications.length === 1 ? 'rock' : 'rocks'} identified
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Feather name="search" size={18} color={COLORS.mediumGray} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, type, or location..."
          placeholderTextColor={COLORS.mediumGray}
          value={searchQuery}
          onChangeText={setSearchQuery}
          testID="collection-search-input"
        />
        {searchQuery.length > 0 ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Feather name="x" size={18} color={COLORS.mediumGray} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.sortButton, showSortMenu && styles.sortButtonActive]}
          onPress={handleSortPress}
          testID="sort-button"
        >
          <Feather name="sliders" size={16} color={COLORS.white} />
          <Text style={styles.sortButtonText}>{getSortLabel()}</Text>
          <Feather
            name={showSortMenu ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={COLORS.white}
          />
        </TouchableOpacity>
      </View>

      {showSortMenu ? (
        <View style={styles.sortMenu}>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortOption === 'date_desc' && styles.sortMenuItemActive]}
            onPress={() => selectSortOption('date_desc')}
          >
            <Feather name="calendar" size={16} color={sortOption === 'date_desc' ? COLORS.primary : COLORS.white} />
            <Text style={[styles.sortMenuText, sortOption === 'date_desc' && styles.sortMenuTextActive]}>
              Newest First
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortOption === 'date_asc' && styles.sortMenuItemActive]}
            onPress={() => selectSortOption('date_asc')}
          >
            <Feather name="calendar" size={16} color={sortOption === 'date_asc' ? COLORS.primary : COLORS.white} />
            <Text style={[styles.sortMenuText, sortOption === 'date_asc' && styles.sortMenuTextActive]}>
              Oldest First
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortOption === 'name_asc' && styles.sortMenuItemActive]}
            onPress={() => selectSortOption('name_asc')}
          >
            <Feather name="type" size={16} color={sortOption === 'name_asc' ? COLORS.primary : COLORS.white} />
            <Text style={[styles.sortMenuText, sortOption === 'name_asc' && styles.sortMenuTextActive]}>
              A to Z
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortMenuItem, sortOption === 'name_desc' && styles.sortMenuItemActive]}
            onPress={() => selectSortOption('name_desc')}
          >
            <Feather name="type" size={16} color={sortOption === 'name_desc' ? COLORS.primary : COLORS.white} />
            <Text style={[styles.sortMenuText, sortOption === 'name_desc' && styles.sortMenuTextActive]}>
              Z to A
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {filteredAndSortedIdentifications.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredAndSortedIdentifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={[
            styles.grid,
            { paddingBottom: tabBarHeight + SPACING.xl }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
          testID="collection-list"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.deepSlateBlue,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
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
  titleContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.lightGray,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  sortButtonActive: {
    backgroundColor: 'rgba(224, 120, 86, 0.3)',
  },
  sortButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginLeft: 4,
  },
  sortMenu: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  sortMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.sm,
  },
  sortMenuItemActive: {
    backgroundColor: 'rgba(224, 120, 86, 0.2)',
  },
  sortMenuText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  sortMenuTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  grid: {
    padding: SPACING.md,
    paddingTop: 0,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.2,
    margin: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'flex-end',
    padding: SPACING.sm,
  },
  cardName: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTypeTag: {
    backgroundColor: 'rgba(230, 126, 34, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.sm,
  },
  cardTypeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  cardDate: {
    color: COLORS.lightGray,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  favoriteIcon: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: BORDER_RADIUS.full,
    padding: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.lightGray,
    fontSize: TYPOGRAPHY.fontSize.base,
    marginTop: SPACING.md,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.lightGray,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});
