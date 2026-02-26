// Force dynamic rendering for shakedown creation page that uses useSearchParams()
export const dynamic = 'force-dynamic';

export default function NewShakedownLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
