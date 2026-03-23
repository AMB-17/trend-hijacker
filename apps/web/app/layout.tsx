import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Trend Hijacker - Detect Early Internet Demand Signals",
  description: "Identify profitable opportunities before they become mainstream by analyzing behavioral patterns in public discussions.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
