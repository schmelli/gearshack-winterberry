/**
 * Contrast Analyzer Utility
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Pure utility functions for WCAG AA compliance
 */

// =============================================================================
// Luminance Calculation
// =============================================================================

/**
 * Calculate relative luminance of an RGB color
 * Uses ITU-R BT.709 formula for perceived brightness
 *
 * @param r - Red value (0-255)
 * @param g - Green value (0-255)
 * @param b - Blue value (0-255)
 * @returns Relative luminance (0-1)
 */
export function calculateLuminance(r: number, g: number, b: number): number {
  // Normalize RGB values (0-255 → 0-1)
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  // Apply gamma correction
  const rLinear =
    rNorm <= 0.03928 ? rNorm / 12.92 : Math.pow((rNorm + 0.055) / 1.055, 2.4);
  const gLinear =
    gNorm <= 0.03928 ? gNorm / 12.92 : Math.pow((gNorm + 0.055) / 1.055, 2.4);
  const bLinear =
    bNorm <= 0.03928 ? bNorm / 12.92 : Math.pow((bNorm + 0.055) / 1.055, 2.4);

  // Calculate relative luminance
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Calculate contrast ratio between two luminance values
 *
 * @param luminance1 - First luminance (0-1)
 * @param luminance2 - Second luminance (0-1)
 * @returns Contrast ratio (1:1 to 21:1)
 */
export function calculateContrastRatio(
  luminance1: number,
  luminance2: number
): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if contrast ratio meets WCAG AA standard (4.5:1 for normal text)
 *
 * @param luminance1 - First luminance (0-1)
 * @param luminance2 - Second luminance (0-1)
 * @returns true if contrast meets WCAG AA
 */
export function meetsWCAGAA(luminance1: number, luminance2: number): boolean {
  const contrast = calculateContrastRatio(luminance1, luminance2);
  return contrast >= 4.5;
}

// =============================================================================
// Image Analysis
// =============================================================================

/**
 * Analyze image brightness in the text overlay region (bottom 30%)
 * Returns average luminance of that region
 *
 * @param imageElement - HTMLImageElement to analyze
 * @returns Average luminance (0-1)
 */
export function analyzeImageBrightness(imageElement: HTMLImageElement): number {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.warn('[ContrastAnalyzer] Canvas context not available');
    return 0.5; // Return mid-value as fallback
  }

  try {
    // Sample bottom 30% of image (where text overlay appears)
    const sampleHeight = Math.floor(imageElement.height * 0.3);
    canvas.width = imageElement.width;
    canvas.height = sampleHeight;

    // Draw the bottom portion of the image
    ctx.drawImage(
      imageElement,
      0,
      imageElement.height - sampleHeight, // Source Y (bottom of image)
      imageElement.width,
      sampleHeight, // Source dimensions
      0,
      0, // Destination position
      canvas.width,
      canvas.height // Destination dimensions
    );

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;

    // Calculate average RGB values
    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    const pixelCount = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
      totalR += pixels[i];
      totalG += pixels[i + 1];
      totalB += pixels[i + 2];
      // Skip alpha channel (pixels[i + 3])
    }

    const avgR = totalR / pixelCount;
    const avgG = totalG / pixelCount;
    const avgB = totalB / pixelCount;

    // Calculate luminance of average color
    return calculateLuminance(avgR, avgG, avgB);
  } catch (error) {
    console.error('[ContrastAnalyzer] Image analysis failed:', error);
    return 0.5; // Return mid-value on error
  }
}

/**
 * Determine optimal text color (white or black) based on image brightness
 * Accounts for the gradient overlay that darkens the background
 *
 * @param imageElement - HTMLImageElement to analyze
 * @returns 'white' or 'black'
 */
export function getTextColor(imageElement: HTMLImageElement): 'white' | 'black' {
  const imageLuminance = analyzeImageBrightness(imageElement);

  // The gradient overlay darkens the background:
  // - Top: transparent (no darkening)
  // - Middle: 30% black overlay
  // - Bottom: 60% black overlay
  // We need to account for this when determining text color

  // Apply gradient effect to luminance (approximate 60% black overlay at bottom)
  const overlayDarkening = 0.4; // 60% opacity black overlay reduces luminance
  const adjustedLuminance = imageLuminance * overlayDarkening;

  // Threshold for text color decision
  // Lower threshold (0.4) because gradient already darkens background
  // If adjusted luminance > 0.4, image is still bright enough for black text
  // Otherwise, use white text
  return adjustedLuminance > 0.4 ? 'black' : 'white';
}

/**
 * Calculate WCAG contrast ratio between text color and background
 *
 * @param textColor - 'white' or 'black'
 * @param backgroundLuminance - Background luminance (0-1)
 * @returns Contrast ratio
 */
export function calculateTextContrast(
  textColor: 'white' | 'black',
  backgroundLuminance: number
): number {
  const textLuminance = textColor === 'white' ? 1.0 : 0.0;
  return calculateContrastRatio(textLuminance, backgroundLuminance);
}

/**
 * Verify that text overlay meets WCAG AA standards
 *
 * @param imageElement - HTMLImageElement to analyze
 * @param textColor - Proposed text color
 * @returns Validation result with contrast ratio
 */
export function validateTextOverlay(
  imageElement: HTMLImageElement,
  textColor: 'white' | 'black'
): {
  isValid: boolean;
  contrastRatio: number;
  meetsWCAGAA: boolean;
} {
  const backgroundLuminance = analyzeImageBrightness(imageElement);

  // Apply gradient overlay effect
  const adjustedLuminance = backgroundLuminance * 0.4;

  const contrastRatio = calculateTextContrast(textColor, adjustedLuminance);
  const isValid = contrastRatio >= 4.5;

  return {
    isValid,
    contrastRatio,
    meetsWCAGAA: isValid,
  };
}
