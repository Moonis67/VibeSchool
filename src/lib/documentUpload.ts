// src/lib/documentUpload.ts
// Reusable direct-to-R2 document upload pipeline (signed URL -> PUT -> enqueue),
// mirrors the flow used inside the AI Tutor workspace so other surfaces (e.g.
// the dashboard's Storage & Library card) can upload without duplicating it.
import { supabase } from "@/integrations/supabase/client";

const COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024;

type DirectUploadPayload = {
  document_id: string;
  upload_url: string;
  upload_method?: string;
  upload_headers?: Record<string, string>;
  compress?: boolean;
};

const getUploadMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "txt") return "text/plain";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
};

const supportsGzipCompression = () => typeof CompressionStream !== "undefined";

const gzipBlob = async (blob: Blob): Promise<Blob> => {
  const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
  return await new Response(stream).blob();
};

const getErrorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error || ""));

const readFunctionError = async (error: { message?: string; context?: { json: () => Promise<unknown> } }) => {
  let msg = error?.message || "Request failed.";
  try {
    const body = await error.context?.json();
    if (body && typeof body === "object") {
      const record = body as Record<string, unknown>;
      if (typeof record.error === "string") msg = record.error;
      else if (typeof record.message === "string") msg = record.message;
    }
  } catch {
    // no JSON body
  }
  return msg;
};

export const safeUploadError = (message: string) => {
  if (/CREATE_UPLOAD_FUNCTION_UNREACHABLE/i.test(message)) {
    return "Could not reach the upload signer. Please try again shortly.";
  }
  if (/DIRECT_R2_UPLOAD_BLOCKED/i.test(message)) {
    return "Direct storage upload was blocked. Please try again.";
  }
  if (/ENQUEUE_FUNCTION_UNREACHABLE/i.test(message)) {
    return "Upload reached storage, but queueing failed. Please try again.";
  }
  return message || "Upload failed. Please check the file type, size, and try again.";
};

// Uploads a single file end-to-end. Never throws — resolves with the new
// document_id on success, or throws only for caller-fatal setup errors
// (missing auth session), matching how the Tutor workspace treats per-file
// failures as independent of the rest of a batch.
export async function uploadDocument(file: File, accessToken: string): Promise<string> {
  const uploadMimeType = getUploadMimeType(file);
  const wantsCompression = supportsGzipCompression() && file.size > COMPRESSION_THRESHOLD_BYTES;

  let uploadResult: Awaited<ReturnType<typeof supabase.functions.invoke<DirectUploadPayload>>>;
  try {
    uploadResult = await supabase.functions.invoke<DirectUploadPayload>("create-document-upload", {
      body: {
        file_name: file.name,
        file_size: file.size,
        file_type: uploadMimeType,
        compress: wantsCompression,
      },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (functionError: unknown) {
    const message = getErrorMessage(functionError);
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error(`CREATE_UPLOAD_FUNCTION_UNREACHABLE: ${message}`);
    }
    throw functionError;
  }

  if (uploadResult.error) throw new Error(await readFunctionError(uploadResult.error));
  const uploadData = uploadResult.data;
  if (!uploadData?.upload_url || !uploadData?.document_id) {
    throw new Error("Upload signer returned an invalid response.");
  }

  try {
    const uploadBody = uploadData.compress ? await gzipBlob(file) : file;
    const putResponse = await fetch(uploadData.upload_url, {
      method: uploadData.upload_method || "PUT",
      headers: uploadData.upload_headers || { "Content-Type": uploadMimeType },
      body: uploadBody,
    });
    if (!putResponse.ok) {
      const details = await putResponse.text().catch(() => "");
      throw new Error(`Direct storage upload failed (${putResponse.status}): ${details || putResponse.statusText}`);
    }
  } catch (storageError: unknown) {
    const message = getErrorMessage(storageError);
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error(`DIRECT_R2_UPLOAD_BLOCKED: ${message}`);
    }
    throw storageError;
  }

  try {
    const enqueueResult = await supabase.functions.invoke<{ error?: string }>("enqueue-document-processing", {
      body: { document_id: uploadData.document_id, file_name: file.name, file_size: file.size },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (enqueueResult.error) throw new Error(await readFunctionError(enqueueResult.error));
    if (enqueueResult.data?.error) throw new Error(enqueueResult.data.error);
  } catch (enqueueFunctionError: unknown) {
    const message = getErrorMessage(enqueueFunctionError);
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
      throw new Error(`ENQUEUE_FUNCTION_UNREACHABLE: ${message}`);
    }
    throw enqueueFunctionError;
  }

  return uploadData.document_id;
}

export async function deleteDocument(documentId: string, accessToken: string): Promise<void> {
  const { error } = await supabase.functions.invoke("delete-document", {
    body: { document_id: documentId },
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (error) throw new Error(await readFunctionError(error));
}
