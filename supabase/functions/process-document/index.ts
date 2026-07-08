// supabase/functions/process-document/index.ts
// Synchronous ingestion path: receives the file directly, stages it in R2
// only for the duration of extraction + embedding, then deletes it. No
// original file or full extracted text is ever persisted in Supabase.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2";
import JSZip from "https://esm.sh/jszip@3.10.1";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";
import { buildTempR2Key, deleteR2Object, getR2UserTempUsageBytes, requiredEnv } from "../_shared/r2.ts";
import { enforceUserChunkBudget, selectHighQualityChunks } from "../_shared/pinecone.ts";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.20";

const TEMP_STORAGE_CAP_BYTES = 50 * 1024 * 1024;
const MAX_CHUNKS_PER_DOCUMENT = 40;
const PINECONE_BATCH_SIZE = 50;
const MAX_REQUEST_BYTES = 55 * 1024 * 1024;
const UPLOAD_RATE_LIMIT = 10;
const UPLOAD_RATE_WINDOW_MS = 60 * 60 * 1000;
const ALLOWED_FILE_TYPES: Record<string, Set<string>> = {
  pdf: new Set(["application/pdf"]),
  txt: new Set(["text/plain"]),
  docx: new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
};
const uploadRateBuckets = new Map<string, number[]>();

type ExtractedPage = {
  pageNumber: number;
  text: string;
};

type TextChunk = {
  text: string;
  pageNumber: number;
};

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function bytesToMb(bytes: number) {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function sanitizeFileName(name: string) {
  const trimmed = name.split(/[\\/]/).pop() || "upload";
  const safe = trimmed
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
  return safe || "upload";
}

function getFileExtension(name: string) {
  return sanitizeFileName(name).split(".").pop()?.toLowerCase() || "";
}

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const recent = (uploadRateBuckets.get(userId) || []).filter((timestamp) => now - timestamp < UPLOAD_RATE_WINDOW_MS);
  if (recent.length >= UPLOAD_RATE_LIMIT) return false;
  recent.push(now);
  uploadRateBuckets.set(userId, recent);
  return true;
}

async function validateFileType(file: File) {
  const extension = getFileExtension(file.name);
  const allowedMimeTypes = ALLOWED_FILE_TYPES[extension];
  const mimeType = (file.type || "").toLowerCase();

  if (!allowedMimeTypes || !allowedMimeTypes.has(mimeType)) {
    return false;
  }

  const header = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  if (extension === "pdf") {
    return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  }
  if (extension === "docx") {
    return header[0] === 0x50 && header[1] === 0x4b;
  }
  if (extension === "txt") {
    return !header.some((byte) => byte === 0);
  }
  return false;
}

function encodeR2Key(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

async function uploadToR2Temp(file: File, r2Key: string) {
  const accountId = requiredEnv("R2_ACCOUNT_ID");
  const accessKeyId = requiredEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requiredEnv("R2_BUCKET_NAME");
  const endpoint = (Deno.env.get("R2_ENDPOINT") || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/$/, "");
  const aws = new AwsClient({ accessKeyId, secretAccessKey, service: "s3", region: "auto" });

  const url = `${endpoint}/${bucket}/${encodeR2Key(r2Key)}`;
  const response = await aws.fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
      "Content-Length": String(file.size),
    },
    body: file,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}): ${details || response.statusText}`);
  }
}

async function hashFile(arrayBuffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function extractPages(file: File): Promise<ExtractedPage[]> {
  const type = file.type || "";
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (type.includes("pdf") || extension === "pdf") {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const { getDocument } = await resolvePDFJS();
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    const pages: ExtractedPage[] = [];

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      pages.push({ pageNumber: i, text: pageText.replace(/\s+/g, " ").trim() });
    }

    return pages;
  }

  if (type.startsWith("text/") || extension === "txt") {
    return [{ pageNumber: 1, text: (await file.text()).replace(/\s+/g, " ").trim() }];
  }

  if (extension === "docx") {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const documentXml = await zip.file("word/document.xml")?.async("string");
    if (!documentXml) {
      throw new Error("DOCX text extraction failed.");
    }

    const text = documentXml
      .replace(/<w:tab\/>/g, " ")
      .replace(/<\/w:p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, "\"")
      .replace(/&apos;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    return [{ pageNumber: 1, text }];
  }

  throw new Error("Unsupported file type.");
}

function chunkPageText(page: ExtractedPage, chunkSize = 1400, overlap = 180): TextChunk[] {
  const chunks: TextChunk[] = [];
  const text = page.text;
  if (!text) return chunks;

  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;

    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }

    const chunk = text.substring(startIndex, endIndex).replace(/\s+/g, " ").trim();
    if (chunk.length >= 20) {
      chunks.push({ text: chunk, pageNumber: page.pageNumber });
    }

    const nextIndex = endIndex - overlap;
    startIndex = nextIndex <= startIndex ? endIndex : nextIndex;
  }

  return chunks;
}

function chunkPages(pages: ExtractedPage[]) {
  return pages.flatMap((page) => chunkPageText(page));
}

async function generateEmbedding(text: string) {
  // @ts-ignore Supabase Edge Runtime provides this AI session API.
  const session = new Supabase.ai.Session("gte-small");
  const embedding = await session.run(text, { mean_pool: true, normalize: true });
  return Array.from(embedding as Iterable<number>);
}

async function upsertPineconeVectors(params: {
  userId: string;
  documentId: string;
  chunks: TextChunk[];
}) {
  const apiKey = requiredEnv("PINECONE_API_KEY");
  const indexHost = requiredEnv("PINECONE_INDEX_HOST").replace(/\/$/, "");
  let vectorsUpserted = 0;

  for (let start = 0; start < params.chunks.length; start += PINECONE_BATCH_SIZE) {
    const batch = params.chunks.slice(start, start + PINECONE_BATCH_SIZE);
    const vectors = [];

    for (let offset = 0; offset < batch.length; offset++) {
      const chunkIndex = start + offset;
      const chunk = batch[offset];
      const embedding = await generateEmbedding(chunk.text);
      if (!embedding.length) continue;

      vectors.push({
        id: `${params.documentId}-${chunkIndex}`,
        values: embedding,
        metadata: {
          user_id: params.userId,
          document_id: params.documentId,
          chunk_index: chunkIndex,
          page_number: chunk.pageNumber,
          text: chunk.text,
        },
      });
    }

    if (!vectors.length) continue;

    const response = await fetch(`${indexHost}/vectors/upsert`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vectors }),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Pinecone upsert failed (${response.status}): ${details || response.statusText}`);
    }

    vectorsUpserted += vectors.length;
  }

  return vectorsUpserted;
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return jsonResponse(req, { error: safeErrorMessage(405) }, 405);
  }

  let documentId: string | null = null;
  let r2Key: string | null = null;
  let supabase: ReturnType<typeof createClient> | null = null;

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    supabase = createClient(supabaseUrl, supabaseServiceKey);

    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > MAX_REQUEST_BYTES) {
      return jsonResponse(req, { error: safeErrorMessage(413) }, 413);
    }

    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return jsonResponse(req, { error: "Missing file upload." }, 400);
    }

    const userId = userData.user.id;
    const safeFileName = sanitizeFileName(file.name);

    if (!enforceRateLimit(userId)) {
      return jsonResponse(req, { error: safeErrorMessage(429) }, 429);
    }

    if (!(await validateFileType(file))) {
      return jsonResponse(req, { error: "Unsupported file type. Upload PDF, TXT, or DOCX files only." }, 415);
    }

    const currentUsage = await getR2UserTempUsageBytes(userId);
    if (currentUsage + file.size > TEMP_STORAGE_CAP_BYTES) {
      const remainingMb = bytesToMb(Math.max(0, TEMP_STORAGE_CAP_BYTES - currentUsage));
      return jsonResponse(
        req,
        { error: `Temporary storage limit reached. You have ${remainingMb} MB remaining, and this file is ${bytesToMb(file.size)} MB.` },
        413,
      );
    }

    documentId = crypto.randomUUID();
    r2Key = buildTempR2Key(userId, documentId, safeFileName);

    const { error: insertError } = await supabase.from("documents").insert({
      document_id: documentId,
      user_id: userId,
      file_name: safeFileName,
      processing_status: "processing",
    });
    if (insertError) throw new Error(`Document metadata insert failed: ${insertError.message}`);

    await uploadToR2Temp(file, r2Key);

    const fileHash = await hashFile(await file.arrayBuffer());
    const pages = await extractPages(file);
    const totalTextChars = pages.reduce((sum, page) => sum + page.text.length, 0);
    if (totalTextChars < 15) {
      throw new Error("This file has no extractable text. It might be scanned, image-only, empty, or password protected.");
    }

    const chunks = selectHighQualityChunks(chunkPages(pages), MAX_CHUNKS_PER_DOCUMENT);
    if (!chunks.length) {
      throw new Error("No usable text chunks could be created from this file.");
    }

    await enforceUserChunkBudget(supabase, userId, chunks.length);

    const chunksUpserted = await upsertPineconeVectors({ userId, documentId, chunks });

    await supabase
      .from("documents")
      .update({
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        chunk_count: chunksUpserted,
        file_hash: fileHash,
      })
      .eq("document_id", documentId)
      .eq("user_id", userId);

    await deleteR2Object(r2Key);

    return jsonResponse(
      req,
      {
        success: true,
        document_id: documentId,
        material_id: documentId,
        chunk_count: chunksUpserted,
        pages: pages.length,
      },
      200,
    );
  } catch (error: any) {
    console.error(`[process-document] ${error?.message || "failed"}`);

    if (supabase && documentId) {
      try {
        await supabase
          .from("documents")
          .update({ processing_status: "failed" })
          .eq("document_id", documentId);
      } catch (_) {
        // Preserve the original processing error for the client.
      }
    }

    if (r2Key) {
      try {
        await deleteR2Object(r2Key);
      } catch (_) {
        // The cleanup job sweeps anything left behind.
      }
    }

    return jsonResponse(req, { error: error?.message || safeErrorMessage(500) }, 500);
  }
});
