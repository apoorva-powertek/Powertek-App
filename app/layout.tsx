import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Powertek Pole Portal",
  description: "Secure pole survey imagery, attachment heights, satellite locations, and SPIDA-style profiles.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
