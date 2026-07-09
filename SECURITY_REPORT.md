# Security Report

## Scope

Security hardening pass for the existing Vite + Supabase + Supabase Edge Functions application. UI and feature flow were intentionally left unchanged.

## Vulnerabilities Found

- Edge Functions used wildcard CORS and did not consistently require verified user JWTs.
- `transform-vibe` and `deepgram-tts` could be called without a real authenticated user token.
- Edge Functions returned raw upstream/internal error messages to clients.
- RAG upload validation allowed extra file extensions and did not perform strict MIME/header checks.
- File names were stored without server-side sanitization.
- Basic abuse controls were missing for uploads, AI requests, and TTS requests.
- Frontend Classroom calls to `transform-vibe` did not send an authorization header.
- Frontend TTS had a direct browser websocket fallback with a token-like value in client code.
- Mermaid rendering used loose security mode and unsanitized SVG insertion.
- Logout did not explicitly clear local/session app state.
- Some frontend console logs could expose submitted form data or raw failure details.
- Legacy Supabase RAG tables had historically permissive policies.

## Fixes Applied

- Added shared Edge Function CORS helpers with allowlisted origins only.
- Enabled JWT verification for all Edge Functions in `supabase/config.toml`.
- Added explicit Authorization header checks and Supabase `auth.getUser()` verification in all Edge Functions.
- Removed trust in frontend-provided user identity; user IDs are always derived from verified JWT sessions.
- Added input size validation for upload, AI, and TTS endpoints.
- Added rate limits:
  - file uploads: 10 per hour per user
  - AI requests: 20 per minute per user
  - TTS requests: 30 per minute per user
- Hardened RAG upload validation:
  - allowed: `pdf`, `txt`, `docx`
  - rejected unknown MIME types and invalid file headers
  - sanitized stored file names
  - kept R2 keys independent of original file names
- Added DOCX text extraction for server-side processing.
- Kept Pinecone vector writes/searches scoped with authenticated `user_id` metadata filters.
- Added database RLS hardening migration for:
  - `profiles`
  - `documents`
  - `user_session_history`
  - legacy `materials`
  - legacy `document_sections`
  - optional `chat_sessions`
  - optional `chat_messages`
  - avatar storage ownership policies
- Removed browser-side direct TTS token fallback.
- Updated Classroom and Transform to call protected Edge Functions with the current user access token.
- Changed protected-route session check from local session presence to verified `getUser()`.
- Added logout cleanup for sensitive browser storage.
- Switched Mermaid to strict security mode and sanitized rendered SVG before insertion.
- Removed raw form-data console logging and reduced raw error logging in frontend.

## Files Changed

- `src/App.tsx`
- `src/components/layout/Navbar.tsx`
- `src/integrations/supabase/client.ts`
- `src/lib/security.ts`
- `src/pages/Classroom.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Profile.tsx`
- `src/pages/Transform.tsx`
- `src/pages/pricing/EnterprisePlan.tsx`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `supabase/functions/_shared/cors.ts`
- `supabase/functions/process-document/index.ts`
- `supabase/functions/transform-vibe/index.ts`
- `supabase/functions/deepgram-tts/index.ts`
- `supabase/migrations/rag_r2_pinecone_storage.sql`
- `supabase/migrations/security_hardening.sql`

## Required Deployment Settings

Set this Supabase Edge Function secret to enable production CORS:

```txt
ALLOWED_ORIGINS=https://your-production-domain.com
```

If using Deepgram TTS, set:

```txt
DEEPGRAM_API_KEY=...
```

Keep these only in Supabase Edge Function secrets, never frontend env:

```txt
SUPABASE_SERVICE_ROLE_KEY
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
PINECONE_API_KEY
GROQ_API_KEY
DEEPGRAM_API_KEY
```

Frontend env should contain only public Vite variables such as:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_PROJECT_ID
VITE_DEEPGRAM_TTS_ENDPOINT
```

## Remaining Recommendations

- Replace in-memory rate limits with a durable limiter backed by Redis, Upstash, Supabase table RPC, or another shared store. Current limits are basic per-isolate protection.
- Add a real subscription source of truth for paid plan checks. Current paid/free storage limits depend on Supabase Auth metadata values such as `plan: "pro"` or `subscription_tier: "paid"`.
- Add malware scanning for uploaded files before processing or download.
- Add CSP/security headers at the hosting layer.
- Consider private avatar buckets with signed URLs if profile images should not be public.
- Add automated RLS policy tests using Supabase local testing or SQL test scripts.

## Verification

- Production Vite build completed successfully with `npm.cmd run build`.
- The first sandboxed build attempt failed because the sandbox blocked Vite/esbuild from reading above the workspace; rerunning outside the sandbox passed.
