// Force dynamic rendering for loadouts routes that use useSearchParams()
export const dynamic = 'force-dynamic';

export default function LoadoutsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
