import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";
import "./refinement.css";
import "./modern.css";

export const metadata: Metadata = {
  title: "Powertek Utility Services | Transmission Engineering",
  description: "Transmission line modelling, thermal rating analysis, vegetation management, and aerial inspection from Powertek Utility Services.",
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
