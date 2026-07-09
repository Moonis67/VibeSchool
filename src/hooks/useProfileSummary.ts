// src/hooks/useProfileSummary.ts
// Re-exports the shared profile context so existing `@/hooks/useProfileSummary`
// imports keep working unchanged. The real implementation lives in
// `@/lib/profileStore.tsx` — a single app-wide store (see that file for why),
// not a per-component Supabase fetch anymore.
export { useProfileSummary } from "@/lib/profileStore";
