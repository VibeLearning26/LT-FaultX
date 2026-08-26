import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LT-FaultX — Smart LT Line Fault Platform",
  description:
    "Distributed LT electrical line fault detection, localization, isolation and public monitoring.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
