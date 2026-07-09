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

---

# TTS Worker (`tts-server.mjs`)

A second, independent long-running service — deploy it as its **own Railway
service**, separate from the document worker above. It wraps Microsoft
Edge's free "Read Aloud" neural TTS via the `msedge-tts` npm package and
exposes it as a plain HTTP API. This replaced Deepgram entirely; nothing in
this app calls Deepgram anymore.

It is not meant to be reachable from the browser. The Supabase `edge-tts`
Edge Function (`supabase/functions/edge-tts/index.ts`) is the only intended
caller — it authenticates the user, rate-limits, then forwards the request
here with a shared secret.

## Railway deploy — one shared start command, dispatched by an env var

Both this service and the document worker are started the exact same way:
`railway.json`'s `startCommand` is `node workers/start.mjs`, a tiny
dispatcher (see `workers/start.mjs`) that imports whichever worker file
`WORKER_TYPE` points at. This exists because per-service "Custom Start
Command" / "Config-as-code" fields in the Railway dashboard turned out to be
unreliable to find and edit — a service with no override silently falls back
to the repo's root `railway.json`, which is why a freshly created TTS
service kept crash-looping on `document-worker.mjs` instead of starting the
TTS server. Setting an env var (Settings → Variables) is the one thing that
reliably works, so that's the only thing you need to touch per-service:

1. Create the second Railway service pointed at this same GitHub repo.
   (No start command / config file path to set — it inherits `railway.json`
   like every other service, same as before.)
2. Settings → Variables on that service: add `WORKER_TYPE=tts` and
   `TTS_SHARED_SECRET=<your secret>`.
3. Deploy. Logs should show `[tts-server] Edge TTS server listening on port ...`.
4. Settings → Networking → Generate Domain, then use `https://<that-domain>/tts`
   as `RAILWAY_TTS_URL` in Supabase's Edge Function secrets.

The original document-worker service needs no changes — it has no
`WORKER_TYPE` set, and `start.mjs` defaults to `"documents"` when that
variable is absent, so it behaves exactly as before.

## API

`POST /tts` — body `{ text: string, voice?: string, speed?: number }`,
returns raw `audio/mpeg` bytes. Requires header `x-tts-secret: <TTS_SHARED_SECRET>`
unless that env var is unset (only do that for local testing).

`GET /health` — plain `200 ok`, for Railway's health check.

## Required env

```bash
TTS_SHARED_SECRET=   # any random string; must match the Supabase edge-tts function's secret
PORT=                # Railway sets this automatically — don't set it yourself
```

## Run locally

```bash
npm install
npm run worker:tts
```

## Voices

Voice ids are Microsoft Edge neural voices (e.g. `en-US-AndrewNeural`). The
allowed list lives in three places that must stay in sync:
`ALLOWED_VOICES` in this file, `allowedVoices` in
`supabase/functions/edge-tts/index.ts`, and `EDGE_TTS_VOICES` in
`src/pages/Transform.tsx`.

Note: the free, unofficial Edge "Read Aloud" API this package wraps does
**not** support Azure's paid emotional "styles" (cheerful/excited/etc.) —
only voice choice and speaking rate. `en-US-AndrewNeural` is used as the
default reel voice because the edge-tts community widely considers it the
most natural/lively-sounding option available through this free API.

