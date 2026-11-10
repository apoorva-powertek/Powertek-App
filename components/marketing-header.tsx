"use client";

import { ThemeControl } from "@/components/theme-control";
import Image from "next/image";
import { ArrowUpRight, LockKeyhole, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { href: "#services", label: "Our expertise" },
  { href: "#approach", label: "Our approach" },
  { href: "#workspace", label: "Client workspace" },
  { href: "#contact", label: "Contact" },
];

export function MarketingHeader({ portalSignInUrl }: { portalSignInUrl: string }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [ready,setReady]=useState(false);
  const toggle=useRef<HTMLButtonElement>(null);
  const open=useRef(false);
  useEffect(()=>{open.current=menuOpen;},[menuOpen]);

  useEffect(() => {
    const timer=window.setTimeout(()=>setReady(true),0);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open.current) {setMenuOpen(false);toggle.current?.focus();}
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {window.clearTimeout(timer);window.removeEventListener("keydown", closeOnEscape);};
  }, []);

  return (
    <header className="site-header">
      <a className="site-home-link" href="#top" aria-label="Powertek home" onClick={() => setMenuOpen(false)}>
        <Image className="site-logo" src="/powertek-logo.svg" alt="Powertek Utility Services" width={362} height={108} priority />
      </a>
      <nav className="desktop-navigation" aria-label="Main navigation">
        {navigation.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
      </nav>
      <ThemeControl />
      <a className="brand-button navy header-sign-in" href={portalSignInUrl}><LockKeyhole size={15} /> Client sign in <ArrowUpRight size={16} /></a>
      <button
        className="mobile-menu-toggle"
        ref={toggle}
        disabled={!ready}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-navigation"
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation" data-open={menuOpen}>
        {navigation.map((item) => <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</a>)}
        <a className="mobile-sign-in" href={portalSignInUrl} onClick={() => setMenuOpen(false)}><LockKeyhole size={16} /> Client sign in <ArrowUpRight size={17} /></a>
      </nav>
    </header>
  );
}
