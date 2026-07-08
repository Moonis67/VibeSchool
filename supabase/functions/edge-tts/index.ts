import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, getCorsHeaders, safeErrorMessage } from "../_shared/cors.ts";

const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";
const MAX_TEXT_CHARS = 3500;
const MAX_TOTAL_CHARS = 12000;
const MAX_BODY_BYTES = 24 * 1024;
const TTS_RATE_LIMIT = 30;
const TTS_RATE_WINDOW_MS = 60 * 1000;
const ttsRateBuckets = new Map<string, number[]>();

const allowedVoices = new Set([
  "aura-2-thalia-en",
  "aura-2-aurora-en",
  "aura-2-atlas-en",
  "aura-2-selene-en",
  "aura-2-ophelia-en",
  "aura-2-apollo-en",
  "aura-2-aries-en",
  "aura-2-zeus-en",
]);

const optionalEnv = (...names: string[]) => {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return "";
};

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} missing.`);
  return value;
};

const getDeepgramApiKey = () =>
  optionalEnv("deepgram_api", "DEEPGRAM_API_KEY", "DEEPGRAM_API", "VITE_DEEPGRAM_API_KEY");

const getBearerToken = (req: Request) => {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
};

const enforceRateLimit = (userId: string) => {
  const now = Date.now();
  const recent = (ttsRateBuckets.get(userId) || []).filter((timestamp) => now - timestamp < TTS_RATE_WINDOW_MS);
  if (recent.length >= TTS_RATE_LIMIT) return false;
  recent.push(now);
  ttsRateBuckets.set(userId, recent);
  return true;
};

const clampSpeed = (speed: unknown) => {
  const numeric = Number(speed);
  if (!Number.isFinite(numeric)) return "1";
  return String(Math.min(1.5, Math.max(0.7, numeric)));
};

const concatChunks = (chunks: Uint8Array[]) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
};

const splitText = (text: string) => {
  const parts: string[] = [];
  let remaining = text.trim();

  while (remaining.length > MAX_TEXT_CHARS) {
    const windowText = remaining.slice(0, MAX_TEXT_CHARS);
    const splitAt = Math.max(
      windowText.lastIndexOf(". "),
      windowText.lastIndexOf("? "),
      windowText.lastIndexOf("! "),
      windowText.lastIndexOf("; "),
      windowText.lastIndexOf(", "),
    );
    const splitPoint = splitAt > 900 ? splitAt + 1 : MAX_TEXT_CHARS;
    parts.push(remaining.slice(0, splitPoint).trim());
    remaining = remaining.slice(splitPoint).trim();
  }

  if (remaining) parts.push(remaining);
  return parts;
};

const synthesizeDeepgramSpeech = async (text: string, voice: string, speed: unknown) => {
  const apiKey = getDeepgramApiKey();
  if (!apiKey) throw new Error("Deepgram API key missing.");

  const url = new URL(DEEPGRAM_SPEAK_URL);
  url.searchParams.set("model", voice);
  url.searchParams.set("encoding", "mp3");
  url.searchParams.set("sample_rate", "24000");
  url.searchParams.set("speed", clampSpeed(speed));

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    throw new Error(`Deepgram TTS failed with ${response.status}.`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") {
      return jsonResponse(req, { error: safeErrorMessage(405) }, 405);
    }

    const contentLength = Number(req.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return jsonResponse(req, { error: safeErrorMessage(413) }, 413);
    }

    const supabase = createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"));
    const token = getBearerToken(req);
    if (!token) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    if (!enforceRateLimit(userData.user.id)) return jsonResponse(req, { error: safeErrorMessage(429) }, 429);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
    }

    const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, MAX_TOTAL_CHARS);
    const voice = allowedVoices.has(body.voice) ? body.voice : "aura-2-thalia-en";

    if (!text) {
      return jsonResponse(req, { error: "No text provided." }, 400);
    }

    const audioParts: Uint8Array[] = [];
    for (const part of splitText(text)) {
      audioParts.push(await synthesizeDeepgramSpeech(part, voice, body.speed));
    }
    const audio = concatChunks(audioParts);

    return new Response(audio, {
      headers: {
        ...getCorsHeaders(req),
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[deepgram-tts]", error instanceof Error ? error.message : "failed");
    return jsonResponse(req, { error: safeErrorMessage(500) }, 500);
  }
});
