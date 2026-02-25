// Force dynamic rendering for shakedown detail page that uses useSearchParams()
export const dynamic = 'force-dynamic';

export default function ShakedownDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
