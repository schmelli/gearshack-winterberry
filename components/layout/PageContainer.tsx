/**
 * PageContainer Component
 *
 * Reusable page-level container that provides consistent responsive padding
 * and max-width constraints across all pages.
 *
 * Usage:
 *   <PageContainer>...</PageContainer>                              - default width
 *   <PageContainer className="max-w-2xl">...</PageContainer>       - narrow
 *   <PageContainer className="max-w-7xl space-y-6">...</PageContainer> - wide + spacing
 */

import { cn } from '@/lib/utils';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn('container mx-auto px-4 py-8 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  );
}
