import { create } from 'zustand';

const useStore = create((set, get) => ({
  // User & Auth State
  user: null,
  isPro: false,
  isLoading: false,
  
  // Subscription State
  subscriptionStatus: 'free', // 'free', 'trial', 'pro'
  trialEndsAt: null,
  
  // Identification State
  currentIdentification: null,
  identifications: [],
  dailyIdentificationCount: 0,
  dailyLimit: 5, // Free users get 5 per day
  
  // UI State
  hasSeenTutorial: false,
  currentScreen: 'Home',
  
  // Actions
  setUser: (user) => set({ user }),
  
  setIsPro: (isPro) => set({ isPro }),
  
  setSubscriptionStatus: (status) => {
    set({ subscriptionStatus: status });
    // Update isPro based on subscription status
    set({ isPro: status === 'pro' || status === 'trial' });
  },
  
  setCurrentIdentification: (identification) => set({ currentIdentification: identification }),
  
  addIdentification: (identification) => set((state) => ({
    identifications: [identification, ...state.identifications],
    dailyIdentificationCount: state.dailyIdentificationCount + 1,
  })),
  
  resetDailyCount: () => set({ dailyIdentificationCount: 0 }),
  
  canIdentify: () => {
    const state = get();
    if (state.isPro) return true;
    return state.dailyIdentificationCount < state.dailyLimit;
  },
  
  getRemainingIdentifications: () => {
    const state = get();
    if (state.isPro) return 'Unlimited';
    return Math.max(0, state.dailyLimit - state.dailyIdentificationCount);
  },
  
  setHasSeenTutorial: (seen) => set({ hasSeenTutorial: seen }),
  
  setCurrentScreen: (screen) => set({ currentScreen: screen }),
  
  // Computed value for header branding
  getHeaderBrand: () => {
    const state = get();
    return state.isPro ? 'GeoID Pro' : 'GeoID';
  },
}));

export default useStore;
