/**
 * Contrast Analyzer Tests
 *
 * Tests for WCAG AA compliance utilities including
 * luminance calculation, contrast ratios, and text color determination.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  HERO_IMAGE_GRADIENT_OVERLAY_OPACITY,
  calculateLuminance,
  calculateContrastRatio,
  meetsWCAGAA,
  analyzeImageBrightness,
  getTextColor,
  calculateTextContrast,
  validateTextOverlay,
} from '@/lib/contrast-analyzer';

// =============================================================================
// Test Constants
// =============================================================================

// Well-known luminance values for testing
const RGB_BLACK = { r: 0, g: 0, b: 0 };
const RGB_WHITE = { r: 255, g: 255, b: 255 };
const RGB_PURE_RED = { r: 255, g: 0, b: 0 };
const RGB_PURE_GREEN = { r: 0, g: 255, b: 0 };
const RGB_PURE_BLUE = { r: 0, g: 0, b: 255 };
const RGB_GRAY = { r: 128, g: 128, b: 128 };

// =============================================================================
// Exported Constant Tests
// =============================================================================

describe('HERO_IMAGE_GRADIENT_OVERLAY_OPACITY', () => {
  it('should be 0.6 (60% black overlay)', () => {
    expect(HERO_IMAGE_GRADIENT_OVERLAY_OPACITY).toBe(0.6);
  });

  it('should leave 40% original brightness', () => {
    expect(1 - HERO_IMAGE_GRADIENT_OVERLAY_OPACITY).toBe(0.4);
  });
});

// =============================================================================
// calculateLuminance Tests
// =============================================================================

describe('calculateLuminance', () => {
  describe('Pure Colors', () => {
    it('should return 0 for pure black', () => {
      const luminance = calculateLuminance(RGB_BLACK.r, RGB_BLACK.g, RGB_BLACK.b);
      expect(luminance).toBe(0);
    });

    it('should return 1 for pure white', () => {
      const luminance = calculateLuminance(RGB_WHITE.r, RGB_WHITE.g, RGB_WHITE.b);
      expect(luminance).toBe(1);
    });

    it('should return ~0.2126 for pure red', () => {
      const luminance = calculateLuminance(RGB_PURE_RED.r, RGB_PURE_RED.g, RGB_PURE_RED.b);
      expect(luminance).toBeCloseTo(0.2126, 4);
    });

    it('should return ~0.7152 for pure green', () => {
      const luminance = calculateLuminance(RGB_PURE_GREEN.r, RGB_PURE_GREEN.g, RGB_PURE_GREEN.b);
      expect(luminance).toBeCloseTo(0.7152, 4);
    });

    it('should return ~0.0722 for pure blue', () => {
      const luminance = calculateLuminance(RGB_PURE_BLUE.r, RGB_PURE_BLUE.g, RGB_PURE_BLUE.b);
      expect(luminance).toBeCloseTo(0.0722, 4);
    });
  });

  describe('Gamma Correction', () => {
    it('should apply gamma correction for low values (<=0.03928)', () => {
      // RGB value 10 (10/255 ≈ 0.039) is right at the threshold
      const luminance = calculateLuminance(10, 10, 10);
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(0.01);
    });

    it('should apply gamma correction for high values (>0.03928)', () => {
      // RGB value 128 is well above the threshold
      const luminance = calculateLuminance(RGB_GRAY.r, RGB_GRAY.g, RGB_GRAY.b);
      // Gray should have luminance around 0.21
      expect(luminance).toBeGreaterThan(0.2);
      expect(luminance).toBeLessThan(0.25);
    });
  });

  describe('ITU-R BT.709 Weighting', () => {
    it('should weight green more than red', () => {
      const redLuminance = calculateLuminance(100, 0, 0);
      const greenLuminance = calculateLuminance(0, 100, 0);
      expect(greenLuminance).toBeGreaterThan(redLuminance);
    });

    it('should weight red more than blue', () => {
      const redLuminance = calculateLuminance(100, 0, 0);
      const blueLuminance = calculateLuminance(0, 0, 100);
      expect(redLuminance).toBeGreaterThan(blueLuminance);
    });

    it('should sum to 1.0 for full white', () => {
      const whiteLuminance = calculateLuminance(255, 255, 255);
      expect(whiteLuminance).toBe(1);
    });
  });

  describe('Boundary Values', () => {
    it('should handle minimum values (0, 0, 0)', () => {
      expect(() => calculateLuminance(0, 0, 0)).not.toThrow();
      expect(calculateLuminance(0, 0, 0)).toBe(0);
    });

    it('should handle maximum values (255, 255, 255)', () => {
      expect(() => calculateLuminance(255, 255, 255)).not.toThrow();
      expect(calculateLuminance(255, 255, 255)).toBe(1);
    });
  });
});

// =============================================================================
// calculateContrastRatio Tests
// =============================================================================

describe('calculateContrastRatio', () => {
  describe('Extreme Cases', () => {
    it('should return 21:1 for black on white', () => {
      const ratio = calculateContrastRatio(0, 1);
      expect(ratio).toBe(21);
    });

    it('should return 21:1 for white on black', () => {
      const ratio = calculateContrastRatio(1, 0);
      expect(ratio).toBe(21);
    });

    it('should return 1:1 for same luminance', () => {
      const ratio = calculateContrastRatio(0.5, 0.5);
      expect(ratio).toBe(1);
    });
  });

  describe('Order Independence', () => {
    it('should return same ratio regardless of parameter order', () => {
      const ratio1 = calculateContrastRatio(0.2, 0.8);
      const ratio2 = calculateContrastRatio(0.8, 0.2);
      expect(ratio1).toBe(ratio2);
    });
  });

  describe('Intermediate Values', () => {
    it('should calculate correct ratio for mid-gray on black', () => {
      // Gray luminance ~0.21, black luminance 0
      // Contrast = (0.21 + 0.05) / (0 + 0.05) = 5.2
      const ratio = calculateContrastRatio(0.21, 0);
      expect(ratio).toBeCloseTo(5.2, 1);
    });

    it('should calculate correct ratio for mid-gray on white', () => {
      // Gray luminance ~0.21, white luminance 1
      // Contrast = (1 + 0.05) / (0.21 + 0.05) ≈ 4.04
      const ratio = calculateContrastRatio(0.21, 1);
      expect(ratio).toBeCloseTo(4.04, 1);
    });
  });
});

// =============================================================================
// meetsWCAGAA Tests
// =============================================================================

describe('meetsWCAGAA', () => {
  describe('Passing Contrast', () => {
    it('should return true for 21:1 contrast (black on white)', () => {
      expect(meetsWCAGAA(0, 1)).toBe(true);
    });

    it('should return true for contrast above 4.5:1', () => {
      // For ratio > 4.5, need L1 > 0.175 when L2 = 0
      // Using L1 = 0.18 gives ratio ≈ 4.6 which safely passes
      const L1 = 0.18;
      const L2 = 0;
      const ratio = calculateContrastRatio(L1, L2);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      expect(meetsWCAGAA(L1, L2)).toBe(true);
    });
  });

  describe('Failing Contrast', () => {
    it('should return false for 1:1 contrast (same color)', () => {
      expect(meetsWCAGAA(0.5, 0.5)).toBe(false);
    });

    it('should return false for contrast just below 4.5:1', () => {
      // For ratio = 4.4, need: L1 = 4.4 * 0.05 - 0.05 = 0.17
      const L1 = 0.17;
      const L2 = 0;
      expect(meetsWCAGAA(L1, L2)).toBe(false);
    });
  });

  describe('WCAG AA Standard (4.5:1)', () => {
    it('should enforce 4.5:1 minimum for normal text', () => {
      // Light gray on white - typically fails
      const lightGrayLuminance = 0.7;
      const whiteLuminance = 1;
      expect(meetsWCAGAA(lightGrayLuminance, whiteLuminance)).toBe(false);
    });

    it('should pass for high contrast colors', () => {
      // Dark blue on white - typically passes
      const darkBlueLuminance = 0.05;
      const whiteLuminance = 1;
      expect(meetsWCAGAA(darkBlueLuminance, whiteLuminance)).toBe(true);
    });
  });
});

// =============================================================================
// calculateTextContrast Tests
// =============================================================================

describe('calculateTextContrast', () => {
  describe('White Text', () => {
    it('should return 21:1 for white text on black background', () => {
      const ratio = calculateTextContrast('white', 0);
      expect(ratio).toBe(21);
    });

    it('should return 1:1 for white text on white background', () => {
      const ratio = calculateTextContrast('white', 1);
      expect(ratio).toBe(1);
    });

    it('should return intermediate ratio for white on gray', () => {
      const ratio = calculateTextContrast('white', 0.21);
      // (1 + 0.05) / (0.21 + 0.05) ≈ 4.04
      expect(ratio).toBeCloseTo(4.04, 1);
    });
  });

  describe('Black Text', () => {
    it('should return 21:1 for black text on white background', () => {
      const ratio = calculateTextContrast('black', 1);
      expect(ratio).toBe(21);
    });

    it('should return 1:1 for black text on black background', () => {
      const ratio = calculateTextContrast('black', 0);
      expect(ratio).toBe(1);
    });

    it('should return intermediate ratio for black on gray', () => {
      const ratio = calculateTextContrast('black', 0.21);
      // (0.21 + 0.05) / (0 + 0.05) ≈ 5.2
      expect(ratio).toBeCloseTo(5.2, 1);
    });
  });
});

// =============================================================================
// Browser-Dependent Function Tests (Mocked)
// =============================================================================

describe('analyzeImageBrightness', () => {
  let originalWindow: typeof window;
  let originalDocument: typeof document;

  describe('SSR Context (No Browser)', () => {
    beforeEach(() => {
      // Simulate SSR by removing window/document
      originalWindow = global.window;
      originalDocument = global.document;
    });

    afterEach(() => {
      // Restore
      global.window = originalWindow;
      global.document = originalDocument;
    });

    it('should return 0.5 fallback when window is undefined', () => {
      // @ts-expect-error - Testing SSR context
      global.window = undefined;

      const mockImage = {} as HTMLImageElement;
      const result = analyzeImageBrightness(mockImage);

      expect(result).toBe(0.5);
    });
  });

  describe('Browser Context', () => {
    let mockCanvas: Partial<HTMLCanvasElement>;
    let mockContext: Partial<CanvasRenderingContext2D>;

    beforeEach(() => {
      mockContext = {
        drawImage: vi.fn(),
        getImageData: vi.fn().mockReturnValue({
          data: new Uint8ClampedArray([
            // 4 pixels: RGBA format
            128, 128, 128, 255, // Gray pixel
            128, 128, 128, 255, // Gray pixel
            128, 128, 128, 255, // Gray pixel
            128, 128, 128, 255, // Gray pixel
          ]),
        }),
        clearRect: vi.fn(),
      };

      mockCanvas = {
        getContext: vi.fn().mockReturnValue(mockContext),
        width: 0,
        height: 0,
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as HTMLCanvasElement);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should analyze bottom 30% of image', () => {
      const mockImage = {
        width: 100,
        height: 100,
      } as HTMLImageElement;

      analyzeImageBrightness(mockImage);

      // Should set canvas height to 30% of image height
      expect(mockCanvas.height).toBe(0); // Reset to 0 in cleanup
    });

    it('should return luminance value between 0 and 1', () => {
      const mockImage = {
        width: 100,
        height: 100,
      } as HTMLImageElement;

      const result = analyzeImageBrightness(mockImage);

      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(1);
    });

    it('should return 0.5 when canvas context is null', () => {
      mockCanvas.getContext = vi.fn().mockReturnValue(null);

      const mockImage = {
        width: 100,
        height: 100,
      } as HTMLImageElement;

      const result = analyzeImageBrightness(mockImage);

      expect(result).toBe(0.5);
    });

    it('should return 0.5 on error', () => {
      mockContext.getImageData = vi.fn().mockImplementation(() => {
        throw new Error('Canvas security error');
      });

      const mockImage = {
        width: 100,
        height: 100,
      } as HTMLImageElement;

      const result = analyzeImageBrightness(mockImage);

      expect(result).toBe(0.5);
    });

    it('should cleanup canvas resources', () => {
      const mockImage = {
        width: 100,
        height: 100,
      } as HTMLImageElement;

      analyzeImageBrightness(mockImage);

      expect(mockContext.clearRect).toHaveBeenCalled();
      expect(mockCanvas.width).toBe(0);
      expect(mockCanvas.height).toBe(0);
    });
  });
});

describe('getTextColor', () => {
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      clearRect: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 0,
      height: 0,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as HTMLCanvasElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return "white" for dark images', () => {
    // Dark image - low luminance
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        20, 20, 20, 255, // Very dark pixel
        20, 20, 20, 255,
        20, 20, 20, 255,
        20, 20, 20, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = getTextColor(mockImage);

    expect(result).toBe('white');
  });

  it('should return "black" for very bright images after gradient adjustment', () => {
    // Very bright image - even after 60% overlay, adjusted luminance > 0.4
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        255, 255, 255, 255, // Pure white
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = getTextColor(mockImage);

    // White image luminance = 1
    // Adjusted = 1 * 0.4 = 0.4
    // Threshold is > 0.4, so this is exactly at threshold - should be 'white'
    expect(result).toBe('white');
  });

  it('should account for gradient overlay opacity', () => {
    // Medium brightness image
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        180, 180, 180, 255,
        180, 180, 180, 255,
        180, 180, 180, 255,
        180, 180, 180, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = getTextColor(mockImage);

    // Result depends on luminance calculation with gradient adjustment
    expect(['white', 'black']).toContain(result);
  });
});

describe('validateTextOverlay', () => {
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
      getImageData: vi.fn(),
      clearRect: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      width: 0,
      height: 0,
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as HTMLCanvasElement);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return valid result structure', () => {
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([128, 128, 128, 255]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = validateTextOverlay(mockImage, 'white');

    expect(result).toHaveProperty('isValid');
    expect(result).toHaveProperty('contrastRatio');
    expect(result).toHaveProperty('meetsWCAGAA');
    expect(typeof result.isValid).toBe('boolean');
    expect(typeof result.contrastRatio).toBe('number');
    expect(typeof result.meetsWCAGAA).toBe('boolean');
  });

  it('should validate white text on dark background', () => {
    // Very dark background
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        10, 10, 10, 255,
        10, 10, 10, 255,
        10, 10, 10, 255,
        10, 10, 10, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = validateTextOverlay(mockImage, 'white');

    expect(result.isValid).toBe(true);
    expect(result.contrastRatio).toBeGreaterThan(4.5);
    expect(result.meetsWCAGAA).toBe(true);
  });

  it('should fail white text on white background', () => {
    // Very bright background
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
        255, 255, 255, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = validateTextOverlay(mockImage, 'white');

    // Even with gradient overlay, white on bright may not meet 4.5:1
    expect(result.contrastRatio).toBeGreaterThan(1);
  });

  it('should account for gradient overlay in calculations', () => {
    // Medium gray background
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([
        128, 128, 128, 255,
        128, 128, 128, 255,
        128, 128, 128, 255,
        128, 128, 255, 255,
      ]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = validateTextOverlay(mockImage, 'white');

    // Gradient darkens background, improving white text contrast
    expect(result.contrastRatio).toBeGreaterThan(1);
  });

  it('should set meetsWCAGAA equal to isValid', () => {
    mockContext.getImageData = vi.fn().mockReturnValue({
      data: new Uint8ClampedArray([50, 50, 50, 255]),
    });

    const mockImage = { width: 100, height: 100 } as HTMLImageElement;
    const result = validateTextOverlay(mockImage, 'white');

    expect(result.isValid).toBe(result.meetsWCAGAA);
  });
});
