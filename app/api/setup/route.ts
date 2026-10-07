export async function POST() {
  return Response.json({ error: "Portal accounts are managed through confirmed Supabase Auth invitations." }, { status: 410 });
}

