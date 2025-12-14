// Force dynamic rendering for inventory routes that use useSearchParams()
export const dynamic = 'force-dynamic';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
