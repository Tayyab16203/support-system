import { AppShell } from "@/components/layout/AppShell";
import { AuthGuard } from "@/components/layout/AuthGuard";
import { ProjectProvider } from "@/providers/ProjectProvider";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <ProjectProvider>
        <AppShell>{children}</AppShell>
      </ProjectProvider>
    </AuthGuard>
  );
}
