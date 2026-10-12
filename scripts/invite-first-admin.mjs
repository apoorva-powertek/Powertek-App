// Project-owner operation. Run deliberately after creating the admin profile.
// This script is not called during application startup or environment setup.
import { createClient } from '@supabase/supabase-js';
const email = String(process.argv[2] || '').trim().toLowerCase();
if (email === '--help') {
  console.log('Usage: node --env-file=.dev.vars scripts/invite-first-admin.mjs YOUR_ADMIN_EMAIL\nSet SUPABASE_SERVICE_ROLE_KEY and PORTAL_SITE_URL securely first. Create the matching admin profile using docs/admin-and-invitations.md.');
  process.exit(0);
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.PORTAL_SITE_URL) {
  console.error('Provide an admin email and configure SUPABASE_SERVICE_ROLE_KEY and PORTAL_SITE_URL securely. Use --help for instructions.');
  process.exit(1);
}
try {
  const site = new URL(process.env.PORTAL_SITE_URL);
  if (site.protocol !== 'https:' && !(site.protocol === 'http:' && ['localhost','127.0.0.1'].includes(site.hostname))) throw new Error('Use HTTPS or a local loopback URL');
  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://goqvlgiqqrglyjgpktav.supabase.co', process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const profile = await client.from('portal_users').select('id,role,status').ilike('email',email).maybeSingle();
  if (profile.error || !profile.data || profile.data.role !== 'admin' || profile.data.status !== 'active') throw new Error('A matching active administrator profile must exist first');
  const invitation = await client.auth.admin.inviteUserByEmail(email, { redirectTo: new URL('/invite',site).href });
  if (invitation.error) throw new Error('Invitation was not sent. Check the account status and email provider in Supabase; an existing user can sign in or reset their password');
  const tracked = await client.from('portal_users').update({ invitation_status:'sent', invited_at:new Date().toISOString() }).eq('id',profile.data.id);
  if (tracked.error) throw new Error('Invitation email was sent, but its status could not be saved. Do not resend without checking first');
  console.log('Administrator invitation email sent. Open it to choose a password, then sign in at /admin.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Could not invite administrator');
  process.exitCode = 1;
}
