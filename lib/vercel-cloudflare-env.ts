// Vercel can compile the shared route modules, but it does not provide Cloudflare D1/R2 bindings.
// Supabase portal APIs work here; legacy D1/R2 paths require Cloudflare.

export const env = process.env as unknown as Cloudflare.Env;
