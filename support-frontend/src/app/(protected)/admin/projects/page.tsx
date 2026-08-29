"use client";

import { useState } from "react";
import { FolderOpen } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useProjectTicketCount,
} from "@/hooks/useProjects";
import { useToast } from "@/providers/ToastProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormField, Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDate } from "@/lib/utils";
import type { Project, ProjectCreate } from "@/types/project";

interface ProjectFormState {
  name: string;
  description: string;
  jira_project_key: string;
  discord_webhook_url: string;
  is_public: boolean;
  email_enabled: boolean;
}

const EMPTY_FORM: ProjectFormState = {
  name: "",
  description: "",
  jira_project_key: "",
  discord_webhook_url: "",
  is_public: false,
  email_enabled: true,
};

function toPayload(form: ProjectFormState): ProjectCreate {
  return {
    name: form.name.trim(),
    description: form.description.trim() || undefined,
    jira_project_key: form.jira_project_key.trim() || undefined,
    discord_webhook_url: form.discord_webhook_url.trim() || undefined,
    is_public: form.is_public,
    email_enabled: form.email_enabled,
  };
}

function errorMessage(err: unknown): string {
  return err && typeof err === "object" && "message" in err
    ? String((err as { message: unknown }).message)
    : "Something went wrong";
}

const checkboxClass =
  "h-4 w-4 rounded border-input text-primary focus:ring-ring/50";

export default function AdminProjectsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = useProjects();
  const toast = useToast();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const { data: deleteTicketCount, isLoading: countLoading } =
    useProjectTicketCount(deleteTarget?.id ?? null);

  // Non-admins should never reach here (Sidebar hides the link), but guard anyway.
  if (!authLoading && !isAdmin) {
    return (
      <EmptyState
        title="Access denied"
        description="You do not have permission to view this page."
      />
    );
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setForm({
      name: project.name,
      description: project.description ?? "",
      jira_project_key: project.jira_project_key ?? "",
      discord_webhook_url: project.discord_webhook_url ?? "",
      is_public: project.is_public,
      email_enabled: project.email_enabled,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (form.name.trim().length < 2) {
      setFormError("Name must be at least 2 characters.");
      return;
    }

    try {
      if (editingId) {
        await updateProject.mutateAsync({
          projectId: editingId,
          payload: toPayload(form),
        });
        toast.success(`Project "${form.name}" updated`);
      } else {
        await createProject.mutateAsync(toPayload(form));
        toast.success(`Project "${form.name}" created`);
      }
      closeForm();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      toast.success(`Project "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      toast.error("Delete failed", errorMessage(err));
      setDeleteTarget(null);
    }
  }

  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Projects
          </h1>
          <p className="text-sm text-muted-foreground">
            Create and manage projects. Tickets are scoped to a project.
          </p>
        </div>
        <Button
          variant={showForm ? "outline" : "primary"}
          onClick={showForm ? closeForm : openCreate}
        >
          {showForm ? "Cancel" : "Add Project"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-xl border bg-surface p-6 shadow-soft sm:grid-cols-2"
        >
          {formError && (
            <div className="rounded-lg bg-danger-soft p-3 text-sm text-danger sm:col-span-2">
              {formError}
            </div>
          )}
          <FormField label="Name">
            <Input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Project Alpha"
            />
          </FormField>
          <FormField label="Jira Project Key">
            <Input
              type="text"
              value={form.jira_project_key}
              onChange={(e) =>
                setForm({ ...form, jira_project_key: e.target.value })
              }
              placeholder="ALPHA"
            />
          </FormField>
          <FormField label="Description" className="sm:col-span-2">
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              placeholder="Main product support channel"
            />
          </FormField>
          <FormField label="Discord Webhook URL" className="sm:col-span-2">
            <Input
              type="url"
              value={form.discord_webhook_url}
              onChange={(e) =>
                setForm({ ...form, discord_webhook_url: e.target.value })
              }
              placeholder="https://discord.com/api/webhooks/..."
            />
          </FormField>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              className={checkboxClass}
            />
            Public (shown on public dashboard)
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.email_enabled}
              onChange={(e) =>
                setForm({ ...form, email_enabled: e.target.checked })
              }
              className={checkboxClass}
            />
            Email notifications enabled
          </label>
          <div className="flex items-end gap-3 sm:col-span-2">
            <Button type="submit" isLoading={isSaving}>
              {editingId ? "Save changes" : "Create project"}
            </Button>
            <Button type="button" variant="outline" onClick={closeForm}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <EmptyState
          icon={FolderOpen}
          title="Failed to load projects"
          description="Something went wrong. Please try again."
        />
      ) : !data || data.data.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Add your first project to start tracking tickets."
          action={<Button onClick={openCreate}>Add Project</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-surface shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-surface-muted">
                <tr>
                  <Th>Name</Th>
                  <Th>Jira</Th>
                  <Th>Visibility</Th>
                  <Th>Created</Th>
                  <Th align="right">Actions</Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.data.map((project) => (
                  <tr
                    key={project.id}
                    className="transition-colors hover:bg-surface-muted/60"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {project.name}
                      </div>
                      {project.description && (
                        <div className="text-xs text-muted-foreground">
                          {project.description}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {project.jira_project_key || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={project.is_public ? "success" : "neutral"}>
                        {project.is_public ? "Public" : "Private"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(project.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openEdit(project)}
                        className="mr-3 text-sm font-medium text-primary hover:text-primary-hover"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(project)}
                        className="text-sm font-medium text-danger hover:text-danger/80"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete project?"
        description={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.name}". This action cannot be undone.`
            : undefined
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              isLoading={deleteProject.isPending}
              disabled={countLoading}
            >
              {deleteTicketCount && deleteTicketCount > 0
                ? `Delete project & ${deleteTicketCount} ticket${
                    deleteTicketCount === 1 ? "" : "s"
                  }`
                : "Delete"}
            </Button>
          </>
        }
      >
        {countLoading ? (
          <p className="text-sm text-muted-foreground">
            Checking for associated tickets...
          </p>
        ) : deleteTicketCount && deleteTicketCount > 0 ? (
          <div className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
            Warning: this project has{" "}
            <span className="font-semibold">{deleteTicketCount}</span> ticket
            {deleteTicketCount === 1 ? "" : "s"} that will also be permanently
            deleted.
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            This project has no tickets.
          </p>
        )}
      </Modal>
    </div>
  );
}

function Th({
  children,
  align,
}: {
  children: React.ReactNode;
  align?: "right";
}) {
  return (
    <th
      className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}
