// Force dynamic rendering for new loadout page that uses useSearchParams()
export const dynamic = 'force-dynamic';

export default function NewLoadoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
