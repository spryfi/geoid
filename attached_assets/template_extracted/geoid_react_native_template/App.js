import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import useStore from './src/services/store';
import { supabase, getCurrentUser, getUserProfile } from './src/services/supabase';

export default function App() {
  const { setUser, setIsPro, setSubscriptionStatus } = useStore();

  useEffect(() => {
    // Check for existing session on app load
    checkUser();

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserData(session.user);
        } else {
          setUser(null);
          setIsPro(false);
        }
      }
    );

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const checkUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      await loadUserData(user);
    }
  };

  const loadUserData = async (user) => {
    setUser(user);
    
    // Load user profile to get Pro status
    const { data: profile } = await getUserProfile(user.id);
    if (profile) {
      setIsPro(profile.is_pro || false);
      
      // Check subscription status
      // TODO: Implement proper subscription checking logic
      if (profile.is_pro) {
        setSubscriptionStatus('pro');
      } else {
        setSubscriptionStatus('free');
      }
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <AppNavigator />
    </GestureHandlerRootView>
  );
}
