/**
 * API Route: Generate Wiki Article from URL
 *
 * Feature: Admin Section Enhancement
 *
 * POST /api/admin/wiki/generate
 *
 * Uses Vercel AI SDK to generate wiki articles from external URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { generateText } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

// =============================================================================
// Request Schema
// =============================================================================

const RequestSchema = z.object({
  sourceUrl: z.string().url('Invalid URL'),
  targetCategoryId: z.string().uuid().optional(),
});

// =============================================================================
// Constants
// =============================================================================

const AI_TEXT_MODEL = process.env.AI_TEXT_MODEL || 'anthropic/claude-3-5-sonnet-20241022';

const WIKI_GENERATION_PROMPT = `You are a professional wiki article writer for an outdoor gear and hiking community called GearShack.

Your task is to create a comprehensive, well-structured wiki article based on the source content provided.

## Requirements:
1. **Structure**: Use markdown formatting with clear headers (##), subheaders (###), and bullet points
2. **Content**: Extract key information and organize it logically for outdoor enthusiasts
3. **Tone**: Informative but approachable, like an experienced hiker sharing knowledge
4. **Practical**: Include practical tips, recommendations, and actionable advice
5. **Safety**: If relevant, include safety considerations
6. **Bilingual**: Create both English and German versions

## Output Format (IMPORTANT - Return valid JSON only):
Return a JSON object with these exact keys:
{
  "title_en": "English title (concise, 3-8 words)",
  "title_de": "German title (natural translation, not machine-translated)",
  "content_en": "Full English article in markdown",
  "content_de": "Full German article in markdown (natural German, preserve markdown formatting)",
  "suggestedCategory": "One of: gear-guides, hiking-tips, maintenance, safety, destinations"
}

## Important:
- The German version should read naturally, not like a direct translation
- Use proper markdown: headers, lists, bold for key terms, links where appropriate
- Keep articles between 300-1500 words
- Focus on value for outdoor enthusiasts
- Do NOT include any text outside the JSON object

SOURCE CONTENT:
`;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get AI Gateway instance
 */
function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY is required');
  }
  return createGateway({ apiKey });
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // Normalize whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Parse JSON from AI response (handles markdown code blocks)
 */
function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  // Try direct JSON parse first
  try {
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code block
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1].trim());
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find JSON object in text
    const objectMatch = text.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // Give up
      }
    }
  }
  return null;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin check
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse and validate request
    const body = await request.json();
    const { sourceUrl } = RequestSchema.parse(body);

    console.log('[Wiki Generate] Fetching URL:', sourceUrl);

    // Fetch URL content
    const fetchResponse = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'GearShack Wiki Bot/1.0',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!fetchResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch URL: ${fetchResponse.status}` },
        { status: 400 }
      );
    }

    const html = await fetchResponse.text();
    const textContent = extractTextFromHtml(html);

    // Limit content size (AI context limits)
    const truncatedContent = textContent.substring(0, 15000);

    console.log(
      '[Wiki Generate] Content extracted, length:',
      truncatedContent.length
    );

    // Generate wiki content using AI
    const gateway = getGateway();

    console.log('[Wiki Generate] Generating article with:', AI_TEXT_MODEL);

    const result = await generateText({
      model: gateway(AI_TEXT_MODEL),
      prompt: WIKI_GENERATION_PROMPT + truncatedContent,
    });

    console.log('[Wiki Generate] AI response received');

    // Parse JSON from response
    const wikiContent = parseJsonFromResponse(result.text);

    if (!wikiContent) {
      console.error('[Wiki Generate] Failed to parse AI response:', result.text.substring(0, 500));
      return NextResponse.json(
        { error: 'Failed to parse AI response as JSON' },
        { status: 500 }
      );
    }

    // Validate required fields
    if (
      !wikiContent.title_en ||
      !wikiContent.title_de ||
      !wikiContent.content_en ||
      !wikiContent.content_de
    ) {
      console.error('[Wiki Generate] Missing required fields in response');
      return NextResponse.json(
        { error: 'AI response missing required fields' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      title_en: wikiContent.title_en,
      title_de: wikiContent.title_de,
      content_en: wikiContent.content_en,
      content_de: wikiContent.content_de,
      suggestedCategory: wikiContent.suggestedCategory || null,
      sourceSummary: truncatedContent.substring(0, 200) + '...',
    });
  } catch (error) {
    console.error('[Wiki Generate] Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    );
  }
}
