import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppConfig, isProUnlocked } from '@/config/appConfig';

interface Identification {
  id: string;
  rock_name: string;
  rock_type: string;
  confidence_score?: number;
  confidence?: number;
  photo_url?: string;
  image_url?: string;
  thumbnail_url?: string;
  description: string;
  origin?: string;
  formation?: string;
  formation_info?: string;
  geological_period?: string;
  mineral_composition?: string[];
  hardness?: number;
  color?: string;
  texture?: string;
  cool_fact?: string;
  notes?: string;
  location_name?: string;
  is_favorite?: boolean;
  user_feedback_accuracy?: string | null;
  created_at: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
}

interface StoreState {
  user: any | null;
  isPro: boolean;
  isLoading: boolean;
  subscriptionStatus: 'free' | 'trial' | 'pro' | 'beta';
  trialEndsAt: string | null;
  proExpirationDate: string | null;
  isBetaTester: boolean;
  isFieldDebugMode: boolean;
  currentIdentification: Identification | null;
  identifications: Identification[];
  dailyIdentificationCount: number;
  dailyLimit: number;
  hasSeenTutorial: boolean;
  currentScreen: string;
  isLoadingIdentifications: boolean;
  setUser: (user: any) => void;
  setIsPro: (isPro: boolean) => void;
  setSubscriptionStatus: (status: 'free' | 'trial' | 'pro' | 'beta') => void;
  setProExpirationDate: (date: string | null) => void;
  setIsBetaTester: (isBeta: boolean) => void;
  setFieldDebugMode: (enabled: boolean) => void;
  activateProWithToken: (expirationDate: Date, grantedDays: number) => void;
  setCurrentIdentification: (identification: Identification | null) => void;
  addIdentification: (identification: Identification) => void;
  setIdentifications: (identifications: Identification[]) => void;
  setIsLoadingIdentifications: (loading: boolean) => void;
  resetDailyCount: () => void;
  canIdentify: () => boolean;
  getRemainingIdentifications: () => number | string;
  setHasSeenTutorial: (seen: boolean) => void;
  setCurrentScreen: (screen: string) => void;
  getHeaderBrand: () => string;
  getProDaysRemaining: () => number | null;
  isProExpired: () => boolean;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
}

const useStore = create<StoreState>((set, get) => ({
  user: null,
  isPro: false,
  isLoading: false,
  subscriptionStatus: 'free',
  trialEndsAt: null,
  proExpirationDate: null,
  isBetaTester: false,
  isFieldDebugMode: false,
  currentIdentification: null,
  identifications: [],
  dailyIdentificationCount: 0,
  dailyLimit: 5,
  hasSeenTutorial: false,
  currentScreen: 'Home',
  isLoadingIdentifications: false,

  setUser: (user) => set({ user }),

  setIsPro: (isPro) => set({ isPro }),
  
  setFieldDebugMode: (enabled) => {
    set({ isFieldDebugMode: enabled });
    get().saveToStorage();
  },

  setSubscriptionStatus: (status) => {
    set({ subscriptionStatus: status });
    set({ isPro: status === 'pro' || status === 'trial' || status === 'beta' });
    get().saveToStorage();
  },

  setProExpirationDate: (date) => {
    set({ proExpirationDate: date });
    get().saveToStorage();
  },

  setIsBetaTester: (isBeta) => {
    set({ isBetaTester: isBeta });
    get().saveToStorage();
  },

  activateProWithToken: (expirationDate, grantedDays) => {
    set({
      isPro: true,
      isBetaTester: true,
      subscriptionStatus: 'beta',
      proExpirationDate: expirationDate.toISOString(),
    });
    get().saveToStorage();
  },

  setCurrentIdentification: (identification) => set({ currentIdentification: identification }),

  addIdentification: (identification) => {
    set((state) => ({
      identifications: [identification, ...state.identifications],
      dailyIdentificationCount: state.dailyIdentificationCount + 1,
    }));
    get().saveToStorage();
  },

  setIdentifications: (identifications) => set({ identifications }),

  setIsLoadingIdentifications: (loading) => set({ isLoadingIdentifications: loading }),

  resetDailyCount: () => set({ dailyIdentificationCount: 0 }),

  canIdentify: () => {
    const state = get();
    // In dev mode, always allow identification
    if (AppConfig.isDevMode || state.isPro) return true;
    return state.dailyIdentificationCount < state.dailyLimit;
  },

  getRemainingIdentifications: () => {
    const state = get();
    // In dev mode, show unlimited
    if (AppConfig.isDevMode || state.isPro) return 'Unlimited';
    return Math.max(0, state.dailyLimit - state.dailyIdentificationCount);
  },

  setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),

  setCurrentScreen: (screen) => set({ currentScreen: screen }),

  getHeaderBrand: () => {
    const state = get();
    // In dev mode, always show Pro branding
    return (AppConfig.isDevMode || state.isPro) ? 'GeoID Pro' : 'GeoID';
  },

  getProDaysRemaining: () => {
    const state = get();
    if (!state.proExpirationDate) return null;
    
    const expDate = new Date(state.proExpirationDate);
    const now = new Date();
    const diffTime = expDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  },

  isProExpired: () => {
    const state = get();
    if (!state.proExpirationDate) return false;
    
    const expDate = new Date(state.proExpirationDate);
    return expDate < new Date();
  },

  loadFromStorage: async () => {
    try {
      const data = await AsyncStorage.getItem('geoid_store');
      if (data) {
        const parsed = JSON.parse(data);
        
        let isPro = parsed.isPro || false;
        let subscriptionStatus = parsed.subscriptionStatus || 'free';
        
        if (parsed.proExpirationDate) {
          const expDate = new Date(parsed.proExpirationDate);
          if (expDate < new Date()) {
            isPro = false;
            subscriptionStatus = 'free';
          }
        }
        
        set({
          identifications: parsed.identifications || [],
          isPro,
          subscriptionStatus,
          proExpirationDate: parsed.proExpirationDate || null,
          isBetaTester: parsed.isBetaTester || false,
          isFieldDebugMode: parsed.isFieldDebugMode || false,
          dailyIdentificationCount: parsed.dailyIdentificationCount || 0,
          hasSeenTutorial: parsed.hasSeenTutorial || false,
        });
      }
    } catch (error) {
      console.error('Error loading from storage:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const state = get();
      const data = {
        identifications: state.identifications,
        isPro: state.isPro,
        subscriptionStatus: state.subscriptionStatus,
        proExpirationDate: state.proExpirationDate,
        isBetaTester: state.isBetaTester,
        isFieldDebugMode: state.isFieldDebugMode,
        dailyIdentificationCount: state.dailyIdentificationCount,
        hasSeenTutorial: state.hasSeenTutorial,
      };
      await AsyncStorage.setItem('geoid_store', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  },
}));

export default useStore;
