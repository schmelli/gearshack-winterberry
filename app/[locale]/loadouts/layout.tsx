/**
 * Force dynamic rendering for loadouts routes.
 *
 * Rationale (Performance Optimization Phase 5 audit):
 * - Protected route requiring authentication (user-specific content)
 * - Uses useSearchParams() for loadout filtering and detail views
 * - User's loadout data varies per user, cannot be statically generated
 * - Kept intentionally: ISR/static generation not suitable for authenticated routes
 */
export const dynamic = 'force-dynamic';

export default function LoadoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
