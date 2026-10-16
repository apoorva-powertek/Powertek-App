import { requirePortalUser } from "@/lib/supabase";
import { parseAccessInput } from "@/lib/access";
import { managementErrorResponse } from "@/lib/server/management-response";
import { invitationClient } from "@/lib/server/invitations";

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalUser(request, true);
    let input;
    try { input = parseAccessInput(await request.json()); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid invitation" }, { status: 400 }); }
    // Check configuration before changing access. The caller's JWT (not the
    // privileged client) authorizes the atomic database access update.
    let mail;
    if (input.sendInvite) {
      const registered = await client.from("portal_users").select("supabase_user_id").ilike("email", input.email).maybeSingle();
      if (registered.error) throw registered.error;
      if (registered.data?.supabase_user_id) return Response.json({ error: "This person already has an account. Save their permissions, or ask them to use Forgot password." }, { status: 409 });
    }
    if (input.sendInvite) {
      try { mail = invitationClient(); }
      catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invitation service is not configured" }, { status: 503 }); }
    }
    const saved = await client.rpc("manage_portal_user", {
      p_email: input.email, p_display_name: input.displayName, p_role: input.role,
      p_manage_clients: input.manageClients, p_assignments: input.assignments, p_status: input.status,
    });
    if (saved.error) throw saved.error;
    const id = String(saved.data);
    if (mail) {
      const invitation = await mail.client.auth.admin.inviteUserByEmail(input.email, { redirectTo: mail.redirectTo, data: { display_name: input.displayName } });
      if (invitation.error) {
        const marked = await client.from("portal_users").update({ invitation_status: "failed" }).eq("id", id);
        if (marked.error) console.error("Could not record failed invitation status");
        return Response.json({ error: "Access was saved, but the email invitation was not sent. Check the email provider and account status in Supabase; existing accounts should sign in or use Forgot password.", accessSaved: true }, { status: 502 });
      }
      const marked = await client.from("portal_users").update({ invitation_status: "sent", invited_at: new Date().toISOString() }).eq("id", id);
      if (marked.error) return Response.json({ error: "Invitation email sent, but its delivery status could not be saved. Refresh before retrying.", accessSaved: true, invitationSent: true }, { status: 502 });
    }
    return Response.json({ id, email: input.email, invitationSent: Boolean(mail) }, { status: 200 });
  } catch (error) { return managementErrorResponse(error, "user"); }
}
