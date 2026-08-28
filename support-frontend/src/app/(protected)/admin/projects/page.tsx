"use client";

import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProjects";
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

export default function AdminProjectsPage() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { data, isLoading, error } = useProjects();

  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProjectFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  // Non-admins should never reach here (Sidebar hides the link), but guard anyway.
  if (!authLoading && !isAdmin) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-gray-600">
        You do not have permission to view this page.
      </div>
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
    setSuccess(null);

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
        setSuccess(`Project "${form.name}" updated.`);
      } else {
        await createProject.mutateAsync(toPayload(form));
        setSuccess(`Project "${form.name}" created.`);
      }
      closeForm();
    } catch (err: unknown) {
      setFormError(errorMessage(err));
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSuccess(null);
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      setSuccess(`Project "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
    } catch (err: unknown) {
      setFormError(errorMessage(err));
      setDeleteTarget(null);
    }
  }

  const isSaving = createProject.isPending || updateProject.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-600">
            Create and manage projects. Tickets are scoped to a project.
          </p>
        </div>
        <button
          onClick={showForm ? closeForm : openCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Add Project"}
        </button>
      </div>

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-6 sm:grid-cols-2"
        >
          {formError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Project Alpha"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Jira Project Key
            </label>
            <input
              type="text"
              value={form.jira_project_key}
              onChange={(e) =>
                setForm({ ...form, jira_project_key: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="ALPHA"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Main product support channel"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Discord Webhook URL
            </label>
            <input
              type="url"
              value={form.discord_webhook_url}
              onChange={(e) =>
                setForm({ ...form, discord_webhook_url: e.target.value })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => setForm({ ...form, is_public: e.target.checked })}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Public (shown on public dashboard)
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.email_enabled}
              onChange={(e) =>
                setForm({ ...form, email_enabled: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Email notifications enabled
          </label>
          <div className="flex items-end gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving
                ? "Saving..."
                : editingId
                  ? "Save Changes"
                  : "Create Project"}
            </button>
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-lg border bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading projects...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            Failed to load projects.
          </div>
        ) : !data || data.data.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No projects yet. Add your first project.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Jira</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Visibility
                </th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">
                  Created
                </th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{project.name}</div>
                    {project.description && (
                      <div className="text-xs text-gray-500">
                        {project.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {project.jira_project_key || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        project.is_public
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
                      }
                    >
                      {project.is_public ? "Public" : "Private"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {formatDate(project.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(project)}
                      className="mr-3 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(project)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Delete project?</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will permanently delete{" "}
              <span className="font-medium">{deleteTarget.name}</span> and cascade to
              its tickets. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteProject.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProject.isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
