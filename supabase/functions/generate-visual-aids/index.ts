import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";

const MAX_BODY_BYTES = 64 * 1024;
const MAX_TEXT_INPUT_CHARS = 9000;
const MAX_CONTEXT_CHARS = 6500;
const MAX_VISUAL_SHEETS = Math.max(1, Math.min(3, Number(Deno.env.get("MAX_VISUAL_SHEETS") || 1)));
const VISUAL_RATE_LIMIT = 8;
const VISUAL_RATE_WINDOW_MS = 60 * 1000;
const visualRateBuckets = new Map<string, number[]>();

type LectureSection = {
  title: string;
  text: string;
};

type CheatSheetSection = {
  heading: string;
  points: string[];
};

type VisualAid = {
  title: string;
  subtitle: string;
  lectures: string[];
  sections: CheatSheetSection[];
  recall: string[];
  accent: string;
  imageData?: string;
  mimeType?: string;
};

type PineconeMatch = {
  metadata?: {
    text?: unknown;
    page_number?: unknown;
    chunk_index?: unknown;
  };
  score?: unknown;
};

type PineconeChunk = {
  text: string;
  pageNumber: unknown;
  chunkIndex: number;
  score: number;
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server Misconfiguration: ${name} missing.`);
  return value;
}

function optionalEnv(name: string) {
  return Deno.env.get(name) || "";
}

async function fetchWithTimeout(input: string | URL, init: RequestInit, timeoutMs = 14_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function optionalPollinationsKey() {
  return (
    Deno.env.get("POLLINATIONS_API_KEY") ||
    Deno.env.get("POLLINATIONS_AI") ||
    Deno.env.get("Pollinations_ai") ||
    Deno.env.get("pollinations_ai") ||
    ""
  );
}

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

function clampText(value: unknown, maxLength = MAX_TEXT_INPUT_CHARS) {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, maxLength) : "";
}

function enumValue(value: unknown, allowed: string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const recent = (visualRateBuckets.get(userId) || []).filter((timestamp) => now - timestamp < VISUAL_RATE_WINDOW_MS);
  if (recent.length >= VISUAL_RATE_LIMIT) return false;
  recent.push(now);
  visualRateBuckets.set(userId, recent);
  return true;
}

async function generateEmbedding(text: string) {
  // @ts-expect-error Supabase Edge Runtime provides this AI session API.
  const aiSession = new Supabase.ai.Session("gte-small");
  const embedding = await aiSession.run(text, { mean_pool: true, normalize: true });
  return Array.from(embedding as Iterable<number>);
}

async function queryPinecone(params: {
  query: string;
  userId: string;
  documentId?: string | null;
  topK?: number;
}) {
  const apiKey = requiredEnv("PINECONE_API_KEY");
  const indexHost = requiredEnv("PINECONE_INDEX_HOST").replace(/\/$/, "");
  const vector = await generateEmbedding(params.query);
  const filter: Record<string, unknown> = {
    user_id: { "$eq": params.userId },
  };

  if (params.documentId) {
    filter.document_id = { "$eq": params.documentId };
  }

  const response = await fetch(`${indexHost}/query`, {
    method: "POST",
    headers: {
      "Api-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      vector,
      topK: params.topK || 24,
      includeMetadata: true,
      filter,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Pinecone query failed (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json().catch(() => ({})) as { matches?: PineconeMatch[] };
  return (data.matches || [])
    .map((match): PineconeChunk => ({
      text: String(match.metadata?.text || ""),
      pageNumber: match.metadata?.page_number,
      chunkIndex: Number(match.metadata?.chunk_index ?? 0),
      score: Number(match.score || 0),
    }))
    .filter((match) => match.text.trim().length > 0)
    .sort((a, b) => a.chunkIndex - b.chunkIndex);
}

function displaySourceName(value: string) {
  return value.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
}

function compactText(text: string, maxChars: number) {
  return text.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function compactPromptForUrl(prompt: string, maxChars = 3200) {
  return prompt
    .replace(/\s+/g, " ")
    .replace(/[^\w\s.,:;!?()[\]{}+\-*/=<>|&%#'"]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
}

function splitIntoPseudoLectures(text: string, sourceTitle: string): LectureSection[] {
  const normalized = text.replace(/\r/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!normalized) return [];

  const headingRegex = /(?:^|\n)\s*((?:lecture|lec\.?|chapter|unit|module|lesson)\s*(?:no\.?\s*)?\d+[^\n]{0,90})/gi;
  const matches = Array.from(normalized.matchAll(headingRegex));

  if (matches.length >= 2) {
    return matches.map((match, index) => {
      const start = match.index || 0;
      const end = matches[index + 1]?.index ?? normalized.length;
      const title = compactText(match[1], 80) || `Lecture ${index + 1}`;
      return {
        title,
        text: compactText(normalized.slice(start, end), 5200),
      };
    }).filter((section) => section.text.length > 120);
  }

  const maxSectionChars = normalized.length <= 5200 ? 5200 : 3600;
  const sections: LectureSection[] = [];
  let cursor = 0;
  while (cursor < normalized.length && sections.length < 6) {
    let end = Math.min(normalized.length, cursor + maxSectionChars);
    if (end < normalized.length) {
      const boundary = Math.max(
        normalized.lastIndexOf("\n\n", end),
        normalized.lastIndexOf(". ", end),
      );
      if (boundary > cursor + 900) end = boundary + 1;
    }
    sections.push({
      title: sections.length === 0 ? sourceTitle : `${sourceTitle} Part ${sections.length + 1}`,
      text: compactText(normalized.slice(cursor, end), maxSectionChars),
    });
    cursor = end;
  }
  return sections;
}

function groupLectures(lectures: LectureSection[]) {
  if (lectures.length <= 1) return [lectures];
  const averageLength = lectures.reduce((sum, lecture) => sum + lecture.text.length, 0) / lectures.length;
  const groupSize = averageLength < 1300 ? 5 : averageLength < 2800 ? 2 : 1;
  const groups: LectureSection[][] = [];

  for (let index = 0; index < lectures.length; index += groupSize) {
    groups.push(lectures.slice(index, index + groupSize));
  }

  if (groups.length <= MAX_VISUAL_SHEETS) return groups;

  const merged = groups.slice(0, MAX_VISUAL_SHEETS);
  const overflow = groups.slice(MAX_VISUAL_SHEETS).flat();
  merged[MAX_VISUAL_SHEETS - 1] = [...merged[MAX_VISUAL_SHEETS - 1], ...overflow];
  return merged;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function pickHighSignalLines(text: string, maxChars: number) {
  const lines = text
    .replace(/\r/g, "\n")
    .split(/\n+|(?<=[.!?])\s+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 24);

  const scored = lines.map((line, index) => {
    const lower = line.toLowerCase();
    let score = Math.max(0, 80 - index);
    if (/definition|means|called|formula|equation|law|principle|theorem|rule|step|process|because|therefore|example|advantage|disadvantage|important|exam|question|trap|mistake/.test(lower)) score += 60;
    if (/[:=]|->|=>|\b\d+\b/.test(line)) score += 20;
    if (/^[-*#]|\b(lecture|chapter|unit|module|lesson)\b/i.test(line)) score += 18;
    return { line, score };
  });

  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 24)
    .sort((a, b) => lines.indexOf(a.line) - lines.indexOf(b.line))
    .map((item) => item.line);

  let output = "";
  for (const line of selected) {
    const next = output ? `${output}\n- ${line}` : `- ${line}`;
    if (next.length > maxChars) break;
    output = next;
  }
  return output || compactText(text, maxChars);
}

function buildBriefSource(group: LectureSection[], maxChars = 4200) {
  return group
    .map((lecture) => `### ${lecture.title}\n${pickHighSignalLines(lecture.text, Math.max(1100, Math.floor(maxChars / Math.max(group.length, 1))))}`)
    .join("\n\n")
    .slice(0, maxChars);
}

async function generateVisualBrief(params: {
  group: LectureSection[];
  sourceTitle: string;
  learnerProfile: string;
  goal: string;
}) {
  const sourceText = buildBriefSource(params.group);
  const groqKey = optionalEnv("GROQ_API_KEY");
  if (!groqKey) return sourceText.slice(0, 2600);

  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("VISUAL_BRIEF_MODEL") || "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 650,
      messages: [
        {
          role: "system",
          content: [
            "You convert lecture notes into an accurate visual cheat-sheet brief.",
            "Use only supplied content. Do not invent facts.",
            "Output compact, image-ready text with exact labels.",
            "Keep it useful for exam revision: definitions, formulas, steps, traps, examples, recall prompts.",
            "Avoid long paragraphs. Use short titled blocks.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Source title: ${params.sourceTitle}`,
            `Learner profile: ${params.learnerProfile}`,
            `Goal: ${params.goal}`,
            "",
            "Return exactly this structure:",
            "TITLE:",
            "CORE MAP: 4-6 short nodes",
            "KEY DEFINITIONS: 3-6 bullets",
            "FORMULAS / RULES: bullets, only if present",
            "PROCESS / FLOW: 3-6 numbered steps",
            "EXAM TRAPS: 2-4 bullets",
            "RAPID RECALL: 3 questions",
            "",
            sourceText,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) return sourceText.slice(0, 2600);
  const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
  return (data?.choices?.[0]?.message?.content || sourceText).trim().slice(0, 3200);
}

function extractJsonObject(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>;
  } catch (_) {
    return null;
  }
}

function stringArray(value: unknown, maxItems: number, maxChars: number) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => compactText(item, maxChars))
    .filter((item) => item.length > 0)
    .slice(0, maxItems);
}

function normalizeCheatSheetPayload(value: Record<string, unknown> | null, fallbackTitle: string, sourceText: string): Omit<VisualAid, "subtitle" | "lectures"> {
  const rawSections = Array.isArray(value?.sections) ? value.sections : [];
  const sections = rawSections
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const record = section as Record<string, unknown>;
      const heading = compactText(typeof record.heading === "string" ? record.heading : "", 48);
      const points = stringArray(record.points, 5, 130);
      return heading && points.length ? { heading, points } : null;
    })
    .filter((section): section is CheatSheetSection => Boolean(section))
    .slice(0, 6);

  if (sections.length) {
    return {
      title: compactText(typeof value?.title === "string" ? value.title : fallbackTitle, 72),
      sections,
      recall: stringArray(value?.recall, 4, 110),
      accent: compactText(typeof value?.accent === "string" ? value.accent : "indigo", 24) || "indigo",
    };
  }

  const points = pickHighSignalLines(sourceText, 1400)
    .split("\n")
    .map((line) => line.replace(/^-\s*/, "").trim())
    .filter(Boolean);

  return {
    title: fallbackTitle,
    sections: [
      { heading: "Core Ideas", points: points.slice(0, 5) },
      { heading: "Exam Focus", points: points.slice(5, 10).length ? points.slice(5, 10) : ["Review definitions", "Practice recall", "Check common traps"] },
      { heading: "Quick Recall", points: points.slice(10, 14).length ? points.slice(10, 14) : ["Explain the topic aloud", "Write one example", "List the key steps"] },
    ],
    recall: ["What is the main definition?", "Which step causes mistakes?", "Can you solve one example?"],
    accent: "indigo",
  };
}

async function generateCheatSheetData(params: {
  group: LectureSection[];
  sourceTitle: string;
  learnerProfile: string;
  goal: string;
}) {
  const sourceText = buildBriefSource(params.group, 4600);
  const fallbackTitle = `${params.sourceTitle} Cheat Sheet`;
  const groqKey = optionalEnv("GROQ_API_KEY");
  if (!groqKey) return normalizeCheatSheetPayload(null, fallbackTitle, sourceText);

  const response = await fetchWithTimeout("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("CHEAT_SHEET_MODEL") || Deno.env.get("VISUAL_BRIEF_MODEL") || "llama-3.3-70b-versatile",
      temperature: 0.15,
      max_tokens: 900,
      messages: [
        {
          role: "system",
          content: [
            "You produce precise JSON for a browser-rendered study cheat sheet.",
            "The browser will render the final poster, so all text must be real, concise, and accurate.",
            "Use only the supplied lecture content. Do not invent facts, formulas, names, or numbers.",
            "Prefer exam-useful wording over decoration.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Source title: ${params.sourceTitle}`,
            `Learner profile: ${params.learnerProfile}`,
            `Goal: ${params.goal}`,
            "",
            "Return ONLY JSON with this schema:",
            "{",
            '  "title": "short title",',
            '  "accent": "indigo|cyan|emerald|rose|amber|violet",',
            '  "sections": [',
            '    { "heading": "short heading", "points": ["point <= 16 words"] }',
            "  ],",
            '  "recall": ["question <= 14 words"]',
            "}",
            "",
            "Rules:",
            "- 4 to 6 sections.",
            "- 3 to 5 points per section.",
            "- Use formulas exactly when present.",
            "- Include definitions, process steps, comparisons, mistakes/traps, and examples when present.",
            "- Keep every point short enough for a poster.",
            "",
            sourceText,
          ].join("\n"),
        },
      ],
    }),
  });

  if (!response.ok) return normalizeCheatSheetPayload(null, fallbackTitle, sourceText);
  const data = await response.json().catch(() => null) as { choices?: Array<{ message?: { content?: string } }> } | null;
  const parsed = extractJsonObject(data?.choices?.[0]?.message?.content || "");
  return normalizeCheatSheetPayload(parsed, fallbackTitle, sourceText);
}

function buildPrompt(params: {
  group: LectureSection[];
  sheetIndex: number;
  totalSheets: number;
  sourceTitle: string;
  learnerProfile: string;
  goal: string;
  visualBrief: string;
}) {
  const lectureLabel = params.group.map((lecture) => lecture.title).join(" + ");

  return `
Create a premium educational revision cheat sheet image based ONLY on the approved visual brief below.

Design target:
- One polished 16:9 educational infographic, bright clean academic style, crisp readable typography.
- Title: "${params.sourceTitle} - Visual Revision ${params.sheetIndex}/${params.totalSheets}".
- Covered lectures/parts: ${lectureLabel}.
- Use compact labels, arrows, small diagrams, formula boxes, definition cards, comparison strips, and memory cues.
- Prioritize exam prep: key definitions, must-remember facts, process flow, common mistakes/traps, and rapid recall.
- Keep text large and legible; use few words per box. Do not create tiny paragraph text.
- Layout: strong header, 4-6 modular zones, color-coded sections, icons only when useful, lots of whitespace.
- Visual style target: clean Nano Banana / premium Canva study poster quality, not a generic stock image.
- Do not add facts beyond the approved brief.
- No real people, no logos, no copyrighted characters.

Learner profile: ${params.learnerProfile}
Student goal: ${params.goal}

Approved visual brief:
${params.visualBrief}
`.trim();
}

async function generatePollinationsImage(params: {
  apiKey?: string;
  prompt: string;
}) {
  const useGenApi = Deno.env.get("POLLINATIONS_USE_GEN_API") === "1";
  const model = Deno.env.get("POLLINATIONS_IMAGE_MODEL") || "";
  const width = Deno.env.get("POLLINATIONS_IMAGE_WIDTH") || "1600";
  const height = Deno.env.get("POLLINATIONS_IMAGE_HEIGHT") || "900";
  const quality = Deno.env.get("POLLINATIONS_IMAGE_QUALITY") || "";
  const seed = Deno.env.get("POLLINATIONS_IMAGE_SEED") || String(Math.floor(Math.random() * 1_000_000_000));
  const prompt = compactPromptForUrl(params.prompt);
  const url = useGenApi
    ? new URL(`https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}`)
    : new URL(`https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`);

  url.searchParams.set("width", width);
  url.searchParams.set("height", height);
  url.searchParams.set("seed", seed);
  if (model) url.searchParams.set("model", model);
  if (quality) url.searchParams.set("quality", quality);

  const headers: Record<string, string> = {
    "Accept": "image/jpeg,image/png,image/*",
  };
  if (useGenApi && params.apiKey) {
    headers.Authorization = `Bearer ${params.apiKey}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    let message = details || response.statusText;
    try {
      const parsed = JSON.parse(details) as { error?: { message?: string } };
      message = parsed.error?.message || message;
    } catch (_) {
      // Pollinations may return plain text errors.
    }
    throw new Error(`Pollinations image request failed (${response.status}): ${message}`);
  }

  const mimeType = response.headers.get("Content-Type")?.split(";")[0] || "image/jpeg";
  if (!mimeType.startsWith("image/")) {
    const details = await response.text().catch(() => "");
    throw new Error(`Pollinations returned non-image data: ${details.slice(0, 180) || mimeType}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 1000) {
    throw new Error("Pollinations returned an empty image.");
  }

  return { data: bytesToBase64(bytes), mimeType };
}

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

    const pollinationsKey = optionalPollinationsKey();

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseServiceKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    if (!enforceRateLimit(userData.user.id)) {
      return jsonResponse(req, { error: safeErrorMessage(429) }, 429);
    }

    const body = await req.json().catch(() => null) as unknown;
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
    }
    const requestBody = body as Record<string, unknown>;

    const topic = clampText(requestBody.topic, 800) || "uploaded lectures";
    const materialId = clampText(requestBody.material_id, 120);
    const sourceName = clampText(requestBody.source_name, 180);
    const sourceTitle = displaySourceName(sourceName) || topic || "Study Material";
    const eduLevel = enumValue(requestBody.eduLevel, ["school", "college", "university"], "university");
    const grade = clampText(requestBody.grade, 20);
    const collegeYear = clampText(requestBody.collegeYear, 20);
    const major = clampText(requestBody.major, 120);
    const goal = enumValue(requestBody.goal, ["concept", "exam", "interview", "project"], "exam");
    const experienceLevel = enumValue(requestBody.experienceLevel, ["beginner", "rusty", "intermediate", "advanced"], "beginner");
    const learningStyle = enumValue(requestBody.learningStyle, ["visual", "socratic", "analogical", "academic", "adaptive"], "visual");
    const timeAvailable = clampText(requestBody.timeAvailable, 10) || "15";
    const sessionContext = clampText(requestBody.session_context, 1800);

    let contextText = "";
    if (materialId) {
      const { data: documentRow, error: documentError } = await supabase
        .from("documents")
        .select("document_id, user_id, processing_status")
        .eq("document_id", materialId)
        .eq("user_id", userData.user.id)
        .single();

      if (documentError || !documentRow) {
        return jsonResponse(req, { error: "Uploaded document was not found for this account." }, 404);
      }
      if (documentRow.processing_status !== "processed") {
        return jsonResponse(req, { error: "Uploaded document is still processing. Try again shortly." }, 409);
      }

      const chunks = await queryPinecone({
        query: `${sourceTitle} lecture overview key definitions formulas exam traps summary ${topic}`,
        userId: userData.user.id,
        documentId: materialId,
        topK: 10,
      });

      contextText = chunks
        .map((chunk) => {
          const page = chunk.pageNumber ? `Page ${chunk.pageNumber}` : "Lecture notes";
          return `[${page}]\n${chunk.text}`;
        })
        .join("\n\n")
        .slice(0, MAX_CONTEXT_CHARS);
    }

    if (!contextText) {
      contextText = [
        `Topic: ${topic}`,
        `Source: ${sourceTitle}`,
        sessionContext ? `Recent study context: ${sessionContext}` : "",
        `Create a visual revision aid from reliable study knowledge for this topic.`,
      ].filter(Boolean).join("\n\n").slice(0, MAX_CONTEXT_CHARS);
    }

    const lectures = splitIntoPseudoLectures(contextText, sourceTitle);
    if (!lectures.length) {
      throw new Error("No usable lecture text was available for visual aid generation.");
    }

    const learnerProfile = [
      `Education=${eduLevel}${eduLevel === "school" ? ` grade ${grade || "10"}` : eduLevel === "college" ? ` year ${collegeYear || "1"}` : ` major ${major || "general"}`}`,
      `Experience=${experienceLevel}`,
      `Learning style=${learningStyle}`,
      `Study window=${timeAvailable} minutes`,
    ].join(", ");

    const groups = groupLectures(lectures).slice(0, MAX_VISUAL_SHEETS);
    const aids: VisualAid[] = [];

    for (let index = 0; index < groups.length; index += 1) {
      const group = groups[index];
      const sheetData = await generateCheatSheetData({
        group,
        sourceTitle,
        learnerProfile,
        goal,
      });

      let decorativeImage: { data: string; mimeType: string } | null = null;
      if (Deno.env.get("POLLINATIONS_DECORATIVE_POSTER") === "1") {
        const prompt = buildPrompt({
          group,
          sheetIndex: index + 1,
          totalSheets: groups.length,
          sourceTitle,
          learnerProfile,
          goal,
          visualBrief: [
            sheetData.title,
            ...sheetData.sections.map((section) => `${section.heading}: ${section.points.join("; ")}`),
            `Recall: ${sheetData.recall.join("; ")}`,
          ].join("\n"),
        });

        decorativeImage = await generatePollinationsImage({ apiKey: pollinationsKey, prompt });
      }

      aids.push({
        ...sheetData,
        title: groups.length === 1 ? sheetData.title : `${sheetData.title} ${index + 1}`,
        subtitle: group.map((lecture) => lecture.title).join(" + "),
        lectures: group.map((lecture) => lecture.title),
        imageData: decorativeImage?.data,
        mimeType: decorativeImage?.mimeType,
      });
    }

    return jsonResponse(req, {
      aids,
      suggestions: [
        `Quiz me from ${sourceTitle}`,
        `Make a revision plan for ${sourceTitle}`,
        `Explain the toughest parts of ${sourceTitle}`,
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : safeErrorMessage(400);
    console.error("[generate-visual-aids]", message || "failed");
    return jsonResponse(req, { error: message || safeErrorMessage(400) }, 400);
  }
});
