// supabase/functions/_shared/pinecone.ts
// Pinecone is the only place chunk text + embeddings live. Vector ids are
// deterministic: `${document_id}-${chunkIndex}` for chunkIndex in [0, chunk_count).

import { requiredEnv } from "./r2.ts";

const DELETE_BATCH_SIZE = 500;
type SupabaseLikeClient = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: unknown) => {
        eq: (column: string, value: unknown) => {
          order: (column: string, options: { ascending: boolean }) => Promise<{
            data: Array<{ document_id: string; chunk_count?: number; processed_at?: string }>;
            error: { message: string } | null;
          }>;
        };
      };
    };
    delete: () => {
      eq: (column: string, value: unknown) => Promise<unknown>;
    };
  };
};

export async function deletePineconeVectorsForDocument(documentId: string, chunkCount: number) {
  if (!chunkCount || chunkCount <= 0) return;
  const apiKey = requiredEnv("PINECONE_API_KEY");
  const indexHost = requiredEnv("PINECONE_INDEX_HOST").replace(/\/$/, "");
  const ids = Array.from({ length: chunkCount }, (_, index) => `${documentId}-${index}`);

  for (let start = 0; start < ids.length; start += DELETE_BATCH_SIZE) {
    const batch = ids.slice(start, start + DELETE_BATCH_SIZE);
    const response = await fetch(`${indexHost}/vectors/delete`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
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

const USER_ACTIVE_CHUNK_CAP = 200;

// Evicts the user's oldest processed documents (Pinecone vectors + Supabase row)
// until there is room for `incomingChunkCount` more active chunks.
export async function enforceUserChunkBudget(
  supabase: SupabaseLikeClient,
  userId: string,
  incomingChunkCount: number,
) {
  const { data: rows, error } = await supabase
    .from("documents")
    .select("document_id, chunk_count, processed_at")
    .eq("user_id", userId)
    .eq("processing_status", "processed")
    .order("processed_at", { ascending: true });

  if (error) throw new Error(`User chunk budget check failed: ${error.message}`);

  const queue = [...(rows || [])];
  let total = queue.reduce((sum, row) => sum + Number(row.chunk_count || 0), 0);

  while (total + incomingChunkCount > USER_ACTIVE_CHUNK_CAP && queue.length) {
    const oldest = queue.shift();
    await deletePineconeVectorsForDocument(oldest.document_id, Number(oldest.chunk_count || 0));
    await supabase.from("documents").delete().eq("document_id", oldest.document_id);
    total -= Number(oldest.chunk_count || 0);
  }
}

type Chunk = { text: string; pageNumber: number };

function scoreChunk(text: string) {
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
// the selected set covers the beginning, middle, and end rather than just
// the first N characters.
export function selectHighQualityChunks<T extends Chunk>(chunks: T[], maxChunks: number): T[] {
  const seen = new Set<string>();
  const scored: T[] = [];
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
  const selectedIndexes = new Set<number>();
  for (let i = 0; i < maxChunks; i++) {
    selectedIndexes.add(Math.round(i * step));
  }
  return scored.filter((_, index) => selectedIndexes.has(index));
}
