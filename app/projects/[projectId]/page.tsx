import { chatGPTSignOutPath } from "@/app/chatgpt-auth";
import { requireProjectAccess } from "@/lib/portal-auth";
import { ProjectViewer } from "@/components/project-viewer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  let user;
  try { user = await requireProjectAccess(projectId); }
  catch {
    return <main className="access-shell"><section className="access-card"><p className="eyebrow">PROJECT ACCESS</p><h1>This project is not assigned to your account</h1><p>Return to your workspace or ask the administrator to update your project assignment.</p><Link className="secondary-cta" href="/">Return to projects</Link></section></main>;
  }
  return <ProjectViewer projectId={projectId} user={user} signOutPath={chatGPTSignOutPath("/")} />;
}
