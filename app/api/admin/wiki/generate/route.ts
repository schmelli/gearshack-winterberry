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

// DeepSeek is preferred for wiki generation - fast, cost-effective, and good at structured output
const AI_WIKI_MODEL = process.env.AI_WIKI_MODEL || process.env.AI_TEXT_MODEL || 'deepseek/deepseek-v3';

const WIKI_GENERATION_PROMPT = `You are a wiki article writer for GearShack, an outdoor gear community.

Create a bilingual wiki article (English and German) based on the source content below.

CRITICAL: Return ONLY a valid JSON object. No markdown code blocks, no explanations, no text before or after.

Required JSON structure:
{"title_en":"English title","title_de":"German title","content_en":"English article in markdown","content_de":"German article in markdown","suggestedCategory":"gear-guides|hiking-tips|maintenance|safety|destinations"}

Guidelines:
- Use markdown in content fields (##, ###, bullets, **bold**)
- German should be natural, not machine-translated
- Articles: 300-1500 words, practical tips, safety info if relevant
- Escape quotes inside strings with backslash

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
 * Parse JSON from AI response (handles markdown code blocks and various formats)
 *
 * DeepSeek and other models may return JSON in various formats:
 * 1. Raw JSON object
 * 2. JSON wrapped in ```json ... ``` code blocks
 * 3. JSON with preamble/postamble text
 * 4. JSON with unescaped newlines in strings
 */
function parseJsonFromResponse(text: string): Record<string, unknown> | null {
  // Clean the text
  const cleanedText = text.trim();

  // Try direct JSON parse first
  try {
    return JSON.parse(cleanedText);
  } catch {
    // Continue to extraction methods
  }

  // Try to extract JSON from markdown code block (```json ... ``` or ``` ... ```)
  const codeBlockMatch = cleanedText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch {
      // Continue to next attempt
    }
  }

  // Try to find the outermost JSON object - find first { and last }
  const firstBrace = cleanedText.indexOf('{');
  const lastBrace = cleanedText.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleanedText.substring(firstBrace, lastBrace + 1);

    // Try direct parse
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      // Try to fix common issues
    }

    // Fix unescaped newlines within strings (common AI issue)
    // This regex finds strings and replaces unescaped newlines with \n
    try {
      const fixedJson = jsonCandidate
        .replace(/:\s*"([^"]*?)(?<!\\)"/g, (match, content) => {
          // Replace actual newlines with escaped newlines
          const fixed = content
            .replace(/\r?\n/g, '\\n')
            .replace(/\t/g, '\\t');
          return `: "${fixed}"`;
        });
      return JSON.parse(fixedJson);
    } catch {
      // Continue
    }

    // Try removing control characters
    try {
      const sanitized = jsonCandidate
        .replace(/[\x00-\x1F\x7F]/g, (char) => {
          if (char === '\n') return '\\n';
          if (char === '\r') return '';
          if (char === '\t') return '\\t';
          return '';
        });
      return JSON.parse(sanitized);
    } catch {
      // Give up
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

    console.log('[Wiki Generate] Generating article with:', AI_WIKI_MODEL);

    const result = await generateText({
      model: gateway(AI_WIKI_MODEL),
      prompt: WIKI_GENERATION_PROMPT + truncatedContent,
    });

    console.log('[Wiki Generate] AI response received, length:', result.text.length);
    console.log('[Wiki Generate] Response preview:', result.text.substring(0, 300));

    // Parse JSON from response
    const wikiContent = parseJsonFromResponse(result.text);

    if (!wikiContent) {
      console.error('[Wiki Generate] Failed to parse AI response as JSON');
      console.error('[Wiki Generate] Full response:', result.text);
      return NextResponse.json(
        {
          error: 'Failed to parse AI response as JSON',
          debug: {
            model: AI_WIKI_MODEL,
            responseLength: result.text.length,
            responsePreview: result.text.substring(0, 500),
          },
        },
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
