# Document Worker

This worker processes large uploaded study files outside Supabase Edge Functions.

Free-tier MVP model: R2 is temporary staging only. Nothing about the original
file or its full extracted text is ever persisted permanently — only a
lightweight `public.documents` row (`document_id`, `user_id`, `file_name`,
`file_hash`, `processing_status`, `chunk_count`, `created_at`, `processed_at`)
and the chunk vectors/text living in Pinecone.

Pipeline:

1. Frontend calls `create-document-upload`, which enforces a 50MB-per-user
   temp storage cap (checked by listing the user's `temp/` prefix in R2) and
   returns a presigned PUT URL for `temp/{user_id}/{document_id}/{file_name}`.
2. For files over ~3MB, the browser gzips the file client-side
   (`CompressionStream`) before the PUT and marks it with a signed
   `x-amz-meta-compression: gzip` header.
3. Frontend calls `enqueue-document-processing`.
4. This worker polls queued rows in `public.documents`, deriving the R2 key
   deterministically from `user_id` + `document_id` + `file_name` (no `r2_key`
   column is stored).
5. Worker downloads from R2 (gunzipping if the compression marker is set),
   hashes the file (SHA-256 → `file_hash`), extracts text, chunks it, and
   keeps only the top 40 highest-quality chunks (deduped, noise-filtered,
   evenly sampled across the document).
6. Before upserting, the worker evicts the user's oldest processed documents
   (Pinecone vectors + Supabase row) if needed to stay within a 200
   active-chunk budget per user.
7. Worker embeds the surviving chunks and upserts them to Pinecone.
8. Worker marks the document `processed` (storing only `chunk_count` and
   `file_hash`) or `failed`, then **deletes the R2 object either way** — the
   temp file never survives past this step.

A separate `cleanup-temp-storage` Edge Function (see
`supabase/functions/cleanup-temp-storage`) should run on a schedule (e.g.
every 15 minutes via pg_cron + pg_net) as a safety net: it deletes any
`temp/` object older than 1 hour and clears files left behind by failed or
stuck jobs.

## Required env

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT=

PINECONE_API_KEY=
PINECONE_INDEX_HOST=

OPENAI_API_KEY=
EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=384
```

`EMBEDDING_DIMENSIONS` must match your Pinecone index dimension. The current Edge functions use `gte-small`, which is commonly 384 dimensions, so `text-embedding-3-small` with `dimensions=384` is the safest migration path.

## Run

```bash
npm install
npm run worker:documents
```

Deploy this worker to Railway, Render, Fly.io, or another long-running Node host. Do not deploy it as a Supabase Edge Function.

## R2 CORS

Your R2 bucket must allow browser PUT uploads from your app origin. Example:

```json
[
  {
    "AllowedOrigins": ["http://localhost:5173", "https://your-app-domain.com"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type", "x-amz-*"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 3600
  }
]
```

For very large files, replace the single signed PUT with multipart/resumable upload. The rest of the queue/worker architecture stays the same.
