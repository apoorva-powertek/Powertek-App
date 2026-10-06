import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Powertek | Pole Survey & Client Portal",
  description: "Pole survey data, measured photo overlays, mapped locations, and project deliverables in a secure Powertek client workspace.",
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
