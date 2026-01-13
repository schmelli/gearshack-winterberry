/**
 * Community Banner Carousel
 *
 * Feature: 056-community-hub-enhancements
 * Task: T029
 *
 * Auto-rotating promotional banner carousel for the community page.
 * Uses embla-carousel with autoplay plugin.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import { useBannerCarousel } from '@/hooks/banner';
import { BANNER_CONSTANTS } from '@/types/banner';
import { cn } from '@/lib/utils';
import type { EmblaCarouselType } from 'embla-carousel';

// ============================================================================
// Component
// ============================================================================

export function BannerCarousel() {
  const t = useTranslations('Banner.carousel');
  const { banners, hasBanners, loadingState } = useBannerCarousel();

  const [api, setApi] = useState<EmblaCarouselType | undefined>(undefined);
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Update current slide index when carousel changes and start autoplay
  useEffect(() => {
    if (!api) return;

    const onSelect = () => {
      setCurrent(api.selectedScrollSnap());
    };

    api.on('select', onSelect);
    onSelect();

    // Start autoplay after carousel is ready (avoids race condition)
    const autoplayPlugin = api.plugins()?.autoplay;
    if (autoplayPlugin && 'play' in autoplayPlugin && api.scrollSnapList().length > 0) {
      // Small delay to ensure carousel is fully initialized
      const timer = setTimeout(() => {
        try {
          (autoplayPlugin as { play: () => void }).play();
        } catch {
          // Ignore if already playing or not ready
        }
      }, 100);
      return () => {
        clearTimeout(timer);
        api.off('select', onSelect);
      };
    }

    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // Navigation handlers
  const scrollPrev = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const scrollNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  // Pause autoplay on hover
  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
    try {
      const autoplayPlugin = api?.plugins()?.autoplay;
      if (autoplayPlugin && 'stop' in autoplayPlugin) {
        (autoplayPlugin as { stop: () => void }).stop();
      }
    } catch {
      // Ignore errors if carousel is not fully initialized
    }
  }, [api]);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
    try {
      // Only play if carousel API is ready and has slides
      if (!api || api.scrollSnapList().length === 0) return;
      const autoplayPlugin = api.plugins()?.autoplay;
      if (autoplayPlugin && 'play' in autoplayPlugin) {
        (autoplayPlugin as { play: () => void }).play();
      }
    } catch {
      // Ignore errors if carousel is not fully initialized
    }
  }, [api]);

  // Don't render if no banners or still loading
  if (loadingState === 'loading') {
    return (
      <div className="relative mb-6 aspect-[21/9] w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  if (!hasBanners) {
    return null;
  }

  return (
    <div
      className="relative mb-6"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Carousel
        setApi={setApi}
        opts={{
          loop: true,
          align: 'start',
        }}
        plugins={[
          Autoplay({
            delay: BANNER_CONSTANTS.AUTO_ROTATE_INTERVAL_MS,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
            playOnInit: false, // We manually start autoplay after carousel is ready
          }),
        ]}
        className="w-full"
      >
        <CarouselContent>
          {banners.map((banner) => (
            <CarouselItem key={banner.id}>
              <a
                href={banner.targetUrl}
                target={
                  banner.targetUrl.startsWith('http') ? '_blank' : undefined
                }
                rel={
                  banner.targetUrl.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
                className="group relative block aspect-[21/9] w-full overflow-hidden rounded-xl"
              >
                {/* Background image */}
                <Image
                  src={banner.heroImageUrl}
                  alt={`${banner.ctaText} - ${banner.buttonText}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 1200px) 100vw, 1200px"
                  priority={banners.indexOf(banner) === 0}
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />

                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-10">
                  <h2 className="mb-4 max-w-lg text-xl font-bold text-white drop-shadow-lg md:text-3xl lg:text-4xl">
                    {banner.ctaText}
                  </h2>
                  <div>
                    <span className="inline-flex items-center rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground transition-colors hover:bg-primary/90">
                      {banner.buttonText}
                    </span>
                  </div>
                </div>
              </a>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Navigation arrows */}
      {banners.length > 1 && (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50',
              'opacity-0 transition-opacity group-hover:opacity-100',
              isPaused && 'opacity-100'
            )}
            onClick={scrollPrev}
            aria-label={t('previous')}
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/30 text-white hover:bg-black/50',
              'opacity-0 transition-opacity group-hover:opacity-100',
              isPaused && 'opacity-100'
            )}
            onClick={scrollNext}
            aria-label={t('next')}
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}

      {/* Dots navigation */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={cn(
                'h-2 w-2 rounded-full transition-all',
                index === current
                  ? 'w-6 bg-white'
                  : 'bg-white/50 hover:bg-white/75'
              )}
              aria-label={t('goTo', { index: index + 1 })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
