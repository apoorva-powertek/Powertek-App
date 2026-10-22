import type { SupabaseClient } from "@supabase/supabase-js";

const expiredMessage = "This reset link has expired or has already been used. Request a new reset email.";

/** Preserve recovery intent before the Auth SDK consumes URL credentials. */
export function recoveryDestination(href: string): string | null {
  const url = new URL(href);
  if (url.pathname === "/reset-password") return null;
  const hash = new URLSearchParams(url.hash.slice(1));
  const recovery = hash.get("type") === "recovery" || url.searchParams.get("type") === "recovery";
  const callbackError = hash.has("error") || url.searchParams.has("error");
  if (!recovery && !callbackError && !url.searchParams.has("code")) return null;
  return `/reset-password${url.search}${url.hash}`;
}

export async function completePasswordRecovery(createClient: () => SupabaseClient): Promise<void> {
  const url = new URL(window.location.href);
  const query = url.searchParams;
  const hash = new URLSearchParams(url.hash.slice(1));
  // Remove credentials from browser history before creating the SDK. This also
  // prevents its automatic callback handling from racing the explicit exchange.
  window.history.replaceState({}, "", "/reset-password");
  if (query.has("error") || hash.has("error") || query.has("error_description") || hash.has("error_description")) throw new Error(expiredMessage);

  const supabase = createClient();
  const tokenHash = query.get("token_hash");
  const code = query.get("code");
  const accessToken = hash.get("access_token"), refreshToken = hash.get("refresh_token");
  if (tokenHash) {
    if (query.get("type") !== "recovery") throw new Error(expiredMessage);
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (error) throw new Error(expiredMessage);
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw new Error("This reset link could not be verified in this browser. Request a fresh email and open it in the same browser.");
  } else if (accessToken || refreshToken) {
    if (!accessToken || !refreshToken || hash.get("type") !== "recovery") throw new Error(expiredMessage);
    const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (error) throw new Error(expiredMessage);
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error(expiredMessage);
}
