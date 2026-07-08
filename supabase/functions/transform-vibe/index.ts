// supabase/functions/transform-vibe/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";

const AI_RATE_LIMIT = 20;
const AI_RATE_WINDOW_MS = 60 * 1000;
const MAX_BODY_BYTES = 64 * 1024;
const MAX_TEXT_INPUT_CHARS = 8000;
const aiRateBuckets = new Map<string, number[]>();

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Server Misconfiguration: ${name} missing.`);
  return value;
}

function getBearerToken(req: Request) {
  const header = req.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || "";
}

async function generateEmbedding(text: string) {
  // @ts-ignore Supabase Edge Runtime provides this AI session API.
  const aiSession = new Supabase.ai.Session('gte-small');
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
      topK: params.topK || 6,
      includeMetadata: true,
      filter,
    }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`Pinecone query failed (${response.status}): ${details || response.statusText}`);
  }

  const data = await response.json();
  return (data.matches || [])
    .map((match: any) => ({
      text: match.metadata?.text || "",
      page_number: match.metadata?.page_number,
      document_id: match.metadata?.document_id,
      score: match.score,
    }))
    .filter((match: any) => typeof match.text === "string" && match.text.trim().length > 0);
}

function enforceRateLimit(userId: string) {
  const now = Date.now();
  const recent = (aiRateBuckets.get(userId) || []).filter((timestamp) => now - timestamp < AI_RATE_WINDOW_MS);
  if (recent.length >= AI_RATE_LIMIT) return false;
  recent.push(now);
  aiRateBuckets.set(userId, recent);
  return true;
}

function clampText(value: unknown, maxLength = MAX_TEXT_INPUT_CHARS) {
  return typeof value === "string" ? value.replace(/\0/g, "").trim().slice(0, maxLength) : "";
}

function enumValue(value: unknown, allowed: string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function isDocumentInstruction(value: string) {
  return /^(explain|explain me|explain this|explain me this|summari[sz]e|summari[sz]e this|what is this|teach me this|break this down|tell me about this|this)$/i.test(value.trim());
}

function displaySourceName(value: string) {
  return value.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
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

    const GROQ_API_KEY = requiredEnv('GROQ_API_KEY');

    const supabaseUrl = requiredEnv('SUPABASE_URL');
    const supabaseServiceKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = getBearerToken(req);
    if (!token) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return jsonResponse(req, { error: safeErrorMessage(401) }, 401);
    }

    const currentUser = userData?.user || null;
    if (!enforceRateLimit(currentUser.id)) {
      return jsonResponse(req, { error: safeErrorMessage(429) }, 429);
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
    }
    
    // Extract parameters from BOTH potential frontend payloads
    const { 
      material_id,
    } = body;

    const topic = clampText((body as any).topic, 800);
    const content = clampText((body as any).content, MAX_TEXT_INPUT_CHARS);
    const sourceName = clampText((body as any).source_name, 180);
    const sessionContext = clampText((body as any).session_context, 3200);
    const incomingSystemPrompt = clampText((body as any).systemPrompt, 2000);
    const eduLevel = enumValue((body as any).eduLevel, ["school", "college", "university"], "university");
    const grade = clampText((body as any).grade, 20);
    const collegeYear = clampText((body as any).collegeYear, 20);
    const major = clampText((body as any).major, 120);
    const activeTab = enumValue((body as any).activeTab, ["learn", "quiz", "visualize", "plan"], "learn");
    const mood = enumValue((body as any).mood, ["strict", "funny", "professional", "encouraging", "socratic", "hype", "enthusiastic"], "hype");
    const learningStyle = enumValue((body as any).learningStyle, ["visual", "socratic", "analogical", "academic", "adaptive"], "academic");
    const timeAvailable = clampText((body as any).timeAvailable, 10) || "15";
    const goal = enumValue((body as any).goal, ["concept", "exam", "interview", "project"], "concept");
    const experienceLevel = enumValue((body as any).experienceLevel, ["beginner", "rusty", "intermediate", "advanced"], "beginner");
    const profileContext = clampText((body as any).profileContext, 200);
    const quizDifficulty = enumValue((body as any).quizDifficulty, ["basic", "advanced"], "basic");
    const quizFormat = enumValue((body as any).quizFormat, ["mcq", "rapid"], "mcq");
    const learnFormat = enumValue((body as any).learnFormat, ["lecture", "flashcards", "podcast", "reel"], "lecture");
    const vizFormat = enumValue((body as any).vizFormat, ["flowchart", "dld"], "flowchart");

    // --- INTERCEPT ROUTE: Is this a Live Classroom audio event? ---
    const isClassroomMode = !topic && content;

    let finalSystemPrompt = "";
    let finalUserPrompt = "";
    let finalTemperature = 0.7;
    let responseSuggestions: string[] = [];

    if (isClassroomMode) {
      // Direct pass-through for the live microphone question handler
      finalSystemPrompt = incomingSystemPrompt || "You are a smart classroom assistant. Be concise.";
      finalUserPrompt = content;
      finalTemperature = 0.5; // Lower variance for direct answers
    } else {
      // --- STANDARD RAG PROFESSOR PIPELINE (Transform Hub) ---
      const userQuery = topic || "Overview";
      const hasUploadedDocument = Boolean(material_id);
      const documentInstruction = hasUploadedDocument && isDocumentInstruction(userQuery);
      const sourceTitle = displaySourceName(sourceName) || "the uploaded document";
      if (hasUploadedDocument) {
        responseSuggestions = [
          `Summarize ${sourceTitle}`,
          `Key points from ${sourceTitle}`,
          `Questions from ${sourceTitle}`,
        ];
      }
      const retrievalQuery = documentInstruction
        ? `${sourceTitle} overview summary key points scope features pricing timeline requirements`
        : userQuery;
      let retrievedContext = "";
      let ragStatus = "NO_DOCUMENT";

      if (material_id) {
        try {
          if (!currentUser) {
            ragStatus = "AUTH_REQUIRED";
          } else {
            const requestedDocumentId = String(material_id);
            const { data: documentRow, error: documentError } = await supabase
              .from("documents")
              .select("document_id, user_id, processing_status")
              .eq("document_id", requestedDocumentId)
              .eq("user_id", currentUser.id)
              .single();

            if (documentError || !documentRow) {
              ragStatus = "DOCUMENT_NOT_FOUND";
            } else if (documentRow.processing_status !== "processed") {
              ragStatus = `DOCUMENT_${String(documentRow.processing_status || "UNKNOWN").toUpperCase()}`;
            } else {
              const matchedChunks = await queryPinecone({
                query: retrievalQuery,
                userId: currentUser.id,
                documentId: requestedDocumentId,
                topK: 6,
              });

              if (matchedChunks.length > 0) {
                retrievedContext = matchedChunks
                  .map((chunk: any) => {
                    const page = chunk.page_number ? `Page ${chunk.page_number}` : "Uploaded document";
                    return `[${page}]\n${chunk.text}`;
                  })
                  .join("\n\n---\n\n");
                ragStatus = "CONTEXT_FOUND";
              } else {
                ragStatus = "NO_MATCHES";
              }
            }
          }
        } catch (ragError: any) {
          console.error("RAG Pipeline Exception:", ragError?.message || "failed");
          ragStatus = "EXCEPTION";
        }
      } else if (currentUser) {
        try {
          const matchedChunks = await queryPinecone({
            query: userQuery,
            userId: currentUser.id,
            topK: 6,
          });

          if (matchedChunks.length > 0) {
            retrievedContext = matchedChunks
              .map((chunk: any) => {
                const page = chunk.page_number ? `Page ${chunk.page_number}` : "Uploaded document";
                return `[${page}]\n${chunk.text}`;
              })
              .join("\n\n---\n\n");
            ragStatus = "CONTEXT_FOUND";
          } else {
            ragStatus = "NO_MATCHES";
          }
        } catch (ragError: any) {
          console.error("RAG Pipeline Exception:", ragError?.message || "failed");
          ragStatus = "EXCEPTION";
        }
      }

      let adaptiveConstraints = "";
      if (eduLevel === 'school') {
        adaptiveConstraints = `
          - CRITICAL AUDIENCE TARGET: School Student (Grade ${grade || 10}).
          - COGNITIVE DEPTH: Simplistic, highly intuitive, and conceptual. 
          - LANGUAGE RULES: Use basic sentence structures and highly relatable everyday analogies. 
          - ABSOLUTELY FORBIDDEN: Do not output advanced university-level jargon.
          - If a complex technical term is strictly necessary, provide an immediate definition in brackets.
        `;
      } else if (eduLevel === 'college') {
        adaptiveConstraints = `
          - AUDIENCE TARGET: College Student (Year ${collegeYear || 11}).
          - COGNITIVE DEPTH: Practical application, foundational formulas, logical system interactions.
        `;
      } else {
        adaptiveConstraints = `
          - AUDIENCE TARGET: University Academic majoring in ${major || 'Computer Science'}.
          - COGNITIVE DEPTH: Maximum academic rigor, exact formulas, and professional nomenclature.
        `;
      }

      const timeProfile = (() => {
        const minutes = Number(timeAvailable || 15);
        if (minutes <= 5) return "ULTRA-COMPACT: answer in one tight mental model, one example, and one recall question.";
        if (minutes <= 10) return "COMPACT: prioritize the 20% of ideas that unlock 80% understanding.";
        if (minutes <= 15) return "BALANCED: explain core ideas, one example, and likely mistake traps.";
        if (minutes <= 30) return "DEEP: include reasoning, examples, edge cases, and a mini self-check.";
        return "MASTERCLASS: include foundations, mechanisms, examples, misconceptions, edge cases, and review prompts.";
      })();

      const moodProfile = (() => {
        if (mood === "strict") return "STRICT MODE: be direct, concise, no jokes, no motivational fluff, answer first, then explain.";
        if (mood === "funny") return "FUNNY MODE: use light, relevant humor and surprising analogies, but never sacrifice correctness.";
        if (mood === "professional") return "PRO MODE: polished, precise, workplace/academic tone.";
        if (mood === "encouraging") return "SUPPORT MODE: patient, reassuring, step-by-step, normalize confusion.";
        if (mood === "socratic") return "QUESTION MODE: teach by asking short guiding questions, then answer them clearly.";
        if (mood === "enthusiastic") return "HYPE MODE: energetic, crisp, memorable, momentum-building.";
        return "HYPE MODE: energetic, crisp, memorable, momentum-building.";
      })();

      const styleProfile = (() => {
        if (learningStyle === "visual") return "VISUAL STYLE: use mental maps, frameworks, spatial comparisons, and labeled step structures.";
        if (learningStyle === "analogical") return "ANALOGY STYLE: explain with a relatable analogy first, then translate it into the formal concept.";
        if (learningStyle === "socratic") return "SOCRATIC STYLE: ask short guiding questions, then answer them clearly so the student can self-check.";
        return "STRUCTURED STYLE: use clean definitions, examples, misconceptions, and a final check.";
      })();

      // Build the context block for the system prompt
      let contextBlock = "";
      if (retrievedContext && retrievedContext.trim().length > 0) {
        contextBlock = `
        --- REFERENCE MATERIAL (USE THIS AS YOUR PRIMARY KNOWLEDGE SOURCE) ---
        The following text excerpts are extracted from the student's uploaded study document.
        You MUST base your response primarily on this material. Teach from it, quote it, and reference it directly.
        DO NOT say you cannot access files — the text content is provided directly below.

        Uploaded document display name: "${sourceTitle}"

        ${retrievedContext}

        --- END REFERENCE MATERIAL ---
        `;
      } else {
        contextBlock = `
        --- KNOWLEDGE SOURCE ---
        No reference document was provided by the student for this query.
        Use your own training knowledge to answer the topic thoroughly and helpfully.
        DO NOT mention files, attachments, or document access limitations.
        --- END KNOWLEDGE SOURCE ---
        `;
      }

      finalSystemPrompt = `
        You are an Adaptive AI Professor who teaches students effectively.
        VIBE PROFILE: Mode: ${activeTab}, Tone/Mood: ${mood}, Available Study Window: ${timeAvailable} minutes.
        LEARNER PROFILE: Education=${eduLevel || "unknown"}, Experience=${experienceLevel || "beginner"}, Goal=${goal || "concept"}, LearningStyle=${learningStyle || "academic"}, Context=${profileContext || major || "general learning"}.

        --- PEDAGOGICAL GUARDRAILS ---
        ${adaptiveConstraints}
        - ${timeProfile}
        - ${moodProfile}
        - ${styleProfile}
        - If Goal is "exam", emphasize traps, recall, and test phrasing.
        - If Goal is "interview", emphasize short verbal explanations, contrasts, and examples.
        - If Goal is "project", emphasize practical usage and implementation choices.
        - If Experience is "beginner" or "rusty", define terms before using them. If "advanced", include nuance and edge cases.

        --- TEMPORARY SESSION MEMORY ---
        ${sessionContext || "No prior session context was provided."}
        Use this to preserve continuity across follow-ups and mode/setting changes. Do not repeat it verbatim.

        ${contextBlock}

        --- CRITICAL BEHAVIORAL RULES ---
        - NEVER say "I don't have the capability to access files" or similar. You have ALL the context you need inline above.
        - NEVER refuse to answer. Always provide a helpful, educational response.
        - If reference material is provided above, teach EXCLUSIVELY from that material.
        - If the student's wording is vague, such as "explain me this", "summarize this", or "what is this", treat it as an instruction to explain the uploaded document's actual subject. Do NOT create a lesson about the phrase itself.
        - Do NOT generate sections titled "Introduction to explain me this" or suggestions based on the literal instruction phrase.
        - If no reference material is provided, teach from your own knowledge confidently.
        - For anything that may be spoken aloud, do not include stage directions, sound effects, markdown fences, or repeated speaker names inside the dialogue text.

        --- OUTPUT FORMATTING STYLING LAWS ---
        1. INTENSE SELECTIVITY: Do not overformat. Write general explanations using standard, clear paragraph text.
        2. CALLOUT BLOCKS: Wrap text with "> " to build structural boxes ONLY for vital, high-impact definitions or laws.
        3. LISTS: Use clean asterisks (* ) for bullet structures ONLY when detailing specific sequential items or itemized elements.
        4. HEADINGS: Use "## Heading Name" for structural sections, preceded by a horizontal rule "---".

        --- QUIZ FORMAT STRICT RULES ---
        - If activeTab is 'quiz' and format is 'mcq', generate EXACTLY 10 questions and match this split format string structure: ### Q: Question Text | A) Option | B) Option | C) Option | D) Option | Correct: A | Area: Short Skill Area ###
        - MCQ difficulty is ${quizDifficulty || "basic"}. Basic checks foundations and definitions. Advanced uses scenario traps, edge cases, and near-miss options.
        - If activeTab is 'quiz' and format is 'rapid', use this: ### Q: Short Question? | A: 1-3 word answer ###
      `;

      finalTemperature = mood === 'strict' ? 0.25 : mood === 'funny' ? 0.85 : 0.65;
      const lessonTarget = documentInstruction ? sourceTitle : userQuery;

      // Adjust task targets based on application menu flags
      if (activeTab === "visualize") {
        finalUserPrompt = `Output ONLY raw, clean Mermaid JS diagram code representing a ${vizFormat || 'flowchart'} for ${lessonTarget}. Do not wrap it in markdown code blocks.`;
      } else if (activeTab === "plan") {
        finalUserPrompt = `Create a 6-step study roadmap for ${lessonTarget}. Format precisely using: ### Step Title | Actionable Description | Time Allotment ###`;
      } else if (activeTab === "quiz") {
        finalUserPrompt = quizFormat === 'mcq' 
          ? `Generate exactly 10 ${quizDifficulty || "basic"} multiple choice questions covering ${lessonTarget} based on the reference material provided in the system context. Include a meaningful Area field for diagnostics.`
          : `Generate 5 rapid fire conceptual short-answer questions covering ${lessonTarget} based on the reference material provided in the system context.`;
      } else if (learnFormat === 'reel') {
        finalUserPrompt = `Write a short vertical reel lesson dialogue about ${lessonTarget}. Use exactly 10-14 short lines alternating A and B. Format every line as "A: dialogue" or "B: dialogue". The conversation should ask questions and answer them, with mood=${mood}, time=${timeAvailable} minutes, learner goal=${goal}. IMPORTANT: no character names, no stage directions, no sound effects, no markdown headings, no narration. Use the reference material as the primary source.`;
      } else if (learnFormat === 'podcast') {
        finalUserPrompt = `Write an ultra-engaging educational podcast dialogue script between A and B deep diving into ${lessonTarget}. Match mood=${mood}, time=${timeAvailable} minutes, learner goal=${goal}. Use questions and answers naturally. No markdown headings. Use the reference material as the primary source.`;
      } else if (learnFormat === 'flashcards') {
        finalUserPrompt = `Generate 7 separate core flashcards about ${lessonTarget}. Split each individual card with "---". Base the content on the reference material.`;
      } else {
        finalUserPrompt = documentInstruction
          ? `The student wrote "${userQuery}" after uploading a document. Explain the uploaded document "${sourceTitle}" clearly. Start with what the document is about, then cover the concrete details, key numbers, scope, timeline, responsibilities, and important takeaways found in the reference material. Do not explain the phrase "${userQuery}".`
          : `Teach me about: ${userQuery}. Use the reference material provided in the system context as your primary source.`;
      }
    }

    // --- RUN LIVE MODEL INVOCATION ---
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: finalSystemPrompt },
          { role: "user", content: finalUserPrompt }
        ],
        temperature: finalTemperature,
        max_tokens: 2048,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error("LLM upstream request failed.");

    const reply = data.choices?.[0]?.message?.content;
    
    return jsonResponse(req, { content: reply || "", suggestions: responseSuggestions });

  } catch (error: any) {
    console.error("Function Root Error:", error?.message || "failed");
    return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
  }
});
