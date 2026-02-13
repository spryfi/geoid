# GeoID Pro - Replit AI Development Prompts

This document contains a sequence of prompts to use with Replit AI (or any AI coding assistant) to enhance and complete the GeoID Pro mobile app template.

## 🎯 How to Use These Prompts

1. Upload the entire `geoid_react_native_template` folder to Replit
2. Open the Replit AI chat
3. Run these prompts **in sequence**, one at a time
4. Test each feature after implementation before moving to the next prompt

---

## Phase 1: Setup & Configuration

### Prompt 1: Verify Project Structure

```
I have uploaded a React Native (Expo) project for GeoID Pro, a geology identification mobile app. Please:

1. Verify that all files are present and the project structure is correct
2. Check that all imports in the screen files are working
3. Identify any missing dependencies in package.json
4. Suggest any improvements to the folder structure

The project uses:
- React Native with Expo SDK 50
- React Navigation for navigation
- Zustand for state management
- Supabase for backend
- "Scientific Elegance" design system (see src/utils/theme.js)
```

### Prompt 2: Install Dependencies and Test

```
Please help me:

1. Run `npm install` to install all dependencies
2. Start the Expo development server with `npm start`
3. Identify and fix any errors that occur during startup
4. Verify that the app loads to the SplashScreen correctly

If there are any version conflicts or missing packages, please resolve them.
```

---

## Phase 2: AI Integration

### Prompt 3: Implement OpenAI Vision API Integration

```
I need to integrate the OpenAI GPT-4 Vision API for rock identification in the IdentifyScreen.

Please:

1. Create a new file `src/services/aiService.js` that contains:
   - A function `identifyRockWithAI(imageUri, location, bearing)` that:
     - Takes an image URI, GPS coordinates, and compass bearing
     - Resizes the image to 1024x1024 to minimize API costs
     - Sends the image to OpenAI GPT-4 Vision API with a prompt that includes location context
     - Returns a structured result with: rock_name, confidence_score, origin_story, formation_story, cool_fact, vertical_offset_percent (if applicable)

2. Update `src/screens/IdentifyScreen.js` to:
   - Replace the mock identification logic with the real AI service
   - Show proper loading states during API calls
   - Handle errors gracefully with user-friendly messages

3. Add environment variable support for `OPENAI_API_KEY`

The AI prompt should be:
"You are a professional geologist. Identify the rock or geological formation in this image. The user is at [LAT, LON] facing [BEARING] degrees. Provide: 1) Rock name, 2) Confidence (0-1), 3) Origin story (2-3 sentences), 4) Formation process (2-3 sentences, technical), 5) Cool fact (1-2 sentences). If this shows a visible geological layer (like KT Boundary), also provide vertical_offset_percent (0-100) indicating where in the image the layer appears."
```

### Prompt 4: Implement Local TensorFlow Lite Model

```
I need to add offline AI capabilities using TensorFlow Lite.

Please:

1. Research and suggest a suitable pre-trained TensorFlow Lite model for rock/mineral classification (or create a placeholder)
2. Create `src/services/localAI.js` with:
   - A function `identifyRockLocally(imageUri)` that runs the TF Lite model
   - Returns a result in the same format as the cloud AI (but with lower confidence)
3. Update `src/screens/IdentifyScreen.js` to:
   - Check network connectivity before analysis
   - Route to local AI if offline, cloud AI if online
   - Display a badge showing "Cloud AI" or "Local AI" on the results

Note: For now, a mock local AI that returns placeholder results is acceptable. We'll train a custom model later.
```

---

## Phase 3: Location & Caching

### Prompt 5: Implement Location Services

```
I need to integrate GPS and compass for location-aware identification.

Please:

1. Create `src/services/locationService.js` with:
   - `getCurrentLocation()` - Gets GPS coordinates using Expo Location
   - `getCompassBearing()` - Gets compass heading (mock for now, as compass requires native code)
   - `requestLocationPermissions()` - Handles permission requests

2. Update `src/screens/IdentifyScreen.js` to:
   - Request location permissions when the screen loads
   - Capture location and bearing when the user takes a photo
   - Pass this data to the AI service

3. Handle permission denials gracefully with a user-friendly message
```

### Prompt 6: Implement Global Caching System

```
I need to implement a caching system to reduce API costs by reusing identifications from nearby locations.

Please:

1. Create `src/services/cacheService.js` with:
   - `checkCache(latitude, longitude, radius = 100)` - Queries Supabase for identifications within 100 meters
   - `saveToCache(identification)` - Saves a new identification to the database for future cache hits

2. Update the AI identification flow to:
   - Check the cache BEFORE making an API call
   - If a cache hit is found, return it immediately (with a "Cached Result" badge)
   - If no cache hit, proceed with AI identification and save the result to cache

3. Add a `cost_incurred` field to track $0 for cache hits and local AI, actual cost for cloud AI calls
```

---

## Phase 4: Advanced Features

### Prompt 7: Implement "Show Me Where" AR-Style Feature

```
I need to implement the "Show Me Where" feature that highlights geological layers in photos.

Please:

1. Create `src/components/ShowMeWhereOverlay.js` that:
   - Takes an image URI and vertical_offset_percent as props
   - Displays the image with a thin, animated line drawn at the specified vertical position
   - Labels the line with the feature name (e.g., "KT Boundary")
   - Has a close button to dismiss the overlay

2. Update `src/screens/ResultsScreen.js` to:
   - Check if the identification has a `vertical_offset_percent` value
   - If yes, show a "Show Me Where" button
   - When tapped, open the ShowMeWhereOverlay component

3. Style the overlay to match the "Scientific Elegance" design system
```

### Prompt 8: Implement Progressive Disclosure with Real Data

```
Update the ResultsScreen to use real data from the AI identification instead of hardcoded text.

Please:

1. Update `src/screens/ResultsScreen.js` to:
   - Display the `origin_story` in the "The Origin" section
   - Display the `formation_story` in the "The Formation" section (Pro only)
   - Display the `cool_fact` in the "Cool Fact" section (Pro only)
   - All sections should expand/collapse smoothly

2. Ensure the glassmorphism blur effect is applied correctly to locked sections for Free users

3. Add a "Deep Dive" button that navigates to a new DeepDiveScreen (create a placeholder screen for now)
```

### Prompt 9: Implement Save to Collection

```
I need to implement the "Save" functionality so users can save identifications to their collection.

Please:

1. Update `src/screens/ResultsScreen.js` to:
   - Add a "Save" button that calls `saveIdentification()` from the Supabase service
   - Show a success toast when saved
   - Disable the button if already saved (check by ID)

2. Update `src/screens/CollectionScreen.js` to:
   - Fetch the user's identifications from Supabase on mount
   - Display them in a grid with proper loading and empty states
   - Allow tapping a card to navigate back to the Results screen

3. Ensure all database operations respect RLS policies
```

### Prompt 10: Implement Share Discovery

```
I need to implement the "Share" functionality to let users share their discoveries.

Please:

1. Create `src/utils/shareUtils.js` with:
   - `generateShareImage(identification)` - Creates a beautiful share card with the rock name, confidence, and photo
   - `shareDiscovery(identification)` - Uses Expo Sharing to share the generated image

2. Update `src/screens/ResultsScreen.js` to:
   - Wire up the "Share" button to call `shareDiscovery()`
   - Show a loading indicator while generating the share image

3. The share card should match the "Scientific Elegance" aesthetic with the GeoID Pro logo
```

---

## Phase 5: Subscription & Payments

### Prompt 11: Implement Daily Limit Logic

```
I need to enforce the daily identification limit for Free users.

Please:

1. Update `src/services/store.js` to:
   - Track `dailyIdentificationCount` and reset it at midnight
   - Implement `canIdentify()` to check if the user has identifications remaining

2. Update `src/screens/HomeScreen.js` to:
   - Display the remaining identifications count for Free users
   - Show a prominent banner when the user has 0 identifications left

3. Update `src/screens/IdentifyScreen.js` to:
   - Check `canIdentify()` before allowing photo capture
   - If limit reached, show a modal prompting the user to upgrade to Pro
```

### Prompt 12: Implement Payment Integration (Placeholder)

```
I need to set up the payment flow for Pro subscriptions.

Please:

1. Research and suggest the best payment provider for React Native (Stripe, RevenueCat, or native IAP)

2. Create `src/services/paymentService.js` with placeholder functions:
   - `initiatePurchase(planId)` - Starts the purchase flow
   - `restorePurchase()` - Restores previous purchases
   - `checkSubscriptionStatus(userId)` - Checks if the user has an active subscription

3. Update `src/screens/PaywallScreen.js` to:
   - Wire up the "Subscribe Now" button to `initiatePurchase()`
   - Wire up the "Restore Purchase" button to `restorePurchase()`
   - Show loading states during payment processing

Note: For now, use mock functions that simulate successful payments. We'll integrate real payments later.
```

---

## Phase 6: Polish & Optimization

### Prompt 13: Implement Tutorial System

```
I need to add a tutorial/onboarding system for first-time users.

Please:

1. Create `src/components/TutorialModal.js` that:
   - Shows a 3-step onboarding flow on first launch
   - Explains: 1) How to identify rocks, 2) How to save discoveries, 3) Pro features
   - Has "Next", "Skip", and "Get Started" buttons

2. Update `src/screens/HomeScreen.js` to:
   - Show the tutorial modal on first launch (check `hasSeenTutorial` in store)
   - Mark the tutorial as seen after completion

3. Add a "?" help button to screen headers that reopens contextual help
```

### Prompt 14: Add Loading States and Error Handling

```
I need to improve the user experience with better loading states and error handling.

Please:

1. Review all screens and add:
   - Loading skeletons for data fetching (use a library like react-native-skeleton-placeholder)
   - Error boundaries to catch and display errors gracefully
   - Retry buttons for failed network requests

2. Create `src/components/ErrorState.js` - A reusable error component with an illustration and retry button

3. Create `src/components/LoadingState.js` - A reusable loading component with the GeoID Pro logo animation

4. Update all screens to use these components consistently
```

### Prompt 15: Optimize Images and Performance

```
I need to optimize the app for performance and reduce bundle size.

Please:

1. Review all images in `assets/images/` and suggest optimizations:
   - Compress large images
   - Convert to WebP where appropriate
   - Remove unused mockup images (keep only the ones actually used in the app)

2. Implement lazy loading for:
   - The Collection screen (paginate results)
   - Images in the Results screen

3. Add React.memo() to components that don't need frequent re-renders

4. Profile the app and identify any performance bottlenecks
```

---

## Phase 7: Testing & Deployment

### Prompt 16: Add Unit Tests

```
I need to add unit tests for critical functionality.

Please:

1. Set up Jest and React Native Testing Library
2. Create tests for:
   - `src/services/store.js` - Test all state management functions
   - `src/services/cacheService.js` - Test cache hit/miss logic
   - `src/utils/shareUtils.js` - Test share image generation

3. Add a `npm test` script to package.json

4. Aim for at least 60% code coverage on critical services
```

### Prompt 17: Prepare for iOS Build

```
I need to prepare the app for building with Xcode and submitting to the App Store.

Please:

1. Review `app.json` and ensure all iOS-specific settings are correct:
   - Bundle identifier
   - App icons and splash screen
   - Permissions (Camera, Location)

2. Create an `ios/` folder structure for Xcode (if using bare workflow)

3. Generate a build with `expo build:ios` or `eas build --platform ios`

4. Provide a checklist of steps needed to submit to App Store Connect

Note: I will handle the actual Xcode project and TestFlight submission.
```

### Prompt 18: Prepare for Android Build

```
I need to prepare the app for building for Android.

Please:

1. Review `app.json` and ensure all Android-specific settings are correct:
   - Package name
   - Adaptive icons
   - Permissions

2. Generate a build with `expo build:android` or `eas build --platform android`

3. Provide a checklist of steps needed to submit to Google Play Console
```

---

## 🎉 Final Prompt: Review and Launch Checklist

```
The GeoID Pro app is nearly complete! Please:

1. Review the entire codebase and create a comprehensive launch checklist covering:
   - All features implemented and tested
   - All API keys configured
   - All permissions requested
   - All error states handled
   - Performance optimized
   - App Store assets prepared (screenshots, description, keywords)

2. Identify any remaining TODOs or placeholder code that needs to be replaced

3. Suggest any final polish or improvements before launch

4. Provide a step-by-step deployment guide for both iOS and Android
```

---

## 📝 Notes

- Test each feature thoroughly before moving to the next prompt
- Adjust prompts based on the AI's responses and any issues encountered
- Keep the "Scientific Elegance" design system consistent throughout
- Prioritize user experience and performance in all implementations

---

**Good luck with your build! 🚀**
