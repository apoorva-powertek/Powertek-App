export async function GET() {
  return Response.json({ error: "Source backups are not configured for the Supabase portal." }, { status: 410 });
}

