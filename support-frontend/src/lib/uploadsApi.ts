/**
 * File upload API functions.
 *
 * Upload flow:
 *   1. Request a presigned PUT URL from the backend.
 *   2. PUT the file bytes directly to S3 (bypassing the API client).
 *   3. Confirm the upload so the backend persists an attachment record.
 */

import { api } from "@/lib/api";
import type { Attachment } from "@/types/ticket";

export const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
] as const;

export const MAX_FILE_SIZE = 52_428_800; // 50MB

interface PresignedUrlResponse {
  data: {
    upload_url: string;
    s3_key: string;
    expires_in: number;
  };
}

interface AttachmentResponse {
  data: Attachment;
  message: string;
}

interface AttachmentListResponse {
  data: Attachment[];
}

export function validateFile(file: File): string | null {
  if (!ALLOWED_CONTENT_TYPES.includes(file.type as never)) {
    return "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, MP4, WebM.";
  }
  if (file.size > MAX_FILE_SIZE) {
    return "File exceeds the maximum size of 50MB.";
  }
  return null;
}

export async function getPresignedUrl(
  ticketId: string,
  file: File
): Promise<PresignedUrlResponse["data"]> {
  const res = await api.post<PresignedUrlResponse>("/uploads/presigned-url", {
    ticket_id: ticketId,
    file_name: file.name,
    content_type: file.type,
    file_size: file.size,
  });
  return res.data;
}

/**
 * PUT the file directly to S3 using the presigned URL, reporting progress.
 * Uses XHR because fetch does not expose upload progress events.
 */
export function uploadToS3(
  uploadUrl: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Please try again."));
    xhr.send(file);
  });
}

export async function confirmUpload(
  ticketId: string,
  s3Key: string,
  file: File
): Promise<Attachment> {
  const res = await api.post<AttachmentResponse>("/uploads/confirm", {
    ticket_id: ticketId,
    s3_key: s3Key,
    file_name: file.name,
    content_type: file.type,
    file_size: file.size,
  });
  return res.data;
}

export async function listAttachments(ticketId: string): Promise<Attachment[]> {
  const res = await api.get<AttachmentListResponse>(`/uploads/${ticketId}`);
  return res.data;
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  return api.delete(`/uploads/${attachmentId}`);
}

/**
 * Full upload orchestration: presign, upload with progress, then confirm.
 */
export async function uploadFile(
  ticketId: string,
  file: File,
  onProgress?: (percent: number) => void
): Promise<Attachment> {
  const { upload_url, s3_key } = await getPresignedUrl(ticketId, file);
  await uploadToS3(upload_url, file, onProgress);
  return confirmUpload(ticketId, s3_key, file);
}
