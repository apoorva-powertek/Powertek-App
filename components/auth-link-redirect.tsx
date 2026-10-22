"use client";
import { useEffect } from "react";
import { recoveryDestination } from "@/lib/password-recovery";

/** Older recovery emails can use the Supabase Site URL (the marketing home). */
export function AuthLinkRedirect() {
  useEffect(() => {
    const destination = recoveryDestination(window.location.href);
    if (destination) window.location.replace(destination);
  }, []);
  return null;
}
