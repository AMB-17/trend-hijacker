import { DashboardLayout } from '@/components/layouts';

export default function AnalyticsRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
