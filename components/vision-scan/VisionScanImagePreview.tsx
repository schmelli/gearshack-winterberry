/**
 * VisionScanImagePreview Component
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Shows the uploaded image with:
 * - Scan-line animation during the 'analyzing' phase
 * - Detected-item chips overlaid on the image in the 'review' phase
 *
 * No bounding-box data is available from the AI, so chips are placed at
 * visually-pleasing preset positions rather than precise coordinates.
 * This is an intentional UX choice: it gives a "this was detected here"
 * feel without misleading the user about exact object locations.
 */

'use client';

import Image from 'next/image';
import type { VisionScanStatus, CatalogMatchResult } from '@/types/vision-scan';

// =============================================================================
// Chip positions (up to 6 items) — pre-defined to avoid overlaps
// =============================================================================

const CHIP_POSITIONS: React.CSSProperties[] = [
  { top: '12%',  left:  '8%'  },
  { top: '12%',  right: '8%'  },
  { top: '44%',  left:  '6%'  },
  { top: '44%',  right: '6%'  },
  { bottom: '14%', left:  '8%'  },
  { bottom: '14%', right: '8%'  },
];

// =============================================================================
// Types
// =============================================================================

interface VisionScanImagePreviewProps {
  previewUrl: string;
  status: VisionScanStatus;
  results: CatalogMatchResult[];
}

// =============================================================================
// Component
// =============================================================================

export function VisionScanImagePreview({
  previewUrl,
  status,
  results,
}: VisionScanImagePreviewProps) {
  const isAnalyzing = status === 'analyzing';
  const isReview    = status === 'review';
  const chips       = results.slice(0, 6);

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg"
      style={{ aspectRatio: '4 / 3' }}
    >
      {/* ── Image ─────────────────────────────────────────────────────────── */}
      <Image
        src={previewUrl}
        alt="Uploaded gear photo"
        fill
        unoptimized
        className="object-cover"
        style={{
          filter: isAnalyzing ? 'brightness(0.7)' : 'brightness(1)',
          transition: 'filter 0.6s ease',
          // Pulsing white border while items are shown
          ...(isReview && chips.length > 0
            ? { animation: 'vision-pulse-border 3s ease-in-out infinite' }
            : {}),
        }}
      />

      {/* ── Scan line (analyzing only) ────────────────────────────────────── */}
      {isAnalyzing && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Glow trail above the line */}
          <div
            className="absolute w-full"
            style={{
              height: '25%',
              background:
                'linear-gradient(to bottom, transparent, rgba(147,197,253,0.08))',
              animation: 'vision-scan-line 2.2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
          {/* The bright line itself */}
          <div
            className="absolute w-full"
            style={{
              height: '2px',
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.9) 20%, white 50%, rgba(255,255,255,0.9) 80%, transparent 100%)',
              boxShadow:
                '0 0 8px 3px rgba(255,255,255,0.55), 0 0 20px 6px rgba(147,197,253,0.35)',
              animation: 'vision-scan-line 2.2s cubic-bezier(0.4,0,0.6,1) infinite',
            }}
          />
        </div>
      )}

      {/* ── Detection chips (review, items found) ─────────────────────────── */}
      {isReview && chips.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {chips.map((result, i) => {
            const label =
              result.catalogMatch?.productName ?? result.detected.name;
            const truncated =
              label.length > 22 ? label.slice(0, 21) + '…' : label;

            return (
              <span
                key={i}
                className="absolute max-w-[140px] rounded-full border border-white/50 bg-black/60 px-2 py-0.5 text-[10px] font-medium leading-tight text-white backdrop-blur-sm"
                style={{
                  ...CHIP_POSITIONS[i],
                  animation: `vision-detect-in 0.45s ease-out both`,
                  animationDelay: `${i * 120}ms`,
                }}
              >
                {truncated}
              </span>
            );
          })}
        </div>
      )}

      {/* ── Corner brackets (review decoration) ──────────────────────────── */}
      {isReview && chips.length > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {/* Top-left */}
          <span className="absolute left-2 top-2 h-5 w-5 rounded-tl border-l-2 border-t-2 border-white/60" />
          {/* Top-right */}
          <span className="absolute right-2 top-2 h-5 w-5 rounded-tr border-r-2 border-t-2 border-white/60" />
          {/* Bottom-left */}
          <span className="absolute bottom-2 left-2 h-5 w-5 rounded-bl border-b-2 border-l-2 border-white/60" />
          {/* Bottom-right */}
          <span className="absolute bottom-2 right-2 h-5 w-5 rounded-br border-b-2 border-r-2 border-white/60" />
        </div>
      )}

      {/* ── "Scanning…" label (analyzing) ─────────────────────────────────── */}
      {isAnalyzing && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center">
          <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium tracking-widest text-white/80 backdrop-blur-sm uppercase">
            Scanning…
          </span>
        </div>
      )}
    </div>
  );
}
