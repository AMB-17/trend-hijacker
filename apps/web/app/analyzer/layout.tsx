import { DashboardLayout } from '@/components/layouts/DashboardLayout';

export default function AnalyzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}