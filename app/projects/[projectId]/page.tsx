import { ProjectPage } from "@/components/project-page";

export default async function ProjectRoute({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <ProjectPage projectId={projectId} />;
}

