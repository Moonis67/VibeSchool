// supabase/functions/_shared/cors.ts

const defaultAllowedOrigins = [
  "http://localhost:8080",
  "http://localhost:5173",
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
];

const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set([...defaultAllowedOrigins, ...configuredOrigins]);
const allowAnyOrigin = configuredOrigins.length === 0 || allowedOrigins.has("*");

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = origin && (allowAnyOrigin || allowedOrigins.has(origin)) ? origin : "";

  return {
    ...(allowedOrigin ? { "Access-Control-Allow-Origin": allowedOrigin } : {}),
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function handleCorsPreflight(req: Request) {
  if (req.method !== "OPTIONS") return null;
  return new Response("ok", {
    status: 200,
    headers: getCorsHeaders(req),
  });
}

export function jsonResponse(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

export function safeErrorMessage(status: number) {
  if (status === 400) return "Invalid request.";
  if (status === 401) return "Authentication required.";
  if (status === 403) return "Access denied.";
  if (status === 405) return "Method not allowed.";
  if (status === 413) return "Request is too large.";
  if (status === 415) return "Unsupported file type.";
  if (status === 429) return "Too many requests. Please try again later.";
  return "Request failed.";
}
