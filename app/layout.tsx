import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Powertek Utility Services | Transmission Engineering",
  description: "Transmission line modelling, thermal rating analysis, vegetation management, and aerial inspection from Powertek Utility Services.",
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('powertek-theme');document.documentElement.dataset.theme=t==='dark'?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()` }} />{children}</body>
    </html>
  );
}
