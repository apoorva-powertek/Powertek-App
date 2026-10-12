// Import only from server routes. Never expose this client to browser components.
import { createClient } from "@supabase/supabase-js";
import { env } from "cloudflare:workers";

export function invitationClient() {
  const bindings = env as Record<string, unknown>;
  const key = String(bindings.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "");
  const url = String(bindings.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://goqvlgiqqrglyjgpktav.supabase.co");
  const siteUrl = String(bindings.PORTAL_SITE_URL || process.env.PORTAL_SITE_URL || "");
  if (!key || !siteUrl) throw new Error("Email invitations need SUPABASE_SERVICE_ROLE_KEY and PORTAL_SITE_URL configured on the server");
  const destination = new URL(siteUrl);
  if (destination.protocol !== "https:" && !(destination.protocol === "http:" && ["localhost", "127.0.0.1"].includes(destination.hostname))) throw new Error("PORTAL_SITE_URL must use HTTPS (or loopback for local development)");
  if (destination.username || destination.password || destination.search || destination.hash) throw new Error("PORTAL_SITE_URL must be a clean application URL");
  return { client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }), redirectTo: new URL("/invite", destination).href };
}
