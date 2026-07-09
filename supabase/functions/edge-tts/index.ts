// supabase/functions/edge-tts/index.ts
// Thin authenticated proxy in front of the Railway-hosted Edge TTS worker
// (workers/tts-server.mjs). This function owns auth + rate limiting — the
// Railway service itself only trusts requests carrying TTS_SHARED_SECRET,
// which never reaches the browser. Replaces the old deepgram-tts function;
// nothing in this app calls Deepgram anymore.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, getCorsHeaders, safeErrorMessage } from "../_shared/cors.ts";

const MAX_TOTAL_CHARS = 6000;
const MAX_BODY_BYTES = 24 * 1024;
const TTS_RATE_LIMIT = 30;
const TTS_RATE_WINDOW_MS = 60 * 1000;
const ttsRateBuckets = new Map<string, number[]>();

// Must match ALLOWED_VOICES in workers/tts-server.mjs and EDGE_TTS_VOICES in
// src/pages/Transform.tsx.
const allowedVoices = new Set([
  "en-US-AndrewNeural",
  "en-US-AriaNeural",
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-US-DavisNeural",
  "en-US-EmmaNeural",
  "en-US-ChristopherNeural",
  "en-US-MichelleNeural",
]);

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server misconfiguration: ${name} is missing.`);
  return value;
}

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const recent = (ttsRateBuckets.get(userId) || []).filter((timestamp) => now - timestamp < TTS_RATE_WINDOW_MS);
  if (recent.length >= TTS_RATE_LIMIT) return false;
  recent.push(now);
  ttsRateBuckets.set(userId, recent);
  return true;
}

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse(req, { error: safeErrorMessage(405) }, 405);

    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonResponse(req, { error: safeErrorMessage(413) }, 413);

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = getBearerToken(req);
    if (!token) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    if (!enforceRateLimit(userData.user.id)) return jsonResponse(req, { error: safeErrorMessage(429) }, 429);

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") return jsonResponse(req, { error: safeErrorMessage(400) }, 400);

    const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_TOTAL_CHARS);
    if (!text) return jsonResponse(req, { error: "No text provided." }, 400);
    const voice = allowedVoices.has(String(body.voice)) ? String(body.voice) : "en-US-AndrewNeural";
    const speed = Number(body.speed) || 1;

    const railwayTtsUrl = requiredEnv("RAILWAY_TTS_URL");
    const ttsSharedSecret = requiredEnv("TTS_SHARED_SECRET");

    const upstream = await fetch(railwayTtsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-tts-secret": ttsSharedSecret,
      },
      body: JSON.stringify({ text, voice, speed }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => "");
      throw new Error(`Edge TTS backend returned ${upstream.status}${detail ? `: ${detail.slice(0, 160)}` : ""}.`);
    }

    return new Response(upstream.body, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(500);
    console.error(`[edge-tts] ${message}`);
    return jsonResponse(req, { error: safeErrorMessage(500) }, 500);
  }
});
