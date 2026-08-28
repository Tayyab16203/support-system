"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ALLOWED_CONTENT_TYPES,
  uploadFile,
  validateFile,
} from "@/lib/uploadsApi";
import { formatFileSize } from "@/lib/utils";

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
        className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400"
        }`}
      >
        <p className="text-sm font-medium text-gray-700">
          Drag & drop files here, or click to browse
        </p>
        <p className="mt-1 text-xs text-gray-500">
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
              className="rounded-lg border bg-white px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-gray-800">{item.file.name}</span>
                <span className="shrink-0 text-xs text-gray-500">
                  {formatFileSize(item.file.size)}
                </span>
              </div>

              {item.status === "uploading" && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}
              {item.status === "done" && (
                <p className="mt-1 text-xs font-medium text-green-600">
                  Uploaded
                </p>
              )}
              {item.status === "error" && (
                <p className="mt-1 text-xs font-medium text-red-600">
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
