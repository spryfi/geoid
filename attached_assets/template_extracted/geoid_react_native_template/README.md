# GeoID Pro - React Native Mobile App Template

A premium geology identification mobile app built with React Native (Expo), featuring AI-powered rock identification, location-aware filtering, and a beautiful "Scientific Elegance" design system.

## 🎯 Project Overview

GeoID Pro is a mobile application that uses AI vision to identify rocks and geological formations. The app combines photo-based identification with USGS geological data and GPS location for enhanced accuracy.

### Key Features

- **Hybrid AI Identification**: On-device TensorFlow Lite for offline use + Cloud AI (OpenAI GPT-4 Vision) for enhanced accuracy
- **Location-Aware Filtering**: GPS and compass integration to filter results based on regional geology
- **Pro/Free Tiers**: Free users get 5 identifications per day; Pro users get unlimited access
- **"Show Me Where" AR Feature**: Visualize hidden geological layers in photos
- **Offline-First Architecture**: Works without internet connection using cached data
- **Beautiful UI**: "Scientific Elegance" design system with glassmorphism effects

## 📱 Tech Stack

- **Framework**: React Native (Expo SDK 50)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: Zustand
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: OpenAI GPT-4 Vision API + TensorFlow Lite
- **Camera**: Expo Camera
- **Location**: Expo Location

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- Expo CLI installed (`npm install -g expo-cli`)
- Supabase account and project created
- OpenAI API key

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure Supabase**:
   - Open `src/services/supabase.js`
   - Replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY` with your actual Supabase credentials
   - Run the SQL schema (see `SUPABASE_SETUP.md`)

3. **Configure OpenAI** (for AI identification):
   - Create a `.env` file in the root directory
   - Add your OpenAI API key: `OPENAI_API_KEY=your_key_here`

4. **Start the development server**:
   ```bash
   npm start
   ```

5. **Run on device/simulator**:
   - iOS: Press `i` in the terminal or scan QR code with Expo Go
   - Android: Press `a` in the terminal or scan QR code with Expo Go

## 📂 Project Structure

```
geoid-pro/
├── App.js                      # Main app entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── assets/                     # Images, icons, and brand assets
│   ├── images/                 # All image files
│   └── icons/                  # Custom icons
├── src/
│   ├── screens/                # All screen components
│   │   ├── SplashScreen.js
│   │   ├── HomeScreen.js
│   │   ├── IdentifyScreen.js
│   │   ├── ResultsScreen.js
│   │   ├── CollectionScreen.js
│   │   ├── ExploreScreen.js
│   │   └── PaywallScreen.js
│   ├── navigation/             # Navigation configuration
│   │   └── AppNavigator.js
│   ├── services/               # Backend services
│   │   ├── supabase.js         # Supabase client and helpers
│   │   └── store.js            # Zustand global state
│   └── utils/                  # Utilities and constants
│       └── theme.js            # Design system (colors, typography, etc.)
```

## 🎨 Design System

### Color Palette

- **Deep Slate Blue**: `#2C3E50` (Primary)
- **Terracotta Orange**: `#E67E22` (Accent/CTA)
- **Sage Green**: `#27AE60` (Success/Pro badge)
- **Soft Off-White**: `#F8F9FA` (Background)

### Typography

- **Font Family**: System (Inter/SF Pro Rounded)
- **Sizes**: 12px (xs) to 32px (xxxl)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Corner Radius

- **Standard**: 12pt for all major containers and cards

### Glassmorphism

Used for premium features and the paywall:
- Semi-transparent background
- Subtle blur effect
- Light border and shadow

## 🔐 Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `SUPABASE_SETUP.md` in the SQL Editor
3. Enable Row Level Security (RLS) on all tables
4. Configure Auth providers (Email, Google, Facebook)
5. Create a storage bucket named `rock_photos` with public access

See `SUPABASE_SETUP.md` for detailed instructions.

## 🧪 Testing

### Test Pro/Free Logic

To test the Pro/Free tier logic:

1. Open `src/services/store.js`
2. Change the initial `isPro` state to `true` or `false`
3. Reload the app to see the UI changes

### Test Identification Flow

1. Navigate to the Identify screen
2. Take a photo or select from gallery
3. Tap "Analyze" to trigger the AI identification
4. View results on the Results screen

## 📦 Building for Production

### iOS (Xcode)

1. **Build with Expo**:
   ```bash
   expo build:ios
   ```

2. **Download the `.ipa` file** and upload to App Store Connect

3. **Submit for review** via App Store Connect

### Android

1. **Build with Expo**:
   ```bash
   expo build:android
   ```

2. **Download the `.apk` or `.aab` file**

3. **Upload to Google Play Console**

## 🛠️ Development Roadmap

### Phase 1: Core Features (Current Template)
- ✅ Splash screen
- ✅ Home screen with scenic header
- ✅ Camera/Identify screen
- ✅ Results screen with progressive disclosure
- ✅ Collection screen
- ✅ Paywall screen with glassmorphism
- ✅ Pro/Free logic
- ✅ Supabase integration

### Phase 2: AI Integration (Next Steps)
- ⏳ OpenAI GPT-4 Vision API integration
- ⏳ TensorFlow Lite model integration
- ⏳ Hybrid AI routing logic
- ⏳ Image optimization for cost control
- ⏳ Global caching system

### Phase 3: Advanced Features
- ⏳ "Show Me Where" AR-style feature
- ⏳ 3D geological maps
- ⏳ Offline data caching
- ⏳ Location-aware filtering
- ⏳ Tutorial system

### Phase 4: Polish & Launch
- ⏳ Payment integration (Stripe/RevenueCat)
- ⏳ Analytics integration
- ⏳ Performance optimization
- ⏳ App Store submission

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. For questions or issues, contact the development team.

---

Built with ❤️ for geology enthusiasts
