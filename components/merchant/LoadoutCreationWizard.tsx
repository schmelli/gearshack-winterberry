/**
 * LoadoutCreationWizard Component
 *
 * Feature: 053-merchant-integration
 * Task: T033
 *
 * Multi-step wizard for creating merchant loadouts.
 * Steps: Basics -> Items -> Pricing -> Availability
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2, Save, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  calculateLoadoutPricing,
  type MerchantLoadoutInput,
  type LoadoutItemInput,
  type LoadoutAvailabilityInput,
  type LoadoutPricing,
} from '@/types/merchant-loadout';
import type { MerchantCatalogItem, MerchantLocation } from '@/types/merchant';
import {
  LoadoutBasicsStep,
  LoadoutItemsStep,
  LoadoutPricingStep,
  LoadoutAvailabilityStep,
} from './wizard';

// =============================================================================
// Types
// =============================================================================

export type WizardStep = 'basics' | 'items' | 'pricing' | 'availability';

export interface WizardStepConfig {
  id: WizardStep;
  label: string;
  description: string;
}

export interface WizardState {
  currentStep: WizardStep;
  basics: MerchantLoadoutInput;
  items: LoadoutItemInput[];
  pricing: { discountPercent: number };
  availability: LoadoutAvailabilityInput[];
  isDirty: boolean;
}

export interface LoadoutCreationWizardProps {
  /** Initial values for editing existing loadout */
  initialValues?: Partial<WizardState>;
  /** Loadout ID when editing */
  loadoutId?: string;
  /** Available catalog items to add */
  catalogItems: MerchantCatalogItem[];
  /** Available store locations */
  locations: MerchantLocation[];
  /** Loading state */
  isLoading?: boolean;
  /** Callback when saving as draft */
  onSaveDraft: (data: WizardSubmitData) => Promise<boolean>;
  /** Callback when submitting for review */
  onSubmitForReview: (data: WizardSubmitData) => Promise<boolean>;
  /** Callback when cancelling */
  onCancel: () => void;
}

export interface WizardSubmitData {
  basics: MerchantLoadoutInput;
  items: LoadoutItemInput[];
  availability: LoadoutAvailabilityInput[];
}

// =============================================================================
// Constants
// =============================================================================

const STEPS: WizardStep[] = ['basics', 'items', 'pricing', 'availability'];

const DEFAULT_BASICS: MerchantLoadoutInput = {
  name: '',
  description: '',
  tripType: '',
  season: [],
  discountPercent: 0,
};

// =============================================================================
// Component
// =============================================================================

export function LoadoutCreationWizard({
  initialValues,
  loadoutId,
  catalogItems,
  locations,
  isLoading = false,
  onSaveDraft,
  onSubmitForReview,
  onCancel,
}: LoadoutCreationWizardProps) {
  const t = useTranslations('MerchantLoadouts.wizard');

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<WizardStep>(
    initialValues?.currentStep ?? 'basics'
  );
  const [basics, setBasics] = useState<MerchantLoadoutInput>(
    initialValues?.basics ?? DEFAULT_BASICS
  );
  const [items, setItems] = useState<LoadoutItemInput[]>(
    initialValues?.items ?? []
  );
  const [availability, setAvailability] = useState<LoadoutAvailabilityInput[]>(
    initialValues?.availability ?? []
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const stepConfigs: WizardStepConfig[] = useMemo(
    () => [
      { id: 'basics', label: t('steps.basics'), description: t('steps.basicsDesc') },
      { id: 'items', label: t('steps.items'), description: t('steps.itemsDesc') },
      { id: 'pricing', label: t('steps.pricing'), description: t('steps.pricingDesc') },
      { id: 'availability', label: t('steps.availability'), description: t('steps.availabilityDesc') },
    ],
    [t]
  );

  const currentStepIndex = STEPS.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  // Calculate pricing based on items and discount
  const pricing: LoadoutPricing = useMemo(() => {
    const itemsWithPricing = items.map((item) => {
      const catalogItem = catalogItems.find((c) => c.id === item.catalogItemId);
      return {
        price: catalogItem?.price ?? 0,
        quantity: item.quantity ?? 1,
        weightGrams: catalogItem?.weightGrams ?? null,
      };
    });
    return calculateLoadoutPricing(itemsWithPricing, basics.discountPercent ?? 0);
  }, [items, catalogItems, basics.discountPercent]);

  // Map catalog items by ID for lookup
  const catalogItemsMap = useMemo(
    () => new Map(catalogItems.map((item) => [item.id, item])),
    [catalogItems]
  );

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------
  const canGoNext = useCallback(() => {
    switch (currentStep) {
      case 'basics':
        return basics.name.trim().length >= 3;
      case 'items':
        return items.length >= 1;
      case 'pricing':
        return true; // Pricing is optional
      case 'availability':
        return true; // Availability is optional
      default:
        return false;
    }
  }, [currentStep, basics.name, items.length]);

  const goToStep = useCallback((step: WizardStep) => {
    setCurrentStep(step);
  }, []);

  const goNext = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex]);
    }
  }, [currentStepIndex]);

  const goPrevious = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEPS[prevIndex]);
    }
  }, [currentStepIndex]);

  // ---------------------------------------------------------------------------
  // Step Data Updates
  // ---------------------------------------------------------------------------
  const updateBasics = useCallback((updates: Partial<MerchantLoadoutInput>) => {
    setBasics((prev) => ({ ...prev, ...updates }));
  }, []);

  const addItem = useCallback((item: LoadoutItemInput) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const updateItem = useCallback(
    (catalogItemId: string, updates: Partial<LoadoutItemInput>) => {
      setItems((prev) =>
        prev.map((item) =>
          item.catalogItemId === catalogItemId ? { ...item, ...updates } : item
        )
      );
    },
    []
  );

  const removeItem = useCallback((catalogItemId: string) => {
    setItems((prev) => prev.filter((item) => item.catalogItemId !== catalogItemId));
  }, []);

  const reorderItems = useCallback((newOrder: LoadoutItemInput[]) => {
    setItems(newOrder.map((item, index) => ({ ...item, sortOrder: index })));
  }, []);

  const updateAvailability = useCallback((locationId: string, updates: Partial<LoadoutAvailabilityInput>) => {
    setAvailability((prev) => {
      const existing = prev.find((a) => a.locationId === locationId);
      if (existing) {
        return prev.map((a) =>
          a.locationId === locationId ? { ...a, ...updates } : a
        );
      }
      return [...prev, { locationId, isInStock: true, ...updates }];
    });
  }, []);

  const removeAvailability = useCallback((locationId: string) => {
    setAvailability((prev) => prev.filter((a) => a.locationId !== locationId));
  }, []);

  // ---------------------------------------------------------------------------
  // Submit Actions
  // ---------------------------------------------------------------------------
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const success = await onSaveDraft({ basics, items, availability });
      return success;
    } finally {
      setIsSaving(false);
    }
  }, [basics, items, availability, onSaveDraft]);

  const handleSubmitForReview = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const success = await onSubmitForReview({ basics, items, availability });
      return success;
    } finally {
      setIsSubmitting(false);
    }
  }, [basics, items, availability, onSubmitForReview]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle>
              {loadoutId ? t('editTitle') : t('createTitle')}
            </CardTitle>
            <div className="text-sm text-muted-foreground">
              {t('stepProgress', { current: currentStepIndex + 1, total: STEPS.length })}
            </div>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>

        {/* Step Indicators */}
        <CardContent className="pt-0">
          <div className="flex justify-between">
            {stepConfigs.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                disabled={index > currentStepIndex + 1}
                className={`flex flex-col items-center text-center px-2 py-1 rounded-md transition-colors ${
                  step.id === currentStep
                    ? 'text-primary font-medium'
                    : index < currentStepIndex
                    ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                    : 'text-muted-foreground/50 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm mb-1 ${
                    step.id === currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index < currentStepIndex
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                <span className="text-xs hidden sm:block">{step.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{stepConfigs[currentStepIndex].label}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {stepConfigs[currentStepIndex].description}
          </p>
        </CardHeader>
        <CardContent>
          {/* Step content will be rendered by child components */}
          <WizardStepContent
            step={currentStep}
            basics={basics}
            items={items}
            availability={availability}
            pricing={pricing}
            catalogItems={catalogItems}
            catalogItemsMap={catalogItemsMap}
            locations={locations}
            onUpdateBasics={updateBasics}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onRemoveItem={removeItem}
            onReorderItems={reorderItems}
            onUpdateAvailability={updateAvailability}
            onRemoveAvailability={removeAvailability}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={goPrevious} disabled={isSaving || isSubmitting}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t('previous')}
            </Button>
          )}
          <Button variant="ghost" onClick={onCancel} disabled={isSaving || isSubmitting}>
            {t('cancel')}
          </Button>
        </div>

        <div className="flex gap-2">
          {/* Save Draft (available on any step) */}
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={!basics.name.trim() || isSaving || isSubmitting}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {t('saveDraft')}
              </>
            )}
          </Button>

          {isLastStep ? (
            /* Submit for Review on last step */
            <Button
              onClick={handleSubmitForReview}
              disabled={items.length === 0 || isSubmitting || isSaving}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('submitting')}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  {t('submitForReview')}
                </>
              )}
            </Button>
          ) : (
            /* Next Step */
            <Button onClick={goNext} disabled={!canGoNext() || isSaving || isSubmitting}>
              {t('next')}
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Step Content Router
// =============================================================================

interface WizardStepContentProps {
  step: WizardStep;
  basics: MerchantLoadoutInput;
  items: LoadoutItemInput[];
  availability: LoadoutAvailabilityInput[];
  pricing: LoadoutPricing;
  catalogItems: MerchantCatalogItem[];
  catalogItemsMap: Map<string, MerchantCatalogItem>;
  locations: MerchantLocation[];
  onUpdateBasics: (updates: Partial<MerchantLoadoutInput>) => void;
  onAddItem: (item: LoadoutItemInput) => void;
  onUpdateItem: (catalogItemId: string, updates: Partial<LoadoutItemInput>) => void;
  onRemoveItem: (catalogItemId: string) => void;
  onReorderItems: (newOrder: LoadoutItemInput[]) => void;
  onUpdateAvailability: (locationId: string, updates: Partial<LoadoutAvailabilityInput>) => void;
  onRemoveAvailability: (locationId: string) => void;
  isLoading: boolean;
}

function WizardStepContent(props: WizardStepContentProps) {
  switch (props.step) {
    case 'basics':
      return (
        <LoadoutBasicsStep
          values={props.basics}
          onUpdate={props.onUpdateBasics}
        />
      );
    case 'items':
      return (
        <LoadoutItemsStep
          items={props.items}
          catalogItems={props.catalogItems}
          catalogItemsMap={props.catalogItemsMap}
          onAddItem={props.onAddItem}
          onUpdateItem={props.onUpdateItem}
          onRemoveItem={props.onRemoveItem}
          onReorderItems={props.onReorderItems}
        />
      );
    case 'pricing':
      return (
        <LoadoutPricingStep
          pricing={props.pricing}
          discountPercent={props.basics.discountPercent ?? 0}
          onUpdateDiscount={(discountPercent) =>
            props.onUpdateBasics({ discountPercent })
          }
        />
      );
    case 'availability':
      return (
        <LoadoutAvailabilityStep
          availability={props.availability}
          locations={props.locations}
          onUpdateAvailability={props.onUpdateAvailability}
          onRemoveAvailability={props.onRemoveAvailability}
        />
      );
    default:
      return null;
  }
}

export default LoadoutCreationWizard;
