# GeoID Pro - Build Instructions

## Overview
GeoID Pro is built with Expo SDK 54 and React Native. This guide covers building for iOS and Android.

## Prerequisites

1. **Node.js** - v18 or higher
2. **Expo CLI** - Install with `npm install -g expo-cli`
3. **EAS CLI** - Install with `npm install -g eas-cli`
4. **For iOS**: macOS with Xcode 15+ and iOS Simulator
5. **For Android**: Android Studio with Android SDK and an emulator

## Development

### Running in Expo Go (Recommended for Development)

1. Install Expo Go on your mobile device from App Store or Google Play
2. Run the development server: `npm run dev`
3. Scan the QR code with Expo Go (Android) or Camera app (iOS)

### Running on Web

```bash
npm run web
```
Opens the app in your browser at http://localhost:8081

## Building for Production

### Setting Up EAS Build

1. Create an Expo account at https://expo.dev
2. Login to EAS:
   ```bash
   eas login
   ```
3. Configure your project:
   ```bash
   eas build:configure
   ```

### Building for iOS

#### Development Build (iOS Simulator)
```bash
eas build --platform ios --profile development
```

#### Production Build (App Store)
```bash
eas build --platform ios --profile production
```

After the build completes, download the IPA file and submit to App Store Connect.

### Building for Android

#### Development Build (APK for testing)
```bash
eas build --platform android --profile development
```

#### Production Build (AAB for Google Play)
```bash
eas build --platform android --profile production
```

After the build completes, download the AAB file and upload to Google Play Console.

## Local Builds (Without EAS)

### iOS (Requires macOS)

1. Generate native projects:
   ```bash
   npx expo prebuild --platform ios
   ```

2. Open in Xcode:
   ```bash
   open ios/GeoIDPro.xcworkspace
   ```

3. Select your team for signing
4. Build and run on simulator or device

### Android

1. Generate native projects:
   ```bash
   npx expo prebuild --platform android
   ```

2. Open in Android Studio:
   ```bash
   open -a "Android Studio" android
   ```

3. Build APK:
   ```bash
   cd android && ./gradlew assembleRelease
   ```
   
   The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

## App Store Submission

### iOS App Store

1. Build production IPA via EAS
2. Download from Expo dashboard
3. Upload to App Store Connect using Transporter or Xcode
4. Fill in app metadata, screenshots, and descriptions
5. Submit for review

### Google Play Store

1. Build production AAB via EAS
2. Download from Expo dashboard
3. Go to Google Play Console
4. Create new release in Production track
5. Upload AAB file
6. Fill in store listing
7. Submit for review

## Required Permissions

The app requests the following permissions:

### iOS (Info.plist)
- `NSCameraUsageDescription` - Camera for rock photos
- `NSLocationWhenInUseUsageDescription` - Location for geological context
- `NSPhotoLibraryUsageDescription` - Access gallery photos

### Android (AndroidManifest.xml)
- `CAMERA` - Camera access
- `ACCESS_FINE_LOCATION` - GPS location
- `ACCESS_COARSE_LOCATION` - Approximate location
- `READ_EXTERNAL_STORAGE` - Read gallery photos
- `INTERNET` - Network requests

## Environment Variables

For production builds, ensure these secrets are configured in EAS:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
eas secret:create --name OPENAI_API_KEY --value "your-openai-key"
eas secret:create --name GOOGLE_MAPS_API_KEY --value "your-maps-key"
```

## Version Management

Update version numbers in `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",        // Semantic version
    "ios": {
      "buildNumber": "2"       // Increment for each iOS build
    },
    "android": {
      "versionCode": 2         // Increment for each Android build
    }
  }
}
```

## Troubleshooting

### Build Fails
- Clear cache: `npx expo start --clear`
- Reset node_modules: `rm -rf node_modules && npm install`

### iOS Signing Issues
- Ensure valid Apple Developer membership
- Check provisioning profiles in Xcode

### Android Build Issues
- Update Android SDK tools
- Check Java version (JDK 17 recommended)
