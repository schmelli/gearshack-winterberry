// Force dynamic rendering for privacy settings page that uses useSearchParams()
export const dynamic = 'force-dynamic';

export default function PrivacySettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
