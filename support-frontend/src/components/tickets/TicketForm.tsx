"use client";

import { useRef, useState } from "react";
import { TriangleAlert, Upload, X } from "lucide-react";
import { ALLOWED_CONTENT_TYPES, validateFile } from "@/lib/uploadsApi";
import { formatFileSize, formatStatus } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import {
  FormField,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/Input";
import type { Priority, TicketStatus, TicketType } from "@/types/ticket";

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
      className="space-y-5 rounded-xl border bg-surface p-6 shadow-soft"
    >
      {serverError && (
        <div className="flex items-start gap-2 rounded-lg bg-danger-soft p-3 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      <FormField
        label="Title"
        htmlFor="ticket-title"
        error={touched ? errors.title : undefined}
      >
        <Input
          id="ticket-title"
          type="text"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Short summary of the issue"
          aria-invalid={Boolean(touched && errors.title)}
        />
      </FormField>

      <FormField
        label="Description"
        htmlFor="ticket-description"
        error={touched ? errors.description : undefined}
      >
        <Textarea
          id="ticket-description"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={5}
          placeholder="Describe the problem, steps to reproduce, and expected behavior"
          aria-invalid={Boolean(touched && errors.description)}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField label="Type" htmlFor="ticket-type">
          <Select
            id="ticket-type"
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value as TicketType })
            }
          >
            {TICKET_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatStatus(t)}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Priority" htmlFor="ticket-priority">
          <Select
            id="ticket-priority"
            value={form.priority}
            onChange={(e) =>
              setForm({ ...form, priority: e.target.value as Priority })
            }
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {formatStatus(p)}
              </option>
            ))}
          </Select>
        </FormField>

        {isEdit && (
          <FormField label="Status" htmlFor="ticket-status">
            <Select
              id="ticket-status"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as TicketStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {formatStatus(s)}
                </option>
              ))}
            </Select>
          </FormField>
        )}
      </div>

      {!isEdit && (
        <p className="text-xs text-muted-foreground">
          New tickets start with a status of{" "}
          <span className="font-medium text-foreground">Pending</span>.
        </p>
      )}

      {showFilePicker && (
        <div className="space-y-1.5">
          <Label>
            Attachments{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </Label>
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ")
                fileInputRef.current?.click();
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-surface-muted/50 p-6 text-center transition-colors hover:border-primary/50 hover:bg-primary-soft/40"
          >
            <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Upload className="h-5 w-5" />
            </span>
            <p className="text-sm font-medium text-foreground">
              Click to add images or videos
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
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

          {fileError && <p className="text-sm text-danger">{fileError}</p>}

          {files.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {files.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-surface px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">{file.name}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      aria-label={`Remove ${file.name}`}
                      className="rounded p-0.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" isLoading={isSubmitting}>
          {isEdit ? "Save changes" : "Create ticket"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
