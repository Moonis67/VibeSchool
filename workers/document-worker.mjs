import { createClient } from "@supabase/supabase-js";
import { AwsClient } from "aws4fetch";
import JSZip from "jszip";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";

const requiredEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const SUPABASE_URL = requiredEnv("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
const R2_ACCOUNT_ID = requiredEnv("R2_ACCOUNT_ID");
const R2_ACCESS_KEY_ID = requiredEnv("R2_ACCESS_KEY_ID");
const R2_SECRET_ACCESS_KEY = requiredEnv("R2_SECRET_ACCESS_KEY");
const R2_BUCKET_NAME = requiredEnv("R2_BUCKET_NAME");
const R2_ENDPOINT = process.env.R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PINECONE_API_KEY = requiredEnv("PINECONE_API_KEY");
const PINECONE_INDEX_HOST = requiredEnv("PINECONE_INDEX_HOST").replace(/\/$/, "");
const OPENAI_API_KEY = requiredEnv("OPENAI_API_KEY");
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS || 384);
const WORKER_POLL_MS = Number(process.env.WORKER_POLL_MS || 5000);
const MAX_CONCURRENT_JOBS = Number(process.env.MAX_CONCURRENT_JOBS || 1);

// Free-tier MVP caps: at most 40 high-quality chunks per document, and at
// most 200 active chunks per user (oldest documents get evicted to make room).
const MAX_CHUNKS_PER_DOCUMENT = 40;
const RAW_CHUNK_CEILING = 400;
const USER_ACTIVE_CHUNK_CAP = 200;

const CHUNK_SIZE = Number(process.env.DOCUMENT_CHUNK_SIZE || 1600);
const CHUNK_OVERLAP = Number(process.env.DOCUMENT_CHUNK_OVERLAP || 180);
const EMBEDDING_BATCH_SIZE = Number(process.env.EMBEDDING_BATCH_SIZE || 64);
const PINECONE_BATCH_SIZE = Number(process.env.PINECONE_BATCH_SIZE || 100);
const PINECONE_DELETE_BATCH_SIZE = 500;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const r2 = new AwsClient({
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  service: "s3",
  region: "auto",
});

const encodeR2Key = (key) => key.split("/").map(encodeURIComponent).join("/");
const buildTempR2Key = (userId, documentId, fileName) => `temp/${userId}/${documentId}/${fileName}`;
const buildUserFileKey = (userId, documentId, fileName) => `files/${userId}/${documentId}/${fileName}`;

const MIME_BY_EXTENSION = {
  pdf: "application/pdf",
  txt: "text/plain",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function mimeForFile(fileName) {
  const extension = String(fileName || "").split(".").pop()?.toLowerCase();
  return MIME_BY_EXTENSION[extension] || "application/octet-stream";
}

async function uploadToR2(r2Key, buffer, contentType) {
  const url = `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET_NAME}/${encodeR2Key(r2Key)}`;
  const response = await r2.fetch(url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: buffer,
  });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 upload failed (${response.status}): ${details || response.statusText}`);
  }
}

async function downloadFromR2(r2Key) {
  const url = `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET_NAME}/${encodeR2Key(r2Key)}`;
  const response = await r2.fetch(url, { method: "GET" });
  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`R2 download failed (${response.status}): ${details || response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const isCompressed = (response.headers.get("x-amz-meta-compression") || "").toLowerCase() === "gzip";
  return isCompressed ? gunzipSync(buffer) : buffer;
}

async function deleteFromR2(r2Key) {
  const url = `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET_NAME}/${encodeR2Key(r2Key)}`;
  const response = await r2.fetch(url, { method: "DELETE" });
  if (!response.ok && response.status !== 404) {
    const details = await response.text().catch(() => "");
    console.warn(`[worker] R2 delete failed for ${r2Key} (${response.status}): ${details || response.statusText}`);
  }
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function extractPdfPages(buffer) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
    if (text) pages.push({ pageNumber, text });
  }
  return pages;
}

async function extractDocxPages(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) throw new Error("DOCX text extraction failed.");
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
  return text ? [{ pageNumber: 1, text }] : [];
}

async function extractPages(documentRow, buffer) {
  const extension = String(documentRow.file_name || "").split(".").pop()?.toLowerCase();
  if (extension === "pdf") return extractPdfPages(buffer);
  if (extension === "txt") {
    const text = buffer.toString("utf8").replace(/\s+/g, " ").trim();
    return text ? [{ pageNumber: 1, text }] : [];
  }
  if (extension === "docx") return extractDocxPages(buffer);
  throw new Error("Unsupported file type.");
}

function chunkPageText(page) {
  const chunks = [];
  let startIndex = 0;
  while (startIndex < page.text.length) {
    let endIndex = startIndex + CHUNK_SIZE;
    if (endIndex < page.text.length) {
      const lastSpace = page.text.lastIndexOf(" ", endIndex);
      if (lastSpace > startIndex) endIndex = lastSpace;
    }
    const text = page.text.slice(startIndex, endIndex).replace(/\s+/g, " ").trim();
    if (text.length >= 20) chunks.push({ text, pageNumber: page.pageNumber });
    const nextIndex = endIndex - CHUNK_OVERLAP;
    startIndex = nextIndex <= startIndex ? endIndex : nextIndex;
    if (chunks.length >= RAW_CHUNK_CEILING) break;
  }
  return chunks;
}

const chunkPages = (pages) => pages.flatMap(chunkPageText).slice(0, RAW_CHUNK_CEILING);

function scoreChunk(text) {
  const trimmed = text.trim();
  if (trimmed.length < 40) return -1;
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return -1;
  const uniqueRatio = new Set(words).size / words.length;
  const alnumRatio = (trimmed.match(/[a-z0-9]/gi)?.length || 0) / trimmed.length;
  if (alnumRatio < 0.4) return -1;
  return trimmed.length * (0.5 + uniqueRatio) * alnumRatio;
}

// Filters noise/duplicate chunks, then evenly samples across the document so
// the selected set covers the beginning, middle, and end of a long lecture
// instead of just truncating the tail.
function selectHighQualityChunks(chunks, maxChunks) {
  const seen = new Set();
  const scored = [];
  for (const chunk of chunks) {
    const normalized = chunk.text.trim().toLowerCase().replace(/\s+/g, " ");
    if (!normalized || seen.has(normalized)) continue;
    if (scoreChunk(chunk.text) < 0) continue;
    seen.add(normalized);
    scored.push(chunk);
  }

  if (scored.length <= maxChunks) return scored;
  if (maxChunks <= 1) return scored.slice(0, maxChunks);

  const step = (scored.length - 1) / (maxChunks - 1);
  const selectedIndexes = new Set();
  for (let i = 0; i < maxChunks; i++) selectedIndexes.add(Math.round(i * step));
  return scored.filter((_, index) => selectedIndexes.has(index));
}

async function embedTexts(texts) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY) {
    try {
      console.log(`[worker] Generating embeddings using Gemini for ${texts.length} texts...`);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:batchEmbedContents?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: "models/gemini-embedding-2",
            content: {
              parts: [{ text }],
            },
            outputDimensionality: EMBEDDING_DIMENSIONS,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.embeddings && data.embeddings.length === texts.length) {
          return data.embeddings.map((item) => item.values);
        }
      }
      console.warn(`[worker] Gemini embedding failed, falling back to OpenAI. status: ${response.status}`);
    } catch (e) {
      console.warn(`[worker] Gemini embedding error, falling back to OpenAI:`, e);
    }
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: texts,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Embedding failed (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json();
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((item) => item.embedding);
}

async function upsertPineconeVectors(documentRow, chunks) {
  let vectorsUpserted = 0;
  for (let start = 0; start < chunks.length; start += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(start, start + EMBEDDING_BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((chunk) => chunk.text));
    const vectors = batch.map((chunk, offset) => {
      const chunkIndex = start + offset;
      return {
        id: `${documentRow.document_id}-${chunkIndex}`,
        values: embeddings[offset],
        metadata: {
          user_id: documentRow.user_id,
          document_id: documentRow.document_id,
          chunk_index: chunkIndex,
          page_number: chunk.pageNumber,
          text: chunk.text,
        },
      };
    });

    for (let vectorStart = 0; vectorStart < vectors.length; vectorStart += PINECONE_BATCH_SIZE) {
      const vectorBatch = vectors.slice(vectorStart, vectorStart + PINECONE_BATCH_SIZE);
      const response = await fetch(`${PINECONE_INDEX_HOST}/vectors/upsert`, {
        method: "POST",
        headers: {
          "Api-Key": PINECONE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ vectors: vectorBatch }),
      });
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        throw new Error(`Pinecone upsert failed (${response.status}): ${details || response.statusText}`);
      }
      vectorsUpserted += vectorBatch.length;
    }
  }
  return vectorsUpserted;
}

async function deletePineconeVectorsForDocument(documentId, chunkCount) {
  if (!chunkCount || chunkCount <= 0) return;
  const ids = Array.from({ length: chunkCount }, (_, index) => `${documentId}-${index}`);
  for (let start = 0; start < ids.length; start += PINECONE_DELETE_BATCH_SIZE) {
    const batch = ids.slice(start, start + PINECONE_DELETE_BATCH_SIZE);
    const response = await fetch(`${PINECONE_INDEX_HOST}/vectors/delete`, {
      method: "POST",
      headers: {
        "Api-Key": PINECONE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: batch }),
    });
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      throw new Error(`Pinecone delete failed (${response.status}): ${details || response.statusText}`);
    }
  }
}

// Evicts the user's oldest processed documents (Pinecone vectors + Supabase
// row) until there is room for `incomingChunkCount` more active chunks.
async function enforceUserChunkBudget(userId, incomingChunkCount) {
  const { data: rows, error } = await supabase
    .from("documents")
    .select("document_id, chunk_count, processed_at, user_id, file_name")
    .eq("user_id", userId)
    .eq("processing_status", "processed")
    .order("processed_at", { ascending: true });

  if (error) throw new Error(`User chunk budget check failed: ${error.message}`);

  const queue = [...(rows || [])];
  let total = queue.reduce((sum, row) => sum + Number(row.chunk_count || 0), 0);

  while (total + incomingChunkCount > USER_ACTIVE_CHUNK_CAP && queue.length) {
    const oldest = queue.shift();
    console.log(`[worker] evicting ${oldest.document_id} to stay under the ${USER_ACTIVE_CHUNK_CAP}-chunk user budget`);
    await deletePineconeVectorsForDocument(oldest.document_id, Number(oldest.chunk_count || 0));
    await deleteFromR2(buildUserFileKey(oldest.user_id, oldest.document_id, oldest.file_name));
    await supabase.from("documents").delete().eq("document_id", oldest.document_id);
    total -= Number(oldest.chunk_count || 0);
  }
}

async function claimJobs(limit) {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("processing_status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw error;
  const claimed = [];
  for (const row of data || []) {
    const { data: updated, error: updateError } = await supabase
      .from("documents")
      .update({ processing_status: "processing" })
      .eq("document_id", row.document_id)
      .eq("processing_status", "queued")
      .select("*")
      .single();
    if (!updateError && updated) claimed.push(updated);
  }
  return claimed;
}

async function processDocument(documentRow) {
  console.log(`[worker] processing ${documentRow.document_id} ${documentRow.file_name}`);
  const r2Key = buildTempR2Key(documentRow.user_id, documentRow.document_id, documentRow.file_name);
  const fileBuffer = await downloadFromR2(r2Key);
  const fileHash = hashBuffer(fileBuffer);

  const pages = await extractPages(documentRow, fileBuffer);
  const totalTextChars = pages.reduce((sum, page) => sum + page.text.length, 0);
  if (totalTextChars < 15) {
    throw new Error("This file has no extractable text. It might be scanned, image-only, empty, or password protected.");
  }

  const chunks = selectHighQualityChunks(chunkPages(pages), MAX_CHUNKS_PER_DOCUMENT);
  if (!chunks.length) throw new Error("No usable text chunks could be created from this file.");

  await enforceUserChunkBudget(documentRow.user_id, chunks.length);

  const chunksUpserted = await upsertPineconeVectors(documentRow, chunks);

  // Move the file out of temp/ into its permanent library key instead of
  // deleting it — the user can keep reusing it as a source across sessions
  // until they delete it or hit their storage cap.
  const permanentKey = buildUserFileKey(documentRow.user_id, documentRow.document_id, documentRow.file_name);
  await uploadToR2(permanentKey, fileBuffer, mimeForFile(documentRow.file_name));
  await deleteFromR2(r2Key);

  await supabase
    .from("documents")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      chunk_count: chunksUpserted,
      file_hash: fileHash,
      size_bytes: fileBuffer.length,
    })
    .eq("document_id", documentRow.document_id);

  console.log(`[worker] processed ${documentRow.document_id}: ${chunksUpserted} chunks`);
}

async function markFailed(documentRow, error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[worker] failed ${documentRow.document_id}: ${message}`);
  await supabase
    .from("documents")
    .update({ processing_status: "failed" })
    .eq("document_id", documentRow.document_id);

  const r2Key = buildTempR2Key(documentRow.user_id, documentRow.document_id, documentRow.file_name);
  await deleteFromR2(r2Key);
}

async function runForever() {
  console.log("[worker] document worker started");
  while (true) {
    const jobs = await claimJobs(MAX_CONCURRENT_JOBS);
    if (!jobs.length) {
      await sleep(WORKER_POLL_MS);
      continue;
    }

    await Promise.all(jobs.map(async (job) => {
      try {
        await processDocument(job);
      } catch (error) {
        await markFailed(job, error);
      }
    }));
  }
}

runForever().catch((error) => {
  console.error("[worker] fatal", error);
  process.exit(1);
});
