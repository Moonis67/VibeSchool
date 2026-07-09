// workers/tts-server.mjs
// Long-running HTTP server (deploy to Railway, not Supabase Edge Functions —
// same reasoning as document-worker.mjs: this needs a real persistent
// process, not a short-lived edge invocation). Wraps Microsoft Edge's
// "Read Aloud" neural TTS via the `msedge-tts` package and exposes it as a
// plain POST /tts endpoint that returns raw audio/mpeg bytes.
//
// This service is not meant to be called directly from the browser — the
// Supabase `edge-tts` Edge Function is the only intended caller. It forwards
// the shared secret below so this server can reject anything else.

import { createServer } from "node:http";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

const PORT = process.env.PORT || 8080;
const TTS_SHARED_SECRET = process.env.TTS_SHARED_SECRET || "";
const MAX_TEXT_CHARS = 6000;

// Real Microsoft Edge neural voice ids — must match EDGE_TTS_VOICES in
// src/pages/Transform.tsx. Andrew is the default: the edge-tts community
// widely calls it out as the most natural/lively-sounding English voice
// (see https://github.com/rany2/edge-tts/discussions/340). Note the free,
// unofficial Edge "Read Aloud" API this package wraps does NOT support
// Azure's paid emotional "styles" (cheerful/excited/etc.) — those require a
// real Azure Speech subscription. What you get here is voice choice + rate,
// not emotion styling.
const ALLOWED_VOICES = new Set([
  "en-US-AndrewNeural",
  "en-US-AriaNeural",
  "en-US-JennyNeural",
  "en-US-GuyNeural",
  "en-US-DavisNeural",
  "en-US-EmmaNeural",
  "en-US-ChristopherNeural",
  "en-US-MichelleNeural",
]);
const DEFAULT_VOICE = "en-US-AndrewNeural";

function speedToRateOption(speed) {
  const value = Number(speed);
  if (!Number.isFinite(value) || value <= 0) return "+0%";
  const pct = Math.round((value - 1) * 100);
  const clamped = Math.max(-50, Math.min(100, pct));
  return `${clamped >= 0 ? "+" : ""}${clamped}%`;
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

async function synthesize(text, voice, rateOption) {
  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioStream } = tts.toStream(text, { rate: rateOption });
    const chunks = [];
    for await (const chunk of audioStream) chunks.push(chunk);
    return Buffer.concat(chunks);
  } finally {
    // Each request opens its own WebSocket to Microsoft's TTS endpoint —
    // without closing it explicitly, connections pile up under load and the
    // process never exits cleanly (confirmed while testing this locally).
    tts.close();
  }
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("ok");
    return;
  }

  if (req.method !== "POST" || req.url !== "/tts") {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found.");
    return;
  }

  if (TTS_SHARED_SECRET && req.headers["x-tts-secret"] !== TTS_SHARED_SECRET) {
    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end("Unauthorized.");
    return;
  }

  try {
    const body = await readJsonBody(req);
    const text = String(body.text || "").trim().slice(0, MAX_TEXT_CHARS);
    if (!text) {
      res.writeHead(400, { "Content-Type": "text/plain" });
      res.end("Missing text.");
      return;
    }
    const voice = ALLOWED_VOICES.has(body.voice) ? body.voice : DEFAULT_VOICE;
    const rateOption = speedToRateOption(body.speed);

    const audio = await synthesize(text, voice, rateOption);
    res.writeHead(200, {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-store",
      "Content-Length": audio.length,
    });
    res.end(audio);
  } catch (error) {
    console.error("[tts-server] synthesis failed:", error instanceof Error ? error.message : error);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("TTS synthesis failed.");
  }
});

server.listen(PORT, () => {
  console.log(`[tts-server] Edge TTS server listening on port ${PORT}`);
});
