"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CloudUpload } from "lucide-react";
import {
  ALLOWED_CONTENT_TYPES,
  uploadFile,
  validateFile,
} from "@/lib/uploadsApi";
import { cn, formatFileSize } from "@/lib/utils";

interface FileUploadProps {
  /** The ticket to attach uploaded files to. */
  ticketId: string;
}

interface UploadItem {
  id: string;
  file: File;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const ACCEPT = ALLOWED_CONTENT_TYPES.join(",");

export function FileUpload({ ticketId }: FileUploadProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);

  function updateItem(id: string, patch: Partial<UploadItem>) {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    for (const file of files) {
      const id = `${file.name}-${Date.now()}-${Math.random()}`;
      const validationError = validateFile(file);

      if (validationError) {
        setItems((prev) => [
          ...prev,
          { id, file, progress: 0, status: "error", error: validationError },
        ]);
        continue;
      }

      setItems((prev) => [
        ...prev,
        { id, file, progress: 0, status: "uploading" },
      ]);

      try {
        await uploadFile(ticketId, file, (percent) =>
          updateItem(id, { progress: percent })
        );
        updateItem(id, { status: "done", progress: 100 });
        void queryClient.invalidateQueries({
          queryKey: ["attachments", ticketId],
        });
      } catch (err: unknown) {
        updateItem(id, {
          status: "error",
          error: err instanceof Error ? err.message : "Upload failed.",
        });
      }
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    void handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors",
          isDragging
            ? "border-primary bg-primary-soft/50"
            : "border-input bg-surface-muted/50 hover:border-primary/50 hover:bg-primary-soft/40"
        )}
      >
        <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
          <CloudUpload className="h-5 w-5" />
        </span>
        <p className="text-sm font-medium text-foreground">
          Drag & drop files here, or click to browse
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Images and videos up to 50MB (JPEG, PNG, GIF, WebP, MP4, WebM)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border bg-surface px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-foreground">
                  {item.file.name}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatFileSize(item.file.size)}
                </span>
              </div>

              {item.status === "uploading" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "done" && (
                <p className="mt-1 text-xs font-medium text-success">Uploaded</p>
              )}
              {item.status === "error" && (
                <p className="mt-1 text-xs font-medium text-danger">
                  {item.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
