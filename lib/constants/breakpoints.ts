/**
 * Responsive Breakpoints Constants
 *
 * Defines breakpoint values for responsive design.
 * These breakpoints align with Tailwind CSS defaults.
 *
 * Usage:
 * ```tsx
 * import { BREAKPOINTS, MEDIA_QUERIES } from '@/lib/constants/breakpoints';
 *
 * // With useMediaQuery hook:
 * const isMobile = useMediaQuery(MEDIA_QUERIES.mobile);
 * const isTablet = useMediaQuery(MEDIA_QUERIES.tablet);
 *
 * // In CSS or inline styles:
 * const width = BREAKPOINTS.sm; // '640px'
 * ```
 */

/**
 * Breakpoint values (in pixels)
 * Matches Tailwind CSS default breakpoints
 */
export const BREAKPOINTS = {
  /** Small devices (640px and up) - Tailwind 'sm' */
  sm: '640px',
  /** Medium devices (768px and up) - Tailwind 'md' */
  md: '768px',
  /** Large devices (1024px and up) - Tailwind 'lg' */
  lg: '1024px',
  /** Extra large devices (1280px and up) - Tailwind 'xl' */
  xl: '1280px',
  /** 2X large devices (1536px and up) - Tailwind '2xl' */
  '2xl': '1536px',
} as const;

/**
 * Media query strings for common device sizes
 * Use with useMediaQuery hook or CSS @media rules
 */
export const MEDIA_QUERIES = {
  /** Mobile: max-width 640px (below 'sm') */
  mobile: `(max-width: ${BREAKPOINTS.sm})`,
  /** Tablet: min-width 640px and max-width 1024px ('sm' to 'lg') */
  tablet: `(min-width: ${BREAKPOINTS.sm}) and (max-width: ${BREAKPOINTS.lg})`,
  /** Desktop: min-width 1024px ('lg' and up) */
  desktop: `(min-width: ${BREAKPOINTS.lg})`,
  /** Prefers reduced motion (accessibility) */
  reducedMotion: '(prefers-reduced-motion: reduce)',
  /** Prefers dark color scheme */
  darkMode: '(prefers-color-scheme: dark)',
} as const;
