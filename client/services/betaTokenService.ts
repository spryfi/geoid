import supabaseService, { supabase } from './supabaseService';
import analyticsService from './analyticsService';

export interface BetaToken {
  id: string;
  token: string;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  grants_days: number;
  created_at: string;
}

export interface RedemptionResult {
  success: boolean;
  error?: string;
  expirationDate?: Date;
  grantedDays?: number;
}

class BetaTokenService {
  private static instance: BetaTokenService;

  private constructor() {}

  static getInstance(): BetaTokenService {
    if (!BetaTokenService.instance) {
      BetaTokenService.instance = new BetaTokenService();
    }
    return BetaTokenService.instance;
  }

  async validateToken(tokenCode: string): Promise<{ valid: boolean; token?: BetaToken; error?: string }> {
    if (!supabaseService.isConfigured || !supabase) {
      return { valid: false, error: 'Service not available' };
    }

    try {
      const normalizedToken = tokenCode.trim().toUpperCase();
      
      const { data, error } = await supabase
        .from('beta_tokens')
        .select('*')
        .eq('token', normalizedToken)
        .single();

      if (error || !data) {
        return { valid: false, error: 'Invalid token code' };
      }

      if (data.is_used) {
        return { valid: false, error: 'This token has already been used' };
      }

      return { valid: true, token: data as BetaToken };
    } catch (error) {
      console.error('Token validation error:', error);
      return { valid: false, error: 'Failed to validate token' };
    }
  }

  async redeemToken(tokenCode: string, userId: string): Promise<RedemptionResult> {
    if (!supabaseService.isConfigured || !supabase) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const validation = await this.validateToken(tokenCode);
      
      if (!validation.valid || !validation.token) {
        return { success: false, error: validation.error };
      }

      const token = validation.token;
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setDate(expirationDate.getDate() + token.grants_days);

      const { error: tokenError } = await supabase
        .from('beta_tokens')
        .update({
          is_used: true,
          used_by: userId,
          used_at: now.toISOString(),
        })
        .eq('id', token.id);

      if (tokenError) {
        console.error('Failed to mark token as used:', tokenError);
        return { success: false, error: 'Failed to redeem token' };
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          is_pro: true,
          is_beta_tester: true,
          pro_expiration_date: expirationDate.toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
      }

      await analyticsService.trackEvent('beta_token_redeemed', {
        token_id: token.id,
        granted_days: token.grants_days,
        expiration_date: expirationDate.toISOString(),
      });

      return {
        success: true,
        expirationDate,
        grantedDays: token.grants_days,
      };
    } catch (error) {
      console.error('Token redemption error:', error);
      return { success: false, error: 'Failed to redeem token' };
    }
  }

  async checkProStatus(userId: string): Promise<{ isPro: boolean; expirationDate?: Date; isExpired?: boolean }> {
    if (!supabaseService.isConfigured || !supabase) {
      return { isPro: false };
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('is_pro, pro_expiration_date')
        .eq('id', userId)
        .single();

      if (error || !data) {
        return { isPro: false };
      }

      if (!data.is_pro) {
        return { isPro: false };
      }

      if (data.pro_expiration_date) {
        const expDate = new Date(data.pro_expiration_date);
        const now = new Date();
        
        if (expDate < now) {
          await supabase
            .from('profiles')
            .update({ is_pro: false })
            .eq('id', userId);
          
          return { isPro: false, expirationDate: expDate, isExpired: true };
        }
        
        return { isPro: true, expirationDate: expDate, isExpired: false };
      }

      return { isPro: true };
    } catch (error) {
      console.error('Pro status check error:', error);
      return { isPro: false };
    }
  }

  formatExpirationDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  getDaysRemaining(expirationDate: Date): number {
    const now = new Date();
    const diffTime = expirationDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export const betaTokenService = BetaTokenService.getInstance();
export default betaTokenService;
