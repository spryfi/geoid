import * as Application from 'expo-application';
import { Platform, Linking, Alert } from 'react-native';
import { supabase } from './supabaseService';

interface AppVersion {
  id: string;
  version: string;
  version_code: number;
  platform: 'ios' | 'android' | 'all';
  force_update: boolean;
  release_notes: string | null;
  min_supported_version: string | null;
  app_store_url: string | null;
  play_store_url: string | null;
  created_at: string;
}

interface VersionCheckResult {
  needsUpdate: boolean;
  forceUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string | null;
  storeUrl: string | null;
}

class VersionService {
  private static instance: VersionService;
  private currentVersion: string = '1.0.0';
  private currentVersionCode: number = 1;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): VersionService {
    if (!VersionService.instance) {
      VersionService.instance = new VersionService();
    }
    return VersionService.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.currentVersion = Application.nativeApplicationVersion || '1.0.0';
      this.currentVersionCode = parseInt(Application.nativeBuildVersion || '1', 10);
      this.isInitialized = true;
    } catch (error) {
      console.warn('Version service initialization warning:', error);
      this.isInitialized = true;
    }
  }

  getCurrentVersion(): string {
    return this.currentVersion;
  }

  getCurrentVersionCode(): number {
    return this.currentVersionCode;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  async checkForUpdates(): Promise<VersionCheckResult> {
    await this.initialize();

    const defaultResult: VersionCheckResult = {
      needsUpdate: false,
      forceUpdate: false,
      latestVersion: this.currentVersion,
      currentVersion: this.currentVersion,
      releaseNotes: null,
      storeUrl: null,
    };

    try {
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .or(`platform.eq.${platform},platform.eq.all`)
        .order('version_code', { ascending: false })
        .limit(1);

      if (error || !data || data.length === 0) {
        console.warn('Version check error or no data:', error?.message);
        return defaultResult;
      }

      const latestVersionInfo = data[0] as AppVersion;
      const needsUpdate = this.compareVersions(latestVersionInfo.version, this.currentVersion) > 0;
      
      let forceUpdate = false;
      if (needsUpdate && latestVersionInfo.force_update) {
        forceUpdate = true;
      }
      
      if (latestVersionInfo.min_supported_version) {
        const isBelowMinimum = this.compareVersions(latestVersionInfo.min_supported_version, this.currentVersion) > 0;
        if (isBelowMinimum) {
          forceUpdate = true;
        }
      }

      const storeUrl = Platform.OS === 'ios' 
        ? latestVersionInfo.app_store_url 
        : latestVersionInfo.play_store_url;

      return {
        needsUpdate,
        forceUpdate,
        latestVersion: latestVersionInfo.version,
        currentVersion: this.currentVersion,
        releaseNotes: latestVersionInfo.release_notes,
        storeUrl,
      };
    } catch (error) {
      console.warn('Version check failed:', error);
      return defaultResult;
    }
  }

  async showUpdateDialog(result: VersionCheckResult): Promise<void> {
    const { forceUpdate, latestVersion, releaseNotes, storeUrl } = result;

    const title = forceUpdate ? 'Update Required' : 'Update Available';
    const message = forceUpdate
      ? `A required update (v${latestVersion}) is available. Please update to continue using GeoID Pro.${releaseNotes ? `\n\n${releaseNotes}` : ''}`
      : `A new version (v${latestVersion}) is available.${releaseNotes ? `\n\n${releaseNotes}` : ''}`;

    const buttons = forceUpdate
      ? [
          {
            text: 'Update Now',
            onPress: () => this.openStore(storeUrl),
          },
        ]
      : [
          {
            text: 'Later',
            style: 'cancel' as const,
          },
          {
            text: 'Update',
            onPress: () => this.openStore(storeUrl),
          },
        ];

    Alert.alert(title, message, buttons, { cancelable: !forceUpdate });
  }

  private async openStore(storeUrl: string | null): Promise<void> {
    if (storeUrl) {
      try {
        const canOpen = await Linking.canOpenURL(storeUrl);
        if (canOpen) {
          await Linking.openURL(storeUrl);
        }
      } catch (error) {
        console.warn('Failed to open store URL:', error);
      }
    }
  }

  async checkAndPromptForUpdate(): Promise<boolean> {
    const result = await this.checkForUpdates();
    
    if (result.needsUpdate) {
      await this.showUpdateDialog(result);
      return result.forceUpdate;
    }
    
    return false;
  }
}

export const versionService = VersionService.getInstance();
export default versionService;
