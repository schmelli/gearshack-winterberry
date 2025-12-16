# Text Overlay Readability Research

## Executive Summary

This document provides comprehensive research on ensuring text overlay readability on AI-generated background images, specifically for loadout titles and gear counts. The goal is to meet WCAG AA 4.5:1 contrast ratio requirements while maintaining visual appeal.

**Recommended Approach**: Combine CSS gradient scrims with dynamic text color selection based on brightness analysis for maximum readability and accessibility.

---

## 1. CSS Gradient Overlay Techniques (Scrims)

### What is a Scrim?

A **scrim** is a semi-transparent gradient layer that helps text appear more readable against backgrounds. The term comes from photography equipment that makes light softer, and it's now a visual design technique for softening an image so overlaid text is more legible.

### Core Principles

- **Gradient Direction**: Bottom-to-top or top-to-bottom gradients work best for text overlays
- **Optimal Opacity**: 40% black (`rgba(0, 0, 0, 0.4)`) to transparent works well without disturbing the image
- **Gradient Length**: Material Design recommends long gradients with center points about 3/10 towards the darker side for natural falloff
- **Color Stops**: Use 13+ color stops to avoid banding and create smooth gradients

### Implementation Examples

#### Basic Floor Fade (Bottom Gradient)

```css
.card-overlay {
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0),
    rgba(0, 0, 0, 0.6)
  ),
  url('background-image.jpg');
}
```

#### Tailwind CSS Implementation

```tsx
<div className="relative h-64 w-full">
  <img
    src="background.jpg"
    alt="Background"
    className="absolute inset-0 h-full w-full object-cover"
  />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
  <div className="absolute bottom-0 left-0 right-0 p-6">
    <h2 className="text-white text-2xl font-bold">Loadout Title</h2>
    <p className="text-white/90">12 items</p>
  </div>
</div>
```

#### Advanced Scrim with Multiple Color Stops

```tsx
// React Component with smooth gradient
const LoadoutCard = ({ imageUrl, title, itemCount }) => {
  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg">
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Smooth 13-stop gradient for natural falloff */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0%,
            rgba(0, 0, 0, 0.013) 8.1%,
            rgba(0, 0, 0, 0.049) 15.5%,
            rgba(0, 0, 0, 0.104) 22.5%,
            rgba(0, 0, 0, 0.175) 29%,
            rgba(0, 0, 0, 0.259) 35.3%,
            rgba(0, 0, 0, 0.352) 41.2%,
            rgba(0, 0, 0, 0.448) 47.1%,
            rgba(0, 0, 0, 0.541) 52.9%,
            rgba(0, 0, 0, 0.648) 58.8%,
            rgba(0, 0, 0, 0.741) 64.7%,
            rgba(0, 0, 0, 0.825) 71%,
            rgba(0, 0, 0, 0.896) 77.5%,
            rgba(0, 0, 0, 0.951) 84.5%,
            rgba(0, 0, 0, 0.987) 91.9%,
            rgba(0, 0, 0, 1) 100%
          )`
        }}
      />
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h2 className="text-white text-2xl font-bold">{title}</h2>
        <p className="text-white/90">{itemCount} items</p>
      </div>
    </div>
  );
};
```

#### Responsive Scrim with Blur Effect

```tsx
const ResponsiveScrim = ({ children }) => {
  return (
    <div className="relative rounded-full bg-black/30 px-6 py-3 backdrop-blur-md">
      {children}
    </div>
  );
};
```

### Gradient Types for Different Use Cases

| Use Case | Gradient Type | Implementation |
|----------|---------------|----------------|
| Text at bottom | Bottom fade | `from-transparent to-black/60` |
| Text at top | Top fade | `from-black/60 to-transparent` |
| Centered text | Radial gradient | `radial-gradient(ellipse at center, rgba(0,0,0,0.7) 0%, transparent 70%)` |
| Full overlay | Solid overlay | `bg-black/40` (40% opacity) |
| Spot overlay | Localized blur | `backdrop-blur-md bg-black/30 rounded-full` |

---

## 2. Brightness Analysis Algorithms

### Canvas API Method

The most reliable way to determine image brightness is using the Canvas API to analyze pixel data.

#### Basic Brightness Detection

```typescript
/**
 * Analyzes image brightness in a specific region
 * @param imageUrl - URL of the image to analyze
 * @param region - Optional region to analyze {x, y, width, height}
 * @returns Average brightness (0-255)
 */
async function getImageBrightness(
  imageUrl: string,
  region?: { x: number; y: number; width: number; height: number }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Use region or full image
      const analyzeWidth = region?.width || img.width;
      const analyzeHeight = region?.height || img.height;
      const startX = region?.x || 0;
      const startY = region?.y || 0;

      canvas.width = analyzeWidth;
      canvas.height = analyzeHeight;

      // Draw the image region
      ctx.drawImage(
        img,
        startX,
        startY,
        analyzeWidth,
        analyzeHeight,
        0,
        0,
        analyzeWidth,
        analyzeHeight
      );

      // Get pixel data
      const imageData = ctx.getImageData(0, 0, analyzeWidth, analyzeHeight);
      const data = imageData.data;

      let brightnessSum = 0;
      const pixelCount = data.length / 4; // 4 values per pixel (RGBA)

      // Calculate average brightness using perceived brightness formula
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Perceived brightness formula (weighted for human eye)
        const brightness = (0.299 * r + 0.587 * g + 0.114 * b);
        brightnessSum += brightness;
      }

      resolve(brightnessSum / pixelCount);
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}
```

#### React Hook for Brightness Analysis

```typescript
import { useState, useEffect } from 'react';

interface UseBrightnessOptions {
  region?: { x: number; y: number; width: number; height: number };
  threshold?: number; // Default: 128
}

/**
 * Hook to analyze image brightness and determine text color
 * @param imageUrl - URL of the background image
 * @param options - Configuration options
 * @returns Object with brightness value and recommended text color
 */
export function useImageBrightness(
  imageUrl: string | null,
  options: UseBrightnessOptions = {}
) {
  const [brightness, setBrightness] = useState<number | null>(null);
  const [textColor, setTextColor] = useState<'white' | 'black'>('white');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const threshold = options.threshold || 128;

  useEffect(() => {
    if (!imageUrl) return;

    setIsAnalyzing(true);

    getImageBrightness(imageUrl, options.region)
      .then((value) => {
        setBrightness(value);
        setTextColor(value < threshold ? 'white' : 'black');
      })
      .catch((error) => {
        console.error('Failed to analyze brightness:', error);
        // Default to white text on error
        setTextColor('white');
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [imageUrl, threshold]);

  return { brightness, textColor, isAnalyzing };
}
```

#### YIQ Color Space Method

The YIQ formula is simpler and works well for calculating brightness from hex colors:

```typescript
/**
 * Calculate brightness using YIQ color space
 * @param hexColor - Hex color string (e.g., '#FF5733')
 * @returns 'light' or 'dark'
 */
function getContrastYIQ(hexColor: string): 'light' | 'dark' {
  // Remove # if present
  const hex = hexColor.replace('#', '');

  // Parse RGB values
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate YIQ value
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

  // 128 is the middle threshold
  return yiq >= 128 ? 'light' : 'dark';
}

/**
 * Get text color based on background color
 */
function getTextColor(backgroundColor: string): string {
  return getContrastYIQ(backgroundColor) === 'light' ? '#000000' : '#FFFFFF';
}
```

---

## 3. WCAG AA Contrast Ratio (4.5:1)

### Understanding the Requirement

- **WCAG 2.0 Level AA**: Requires 4.5:1 for normal text, 3:1 for large text
- **Large text**: 18pt (24px) or 14pt (18.7px) bold and larger
- **Why 4.5:1**: Compensates for vision loss equivalent to 20/40 vision (typical at age 80)

### Calculation Algorithm

```typescript
/**
 * Calculate relative luminance for a color
 * Based on WCAG 2.0 specification
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values to 0-1 range
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  // Apply gamma correction
  const rLinear = rsRGB <= 0.03928
    ? rsRGB / 12.92
    : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928
    ? gsRGB / 12.92
    : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928
    ? bsRGB / 12.92
    : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  // Calculate luminance using WCAG coefficients
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 * @returns Contrast ratio (1-21)
 */
function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  // Ensure lighter color is numerator
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  // WCAG formula: (lighter + 0.05) / (darker + 0.05)
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG standards
 */
function meetsWCAG(
  contrastRatio: number,
  level: 'AA' | 'AAA',
  fontSize: 'normal' | 'large'
): boolean {
  const thresholds = {
    AA: { normal: 4.5, large: 3 },
    AAA: { normal: 7, large: 4.5 }
  };

  return contrastRatio >= thresholds[level][fontSize];
}

/**
 * Helper to convert hex to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
```

### Complete React Hook with WCAG Validation

```typescript
import { useState, useEffect } from 'react';

interface ContrastCheckResult {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  textColor: string;
  backgroundColor: string;
}

/**
 * Hook to ensure WCAG AA contrast compliance
 */
export function useContrastCompliance(
  backgroundColor: string,
  fontSize: 'normal' | 'large' = 'normal'
): ContrastCheckResult {
  const [result, setResult] = useState<ContrastCheckResult>({
    ratio: 1,
    meetsAA: false,
    meetsAAA: false,
    textColor: '#FFFFFF',
    backgroundColor
  });

  useEffect(() => {
    // Try white text first
    let textColor = '#FFFFFF';
    let ratio = getContrastRatio(textColor, backgroundColor);

    // If white doesn't meet AA, try black
    if (!meetsWCAG(ratio, 'AA', fontSize)) {
      textColor = '#000000';
      ratio = getContrastRatio(textColor, backgroundColor);
    }

    setResult({
      ratio,
      meetsAA: meetsWCAG(ratio, 'AA', fontSize),
      meetsAAA: meetsWCAG(ratio, 'AAA', fontSize),
      textColor,
      backgroundColor
    });
  }, [backgroundColor, fontSize]);

  return result;
}
```

### Important Precision Notes

- **Cannot round up**: #777777 (4.47:1) does NOT meet 4.5:1 requirement
- **Small differences matter**: #767676 fails AA, but #757575 passes (4.54:1)
- **Alpha transparency**: Must calculate effective color after blending

---

## 4. Implementation Decision Matrix

### Option A: Pure CSS Gradient Scrim

**Pros:**
- Simplest implementation
- No JavaScript required
- Excellent performance
- Works on all browsers
- No runtime calculations

**Cons:**
- Fixed gradient may not work on all images
- Cannot guarantee WCAG compliance
- No dynamic adaptation to image content

**Best for:** Simple cards with consistent image composition

### Option B: Dynamic Text Color (Brightness Analysis)

**Pros:**
- Adapts to any image
- Can meet WCAG requirements
- Intelligent color selection
- Professional appearance

**Cons:**
- Requires Canvas API
- Runtime overhead for analysis
- CORS issues with external images
- More complex implementation

**Best for:** User-generated content with unpredictable images

### Option C: Hybrid Approach (Recommended)

**Pros:**
- Maximum readability
- Guaranteed WCAG compliance
- Professional appearance
- Adapts to any image
- Graceful degradation

**Cons:**
- Most complex implementation
- Requires both CSS and JS
- Slight performance overhead

**Best for:** Production applications requiring accessibility compliance

### Implementation Comparison

```tsx
// Option A: Pure CSS
<div className="relative">
  <img src={url} alt={title} />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
  <h2 className="absolute bottom-4 text-white">{title}</h2>
</div>

// Option B: Dynamic Text Color Only
<div className="relative">
  <img src={url} alt={title} />
  <h2
    className="absolute bottom-4"
    style={{ color: textColor }}
  >
    {title}
  </h2>
</div>

// Option C: Hybrid (Recommended)
<div className="relative">
  <img src={url} alt={title} />
  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
  <h2
    className="absolute bottom-4"
    style={{ color: textColor }}
  >
    {title}
  </h2>
</div>
```

---

## 5. Best Practices & Recommendations

### For Gearshack Winterberry Loadout Cards

#### Recommended Implementation

```tsx
// hooks/useLoadoutCardAccessibility.ts
import { useState, useEffect } from 'react';

export function useLoadoutCardAccessibility(imageUrl: string | null) {
  const [textColor, setTextColor] = useState<string>('white');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!imageUrl) {
      setTextColor('white');
      setIsReady(true);
      return;
    }

    // Analyze bottom 30% of image (where text will be)
    const region = {
      x: 0,
      y: 0.7, // Start at 70% down
      width: 1,
      height: 0.3 // Bottom 30%
    };

    analyzeRegionBrightness(imageUrl, region)
      .then(brightness => {
        // With gradient overlay, we need higher threshold
        // Gradient adds darkness, so only switch to black if very bright
        setTextColor(brightness > 180 ? 'black' : 'white');
        setIsReady(true);
      })
      .catch(() => {
        setTextColor('white'); // Safe default
        setIsReady(true);
      });
  }, [imageUrl]);

  return { textColor, isReady };
}

// Component usage
export function LoadoutCard({ title, itemCount, imageUrl }) {
  const { textColor, isReady } = useLoadoutCardAccessibility(imageUrl);

  return (
    <div className="relative h-64 w-full overflow-hidden rounded-lg">
      {/* Background Image */}
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Gradient Scrim */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60" />

      {/* Text Content */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        <h2
          className="text-2xl font-bold transition-colors duration-300"
          style={{
            color: textColor,
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {title}
        </h2>
        <p
          className="text-sm font-medium"
          style={{
            color: textColor,
            opacity: 0.9,
            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
          }}
        >
          {itemCount} items
        </p>
      </div>
    </div>
  );
}
```

### Fallback Strategies

1. **Text Shadow**: Add subtle shadow as additional safety
   ```tsx
   style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
   ```

2. **Backdrop Blur**: For extreme cases
   ```tsx
   <div className="backdrop-blur-sm bg-black/20 rounded-lg p-4">
     <h2>{title}</h2>
   </div>
   ```

3. **Minimum Contrast Override**: Force darker gradient if needed
   ```tsx
   className="bg-gradient-to-b from-transparent to-black/80"
   ```

### Performance Considerations

- **Lazy Analysis**: Only analyze images when they enter viewport
- **Caching**: Cache brightness results by image URL
- **Web Workers**: Offload Canvas API work for large images
- **Debouncing**: Debounce analysis on resize/orientation change

### Testing Recommendations

1. **Automated Testing**
   ```typescript
   // Test with known bright/dark images
   describe('LoadoutCard accessibility', () => {
     it('uses white text on dark backgrounds', async () => {
       const { textColor } = renderHook(() =>
         useLoadoutCardAccessibility('dark-mountain.jpg')
       );
       expect(textColor).toBe('white');
     });

     it('meets WCAG AA contrast ratio', async () => {
       const ratio = await getContrastRatio(textColor, backgroundColor);
       expect(ratio).toBeGreaterThanOrEqual(4.5);
     });
   });
   ```

2. **Manual Testing Checklist**
   - [ ] Test with bright images (snow, beach, sky)
   - [ ] Test with dark images (night, forest, cave)
   - [ ] Test with mixed images (sunset, landscape)
   - [ ] Test with low-contrast images
   - [ ] Test on mobile and desktop
   - [ ] Test in light and dark mode
   - [ ] Run automated contrast checker

3. **Browser DevTools**
   - Chrome DevTools shows contrast ratios in color picker
   - Firefox Accessibility Inspector shows WCAG compliance
   - Use Lighthouse for automated accessibility audits

### Browser Compatibility

All modern browsers support:
- CSS gradients (100% support)
- Canvas API (100% support)
- RGBA colors (100% support)
- CSS backdrop-filter (95%+ support, graceful degradation)

---

## 6. Production-Ready Code Examples

### Complete TypeScript Utility Library

```typescript
// lib/accessibility/contrast.ts

/**
 * Comprehensive contrast and brightness utilities
 * for ensuring WCAG AA compliance
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface ContrastResult {
  ratio: number;
  meetsAA: boolean;
  meetsAAA: boolean;
  recommendedTextColor: string;
}

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): RGB | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate relative luminance (WCAG 2.0)
 */
export function getRelativeLuminance(rgb: RGB): number {
  const { r, g, b } = rgb;

  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rLinear = rsRGB <= 0.03928
    ? rsRGB / 12.92
    : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gLinear = gsRGB <= 0.03928
    ? gsRGB / 12.92
    : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bLinear = bsRGB <= 0.03928
    ? bsRGB / 12.92
    : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) return 1;

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check WCAG compliance
 */
export function checkWCAGCompliance(
  contrastRatio: number,
  fontSize: 'normal' | 'large' = 'normal'
): { meetsAA: boolean; meetsAAA: boolean } {
  const thresholds = {
    AA: fontSize === 'large' ? 3 : 4.5,
    AAA: fontSize === 'large' ? 4.5 : 7
  };

  return {
    meetsAA: contrastRatio >= thresholds.AA,
    meetsAAA: contrastRatio >= thresholds.AAA
  };
}

/**
 * Get optimal text color for background
 */
export function getOptimalTextColor(
  backgroundColor: string,
  fontSize: 'normal' | 'large' = 'normal'
): ContrastResult {
  const whiteRatio = getContrastRatio('#FFFFFF', backgroundColor);
  const blackRatio = getContrastRatio('#000000', backgroundColor);

  const useWhite = whiteRatio > blackRatio;
  const ratio = useWhite ? whiteRatio : blackRatio;
  const compliance = checkWCAGCompliance(ratio, fontSize);

  return {
    ratio,
    meetsAA: compliance.meetsAA,
    meetsAAA: compliance.meetsAAA,
    recommendedTextColor: useWhite ? '#FFFFFF' : '#000000'
  };
}

/**
 * Analyze image brightness using Canvas API
 */
export async function analyzeImageBrightness(
  imageUrl: string,
  options?: {
    region?: { x: number; y: number; width: number; height: number };
    sampleSize?: number; // Sample every Nth pixel for performance
  }
): Promise<number> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        const width = options?.region?.width || img.width;
        const height = options?.region?.height || img.height;
        const startX = options?.region?.x || 0;
        const startY = options?.region?.y || 0;

        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, startX, startY, width, height, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const sampleSize = options?.sampleSize || 1;

        let brightnessSum = 0;
        let sampleCount = 0;

        for (let i = 0; i < data.length; i += 4 * sampleSize) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Perceived brightness (weighted for human vision)
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          brightnessSum += brightness;
          sampleCount++;
        }

        resolve(brightnessSum / sampleCount);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });
}

/**
 * Get text color based on image analysis
 */
export async function getTextColorForImage(
  imageUrl: string,
  options?: {
    region?: { x: number; y: number; width: number; height: number };
    threshold?: number; // Default: 128
    withGradient?: boolean; // Adjust threshold if using gradient overlay
  }
): Promise<string> {
  const brightness = await analyzeImageBrightness(imageUrl, {
    region: options?.region,
    sampleSize: 5 // Sample every 5th pixel for performance
  });

  // Adjust threshold if gradient overlay is used
  let threshold = options?.threshold || 128;
  if (options?.withGradient) {
    threshold = 180; // Higher threshold since gradient adds darkness
  }

  return brightness > threshold ? '#000000' : '#FFFFFF';
}
```

### React Hook Implementation

```typescript
// hooks/useTextContrast.ts
import { useState, useEffect } from 'react';
import { getTextColorForImage, type ContrastResult } from '@/lib/accessibility/contrast';

interface UseTextContrastOptions {
  region?: { x: number; y: number; width: number; height: number };
  withGradient?: boolean;
  enabled?: boolean;
}

export function useTextContrast(
  imageUrl: string | null,
  options: UseTextContrastOptions = {}
) {
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { region, withGradient = true, enabled = true } = options;

  useEffect(() => {
    if (!imageUrl || !enabled) {
      setTextColor('#FFFFFF');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    getTextColorForImage(imageUrl, { region, withGradient })
      .then(color => {
        setTextColor(color);
      })
      .catch(err => {
        console.error('Failed to analyze image:', err);
        setError(err);
        setTextColor('#FFFFFF'); // Safe fallback
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [imageUrl, region, withGradient, enabled]);

  return { textColor, isAnalyzing, error };
}
```

---

## 7. Tailwind CSS Utilities

```typescript
// tailwind.config.ts additions

export default {
  theme: {
    extend: {
      backgroundImage: {
        'scrim-b': 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))',
        'scrim-t': 'linear-gradient(to top, transparent, rgba(0,0,0,0.6))',
        'scrim-smooth-b': `linear-gradient(
          to bottom,
          rgba(0,0,0,0) 0%,
          rgba(0,0,0,0.013) 8.1%,
          rgba(0,0,0,0.049) 15.5%,
          rgba(0,0,0,0.104) 22.5%,
          rgba(0,0,0,0.175) 29%,
          rgba(0,0,0,0.259) 35.3%,
          rgba(0,0,0,0.352) 41.2%,
          rgba(0,0,0,0.448) 47.1%,
          rgba(0,0,0,0.541) 52.9%,
          rgba(0,0,0,0.648) 58.8%,
          rgba(0,0,0,0.741) 64.7%,
          rgba(0,0,0,0.825) 71%,
          rgba(0,0,0,0.896) 77.5%,
          rgba(0,0,0,0.951) 84.5%,
          rgba(0,0,0,0.987) 91.9%,
          rgba(0,0,0,1) 100%
        )`
      },
      textShadow: {
        'contrast': '0 2px 4px rgba(0,0,0,0.3)',
        'contrast-sm': '0 1px 2px rgba(0,0,0,0.2)',
        'contrast-lg': '0 4px 6px rgba(0,0,0,0.4)',
      }
    }
  },
  plugins: [
    // Add text-shadow plugin
    plugin(function({ addUtilities }) {
      addUtilities({
        '.text-shadow-contrast': {
          textShadow: '0 2px 4px rgba(0,0,0,0.3)',
        },
        '.text-shadow-contrast-sm': {
          textShadow: '0 1px 2px rgba(0,0,0,0.2)',
        },
        '.text-shadow-contrast-lg': {
          textShadow: '0 4px 6px rgba(0,0,0,0.4)',
        },
      })
    })
  ]
}
```

---

## 8. Recommended Implementation for Gearshack

### Phase 1: CSS-Only (Quick Win)

```tsx
// Immediate implementation - no JS required
<div className="relative h-64 overflow-hidden rounded-lg">
  <img src={imageUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" />
  <div className="absolute inset-0 bg-scrim-smooth-b" />
  <div className="absolute bottom-0 left-0 right-0 p-6">
    <h2 className="text-white text-2xl font-bold text-shadow-contrast">{title}</h2>
    <p className="text-white/90 text-shadow-contrast-sm">{itemCount} items</p>
  </div>
</div>
```

### Phase 2: Add Dynamic Color (Full WCAG Compliance)

```tsx
// Full implementation with accessibility
export function LoadoutCard({ title, itemCount, imageUrl }: LoadoutCardProps) {
  const { textColor } = useTextContrast(imageUrl, {
    region: { x: 0, y: 0.7, width: 1, height: 0.3 },
    withGradient: true
  });

  return (
    <div className="relative h-64 overflow-hidden rounded-lg">
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-scrim-smooth-b" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h2
          className="text-2xl font-bold text-shadow-contrast transition-colors"
          style={{ color: textColor }}
        >
          {title}
        </h2>
        <p
          className="text-shadow-contrast-sm opacity-90"
          style={{ color: textColor }}
        >
          {itemCount} items
        </p>
      </div>
    </div>
  );
}
```

---

## Sources

- [Design Techniques to Display Text over Background Images](https://blog.iamsuleiman.com/techniques-to-display-text-overlay-background-images/)
- [Design Considerations: Text on Images | CSS-Tricks](https://css-tricks.com/design-considerations-text-images/)
- [Designing Accessible Text Over Images | Smashing Magazine](https://www.smashingmagazine.com/2023/08/designing-accessible-text-over-images-part1/)
- [Enhance Text Readability with a Gradient | Epic Web Dev](https://www.epicweb.dev/tutorials/fluid-hover-cards-with-tailwind-css/implementation/enhance-text-readability-with-a-gradient)
- [Responsive Scrim](https://travishorn.com/responsive-scrim-6f286da5b6a5)
- [WebAIM: Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Building your own color contrast checker | DEV Community](https://dev.to/alvaromontoro/building-your-own-color-contrast-checker-4j7o)
- [Understanding Success Criterion 1.4.3: Contrast (Minimum) | W3C](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [Color contrast - Accessibility | MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast)
- [Image brightness detection via Canvas](https://codepen.io/njmcode/pen/pvLyZq)
- [Konva.js Brightness Filter Tutorial](https://konvajs.org/docs/filters/Brighten.html)
- [Dynamic text color contrast based on background lightness | miunau](https://miunau.com/posts/dynamic-text-contrast-in-css/)
- [React Js Change text color based on brightness background](https://fontawesomeicons.com/fa/react-js-change-text-color-based-on-brightness-background)
- [Changing Text Color based on the Background in JavaScript | Medium](https://colton-shawn-oconnor.medium.com/changing-text-color-based-on-the-background-in-javascript-947bf9bc136b)
- [Dynamically changing text color based on background | Go Make Things](https://gomakethings.com/dynamically-changing-the-text-color-based-on-background-color-contrast-with-vanilla-js/)
- [Boost Visual Accessibility by Auto Flipping Text Color](https://blog.karenying.com/posts/boost-visual-accessibility-by-auto-flipping-text-color/)
