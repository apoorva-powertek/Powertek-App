declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    PORTAL_SETUP_CODE?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;
    PORTAL_SITE_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
  }
}
