import { DashboardLayout } from '@/components/layouts';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
