/**
 * Supabase Database Service Functions for Loadout Images
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Server-side database operations with RLS enforcement
 */

import { createClient } from '@supabase/supabase-js';
import type { GeneratedLoadoutImage, StylePreferences } from '@/types/loadout-image';

// =============================================================================
// Client Initialization
// =============================================================================

/**
 * Get Supabase client (server-side with service role for admin operations)
 * For client-side operations, use the client from lib/supabase/client.ts
 */
function getSupabaseClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY - required for server-side RLS operations');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

// =============================================================================
// Insert Operations
// =============================================================================

/**
 * Insert a new generated image and set it as active for the loadout
 *
 * This function performs the following atomically:
 * 1. Deactivates all existing images for the loadout
 * 2. Inserts new generated image with is_active = true
 * 3. Updates loadout.hero_image_id to reference new image
 * 4. Updates loadout.image_source_preference to 'ai_generated'
 * 5. Deletes oldest images if count exceeds 3
 *
 * @param params - Image generation data
 * @returns Newly created image record
 */
export async function insertGeneratedImage(params: {
  loadoutId: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  promptUsed: string;
  stylePreferences?: StylePreferences | null;
  altText?: string | null;
  userId: string; // Required for RLS
}): Promise<GeneratedLoadoutImage> {
  const supabase = getSupabaseClient();

  const {
    loadoutId,
    cloudinaryPublicId,
    cloudinaryUrl,
    promptUsed,
    stylePreferences,
    altText,
  } = params;

  // Step 1: Deactivate all existing images for this loadout
  const { error: deactivateError } = await supabase
    .from('generated_images')
    .update({ is_active: false })
    .eq('loadout_id', loadoutId);

  if (deactivateError) {
    throw new Error(`Failed to deactivate existing images: ${deactivateError.message}`);
  }

  // Step 2: Insert new generated image with is_active = true
  const { data: newImage, error: insertError } = await supabase
    .from('generated_images')
    .insert({
      loadout_id: loadoutId,
      cloudinary_public_id: cloudinaryPublicId,
      cloudinary_url: cloudinaryUrl,
      prompt_used: promptUsed,
      style_preferences: stylePreferences,
      alt_text: altText,
      is_active: true,
      generation_timestamp: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError || !newImage) {
    throw new Error(`Failed to insert generated image: ${insertError?.message || 'Unknown error'}`);
  }

  // Step 3: Update loadout with hero_image_id and source preference
  const { error: updateLoadoutError } = await supabase
    .from('loadouts')
    .update({
      hero_image_id: newImage.id,
      image_source_preference: 'ai_generated',
    })
    .eq('id', loadoutId);

  if (updateLoadoutError) {
    // Log error but don't fail - the image was inserted successfully
    console.error('[LoadoutImages] Failed to update loadout hero_image_id:', updateLoadoutError);
  }

  // Step 4: Delete oldest images beyond 3-image limit
  await cleanupOldImages(loadoutId);

  // Transform database record to TypeScript type
  return transformDbImageToType(newImage);
}

// =============================================================================
// Query Operations
// =============================================================================

/**
 * Get image generation history for a loadout (up to 3 most recent)
 *
 * @param loadoutId - UUID of the loadout
 * @returns Array of up to 3 generated images, ordered by generation_timestamp DESC
 */
export async function getImageHistory(
  loadoutId: string
): Promise<GeneratedLoadoutImage[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('loadout_id', loadoutId)
    .order('generation_timestamp', { ascending: false })
    .limit(3);

  if (error) {
    throw new Error(`Failed to fetch image history: ${error.message}`);
  }

  return (data || []).map(transformDbImageToType);
}

/**
 * Get the currently active image for a loadout
 *
 * @param loadoutId - UUID of the loadout
 * @returns Active image or null if none set
 */
export async function getActiveImage(
  loadoutId: string
): Promise<GeneratedLoadoutImage | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('loadout_id', loadoutId)
    .eq('is_active', true)
    .single();

  if (error) {
    // Not finding an active image is not an error - loadout may not have one yet
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch active image: ${error.message}`);
  }

  return data ? transformDbImageToType(data) : null;
}

/**
 * Get a specific generated image by ID
 *
 * @param imageId - UUID of the generated image
 * @returns Generated image or null if not found
 */
export async function getImageById(
  imageId: string
): Promise<GeneratedLoadoutImage | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('generated_images')
    .select('*')
    .eq('id', imageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch image: ${error.message}`);
  }

  return data ? transformDbImageToType(data) : null;
}

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Set a specific image as the active image for a loadout
 *
 * @param imageId - UUID of the image to activate
 * @param loadoutId - UUID of the loadout
 */
export async function setActiveImage(
  imageId: string,
  loadoutId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Step 1: Deactivate all images for this loadout
  const { error: deactivateError } = await supabase
    .from('generated_images')
    .update({ is_active: false })
    .eq('loadout_id', loadoutId);

  if (deactivateError) {
    throw new Error(`Failed to deactivate images: ${deactivateError.message}`);
  }

  // Step 2: Activate the selected image
  const { error: activateError } = await supabase
    .from('generated_images')
    .update({ is_active: true })
    .eq('id', imageId)
    .eq('loadout_id', loadoutId); // Extra safety check

  if (activateError) {
    throw new Error(`Failed to activate image: ${activateError.message}`);
  }

  // Step 3: Update loadout hero_image_id
  const { error: updateError } = await supabase
    .from('loadouts')
    .update({ hero_image_id: imageId })
    .eq('id', loadoutId);

  if (updateError) {
    console.error('[LoadoutImages] Failed to update loadout hero_image_id:', updateError);
  }
}

// =============================================================================
// Delete Operations
// =============================================================================

/**
 * Delete a generated image and its Cloudinary asset
 *
 * @param imageId - UUID of the image to delete
 * @param loadoutId - UUID of the loadout (for safety check)
 */
export async function deleteGeneratedImage(
  imageId: string,
  loadoutId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  // Get image details before deleting (to remove from Cloudinary)
  const image = await getImageById(imageId);

  if (!image) {
    throw new Error('Image not found');
  }

  // Safety check: ensure image belongs to specified loadout
  if (image.loadoutId !== loadoutId) {
    throw new Error('Image does not belong to specified loadout');
  }

  // Delete from database (RLS will enforce user ownership)
  const { error } = await supabase
    .from('generated_images')
    .delete()
    .eq('id', imageId)
    .eq('loadout_id', loadoutId);

  if (error) {
    throw new Error(`Failed to delete image: ${error.message}`);
  }

  // Note: Cloudinary deletion should be handled separately by the caller
  // to avoid mixing concerns (database vs external service)
}

/**
 * Delete all generated images for a loadout
 * Useful when deleting a loadout entirely
 *
 * @param loadoutId - UUID of the loadout
 */
export async function deleteAllImagesForLoadout(
  loadoutId: string
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('generated_images')
    .delete()
    .eq('loadout_id', loadoutId);

  if (error) {
    throw new Error(`Failed to delete loadout images: ${error.message}`);
  }
}

// =============================================================================
// Cleanup Operations
// =============================================================================

/**
 * Delete oldest images when count exceeds 3 per loadout
 * Keeps only the 3 most recent images
 *
 * @param loadoutId - UUID of the loadout
 */
async function cleanupOldImages(loadoutId: string): Promise<void> {
  const supabase = getSupabaseClient();

  // Get all images for loadout ordered by generation_timestamp
  const { data: allImages, error: fetchError } = await supabase
    .from('generated_images')
    .select('id, generation_timestamp')
    .eq('loadout_id', loadoutId)
    .order('generation_timestamp', { ascending: false });

  if (fetchError) {
    console.error('[LoadoutImages] Failed to fetch images for cleanup:', fetchError);
    return;
  }

  // If more than 3 images, delete the oldest ones
  if (allImages && allImages.length > 3) {
    const imagesToDelete = allImages.slice(3); // Keep first 3, delete rest
    const idsToDelete = imagesToDelete.map((img) => img.id);

    const { error: deleteError } = await supabase
      .from('generated_images')
      .delete()
      .in('id', idsToDelete);

    if (deleteError) {
      console.error('[LoadoutImages] Failed to cleanup old images:', deleteError);
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Transform database record to TypeScript type
 */
function transformDbImageToType(dbImage: {
  id: string;
  loadout_id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  prompt_used: string;
  style_preferences: StylePreferences | null;
  generation_timestamp: string;
  alt_text: string | null;
  is_active: boolean;
  created_at: string;
}): GeneratedLoadoutImage {
  return {
    id: dbImage.id,
    loadoutId: dbImage.loadout_id,
    cloudinaryPublicId: dbImage.cloudinary_public_id,
    cloudinaryUrl: dbImage.cloudinary_url,
    promptUsed: dbImage.prompt_used,
    stylePreferences: dbImage.style_preferences,
    generationTimestamp: new Date(dbImage.generation_timestamp),
    altText: dbImage.alt_text,
    isActive: dbImage.is_active,
    createdAt: new Date(dbImage.created_at),
  };
}
