// Vercel can compile the shared route modules, but it does not provide Cloudflare D1/R2 bindings.
// This shim keeps the public site buildable; portal API calls still require the Cloudflare backend.
import type { Cloudflare } from "../cloudflare-env";

export const env = process.env as unknown as Cloudflare.Env;
