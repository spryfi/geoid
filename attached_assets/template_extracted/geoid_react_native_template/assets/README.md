# GeoID Pro Assets

This folder contains all the images, icons, and brand assets used in the GeoID Pro mobile app.

## Images Folder (`/images`)

### Brand Assets
- **`geoid_logo_splashPin.png`** - Primary brand logo (layered geological pin). Used in headers and splash screen.
- **`geoid_app_icon.png`** - App icon for iOS and Android.

### Screen Mockups (Reference Images)
These mockups are included for reference and can be used as placeholder images during development:

- **`geoid_pro_splash_screen.png`** - Splash screen design reference
- **`geoid_pro_home_scenic_mockup.png`** - Home screen with scenic Mitten Buttes header (used as actual header image)
- **`geoid_pro_identify_camera.png`** - Camera/Identify screen reference
- **`geoid_pro_collection_view.png`** - Collection screen reference
- **`geoid_pro_explore_map.png`** - Explore map screen reference
- **`geoid_pro_deep_dive_details.png`** - Deep dive details screen reference
- **`geoid_free_home_upsell.png`** - Free version home screen reference
- **`geoid_free_results_locked.png`** - Free version results with locked content reference
- **`geoid_free_paywall.png`** - Paywall screen reference

## Icons Folder (`/icons`)

Currently empty - will be populated with custom icon assets as needed.

## Usage in Code

Import assets using `require()`:

```javascript
// Logo
<Image source={require('../assets/images/geoid_logo_splashPin.png')} />

// Scenic header
<Image source={require('../assets/images/geoid_pro_home_scenic_mockup.png')} />
```

## Adding New Assets

1. Place image files in the appropriate folder (`/images` or `/icons`)
2. Use descriptive, lowercase names with underscores (e.g., `sandstone_sample.png`)
3. Optimize images before adding them to reduce app bundle size
4. Update this README when adding new assets
