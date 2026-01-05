'use client';

/**
 * VIP Mention Component
 *
 * Feature: 051-community-bulletin-board (Enhancement)
 *
 * Renders a clickable VIP profile mention
 * Syntax: @vip:slug or [Name](/vip/slug)
 */

import { Link } from '@/i18n/navigation';
import { User } from 'lucide-react';

interface VipMentionProps {
  slug: string;
  name?: string;
}

export function VipMention({ slug, name }: VipMentionProps) {
  return (
    <Link
      href={`/vip/${slug}` as any}
      className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
    >
      <User className="h-3 w-3" />
      <span>{name || `@${slug}`}</span>
    </Link>
  );
}
