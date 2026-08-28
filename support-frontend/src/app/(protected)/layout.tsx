import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
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
        <div className="min-h-screen bg-gray-50">
          <Sidebar />
          <div className="lg:pl-64">
            <Navbar />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </ProjectProvider>
    </AuthGuard>
  );
}
