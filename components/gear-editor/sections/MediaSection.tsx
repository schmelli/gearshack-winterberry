/**
 * MediaSection Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T040-T042, T044
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Displays form fields for media management:
 * - Primary image URL with preview
 * - Gallery image URLs (multiple) with previews
 */

'use client';

import { useCallback } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
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
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Component
// =============================================================================

export function MediaSection() {
  const form = useFormContext<GearItemFormData>();

  // Use field array for gallery images
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'galleryImageUrls' as never, // Type assertion needed for string[]
  });

  const handleAddGalleryImage = useCallback(() => {
    append('' as never);
  }, [append]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Media</h3>

      {/* Primary Image - T041 */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="primaryImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Image URL</FormLabel>
              <div className="flex gap-4 items-start">
                <ImagePreview
                  src={field.value || ''}
                  alt="Primary image preview"
                  size="lg"
                />
                <div className="flex-1">
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="mt-2">
                    Main product image displayed in inventory lists
                  </FormDescription>
                  <FormMessage />
                </div>
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Gallery Images - T042 */}
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
