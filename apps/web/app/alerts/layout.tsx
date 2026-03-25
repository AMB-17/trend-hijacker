import { DashboardLayout } from '@/components/layouts';

export default function AlertsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
