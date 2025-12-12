/**
 * MediaSection Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T040-T042, T044
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Feature: 010-firestore-sync
 * Tasks: T019-T020 - Integrated Firebase Storage upload
 *
 * Feature: 026-client-bg-removal
 * Tasks: T006-T018 - Client-side background removal with toggle
 *
 * Feature: 038-cloudinary-hybrid-upload
 * Tasks: T015 - Integrated ImageUploadZone for primary image
 *
 * Functional Fixes Sprint:
 * - Added image upload UI with local file selection
 * - Dual approach: Paste URL or Upload Image
 * - Local preview using URL.createObjectURL
 * - Firebase Storage integration for file uploads
 *
 * Displays form fields for media management:
 * - Primary image URL with preview (URL or file upload)
 * - Gallery image URLs (multiple) with previews
 * - Auto-remove background toggle (default: ON)
 */

'use client';

import { useCallback, useState } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/gear-editor/ImagePreview';
import { ImageUploadZone } from '@/components/gear-editor/ImageUploadZone';
import type { GearItemFormData } from '@/types/gear';
import type { GearItem } from '@/types/gear';

// =============================================================================
// MediaSection Component
// =============================================================================

export interface MediaSectionProps {
  /** Initial item for editing (undefined for new items) */
  initialItem?: GearItem;
}

export function MediaSection({ initialItem }: MediaSectionProps) {
  const form = useFormContext<GearItemFormData>();
  const { user } = useAuthContext();

  // Watch brand and name fields to pass to ImageUploadZone for auto-search
  const brand = form.watch('brand');
  const productName = form.watch('name');

  // Generate a temporary item ID for new items (Feature: 038-cloudinary-hybrid-upload)
  // Use existing ID if editing, or generate a temporary UUID for new items
  // NOTE: Using useState instead of useMemo to avoid impure functions in render
  const [itemId] = useState(() => {
    if (initialItem?.id) {
      return initialItem.id;
    }
    // Generate a temporary UUID-like ID for new items
    // This will be replaced with the real ID once the item is saved
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  });

  // Get userId from auth (required for Cloudinary upload)
  const userId = user?.uid || 'anonymous';

  // Use field array for gallery images
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'galleryImageUrls' as never,
  });

  const handleAddGalleryImage = useCallback(() => {
    append('' as never);
  }, [append]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Media</h3>

      {/* Primary Image - Feature 038: Cloudinary Upload */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="primaryImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <ImageUploadZone
                  value={field.value || ''}
                  onChange={field.onChange}
                  userId={userId}
                  itemId={itemId}
                  label="Primary Image"
                  brand={brand}
                  productName={productName}
                />
              </FormControl>
              <FormDescription>
                Main product image displayed in inventory lists. Uploaded to Cloudinary with automatic background removal.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Gallery Images */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <FormLabel className="text-base">Gallery Images</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddGalleryImage}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Image
          </Button>
        </div>

        <FormDescription>
          Additional product images for detailed views
        </FormDescription>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            No gallery images added yet. Click &quot;Add Image&quot; to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`galleryImageUrls.${index}`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <div className="flex gap-3 items-start">
                      <ImagePreview
                        src={inputField.value || ''}
                        alt={`Gallery image ${index + 1} preview`}
                        size="sm"
                      />
                      <div className="flex-1">
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            {...inputField}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                        aria-label={`Remove gallery image ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
