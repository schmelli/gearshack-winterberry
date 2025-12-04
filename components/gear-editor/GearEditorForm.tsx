/**
 * GearEditorForm Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T019, T021, T028-T031
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Main container component for the gear item editor form.
 * Organizes sections into tabs for better navigation.
 */

'use client';

import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useGearEditor,
  type UseGearEditorOptions,
} from '@/hooks/useGearEditor';
import { GeneralInfoSection } from '@/components/gear-editor/sections/GeneralInfoSection';
import { ClassificationSection } from '@/components/gear-editor/sections/ClassificationSection';
import { WeightSpecsSection } from '@/components/gear-editor/sections/WeightSpecsSection';
import { PurchaseSection } from '@/components/gear-editor/sections/PurchaseSection';
import { MediaSection } from '@/components/gear-editor/sections/MediaSection';
import { StatusSection } from '@/components/gear-editor/sections/StatusSection';

// =============================================================================
// Types
// =============================================================================

export interface GearEditorFormProps extends UseGearEditorOptions {
  /** Title to display in the form header */
  title?: string;
}

// =============================================================================
// Tab Configuration
// =============================================================================

const TABS = [
  { id: 'general', label: 'General', shortLabel: 'Gen' },
  { id: 'classification', label: 'Classification', shortLabel: 'Class' },
  { id: 'weight', label: 'Weight & Specs', shortLabel: 'Weight' },
  { id: 'purchase', label: 'Purchase', shortLabel: 'Buy' },
  { id: 'media', label: 'Media', shortLabel: 'Media' },
  { id: 'status', label: 'Status', shortLabel: 'Status' },
] as const;

// =============================================================================
// Component
// =============================================================================

export function GearEditorForm({
  title,
  initialItem,
  onSaveSuccess,
  onSaveError,
  redirectPath,
}: GearEditorFormProps) {
  const { form, isEditing, isDirty, isSubmitting, handleSubmit, handleCancel } =
    useGearEditor({
      initialItem,
      onSaveSuccess,
      onSaveError,
      redirectPath,
    });

  const formTitle =
    title ?? (isEditing ? 'Edit Gear Item' : 'Add New Gear Item');

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{formTitle}</CardTitle>
      </CardHeader>

      <Form {...form}>
        <form onSubmit={handleSubmit}>
          <CardContent>
            <Tabs defaultValue="general" className="w-full">
              {/* Tab Navigation - T029, T031 (responsive) */}
              <TabsList className="w-full flex flex-wrap h-auto gap-1 mb-6">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-1 min-w-[80px] data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {/* Show short label on mobile, full label on larger screens */}
                    <span className="sm:hidden">{tab.shortLabel}</span>
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Content - T030 */}
              <TabsContent value="general" className="mt-0">
                <GeneralInfoSection />
              </TabsContent>

              <TabsContent value="classification" className="mt-0">
                <ClassificationSection />
              </TabsContent>

              <TabsContent value="weight" className="mt-0">
                <WeightSpecsSection />
              </TabsContent>

              <TabsContent value="purchase" className="mt-0">
                <PurchaseSection />
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <MediaSection />
              </TabsContent>

              <TabsContent value="status" className="mt-0">
                <StatusSection />
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>

            <div className="flex gap-2 items-center">
              {isDirty && (
                <span className="text-sm text-muted-foreground">
                  Unsaved changes
                </span>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Saving...'
                  : isEditing
                    ? 'Save Changes'
                    : 'Add Item'}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
