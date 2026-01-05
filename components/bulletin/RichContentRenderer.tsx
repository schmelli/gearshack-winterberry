'use client';

/**
 * Rich Content Renderer Component
 *
 * Feature: 051-community-bulletin-board (Enhancement)
 *
 * Renders bulletin post content with support for:
 * - Markdown formatting (bold, italic, links)
 * - YouTube link previews
 * - VIP profile deeplinking via @vip:slug syntax
 * - Gear item references via #gear:item-id syntax
 */

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { YouTubePreview } from './YouTubePreview';
import { VipMention } from './VipMention';
import { GearItemReference } from './GearItemReference';

interface RichContentRendererProps {
  content: string;
  className?: string;
}

/**
 * Extract YouTube video ID from various YouTube URL formats
 */
function extractYouTubeId(url: string): string | null {
  // Handle youtu.be/VIDEO_ID
  const youtubeShortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (youtubeShortMatch) return youtubeShortMatch[1];

  // Handle youtube.com/watch?v=VIDEO_ID
  const youtubeLongMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (youtubeLongMatch) return youtubeLongMatch[1];

  // Handle youtube.com/embed/VIDEO_ID
  const youtubeEmbedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (youtubeEmbedMatch) return youtubeEmbedMatch[1];

  return null;
}

/**
 * Parse content to extract special entities (YouTube URLs, VIP mentions, gear items)
 */
interface ParsedContent {
  type: 'text' | 'youtube' | 'vip-mention' | 'gear-item';
  content: string;
  metadata?: {
    videoId?: string;
    vipSlug?: string;
    vipName?: string;
    gearId?: string;
    gearName?: string;
  };
}

/**
 * Process markdown-style links to detect VIP profiles and gear items
 * [Name](/vip/slug) -> VIP profile link
 * [Name](#gear:id) -> Gear item reference
 */
function processSpecialLinks(text: string): string {
  // Convert VIP profile links to special markers that we can detect
  text = text.replace(/\[([^\]]+)\]\(\/vip\/([a-z0-9-]+)\)/g, '{{VIP:$2:$1}}');

  // Convert gear item references to special markers
  text = text.replace(/\[([^\]]+)\]\(#gear:([a-z0-9-]+)\)/g, '{{GEAR:$2:$1}}');

  return text;
}

function parseContent(content: string): ParsedContent[] {
  const segments: ParsedContent[] = [];
  let currentText = '';

  // First, process special link syntax
  const processedContent = processSpecialLinks(content);

  // Split by lines for better YouTube URL detection
  const lines = processedContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check if line is a YouTube URL (standalone)
    const youtubeId = extractYouTubeId(line);
    if (youtubeId && line.startsWith('http')) {
      // Push accumulated text
      if (currentText) {
        segments.push({ type: 'text', content: currentText });
        currentText = '';
      }
      // Add YouTube preview
      segments.push({
        type: 'youtube',
        content: line,
        metadata: { videoId: youtubeId },
      });
    } else {
      // Add line to current text (with newline if not first line)
      currentText += (currentText ? '\n' : '') + lines[i];
    }
  }

  // Push remaining text
  if (currentText) {
    segments.push({ type: 'text', content: currentText });
  }

  return segments;
}

export function RichContentRenderer({ content, className }: RichContentRendererProps) {
  const parsedSegments = useMemo(() => parseContent(content), [content]);

  return (
    <div className={className}>
      {parsedSegments.map((segment, index) => {
        if (segment.type === 'youtube' && segment.metadata?.videoId) {
          return (
            <div key={index} className="my-3">
              <YouTubePreview videoId={segment.metadata.videoId} url={segment.content} />
            </div>
          );
        }

        if (segment.type === 'text') {
          // Split text by special markers and render accordingly
          const parts = segment.content.split(/({{(?:VIP|GEAR):[^}]+}})/g);

          return (
            <div key={index}>
              {parts.map((part, partIndex) => {
                // Check for VIP mention marker
                const vipMatch = part.match(/{{VIP:([^:]+):([^}]+)}}/);
                if (vipMatch) {
                  const [, slug, name] = vipMatch;
                  return <VipMention key={partIndex} slug={slug} name={name} />;
                }

                // Check for gear item marker
                const gearMatch = part.match(/{{GEAR:([^:]+):([^}]+)}}/);
                if (gearMatch) {
                  const [, itemId, name] = gearMatch;
                  return <GearItemReference key={partIndex} itemId={itemId} name={name} />;
                }

                // Regular markdown text
                return (
                  <div key={partIndex} className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        // Customize link rendering to open in new tab
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-primary hover:underline"
                            target={props.href?.startsWith('http') ? '_blank' : undefined}
                            rel={props.href?.startsWith('http') ? 'noopener noreferrer' : undefined}
                          />
                        ),
                        // Customize paragraph spacing
                        p: ({ node, ...props }) => <p {...props} className="mb-2 last:mb-0" />,
                      }}
                    >
                      {part}
                    </ReactMarkdown>
                  </div>
                );
              })}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
