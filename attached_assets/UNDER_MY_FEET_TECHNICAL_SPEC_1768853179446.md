# What's Under My Feet? - Technical Specification

**Author:** Manus AI  
**Date:** January 18, 2026  
**Version:** 1.0

---

## Overview

This document provides the technical specifications for implementing the enhanced "What's Under My Feet?" geological cross-section visualization in Flutter. The goal is to transform the current list-based display into a visually stunning, to-scale, scrollable cross-section with realistic rock textures.

---

## 1. Asset Manifest

The following texture and icon assets have been generated and should be added to your Flutter project.

### Texture Files (for `assets/textures/`)

| Filename | Rock Type | Description |
|----------|-----------|-------------|
| `soil_texture.png` | Surface Soil / Alluvium | Dark brown organic soil |
| `limestone_texture.png` | Limestone, Dolomite | Gray, fine-grained with fossil fragments |
| `sandstone_texture.png` | Sandstone | Tan/cream with cross-bedding patterns |
| `shale_texture.png` | Shale, Mudstone | Red-brown with horizontal laminations |
| `granite_texture.png` | Granite, Igneous | Pink/gray speckled crystalline |
| `basalt_texture.png` | Basalt, Volcanic | Dark gray/black fine-grained |
| `tuff_texture.png` | Tuff, Volcanic Ash | Light gray porous volcanic |
| `aquifer_texture.png` | Water-bearing formations | Tan with blue water tint |
| `clay_texture.png` | Clay, Mudstone | Gray-green with cracks |
| `dolomite_texture.png` | Dolomite | Tan/buff crystalline |

### Icon Files (for `assets/icons/`)

| Filename | Purpose |
|----------|---------|
| `icon_water_drop.png` | Aquifer indicator |
| `icon_dino_skull.png` | K-T Boundary marker |
| `icon_fossil.png` | Fossil-bearing layer indicator |

---

## 2. Lithology-to-Texture Mapping Function

Add this function to your Flutter code to map API lithology strings to texture assets:

```dart
String getTextureForLithology(String lithology) {
  final lith = lithology.toLowerCase();
  
  // Surface/Unnamed layers
  if (lith == 'unnamed' || lith == 'unknown' || lith.contains('alluvium') || lith.contains('soil')) {
    return 'assets/textures/soil_texture.png';
  }
  
  // Sandstone family
  if (lith.contains('sandstone') || lith.contains('sand') || lith.contains('arenite')) {
    return 'assets/textures/sandstone_texture.png';
  }
  
  // Limestone family
  if (lith.contains('limestone') || lith.contains('chalk') || lith.contains('marl')) {
    return 'assets/textures/limestone_texture.png';
  }
  
  // Dolomite family
  if (lith.contains('dolomite') || lith.contains('dolostone')) {
    return 'assets/textures/dolomite_texture.png';
  }
  
  // Shale/Mudstone family
  if (lith.contains('shale') || lith.contains('mudstone') || lith.contains('siltstone')) {
    return 'assets/textures/shale_texture.png';
  }
  
  // Clay family
  if (lith.contains('clay') || lith.contains('claystone')) {
    return 'assets/textures/clay_texture.png';
  }
  
  // Volcanic family
  if (lith.contains('tuff') || lith.contains('ash') || lith.contains('volcanic')) {
    return 'assets/textures/tuff_texture.png';
  }
  
  // Basalt family
  if (lith.contains('basalt') || lith.contains('lava') || lith.contains('flow')) {
    return 'assets/textures/basalt_texture.png';
  }
  
  // Granite/Igneous family
  if (lith.contains('granite') || lith.contains('gneiss') || lith.contains('schist') || lith.contains('igneous')) {
    return 'assets/textures/granite_texture.png';
  }
  
  // Default fallback
  return 'assets/textures/sandstone_texture.png';
}
```

---

## 3. Aquifer Detection Function

Add this function to determine if a layer is likely an aquifer:

```dart
bool isAquifer(String lithology, String? formationName) {
  final lith = lithology.toLowerCase();
  final name = (formationName ?? '').toLowerCase();
  
  // Known aquifer formations (add more as needed)
  final knownAquifers = [
    'carrizo', 'sparta', 'queen city', 'wilcox', 'edwards',
    'ogallala', 'trinity', 'coconino', 'navajo'
  ];
  
  // Check if formation name matches known aquifers
  for (var aquifer in knownAquifers) {
    if (name.contains(aquifer)) return true;
  }
  
  // Porous rock types that commonly hold water
  if (lith.contains('sandstone') || lith.contains('sand') || 
      lith.contains('gravel') || lith.contains('limestone')) {
    return true;
  }
  
  return false;
}
```

---

## 4. Layer Name Sanitization Function

Fix "Unnamed" and improve display names:

```dart
String sanitizeLayerName(String name, String epoch, int index) {
  if (name.toLowerCase() == 'unnamed' || name.isEmpty) {
    if (index == 0) {
      return 'Surface Soil & Alluvium';
    }
    return '$epoch Formation';
  }
  
  // Clean up "Fm" abbreviation
  return name.replaceAll(' Fm', ' Formation').replaceAll('Fm', 'Formation');
}
```

---

## 5. Scaled Height Calculation

Calculate the visual height of each layer based on its real thickness:

```dart
double calculateLayerHeight(double thicknessMeters) {
  // Base scale: 1 meter = 0.5 logical pixels
  // This means a 100m layer = 50px, 500m layer = 250px
  const double scaleFactor = 0.5;
  
  // Minimum height to ensure thin layers are still visible
  const double minHeight = 40.0;
  
  // Maximum height to prevent extremely thick layers from dominating
  const double maxHeight = 400.0;
  
  double calculatedHeight = thicknessMeters * scaleFactor;
  
  return calculatedHeight.clamp(minHeight, maxHeight);
}
```

---

## 6. GeologicalLayerWidget Implementation

```dart
class GeologicalLayerWidget extends StatelessWidget {
  final String name;
  final String epoch;
  final String lithology;
  final double thicknessMeters;
  final double ageMa;
  final bool isAquifer;
  final VoidCallback onTap;

  const GeologicalLayerWidget({
    Key? key,
    required this.name,
    required this.epoch,
    required this.lithology,
    required this.thicknessMeters,
    required this.ageMa,
    required this.isAquifer,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    final height = calculateLayerHeight(thicknessMeters);
    final texture = getTextureForLithology(lithology);

    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: height,
        width: double.infinity,
        decoration: BoxDecoration(
          image: DecorationImage(
            image: AssetImage(texture),
            fit: BoxFit.cover,
            repeat: ImageRepeat.repeat,
          ),
        ),
        child: Stack(
          children: [
            // Semi-transparent overlay for text readability
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.centerLeft,
                    end: Alignment.centerRight,
                    colors: [
                      Colors.black.withOpacity(0.4),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
            ),
            
            // Layer information
            Positioned(
              left: 16,
              top: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                    ),
                  ),
                  Text(
                    epoch,
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 14,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                    ),
                  ),
                ],
              ),
            ),
            
            // Age and thickness on right side
            Positioned(
              right: 16,
              top: 12,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    '${ageMa.toStringAsFixed(1)} Ma',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                    ),
                  ),
                  Text(
                    '${thicknessMeters.toStringAsFixed(0)}m',
                    style: TextStyle(
                      color: Colors.white.withOpacity(0.8),
                      fontSize: 12,
                      shadows: [Shadow(blurRadius: 4, color: Colors.black)],
                    ),
                  ),
                ],
              ),
            ),
            
            // Aquifer indicator
            if (isAquifer)
              Positioned(
                right: 16,
                bottom: 12,
                child: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: Colors.blue.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Image.asset(
                        'assets/icons/icon_water_drop.png',
                        width: 24,
                        height: 24,
                      ),
                      const SizedBox(width: 4),
                      const Text(
                        'Aquifer',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

---

## 7. Depth Scale Widget

A fixed depth scale on the left side of the screen:

```dart
class DepthScaleWidget extends StatelessWidget {
  final double currentScrollOffset;
  final double scaleFactor;

  const DepthScaleWidget({
    Key? key,
    required this.currentScrollOffset,
    this.scaleFactor = 0.5,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Calculate current depth based on scroll position
    final currentDepth = currentScrollOffset / scaleFactor;

    return Container(
      width: 60,
      color: const Color(0xFFF5E6D3).withOpacity(0.9),
      child: Column(
        children: [
          const SizedBox(height: 8),
          const Text(
            '↓Depth',
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2C3E50),
            ),
          ),
          const SizedBox(height: 16),
          Text(
            '${currentDepth.toStringAsFixed(0)}m',
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFFE07856),
            ),
          ),
        ],
      ),
    );
  }
}
```

---

## 8. pubspec.yaml Assets Section

Add these lines to your `pubspec.yaml`:

```yaml
flutter:
  assets:
    - assets/textures/
    - assets/icons/
```

---

## 9. Color Fallback Map (if textures fail to load)

If textures fail to load, use these fallback colors based on lithology:

| Lithology | Fallback Color (Hex) |
|-----------|---------------------|
| Soil/Alluvium | #5D4037 (Brown) |
| Sandstone | #E8D4A8 (Tan) |
| Limestone | #9E9E9E (Gray) |
| Shale | #8D6E63 (Red-Brown) |
| Basalt | #424242 (Dark Gray) |
| Granite | #F5F5F5 (Light Gray) |
| Tuff | #BCAAA4 (Light Brown) |
| Clay | #78909C (Blue-Gray) |

---

## Summary

This specification provides everything needed to transform the "What's Under My Feet?" feature from a simple list into a professional, visually stunning geological cross-section. The key improvements are:

1. **Scaled heights** based on real formation thickness
2. **Realistic textures** for each rock type
3. **Aquifer indicators** for water-bearing formations
4. **Proper naming** for unnamed/surface layers
5. **Depth scale** for user orientation while scrolling

The implementation maintains the existing tap-to-detail functionality while dramatically improving the visual presentation and educational value of the feature.
