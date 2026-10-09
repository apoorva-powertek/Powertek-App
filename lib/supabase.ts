import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { PortalUser } from "@/lib/portal-types";

// These are public browser credentials. RLS and confirmed Supabase Auth sessions
// enforce access; never replace the publishable key with a service-role secret.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://goqvlgiqqrglyjgpktav.supabase.co";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_gjaMRAc0d3YhjSD0ox_IfA_Fcztp7We";

let browserClient: SupabaseClient | undefined;

export function createBrowserSupabase(): SupabaseClient {
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured. Add the Supabase URL and publishable key to the Vercel project.");
  if (typeof window === "undefined") return createClient(supabaseUrl, supabaseKey);
  browserClient ??= createClient(supabaseUrl, supabaseKey);
  return browserClient;
}

export async function authenticatedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const { data } = await createBrowserSupabase().auth.getSession();
  if (!data.session) throw new PortalAuthError("Sign in to continue");
  return fetch(input, { ...init, headers: { ...(init?.headers ?? {}), authorization: `Bearer ${data.session.access_token}` } });
}

export class PortalAuthError extends Error {
  constructor(message: string, readonly status = 401) { super(message); this.name = "PortalAuthError"; }
}

export async function requirePortalUser(request: Request, admin = false): Promise<{ client: SupabaseClient; authUser: User; user: PortalUser }> {
  const token = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new PortalAuthError("Sign in to continue");
  if (!supabaseUrl || !supabaseKey) throw new Error("Supabase is not configured");
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user || !authData.user.email_confirmed_at) throw new PortalAuthError("Your sign-in session is invalid or your email is not confirmed");

  let result = await client.from("portal_users").select("id,email,display_name,role,status").eq("supabase_user_id", authData.user.id).eq("status", "active").maybeSingle();
  if (!result.data && !result.error) {
    const linked = await client.rpc("link_current_portal_user");
    if (linked.error) throw new PortalAuthError("Portal access has not been assigned to this account", 403);
    const profile = Array.isArray(linked.data) ? linked.data[0] : linked.data;
    result = { data: profile ?? null, error: null } as typeof result;
  }
  if (result.error) throw result.error;
  if (!result.data || result.data.status !== "active") throw new PortalAuthError("Portal access has not been assigned to this account", 403);
  const user: PortalUser = { id: result.data.id, authUserId: authData.user.id, email: result.data.email, displayName: result.data.display_name, role: result.data.role, status: result.data.status };
  if (admin && user.role !== "admin") throw new PortalAuthError("Administrator access required", 403);
  return { client, authUser: authData.user, user };
}

export function authErrorResponse(error: unknown): Response {
  if (error instanceof PortalAuthError) return Response.json({ error: error.message }, { status: error.status });
  console.error(error);
  return Response.json({ error: "The portal service is temporarily unavailable" }, { status: 503 });
}

