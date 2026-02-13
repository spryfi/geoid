import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { supabase } from './supabaseService';

interface AnalyticsEvent {
  event_name: string;
  event_data: Record<string, any>;
  app_version: string;
  device_os: string;
  device_os_version: string;
  user_id?: string;
  session_id?: string;
  timestamp: string;
}

interface EventProperties {
  [key: string]: any;
}

class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private userId: string | null = null;
  private appVersion: string = '1.0.0';
  private deviceOs: string = Platform.OS;
  private deviceOsVersion: string = Platform.Version?.toString() || 'unknown';
  private isInitialized: boolean = false;

  private constructor() {
    this.sessionId = this.generateSessionId();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.appVersion = Application.nativeApplicationVersion || '1.0.0';
      this.deviceOs = Platform.OS;
      this.deviceOsVersion = Platform.Version?.toString() || 'unknown';
      this.isInitialized = true;
    } catch (error) {
      console.warn('Analytics initialization warning:', error);
      this.isInitialized = true;
    }
  }

  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  startNewSession(): void {
    this.sessionId = this.generateSessionId();
    this.trackEvent('session_start', {});
  }

  async trackEvent(eventName: string, eventData: EventProperties = {}): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const event: AnalyticsEvent = {
      event_name: eventName,
      event_data: eventData,
      app_version: this.appVersion,
      device_os: this.deviceOs,
      device_os_version: this.deviceOsVersion,
      user_id: this.userId || undefined,
      session_id: this.sessionId,
      timestamp: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert([event]);

      if (error) {
        console.warn('Analytics tracking error:', error.message);
      }
    } catch (error) {
      console.warn('Analytics tracking failed:', error);
    }
  }

  async trackScreenView(screenName: string, additionalData: EventProperties = {}): Promise<void> {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...additionalData,
    });
  }

  async trackIdentification(rockType: string, confidence: number, location?: { lat: number; lng: number }): Promise<void> {
    await this.trackEvent('rock_identification', {
      rock_type: rockType,
      confidence,
      has_location: !!location,
      latitude: location?.lat,
      longitude: location?.lng,
    });
  }

  async trackProUpgrade(source: string): Promise<void> {
    await this.trackEvent('pro_upgrade', {
      source,
    });
  }

  async trackPaywallView(trigger: string): Promise<void> {
    await this.trackEvent('paywall_view', {
      trigger,
    });
  }

  async trackCameraOpen(): Promise<void> {
    await this.trackEvent('camera_open', {});
  }

  async trackCollectionView(itemCount: number): Promise<void> {
    await this.trackEvent('collection_view', {
      item_count: itemCount,
    });
  }

  async trackExploreMapOpen(): Promise<void> {
    await this.trackEvent('explore_map_open', {});
  }

  async trackDeepDiveView(rockType: string): Promise<void> {
    await this.trackEvent('deep_dive_view', {
      rock_type: rockType,
    });
  }

  async trackError(errorType: string, errorMessage: string, context?: Record<string, any>): Promise<void> {
    await this.trackEvent('app_error', {
      error_type: errorType,
      error_message: errorMessage,
      ...context,
    });
  }

  async trackBetaTesterAction(action: string, details?: Record<string, any>): Promise<void> {
    await this.trackEvent('beta_tester_action', {
      action,
      ...details,
    });
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getAppVersion(): string {
    return this.appVersion;
  }
}

export const analyticsService = AnalyticsService.getInstance();
export default analyticsService;
