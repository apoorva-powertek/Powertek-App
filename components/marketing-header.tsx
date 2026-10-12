"use client";

import Image from "next/image";
import { ArrowUpRight, LockKeyhole, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";

const navigation = [
  { href: "#services", label: "Our expertise" },
  { href: "#approach", label: "Our approach" },
  { href: "#workspace", label: "Client workspace" },
];

export function MarketingHeader({ portalSignInUrl }: { portalSignInUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <header className="site-header">
      <a className="site-home-link" href="#top" aria-label="Powertek home" onClick={() => setMenuOpen(false)}>
        <Image className="site-logo" src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority />
      </a>
      <nav className="desktop-navigation" aria-label="Main navigation">
        {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <a className="brand-button navy header-sign-in" href={portalSignInUrl}><LockKeyhole size={15} /> Client sign in <ArrowUpRight size={16} /></a>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" data-open={menuOpen}>
        {navigation.map((item, index) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}><span>0{index + 1}</span>{item.label}</a>)}
        <a className="mobile-sign-in" href={portalSignInUrl} onClick={() => setMenuOpen(false)}><LockKeyhole size={16} /> Client sign in <ArrowUpRight size={17} /></a>
      </nav>
    </header>
  );
}
