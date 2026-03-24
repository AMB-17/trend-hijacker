import { DashboardLayout } from '@/components/layouts';

export default function OpportunitiesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}