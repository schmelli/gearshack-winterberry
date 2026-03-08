/**
 * POST /api/newsletter
 * Subscribe to the pre-launch newsletter
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email(),
  locale: z.enum(['en', 'de']).default('en'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('newsletter_subscribers')
      .upsert(
        {
          email: parsed.data.email.toLowerCase(),
          locale: parsed.data.locale,
          source: 'coming-soon',
          unsubscribed_at: null,
        },
        { onConflict: 'email' },
      );

    if (error) {
      console.error('[newsletter] Subscribe error:', error);
      return NextResponse.json(
        { success: false, error: 'Subscription failed' },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal error' },
      { status: 500 },
    );
  }
}
