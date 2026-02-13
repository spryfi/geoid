import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return url.startsWith('https://');
  } catch {
    return false;
  }
};

const isConfigured = Boolean(
  SUPABASE_URL && 
  SUPABASE_ANON_KEY &&
  isValidUrl(SUPABASE_URL)
);

class SupabaseService {
  private client: SupabaseClient | null = null;
  private static instance: SupabaseService;
  public readonly isConfigured: boolean = isConfigured;

  private constructor() {
    if (isConfigured) {
      try {
        this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        });
      } catch (error) {
        console.warn('Failed to initialize Supabase client:', error);
        this.client = null;
      }
    } else {
      console.warn('Supabase not configured - running in offline mode');
    }
  }

  static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  getClient(): SupabaseClient | null {
    return this.client;
  }

  async signIn(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!this.client) return { user: null, session: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    return { user: data?.user || null, session: data?.session || null, error };
  }

  async signUp(email: string, password: string): Promise<{ user: User | null; session: Session | null; error: Error | null }> {
    if (!this.client) return { user: null, session: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
    });
    return { user: data?.user || null, session: data?.session || null, error };
  }

  async signOut(): Promise<{ error: Error | null }> {
    if (!this.client) return { error: new Error('Supabase not configured') };
    const { error } = await this.client.auth.signOut();
    return { error };
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.client) return null;
    const { data: { user } } = await this.client.auth.getUser();
    return user;
  }

  async getSession(): Promise<Session | null> {
    if (!this.client) return null;
    const { data: { session } } = await this.client.auth.getSession();
    return session;
  }

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    if (!this.client) return { data: { subscription: { unsubscribe: () => {} } } };
    return this.client.auth.onAuthStateChange(callback);
  }

  async getUserProfile(userId: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    return { data, error };
  }

  async updateUserProfile(userId: string, updates: Record<string, any>) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('profiles')
      .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });
    return { data, error };
  }

  async saveIdentification(identification: Record<string, any>) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('identifications')
      .insert([identification])
      .select()
      .single();
    return { data, error };
  }

  async getUserIdentifications(userId: string) {
    if (!this.client) return { data: [], error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('identifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    return { data: data || [], error };
  }

  async getIdentificationById(id: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('identifications')
      .select('*')
      .eq('id', id)
      .single();
    return { data, error };
  }

  async deleteIdentification(id: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from('identifications')
      .delete()
      .eq('id', id);
    return { data, error };
  }

  async uploadImage(bucket: string, path: string, file: Blob | ArrayBuffer, contentType: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { contentType, upsert: true });
    return { data, error };
  }

  getPublicUrl(bucket: string, path: string): string {
    if (!this.client) return '';
    const { data } = this.client.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  async deleteImage(bucket: string, path: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client.storage
      .from(bucket)
      .remove([path]);
    return { data, error };
  }

  async query<T>(table: string, query: { select?: string; filters?: Record<string, any>; order?: { column: string; ascending?: boolean }; limit?: number }) {
    if (!this.client) return { data: null as T[] | null, error: new Error('Supabase not configured') };
    let queryBuilder = this.client.from(table).select(query.select || '*');
    
    if (query.filters) {
      Object.entries(query.filters).forEach(([key, value]) => {
        queryBuilder = queryBuilder.eq(key, value);
      });
    }
    
    if (query.order) {
      queryBuilder = queryBuilder.order(query.order.column, { ascending: query.order.ascending ?? false });
    }
    
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }
    
    const { data, error } = await queryBuilder;
    return { data: data as T[] | null, error };
  }

  async insert<T>(table: string, data: Record<string, any> | Record<string, any>[]) {
    if (!this.client) return { data: null as T[] | null, error: new Error('Supabase not configured') };
    const { data: result, error } = await this.client
      .from(table)
      .insert(data)
      .select();
    return { data: result as T[] | null, error };
  }

  async update<T>(table: string, id: string, updates: Record<string, any>) {
    if (!this.client) return { data: null as T[] | null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from(table)
      .update(updates)
      .eq('id', id)
      .select();
    return { data: data as T[] | null, error };
  }

  async delete(table: string, id: string) {
    if (!this.client) return { data: null, error: new Error('Supabase not configured') };
    const { data, error } = await this.client
      .from(table)
      .delete()
      .eq('id', id);
    return { data, error };
  }
}

export const supabaseService = SupabaseService.getInstance();
export const supabase = supabaseService.getClient();
export default supabaseService;
