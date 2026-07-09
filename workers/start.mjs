// workers/start.mjs
// Single shared entrypoint for every Railway service in this project.
// Which worker actually runs is chosen by the WORKER_TYPE env var, not by a
// per-service "Start Command" override — that field turned out to be
// unreliable to find/edit in the Railway dashboard. Instead every service
// uses the exact same start command (node workers/start.mjs, set once in
// railway.json) and is told which worker to boot via a Variable:
//   - document-worker service: no WORKER_TYPE needed (defaults to "documents")
//   - TTS service: set WORKER_TYPE=tts

const workerType = process.env.WORKER_TYPE || "documents";

if (workerType === "tts") {
  await import("./tts-server.mjs");
} else if (workerType === "documents") {
  await import("./document-worker.mjs");
} else {
  console.error(`[start] Unknown WORKER_TYPE "${workerType}". Expected "documents" or "tts".`);
  process.exit(1);
}
