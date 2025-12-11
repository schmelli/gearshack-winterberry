/**
 * GearEditorForm Component
 *
 * Feature: 001-gear-item-editor, 045-gear-editor-tabs-marketplace
 * Tasks: T019, T021, T028-T031
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Main container component for the gear item editor form.
 * Organizes sections into 5 tabs for better navigation:
 * - General (+ Dependencies)
 * - Category (Classification + Weight/Specs)
 * - Purchase
 * - Media
 * - Status (+ Marketplace toggles)
 */

'use client';

import { Trash2 } from 'lucide-react';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useGearEditor,
  type UseGearEditorOptions,
} from '@/hooks/useGearEditor';
import { GeneralInfoSection } from '@/components/gear-editor/sections/GeneralInfoSection';
import { CategorySpecsSection } from '@/components/gear-editor/sections/CategorySpecsSection';
import { PurchaseSection } from '@/components/gear-editor/sections/PurchaseSection';
import { MediaSection } from '@/components/gear-editor/sections/MediaSection';
import { StatusSection } from '@/components/gear-editor/sections/StatusSection';
import { useItems } from '@/hooks/useSupabaseStore';

// =============================================================================
// Types
// =============================================================================

export interface GearEditorFormProps extends UseGearEditorOptions {
  /** Title to display in the form header */
  title?: string;
}

// =============================================================================
// Tab Configuration - Reduced from 7 to 5 tabs for better readability
// =============================================================================

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'category', label: 'Category' },
  { id: 'purchase', label: 'Purchase' },
  { id: 'media', label: 'Media' },
  { id: 'status', label: 'Status' },
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
  const { form, isEditing, isDirty, isSubmitting, isDeleting, handleSubmit, handleCancel, handleDelete } =
    useGearEditor({
      initialItem,
      onSaveSuccess,
      onSaveError,
      redirectPath,
    });

  // Get all items for dependency picker (Feature: 037-gear-dependencies)
  const allItems = useItems();

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
              {/* Tab Navigation - Simplified 5 tabs with full labels */}
              <TabsList className="w-full flex h-auto gap-1 mb-6 bg-muted rounded-full p-1">
                {TABS.map((tab) => (
                  <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className="flex-1 rounded-full data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm text-sm"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* Tab Content */}
              <TabsContent value="general" className="mt-0">
                <GeneralInfoSection
                  availableItems={allItems}
                  currentItemId={initialItem?.id}
                />
              </TabsContent>

              <TabsContent value="category" className="mt-0">
                <CategorySpecsSection />
              </TabsContent>

              <TabsContent value="purchase" className="mt-0">
                <PurchaseSection />
              </TabsContent>

              <TabsContent value="media" className="mt-0">
                <MediaSection initialItem={initialItem} />
              </TabsContent>

              <TabsContent value="status" className="mt-0">
                <StatusSection />
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-between border-t pt-6">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>

              {/* Delete button - only when editing */}
              {isEditing && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10"
                      disabled={isSubmitting || isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Delete item</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Gear Item?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

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
