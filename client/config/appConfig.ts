/**
 * App Configuration for Development and Production
 * 
 * SET isDevMode TO TRUE FOR TESTING - Change to FALSE before App Store submission
 */

export const AppConfig = {
  // Development mode flag - enables all Pro features for testing
  // IMPORTANT: Set to FALSE before submitting to App Store/Play Store
  isDevMode: true,

  // App version info
  version: '1.0.0',
  buildNumber: 1,

  // Feature flags
  enableAnalytics: true,
  enableCrashReporting: true,
};

/**
 * Check if Pro features should be unlocked
 * In dev mode, always returns true
 */
export function isProUnlocked(actualSubscriptionStatus: boolean): boolean {
  if (AppConfig.isDevMode) {
    return true;
  }
  return actualSubscriptionStatus;
}

/**
 * Check if paywall should be shown
 * In dev mode, paywall is bypassed
 */
export function shouldShowPaywall(isPro: boolean): boolean {
  if (AppConfig.isDevMode) {
    return false;
  }
  return !isPro;
}

/**
 * Helper to wrap Pro feature access
 * In dev mode, always executes the callback
 */
export function attemptProFeature(
  isPro: boolean,
  onAccess: () => void,
  onBlocked: () => void
): void {
  if (AppConfig.isDevMode || isPro) {
    onAccess();
  } else {
    onBlocked();
  }
}

export default AppConfig;
