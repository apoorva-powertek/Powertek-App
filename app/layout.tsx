import type { Metadata } from "next";
import "./globals.css";
import "./brand.css";
import "./refinement.css";
import "./modern.css";
import "./workspace.css";
import "./dashboard.css";
import "./project-room.css";
import "./home.css";
import "./experience.css";

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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased"><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('powertek-theme');var m=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light';document.documentElement.dataset.theme=m;document.documentElement.style.colorScheme=m}catch(e){document.documentElement.dataset.theme='light'}})()` }} />{children}</body>
    </html>
  );
}
