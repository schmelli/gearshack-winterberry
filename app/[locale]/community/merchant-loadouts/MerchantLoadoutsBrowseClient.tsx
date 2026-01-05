/**
 * MerchantLoadoutsBrowseClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T025
 *
 * Client-side interactive browsing for merchant loadouts.
 * Includes tab navigation for VIP Loadouts and Reseller Loadouts.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Store, Sparkles, Star, ShoppingBag, Users } from 'lucide-react';
import { useMerchantLoadoutsPublic, useFeaturedLoadouts } from '@/hooks/merchant';
import { MerchantLoadoutGrid } from '@/components/merchant/MerchantLoadoutGrid';
import { MerchantLoadoutCard, MerchantLoadoutCardSkeleton } from '@/components/merchant/MerchantLoadoutCard';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export function MerchantLoadoutsBrowseClient() {
  const t = useTranslations('MerchantLoadouts');

  // Featured loadouts for hero section
  const {
    loadouts: featuredLoadouts,
    isLoading: featuredLoading,
  } = useFeaturedLoadouts(6);

  // Main browse state
  const {
    state,
    filters,
    sort,
    setFilters,
    clearFilters,
    setSort,
  } = useMerchantLoadoutsPublic();

  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* Page Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
          <Store className="h-5 w-5" />
          <span className="text-sm font-medium">{t('badge')}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">{t('pageTitle')}</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('pageDescription')}
        </p>
      </div>

      {/* Loadout Type Tabs */}
      <div className="flex justify-center">
        <Tabs defaultValue="vip" className="w-auto">
          <TabsList className="grid grid-cols-2 w-auto">
            <TabsTrigger value="vip" className="flex items-center gap-2 px-6">
              <Star className="h-4 w-4" />
              {t('tabs.vipLoadouts')}
            </TabsTrigger>
            <TabsTrigger
              value="reseller"
              disabled
              className="flex items-center gap-2 px-6 cursor-not-allowed"
            >
              <ShoppingBag className="h-4 w-4" />
              {t('tabs.resellerLoadouts')}
              <Badge variant="secondary" className="ml-1 text-xs">
                {t('tabs.soon')}
              </Badge>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Featured Loadouts Carousel */}
      {(featuredLoading || featuredLoadouts.length > 0) && (
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold">{t('featuredSection')}</h2>
          </div>

          <Carousel
            opts={{
              align: 'start',
              loop: featuredLoadouts.length > 3,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {featuredLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <CarouselItem
                      key={i}
                      className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    >
                      <MerchantLoadoutCardSkeleton />
                    </CarouselItem>
                  ))
                : featuredLoadouts.map((loadout) => (
                    <CarouselItem
                      key={loadout.id}
                      className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
                    >
                      <MerchantLoadoutCard loadout={loadout} />
                    </CarouselItem>
                  ))}
            </CarouselContent>
            <CarouselPrevious className="hidden sm:flex -left-4" />
            <CarouselNext className="hidden sm:flex -right-4" />
          </Carousel>
        </section>
      )}

      {/* All Loadouts Grid */}
      <section className="space-y-6">
        <h2 className="text-xl font-semibold">{t('allLoadouts')}</h2>

        <MerchantLoadoutGrid
          loadouts={state.loadouts}
          isLoading={state.isLoading}
          error={state.error}
          filters={filters}
          sort={sort}
          onFiltersChange={setFilters}
          onClearFilters={clearFilters}
          onSortChange={setSort}
          totalCount={state.total}
          columns={3}
        />

        {/* Pagination */}
        {state.totalPages > 1 && (
          <div className="flex justify-center gap-2 pt-4">
            <span className="text-sm text-muted-foreground">
              {t('pagination', {
                current: state.page,
                total: state.totalPages,
              })}
            </span>
          </div>
        )}
      </section>
    </div>
  );
}
