/**
 * Force dynamic rendering for new loadout creation page.
 *
 * Rationale (Performance Optimization Phase 5 audit):
 * - Protected route requiring authentication
 * - Uses useSearchParams() for form state and navigation
 * - Kept intentionally: form pages with user context require dynamic rendering
 */
export const dynamic = 'force-dynamic';

export default function NewLoadoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
