import { DashboardLayout } from '@/components/layouts';

export default function TrendsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
