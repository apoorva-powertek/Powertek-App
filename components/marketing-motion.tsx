"use client";

import { useEffect } from "react";

/** Enhance the server-rendered page without hiding content when JavaScript is unavailable. */
export function MarketingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".brand-site");
    if (!root) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const precisePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const hero = root.querySelector<HTMLElement>(".site-hero");
    const targets = [...root.querySelectorAll<HTMLElement>("[data-reveal]")];
    let scrollFrame = 0;
    let pointerFrame = 0;

    const syncMotionPreference = () => {
      root.classList.toggle("motion-enabled", !reducedMotion.matches);
      if (reducedMotion.matches) {
        targets.forEach((element) => element.classList.remove("reveal-pending"));
        hero?.style.removeProperty("--pointer-x");
        hero?.style.removeProperty("--pointer-y");
      }
    };
    syncMotionPreference();
    reducedMotion.addEventListener("change", syncMotionPreference);

    const observer = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.remove("reveal-pending");
        entry.target.classList.add("is-visible");
        observer?.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -24px 0px" }) : null;

    if (observer) {
      targets.forEach((element) => {
        if (!reducedMotion.matches && element.getBoundingClientRect().top > window.innerHeight) {
          element.classList.add("reveal-pending");
        }
        observer.observe(element);
      });
    }

    const updateScroll = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        const distance = document.documentElement.scrollHeight - window.innerHeight;
        root.style.setProperty("--page-progress", String(distance > 0 ? Math.min(1, window.scrollY / distance) : 0));
      });
    };
    const updatePointer = (event: PointerEvent) => {
      if (!hero || reducedMotion.matches || !precisePointer.matches) return;
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
      pointerFrame = window.requestAnimationFrame(() => {
        pointerFrame = 0;
        const bounds = hero.getBoundingClientRect();
        hero.style.setProperty("--pointer-x", `${Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100))}%`);
        hero.style.setProperty("--pointer-y", `${Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100))}%`);
      });
    };
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll, { passive: true });
    hero?.addEventListener("pointermove", updatePointer, { passive: true });
    updateScroll();

    return () => {
      observer?.disconnect();
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(pointerFrame);
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
      hero?.removeEventListener("pointermove", updatePointer);
      reducedMotion.removeEventListener("change", syncMotionPreference);
      root.classList.remove("motion-enabled");
      targets.forEach((element) => element.classList.remove("reveal-pending"));
    };
  }, []);

  return <div className="page-progress" aria-hidden="true" />;
}
