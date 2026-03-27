import { DashboardLayout } from '@/components/layouts';

export default function EarlySignalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
