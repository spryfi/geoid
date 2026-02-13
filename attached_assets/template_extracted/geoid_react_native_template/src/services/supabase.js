import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Helper functions for common operations

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  return { data, error };
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);
  return { data, error };
};

export const saveIdentification = async (identification) => {
  const { data, error } = await supabase
    .from('identifications')
    .insert([identification]);
  return { data, error };
};

export const getUserIdentifications = async (userId) => {
  const { data, error } = await supabase
    .from('identifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return { data, error };
};

export const uploadPhoto = async (uri, userId) => {
  const fileName = `${userId}/${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', {
    uri,
    name: fileName,
    type: 'image/jpeg',
  });

  const { data, error } = await supabase.storage
    .from('rock_photos')
    .upload(fileName, formData);

  if (error) return { data: null, error };

  const { data: { publicUrl } } = supabase.storage
    .from('rock_photos')
    .getPublicUrl(fileName);

  return { data: publicUrl, error: null };
};
