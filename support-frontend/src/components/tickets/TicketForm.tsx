"use client";

import { useRef, useState } from "react";
import { ALLOWED_CONTENT_TYPES, validateFile } from "@/lib/uploadsApi";
import { formatFileSize, formatStatus } from "@/lib/utils";
import type {
  Priority,
  TicketStatus,
  TicketType,
} from "@/types/ticket";

export interface TicketFormValues {
  title: string;
  description: string;
  type: TicketType;
  priority: Priority;
  status: TicketStatus;
}

interface TicketFormProps {
  /** Form mode. "create" hides the status field; "edit" shows it. */
  mode?: "create" | "edit";
  /** Prefill values (used in edit mode). */
  initialValues?: Partial<TicketFormValues>;
  /** Called with the validated values when the form is submitted. */
  onSubmit: (values: TicketFormValues) => Promise<void> | void;
  /**
   * Files staged for upload (create mode only). The parent uploads these
   * after the ticket is created, since attachments need a ticket id.
   */
  onFilesChange?: (files: File[]) => void;
  /** Whether a submission is in flight (disables the submit button). */
  isSubmitting?: boolean;
  /** Optional cancel handler; renders a Cancel button when provided. */
  onCancel?: () => void;
  /** Optional server error message to display at the top of the form. */
  serverError?: string | null;
}

const TICKET_TYPES: TicketType[] = [
  "technical_error",
  "bug",
  "feature",
  "remove",
];

const PRIORITIES: Priority[] = ["critical", "high", "medium", "low"];

const STATUSES: TicketStatus[] = [
  "pending",
  "in_progress",
  "paused",
  "in_review",
  "completed",
];

const DEFAULT_VALUES: TicketFormValues = {
  title: "",
  description: "",
  type: "bug",
  priority: "medium",
  status: "pending",
};

interface FieldErrors {
  title?: string;
  description?: string;
}

function validate(values: TicketFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (values.title.trim().length < 5) {
    errors.title = "Title must be at least 5 characters.";
  }
  if (values.description.trim().length < 10) {
    errors.description = "Description must be at least 10 characters.";
  }
  return errors;
}

export function TicketForm({
  mode = "create",
  initialValues,
  onSubmit,
  onFilesChange,
  isSubmitting = false,
  onCancel,
  serverError,
}: TicketFormProps) {
  const [form, setForm] = useState<TicketFormValues>({
    ...DEFAULT_VALUES,
    ...initialValues,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEdit = mode === "edit";
  const showFilePicker = !isEdit && Boolean(onFilesChange);

  function addFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setFileError(null);

    const accepted: File[] = [];
    for (const file of Array.from(fileList)) {
      const err = validateFile(file);
      if (err) {
        setFileError(`${file.name}: ${err}`);
        continue;
      }
      accepted.push(file);
    }

    const next = [...files, ...accepted];
    setFiles(next);
    onFilesChange?.(next);
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    onFilesChange?.(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);

    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    await onSubmit({
      title: form.title.trim(),
      description: form.description.trim(),
      type: form.type,
      priority: form.priority,
      status: form.status,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-lg border bg-white p-6"
    >
      {serverError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {serverError}
        </div>
      )}

      <div>
        <label
          htmlFor="ticket-title"
          className="block text-sm font-medium text-gray-700"
        >
          Title
        </label>
        <input
          id="ticket-title"
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Short summary of the issue"
          aria-invalid={Boolean(touched && errors.title)}
        />
        {touched && errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="ticket-description"
          className="block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="ticket-description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={5}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Describe the problem, steps to reproduce, and expected behavior"
          aria-invalid={Boolean(touched && errors.description)}
        />
        {touched && errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="ticket-type"
            className="block text-sm font-medium text-gray-700"
          >
            Type
          </label>
          <select
            id="ticket-type"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as TicketType })
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatStatus(t)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="ticket-priority"
            className="block text-sm font-medium text-gray-700"
          >
            Priority
          </label>
          <select
            id="ticket-priority"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as Priority })
            }
            className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {formatStatus(p)}
              </option>
            ))}
          </select>
        </div>

        {isEdit && (
          <div>
            <label
              htmlFor="ticket-status"
              className="block text-sm font-medium text-gray-700"
            >
              Status
            </label>
            <select
              id="ticket-status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TicketStatus })
              }
              className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!isEdit && (
        <p className="text-xs text-gray-500">
          New tickets start with a status of{" "}
          <span className="font-medium">Pending</span>.
        </p>
      )}

      {showFilePicker && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Attachments{" "}
            <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 text-center hover:border-gray-400"
          >
            <p className="text-sm text-gray-600">Click to add images or videos</p>
            <p className="mt-0.5 text-xs text-gray-400">
              Up to 50MB each (JPEG, PNG, GIF, WebP, MP4, WebM)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ALLOWED_CONTENT_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {fileError && (
            <p className="mt-1 text-sm text-red-600">{fileError}</p>
          )}

          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-1.5 text-sm"
                >
                  <span className="truncate text-gray-800">{file.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-gray-500">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-xs font-medium text-red-600 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Ticket"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
