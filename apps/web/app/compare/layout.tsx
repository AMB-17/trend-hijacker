import { DashboardLayout } from '@/components/layouts';

export default function CompareRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
