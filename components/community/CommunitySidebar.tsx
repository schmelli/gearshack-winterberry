/**
 * CommunitySidebar Component
 *
 * Feature: Community Hub Enhancement
 *
 * Orchestrates sidebar panels:
 * - Friends Panel (requests + online friends)
 * - Wishlist Offers Panel
 * - Friend Activity Panel
 *
 * On mobile, panels are stacked with collapsible sections.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { FriendsPanel } from '@/components/community/FriendsPanel';
import { WishlistOffersPanel } from '@/components/community/WishlistOffersPanel';
import { FriendActivityPanel } from '@/components/community/FriendActivityPanel';
import type { CommunitySidebarProps } from '@/types/community';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('md:contents', className)}>
      {/* Mobile collapse header - hidden on desktop */}
      <Button
        variant="ghost"
        className="md:hidden w-full justify-between py-2 px-0 h-auto font-semibold hover:bg-transparent"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </Button>

      {/* Content - always visible on desktop, collapsible on mobile */}
      <div className={cn('md:block', isOpen ? 'block' : 'hidden')}>
        {children}
      </div>
    </div>
  );
}

export function CommunitySidebar({ className, collapsedOnMobile = true }: CommunitySidebarProps) {
  const t = useTranslations('Community');

  return (
    <aside className={cn('space-y-4', className)}>
      {collapsedOnMobile ? (
        <>
          <CollapsibleSection title={t('panels.friends.title')} defaultOpen={true}>
            <FriendsPanel compact />
          </CollapsibleSection>

          <CollapsibleSection title={t('panels.offers.title')} defaultOpen={true}>
            <WishlistOffersPanel limit={3} />
          </CollapsibleSection>

          <CollapsibleSection title={t('panels.activity.title')} defaultOpen={false}>
            <FriendActivityPanel limit={5} />
          </CollapsibleSection>
        </>
      ) : (
        <>
          <FriendsPanel />
          <WishlistOffersPanel limit={3} />
          <FriendActivityPanel limit={5} />
        </>
      )}
    </aside>
  );
}

export default CommunitySidebar;
