/**
 * API Route: Delete Generated Image
 * Feature: 048-ai-loadout-image-gen
 * DELETE /api/loadout-images/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteGeneratedImage, getImageById } from '@/lib/supabase/loadout-images';
import { deleteAIImage } from '@/lib/cloudinary-ai';

const DeleteRequestSchema = z.object({
  imageId: z.string().uuid(),
  loadoutId: z.string().uuid(),
  userId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = DeleteRequestSchema.parse(body);

    const { imageId, loadoutId } = validatedData;

    console.log('[API] Deleting image:', imageId, 'from loadout:', loadoutId);

    // Get image details before deleting
    const image = await getImageById(imageId);

    if (image) {
      // Delete from Cloudinary (if not a fallback image)
      if (!image.cloudinaryPublicId.startsWith('fallback/')) {
        await deleteAIImage(image.cloudinaryPublicId);
      }
    }

    // Delete from database
    await deleteGeneratedImage(imageId, loadoutId);

    return NextResponse.json(
      {
        success: true,
        message: 'Image deleted',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('[API] Delete image failed:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete image' },
      { status: 500 }
    );
  }
}
