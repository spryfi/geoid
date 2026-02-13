import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getApiUrl } from '@/lib/query-client';

const DEBUG_MODE_KEY = '@geoid_debug_mode';
const LAST_ACTIONS_KEY = '@geoid_last_actions';
const MAX_ACTIONS = 20;

export interface DebugAction {
  timestamp: number;
  action: string;
  screen?: string;
  details?: any;
}

export interface DebugReport {
  description: string;
  actions: DebugAction[];
  location: { latitude: number; longitude: number } | null;
  deviceInfo: {
    os: string;
    osVersion: string;
    deviceName: string;
    appVersion: string;
    buildNumber: string;
  };
  photo?: string;
  screenshot?: string;
}

class DebugAgentService {
  private static instance: DebugAgentService;
  private isDebugMode: boolean = false;
  private tapCount: number = 0;
  private lastTapTime: number = 0;
  private actions: DebugAction[] = [];
  private lastPhoto: string | null = null;
  private lastLocation: { latitude: number; longitude: number } | null = null;

  private constructor() {
    this.loadDebugMode();
    this.loadActions();
  }

  static getInstance(): DebugAgentService {
    if (!DebugAgentService.instance) {
      DebugAgentService.instance = new DebugAgentService();
    }
    return DebugAgentService.instance;
  }

  private async loadDebugMode(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(DEBUG_MODE_KEY);
      this.isDebugMode = saved === 'true';
    } catch (error) {
      console.warn('Failed to load debug mode:', error);
    }
  }

  private async loadActions(): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(LAST_ACTIONS_KEY);
      if (saved) {
        this.actions = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load actions:', error);
    }
  }

  private async saveActions(): Promise<void> {
    try {
      await AsyncStorage.setItem(LAST_ACTIONS_KEY, JSON.stringify(this.actions.slice(-MAX_ACTIONS)));
    } catch (error) {
      console.warn('Failed to save actions:', error);
    }
  }

  async handleVersionTap(): Promise<boolean> {
    const now = Date.now();
    
    if (now - this.lastTapTime > 2000) {
      this.tapCount = 0;
    }
    
    this.lastTapTime = now;
    this.tapCount++;

    if (this.tapCount >= 5) {
      this.tapCount = 0;
      await this.toggleDebugMode();
      return true;
    }

    return false;
  }

  private async toggleDebugMode(): Promise<void> {
    this.isDebugMode = !this.isDebugMode;
    try {
      await AsyncStorage.setItem(DEBUG_MODE_KEY, this.isDebugMode.toString());
    } catch (error) {
      console.warn('Failed to save debug mode:', error);
    }
  }

  isEnabled(): boolean {
    return this.isDebugMode;
  }

  async setDebugMode(enabled: boolean): Promise<void> {
    this.isDebugMode = enabled;
    try {
      await AsyncStorage.setItem(DEBUG_MODE_KEY, enabled.toString());
    } catch (error) {
      console.warn('Failed to save debug mode:', error);
    }
  }

  logAction(action: string, screen?: string, details?: any): void {
    const logEntry: DebugAction = {
      timestamp: Date.now(),
      action,
      screen,
      details,
    };

    this.actions.push(logEntry);
    
    if (this.actions.length > MAX_ACTIONS) {
      this.actions = this.actions.slice(-MAX_ACTIONS);
    }
    
    this.saveActions();
  }

  setLastPhoto(photoUri: string): void {
    this.lastPhoto = photoUri;
  }

  setLastLocation(location: { latitude: number; longitude: number }): void {
    this.lastLocation = location;
  }

  getLastActions(count: number = 5): DebugAction[] {
    return this.actions.slice(-count);
  }

  async getDeviceInfo(): Promise<DebugReport['deviceInfo']> {
    return {
      os: Platform.OS,
      osVersion: Platform.Version?.toString() || 'Unknown',
      deviceName: Constants.deviceName || 'Unknown Device',
      appVersion: Application.nativeApplicationVersion || '1.0.0',
      buildNumber: Application.nativeBuildVersion || '1',
    };
  }

  async submitReport(description: string, screenshot?: string): Promise<{ success: boolean; reportId?: string; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const actions = this.getLastActions(5);

      const report: DebugReport = {
        description,
        actions,
        location: this.lastLocation,
        deviceInfo,
        photo: this.lastPhoto || undefined,
        screenshot,
      };

      const response = await fetch(new URL('/api/debug-report', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });

      if (!response.ok) {
        throw new Error('Failed to submit report');
      }

      const data = await response.json();
      
      return {
        success: true,
        reportId: data.reportId,
      };
    } catch (error) {
      console.error('Failed to submit debug report:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async generateDebugPrompt(userNotes: string, screenshot?: string): Promise<{ success: boolean; prompt?: string; error?: string }> {
    try {
      const deviceInfo = await this.getDeviceInfo();
      const actions = this.getLastActions(10);

      const debugData = {
        deviceInfo,
        actions,
        location: this.lastLocation,
      };

      const response = await fetch(new URL('/api/generate-debug-prompt', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userNotes,
          screenshot,
          debugData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate prompt');
      }

      const data = await response.json();
      
      return {
        success: true,
        prompt: data.prompt,
      };
    } catch (error) {
      console.error('Failed to generate debug prompt:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendPromptViaSMS(phoneNumber: string, promptText: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(new URL('/api/send-debug-sms', getApiUrl()).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          promptText,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send SMS');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  clearActions(): void {
    this.actions = [];
    AsyncStorage.removeItem(LAST_ACTIONS_KEY);
  }
}

export const debugAgentService = DebugAgentService.getInstance();
export default debugAgentService;
