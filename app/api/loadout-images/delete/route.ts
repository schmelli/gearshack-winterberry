/**
 * API Route: Delete Generated Image
 * Feature: 048-ai-loadout-image-gen
 * DELETE /api/loadout-images/delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { deleteGeneratedImage, getImageById } from '@/lib/supabase/loadout-images';
import { deleteAIImage } from '@/lib/vercel-ai';

const DeleteRequestSchema = z.object({
  imageId: z.string().uuid(),
  loadoutId: z.string().uuid(),
});

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse JSON with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validatedData = DeleteRequestSchema.parse(body);

    const { imageId, loadoutId } = validatedData;

    // Verify loadout ownership
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loadouts table not in generated types
    const { data: loadout, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('user_id')
      .eq('id', loadoutId)
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    if (loadout.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get image details before deleting
    const image = await getImageById(imageId);

    if (image) {
      // Delete from Cloudinary (if not a fallback image)
      if (!image.cloudinaryPublicId.startsWith('fallback/')) {
        await deleteAIImage(image.cloudinaryPublicId);
      }
    }

    // Delete from database
    await deleteGeneratedImage(imageId, loadoutId, user.id);

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
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
