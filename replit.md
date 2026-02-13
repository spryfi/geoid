# GeoID Pro

## Overview

GeoID Pro is a premium geology identification mobile app for iOS and Android, built with React Native (Expo). It combines AI-powered rock identification with location awareness to help users identify rocks and geological formations. The app operates on a freemium model, offering daily limited identifications for free users and unlimited access with advanced features like offline maps and deep-dive technical data for Pro users. The project aims to provide a scientifically elegant user experience with a focus on intuitive design and accurate geological insights, leveraging advanced AI and geological data sources.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React Native with Expo SDK 54
- **Navigation**: React Navigation (native stack navigator and bottom tabs)
- **State Management**: Zustand for global state, with AsyncStorage persistence
- **UI/UX Design**: "Scientific Elegance" design system featuring glassmorphism effects, nature-inspired color schemes, and progressive disclosure for premium content. Custom themed components (Text, View, Card, Button) with Reanimated animations.
- **Styling**: Centralized theme system in `client/constants/theme.ts` using StyleSheet-based styling.
- **Key Screens**: SplashScreen, HomeScreen, IdentifyScreen, ResultsScreen, CollectionScreen, PaywallScreen, ProfileScreen, StratigraphicColumnScreen, ExploreScreen.

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Pattern**: RESTful endpoints prefixed with `/api`
- **Storage**: Currently uses in-memory storage, with Drizzle ORM schema prepared for PostgreSQL.
- **CORS**: Configured for Replit domains and localhost.

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect.
- **Schema Validation**: Zod via drizzle-zod integration.
- **Client State**: Zustand manages user data, identifications, subscription status, and daily limits.

### Core Features
- **AI Vision Pipeline**: Enhanced for field photography with scene type detection and scenario-specific rephoto guidance. Includes a smart retry system with AI-generated prompts and automatic zoom adjustments.
- **Location-Constrained AI Identification**: Utilizes GPS coordinates to query geological APIs (e.g., Macrostrat) for local formations, constraining AI identification to location-valid rocks for increased accuracy.
- **Offline Identification System**: Caches Macrostrat geological data per location using geohash bucketing and AsyncStorage, enabling offline rock identification with best-match results from cached stratigraphic columns.
- **High-Resolution Geological Fault Lines**: Displays detailed fault line traces on maps as tappable polylines with midpoint markers and associated detail cards. Includes ecological boundary visualization and AI-generated deep dive content.
- **Enhanced Stratigraphy Screen ("What's Under My Feet?")**: SVG-based geological cross-section with hardness-based varying layer widths (harder rocks wider), center-aligned layers creating natural profiles, trapezoid transitions between layers, geological boundary markers (K-Pg, Permian-Triassic, Great Unconformity, major unconformities), ft/m unit toggle, enhanced detail modals with lithology composition bars from raw lithArray data, and depth scale. Uses Macrostrat API long response format preserving lithArray, environArray, econ, outcrop, t_int_name, b_int_name fields.
- **Explore Nearby Feature**: Interactive map showing geological Points of Interest (POIs) such as formations, fossil sites, outcrops, and mineral deposits.
- **Collection Screen**: Personal rock identification history with search, sorting, and full result details.
- **Smart Context Mode (Pro Tier)**: Provides geological context ("Why Here?"), alternative rock suggestions, and accuracy feedback.
- **In-App Debug Agent**: AI-powered field debugger for reporting issues with annotated screenshots and AI-generated debug prompts delivered via SMS or clipboard.
- **Authentication & Services**: Comprehensive Supabase integration for auth, database, storage, analytics, and version checking.
- **Paywall & Beta Token System**: Manages Pro subscriptions, beta token redemption, and pro status.

## External Dependencies

### Third-Party Services
- **Supabase**: Authentication, database (profiles, identifications, analytics, app versions), and storage for user data and content.
- **OpenAI API**: For AI-powered rock identification and content generation.
- **Google Maps API**: For location-based features and mapping.
- **Macrostrat API**: Geological data, formation information, and stratigraphic data.
- **Paleobiology Database (PBDB) API**: For fossil site information.
- **Twilio**: For SMS delivery of debug reports.

### Database
- **PostgreSQL**: Used with Drizzle ORM.

### Key NPM Packages
- `expo-camera`: For capturing rock photos.
- `expo-location`: For GPS access and geological context.
- `expo-image`: For optimized image display.
- `expo-haptics`: For haptic feedback.
- `expo-blur`: For glassmorphism effects.
- `expo-linear-gradient`: For gradient overlays.
- `@react-native-community/netinfo`: For network status monitoring.
- `@tanstack/react-query`: For server state management.
- `react-native-svg`: For drawing and annotation features.
- `react-native-view-shot`: For capturing screenshots.
- `zustand`: For state management.

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_MAPS_API_KEY`
- `DATABASE_URL`
- `EXPO_PUBLIC_DOMAIN`
- `REPLIT_DEV_DOMAIN` (set by Replit)