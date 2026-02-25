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
// SSRF Protection
// =============================================================================

/** Maximum content size to prevent memory exhaustion (50MB) */
const MAX_CONTENT_SIZE = 50 * 1024 * 1024;

/**
 * SSRF protection: validate URL is not targeting internal resources
 */
function validateExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Only allow HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return 'Only HTTP/HTTPS URLs are allowed';
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost variations
    const BLOCKED_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', '::1', '[::1]'];
    if (BLOCKED_HOSTS.includes(hostname)) {
      return 'Internal URLs are not allowed';
    }

    // Block private IP ranges
    const BLOCKED_IP_PATTERNS = [
      /^10\./, // 10.0.0.0/8
      /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12
      /^192\.168\./, // 192.168.0.0/16
      /^127\./, // 127.0.0.0/8
      /^169\.254\./, // Link-local
      /^fc00:/i, // IPv6 unique local
      /^fe80:/i, // IPv6 link-local
      /^fd[0-9a-f]{2}:/i, // IPv6 unique local (fd00::/8)
    ];

    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return 'Private network URLs are not allowed';
      }
    }

    // Block cloud metadata endpoints
    const METADATA_HOSTS = [
      '169.254.169.254', // AWS/GCP/Azure metadata
      'metadata.google.internal',
      'metadata.internal',
    ];
    if (METADATA_HOSTS.includes(hostname)) {
      return 'Cloud metadata URLs are not allowed';
    }

    return null; // URL is valid
  } catch {
    return 'Invalid URL format';
  }
}

// =============================================================================
// Constants
// =============================================================================

// DeepSeek is preferred for wiki generation - fast, cost-effective, and good at structured output
const AI_WIKI_MODEL = process.env.AI_WIKI_MODEL || process.env.AI_TEXT_MODEL || 'deepseek/deepseek-v3';

// Similarity threshold for duplicate detection (0-1, higher = stricter)
const DUPLICATE_SIMILARITY_THRESHOLD = 0.4;

const WIKI_GENERATION_PROMPT = `You are an expert wiki editor for GearShack, an outdoor gear community.

Your task: EXTRACT the key insights and practical information from the source, then write an ORIGINAL wiki article in your own words. DO NOT paraphrase or summarize the source - instead, distill the knowledge and present it fresh.

IMPORTANT RULES:
1. Extract FACTS and INSIGHTS, not sentences
2. Reorganize information logically for GearShack readers
3. Add practical tips from your knowledge where relevant
4. Use GearShack's friendly, experienced hiker voice
5. Never copy phrases or sentence structures from the source
6. Focus on actionable advice outdoor enthusiasts can use

CRITICAL: Return ONLY a valid JSON object. No markdown code blocks, no explanations.

JSON structure:
{"title_en":"Concise title (3-7 words)","title_de":"German title","content_en":"Original article in markdown","content_de":"German article (natural, not translated)","suggestedCategory":"gear-guides|hiking-tips|maintenance|safety|destinations","keyTopics":["topic1","topic2","topic3"]}

Content guidelines:
- Start with a brief intro explaining why this matters
- Use ## for main sections, ### for subsections
- Include bullet points for lists and tips
- Bold **key terms** on first use
- 400-1200 words, focused and practical
- Add a "Key Takeaways" section at the end

The keyTopics array should contain 3-5 main topics/keywords for duplicate detection.

SOURCE TO EXTRACT INSIGHTS FROM:
`;

// =============================================================================
// Types
// =============================================================================

interface SimilarArticle {
  id: string;
  slug: string;
  title_en: string;
  title_de: string;
  status: string;
  similarity: number;
  matchReason: string;
}

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

/**
 * Find similar existing wiki articles based on title and keywords
 *
 * Uses multiple matching strategies:
 * 1. Trigram similarity on title (pg_trgm extension)
 * 2. Keyword/topic overlap
 * 3. Full-text search on content
 */
async function findSimilarArticles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string,
  keyTopics: string[]
): Promise<SimilarArticle[]> {
  const similarArticles: SimilarArticle[] = [];

  try {
    // Normalize title for comparison
    const normalizedTitle = title.toLowerCase().trim();
    const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 3);

    // Strategy 1: Search by title similarity using ILIKE patterns
    // Sanitize words to prevent PostgREST injection (escape commas, parens, backslashes, wildcards)
    const sanitizeForPostgREST = (word: string): string =>
      word
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/,/g, '')
        .replace(/\(/g, '')
        .replace(/\)/g, '');

    const titlePatterns = titleWords.slice(0, 3).map(word => `%${sanitizeForPostgREST(word)}%`);

    if (titlePatterns.length > 0) {
      const { data: titleMatches } = await supabase
        .from('wiki_pages')
        .select('id, slug, title_en, title_de, status')
        .or(titlePatterns.map(p => `title_en.ilike.${p}`).join(','))
        .limit(10);

      if (titleMatches) {
        for (const match of titleMatches) {
          // Calculate word overlap similarity
          const matchWords = match.title_en.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const overlap = titleWords.filter(w => matchWords.includes(w)).length;
          // Guard against division by zero when both arrays are empty
          const maxLength = Math.max(titleWords.length, matchWords.length);
          const similarity = maxLength > 0 ? overlap / maxLength : 0;

          if (similarity >= DUPLICATE_SIMILARITY_THRESHOLD) {
            similarArticles.push({
              id: match.id,
              slug: match.slug,
              title_en: match.title_en,
              title_de: match.title_de,
              status: match.status || 'draft',
              similarity: Math.round(similarity * 100) / 100,
              matchReason: `Title similarity: ${Math.round(similarity * 100)}% word overlap`,
            });
          }
        }
      }
    }

    // Strategy 2: Search by keyword/topic overlap
    if (keyTopics && keyTopics.length > 0) {
      // Sanitize topics to prevent PostgREST injection
      const topicPatterns = keyTopics.slice(0, 5).map(topic =>
        `%${sanitizeForPostgREST(topic.toLowerCase())}%`
      );

      const { data: topicMatches } = await supabase
        .from('wiki_pages')
        .select('id, slug, title_en, title_de, status, content_en')
        .or([
          ...topicPatterns.map(p => `title_en.ilike.${p}`),
          ...topicPatterns.map(p => `content_en.ilike.${p}`),
        ].join(','))
        .limit(10);

      if (topicMatches) {
        for (const match of topicMatches) {
          // Skip if already found by title
          if (similarArticles.some(a => a.id === match.id)) continue;

          // Count how many topics match
          const content = `${match.title_en} ${match.content_en}`.toLowerCase();
          const matchingTopics = keyTopics.filter(topic =>
            content.includes(topic.toLowerCase())
          );

          if (matchingTopics.length >= 2) {
            const similarity = matchingTopics.length / keyTopics.length;
            similarArticles.push({
              id: match.id,
              slug: match.slug,
              title_en: match.title_en,
              title_de: match.title_de,
              status: match.status || 'draft',
              similarity: Math.round(similarity * 100) / 100,
              matchReason: `Topic match: ${matchingTopics.join(', ')}`,
            });
          }
        }
      }
    }

    // Sort by similarity descending
    similarArticles.sort((a, b) => b.similarity - a.similarity);

    // Return top 5 matches
    return similarArticles.slice(0, 5);
  } catch (error) {
    console.error('[Wiki Generate] Error finding similar articles:', error);
    return [];
  }
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

    // SSRF protection: validate URL is not targeting internal resources
    const ssrfError = validateExternalUrl(sourceUrl);
    if (ssrfError) {
      console.warn('[Wiki Generate] SSRF protection blocked URL:', sourceUrl, ssrfError);
      return NextResponse.json(
        { error: ssrfError },
        { status: 400 }
      );
    }

    // Fetch URL content with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    let textContent: string;

    try {
      const fetchResponse = await fetch(sourceUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'GearShack Wiki Bot/1.0',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!fetchResponse.ok) {
        clearTimeout(timeout); // Clear timeout before early return
        return NextResponse.json(
          { error: `Failed to fetch URL: ${fetchResponse.status}` },
          { status: 400 }
        );
      }

      // Check Content-Length header to prevent memory exhaustion
      const contentLength = fetchResponse.headers.get('content-length');
      const parsedLength = contentLength ? parseInt(contentLength, 10) : NaN;
      if (!Number.isNaN(parsedLength) && parsedLength > MAX_CONTENT_SIZE) {
        clearTimeout(timeout); // Clear timeout before early return
        return NextResponse.json(
          { error: 'URL content too large (max 50MB)' },
          { status: 413 }
        );
      }

      const html = await fetchResponse.text();

      // Double-check size after download (Content-Length may be missing or wrong)
      if (html.length > MAX_CONTENT_SIZE) {
        clearTimeout(timeout); // Clear timeout before early return
        return NextResponse.json(
          { error: 'URL content too large (max 50MB)' },
          { status: 413 }
        );
      }

      textContent = extractTextFromHtml(html);
    } finally {
      clearTimeout(timeout);
    }

    // Limit content size (AI context limits)
    const truncatedContent = textContent.substring(0, 15000);

    // Generate wiki content using AI
    const gateway = getGateway();

    const result = await generateText({
      model: gateway(AI_WIKI_MODEL),
      prompt: WIKI_GENERATION_PROMPT + truncatedContent,
    });

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

    // Extract keyTopics for duplicate detection
    const keyTopics = Array.isArray(wikiContent.keyTopics)
      ? (wikiContent.keyTopics as string[])
      : [];

    // Find similar existing articles
    const similarArticles = await findSimilarArticles(
      supabase,
      wikiContent.title_en as string,
      keyTopics
    );

    return NextResponse.json({
      success: true,
      title_en: wikiContent.title_en,
      title_de: wikiContent.title_de,
      content_en: wikiContent.content_en,
      content_de: wikiContent.content_de,
      suggestedCategory: wikiContent.suggestedCategory || null,
      keyTopics,
      sourceSummary: truncatedContent.substring(0, 200) + '...',
      // Duplicate detection results
      similarArticles,
      hasPotentialDuplicates: similarArticles.length > 0,
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
