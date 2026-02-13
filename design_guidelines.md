# GeoID Pro - Design Guidelines

## Overview
GeoID Pro is a premium geology identification mobile app featuring AI-powered rock identification with a "Scientific Elegance" design system. The app combines photo-based identification with location-aware filtering for enhanced accuracy.

## Design Philosophy
- **Scientific Elegance**: Professional, trustworthy appearance with modern touches
- **Glassmorphism**: Used for premium features and overlays
- **Nature-Inspired**: Colors and imagery reflect geological themes
- **Progressive Disclosure**: Free users see basic info, Pro users unlock deeper insights

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Deep Slate Blue | `#2C3E50` | Primary text, headers, navigation |
| Terracotta Orange | `#E67E22` | CTAs, accent elements, brand highlight |
| Sage Green | `#27AE60` | Success states, Pro badges, confidence indicators |
| Soft Off-White | `#F8F9FA` | Primary background |

### Neutral Colors
| Name | Hex | Usage |
|------|-----|-------|
| Dark Gray | `#34495E` | Secondary text, body content |
| Medium Gray | `#7F8C8D` | Placeholder text, inactive states |
| Light Gray | `#BDC3C7` | Borders, disabled elements |
| White | `#FFFFFF` | Cards, elevated surfaces |

### Functional Colors
| Name | Hex | Usage |
|------|-----|-------|
| Error | `#E74C3C` | Error states, destructive actions |
| Warning | `#F39C12` | Warning messages |
| Success | `#27AE60` | Success states (same as Sage Green) |
| Info | `#3498DB` | Informational banners, trial CTA |

---

## Typography

### Font Family
- **Primary**: System font (SF Pro on iOS, Roboto on Android)
- **Fallback**: Inter, sans-serif

### Font Sizes
| Name | Size | Weight | Usage |
|------|------|--------|-------|
| xxxl | 32px | Bold (700) | Hero titles, paywall headers |
| xxl | 24px | Bold (700) | Screen titles, rock names |
| xl | 20px | Bold (700) | Section headers, card titles |
| lg | 18px | Semibold (600) | Subsection titles |
| base | 16px | Regular (400) | Body text, descriptions |
| sm | 14px | Regular (400) | Secondary text, captions |
| xs | 12px | Medium (500) | Badges, labels, metadata |

---

## Spacing System

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon padding, tight margins |
| sm | 8px | Small gaps, inline spacing |
| md | 16px | Standard padding, card margins |
| lg | 24px | Section padding, large gaps |
| xl | 32px | Screen padding, major sections |
| xxl | 48px | Hero spacing |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| sm | 8px | Small buttons, badges |
| md | 12px | Cards, inputs, standard components |
| lg | 16px | Large cards, modals |
| xl | 24px | Feature cards, paywall |
| full | 9999px | Circular buttons, FAB |

---

## Shadows

### Small (sm)
- Used for: Cards, subtle elevation
- Shadow: `0 2px 4px rgba(0,0,0,0.1)`
- Elevation: 2

### Medium (md)
- Used for: Interactive cards, dropdowns
- Shadow: `0 4px 8px rgba(0,0,0,0.15)`
- Elevation: 4

### Large (lg)
- Used for: FAB, modals, prominent elements
- Shadow: `0 8px 16px rgba(0,0,0,0.2)`
- Elevation: 8

---

## Component Specifications

### Header (Home Screen)
- Height: 42% of screen height
- Scenic background image with gradient overlay
- Logo (36x36px) + App name in white
- Settings icon on right
- Gradient: `rgba(0,0,0,0.4)` to `transparent`

### Floating Action Button (FAB)
- Size: 120x120px
- Position: Centered, overlapping header/content boundary
- Background: Terracotta Orange
- Shadow: Large (lg)
- Content: Camera icon + "Identify Feature" text

### Feature Cards
- Background: White
- Padding: 24px
- Border Radius: 12px
- Shadow: Medium (md)
- Icon container: 56x56px with rounded corners
- PRO badge: Sage Green, positioned top-right

### Collection Grid
- 3 columns
- Card aspect ratio: 1:1.3
- Border radius: 12px
- Label overlay with gradient
- Type badge: Terracotta Orange background

### Results Screen
- Image takes ~50% of screen
- Glassmorphism card overlay for rock name + confidence
- Confidence ring: 60x60px with Sage Green border
- Expandable sections with icons
- Locked sections show blur + lock icon

### Paywall
- Full-screen background with blur (3px)
- Overlay: `rgba(44, 62, 80, 0.6)`
- Glassmorphism card with features list
- Primary CTA: Info Blue (#3498DB)
- Secondary CTA: Outlined white

---

## Iconography

### Icon Library
- Primary: Feather Icons (@expo/vector-icons)
- Style: Outlined, 2px stroke weight

### Common Icons
| Element | Icon |
|---------|------|
| Home | home |
| Collection | layers |
| Profile | user |
| Camera/Identify | camera |
| Explore | compass |
| Settings | settings |
| Back | arrow-left |
| Close | x |
| Lock | lock |
| Share | share |
| Save | bookmark |
| Success | check |
| Help | help-circle |

---

## States

### Loading States
- Skeleton shimmer for content loading
- Centered spinner with "Scanning..." text for camera analysis
- Subtle progress indicators

### Empty States
- Large icon (64px) in Light Gray
- Bold title in primary color
- Supportive description text
- Optional CTA button

### Error States
- Error Red color for text/icons
- Clear error message
- Retry action available

### Pro/Free States
- Free: Show limited content with lock icons
- Trial: Full access with trial indicator
- Pro: Full access with Pro badge

---

## Animations

### Transitions
- Screen transitions: slide_from_right (default), slide_from_bottom (modals)
- Duration: 300ms
- Easing: ease-out

### Micro-interactions
- Button press: Scale to 0.98 with spring animation
- Card press: Slight elevation change
- Haptic feedback on key actions

### Camera Screen
- Grid overlay at 30% opacity
- Scanning line animation during analysis
- Smooth zoom transitions

---

## Accessibility

### Touch Targets
- Minimum size: 44x44px
- Adequate spacing between interactive elements

### Color Contrast
- All text meets WCAG AA standards
- Important information not conveyed by color alone

### Text Scaling
- Support for dynamic type sizes
- Test with 200% text scaling

---

## Brand Assets

### Logo
- Primary: Layered geological pin icon
- Colors: Terracotta, gold, slate blue, sage green layers
- Usage: Headers, splash screen, app icon

### App Icon
- Background: Deep Slate Blue
- Foreground: Simplified pin logo with colored layers
- Shape: Rounded square (iOS), adaptive (Android)

### Splash Screen
- Background: Soft Off-White (light) / Deep Slate Blue (dark)
- Centered logo with "GeoID" text below
