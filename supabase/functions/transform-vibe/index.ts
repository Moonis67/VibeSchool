// supabase/functions/transform-vibe/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleCorsPreflight, jsonResponse, safeErrorMessage } from "../_shared/cors.ts";

declare const Supabase: {
  ai: {
    Session: new (model: string) => {
      run: (text: string, options: { mean_pool: boolean; normalize: boolean }) => Promise<Iterable<number>>;
    };
  };
};

type JsonObject = Record<string, unknown>;

type PineconeMatch = {
  metadata?: {
    text?: unknown;
    page_number?: unknown;
    document_id?: unknown;
  };
  score?: number;
};

type RetrievedChunk = {
  text: string;
  page_number?: unknown;
  document_id?: unknown;
  score?: number;
};

type DocumentRow = {
  document_id: string;
  processing_status?: string;
};

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : "failed";

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
  const aiSession = new Supabase.ai.Session('gte-small');
  const embedding = await aiSession.run(text, { mean_pool: true, normalize: true });
  return Array.from(embedding as Iterable<number>);
}

async function queryPinecone(params: {
  query: string;
  userId: string;
  documentIds?: string[];
  topK?: number;
}) {
  const apiKey = requiredEnv("PINECONE_API_KEY");
  const indexHost = requiredEnv("PINECONE_INDEX_HOST").replace(/\/$/, "");
  const vector = await generateEmbedding(params.query);
  const filter: Record<string, unknown> = {
    user_id: { "$eq": params.userId },
  };

  if (params.documentIds && params.documentIds.length === 1) {
    filter.document_id = { "$eq": params.documentIds[0] };
  } else if (params.documentIds && params.documentIds.length > 1) {
    filter.document_id = { "$in": params.documentIds };
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

  const data = await response.json() as { matches?: PineconeMatch[] };
  return (data.matches || [])
    .map((match): RetrievedChunk => ({
      text: match.metadata?.text || "",
      page_number: match.metadata?.page_number,
      document_id: match.metadata?.document_id,
      score: match.score,
    }))
    .filter((match) => typeof match.text === "string" && match.text.trim().length > 0);
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

    const body = await req.json().catch(() => null) as JsonObject | null;
    if (!body || typeof body !== "object") {
      return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
    }
    
    // Extract parameters from BOTH potential frontend payloads
    const {
      material_id,
      session_id,
    } = body;

    const topic = clampText(body.topic, 800);
    const content = clampText(body.content, MAX_TEXT_INPUT_CHARS);
    const sourceName = clampText(body.source_name, 180);
    const sessionContext = clampText(body.session_context, 3200);
    const incomingSystemPrompt = clampText(body.systemPrompt, 2000);
    const eduLevel = enumValue(body.eduLevel, ["school", "college", "university"], "university");
    const grade = clampText(body.grade, 20);
    const collegeYear = clampText(body.collegeYear, 20);
    const major = clampText(body.major, 120);
    const activeTab = enumValue(body.activeTab, ["learn", "quiz", "visualize", "plan"], "learn");
    const mood = enumValue(body.mood, ["strict", "funny", "professional", "encouraging", "socratic", "hype", "enthusiastic"], "hype");
    const learningStyle = enumValue(body.learningStyle, ["visual", "socratic", "analogical", "academic", "adaptive"], "academic");
    const timeAvailable = clampText(body.timeAvailable, 10) || "15";
    const goal = enumValue(body.goal, ["concept", "exam", "interview", "project"], "concept");
    const experienceLevel = enumValue(body.experienceLevel, ["beginner", "rusty", "intermediate", "advanced"], "beginner");
    const profileContext = clampText(body.profileContext, 200);
    const quizDifficulty = enumValue(body.quizDifficulty, ["basic", "advanced"], "basic");
    const quizFormat = enumValue(body.quizFormat, ["mcq", "rapid"], "mcq");
    // Set by the "dive deeper" action after a quiz result — the weakest
    // scoring Area from the previous attempt, so the next quiz can weight
    // itself toward it instead of just being a flat re-roll of the topic.
    const focusArea = clampText(body.focus_area, 200);
    const learnFormat = enumValue(body.learnFormat, ["lecture", "flashcards", "podcast", "reel"], "lecture");
    const vizFormat = enumValue(body.vizFormat, ["flowchart", "dld"], "flowchart");

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
      // The frontend can send several documents at once (up to 10) as a
      // comma-joined list of ids. This is always an explicit, user-picked
      // selection — the backend never widens it to "everything this user
      // has ever uploaded."
      const explicitDocumentIds = String(material_id || "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
        .slice(0, 10);

      const sessionIdValue = clampText(session_id, 100);
      let sessionActiveDocumentIds: string[] = [];

      if (sessionIdValue && currentUser) {
        const { data: ownedSession } = await supabase
          .from("sessions")
          .select("id")
          .eq("id", sessionIdValue)
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (ownedSession) {
          // Attaching a file to a session sticks: once picked, it stays an
          // active source for every later question in that session until
          // the user removes it (session_documents.is_active), even though
          // this request only sends material_id the turn it was picked.
          if (explicitDocumentIds.length > 0) {
            await supabase.from("session_documents").upsert(
              explicitDocumentIds.map((documentId) => ({
                session_id: sessionIdValue,
                document_id: documentId,
                is_active: true,
              })),
              { onConflict: "session_id,document_id" },
            );
          }

          const { data: activeRows } = await supabase
            .from("session_documents")
            .select("document_id")
            .eq("session_id", sessionIdValue)
            .eq("is_active", true);

          sessionActiveDocumentIds = (activeRows || []).map((row) => String(row.document_id));

          await supabase
            .from("sessions")
            .update({ last_opened_at: new Date().toISOString() })
            .eq("id", sessionIdValue);
        }
      }

      const requestedDocumentIds = Array.from(new Set([...explicitDocumentIds, ...sessionActiveDocumentIds])).slice(0, 10);
      const hasUploadedDocument = requestedDocumentIds.length > 0;
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

      if (hasUploadedDocument) {
        try {
          if (!currentUser) {
            ragStatus = "AUTH_REQUIRED";
          } else {
            const { data: documentRows, error: documentError } = await supabase
              .from("documents")
              .select("document_id, user_id, processing_status")
              .in("document_id", requestedDocumentIds)
              .eq("user_id", currentUser.id);

            const rows = (documentRows || []) as DocumentRow[];
            const processedDocumentIds = rows
              .filter((row) => row.processing_status === "processed")
              .map((row) => row.document_id);

            if (documentError || !documentRows || documentRows.length === 0) {
              ragStatus = "DOCUMENT_NOT_FOUND";
            } else if (processedDocumentIds.length === 0) {
              const latestStatus = rows[0]?.processing_status || "UNKNOWN";
              ragStatus = `DOCUMENT_${String(latestStatus).toUpperCase()}`;
            } else {
              const matchedChunks = await queryPinecone({
                query: retrievalQuery,
                userId: currentUser.id,
                documentIds: processedDocumentIds,
                topK: processedDocumentIds.length > 1 ? Math.min(24, processedDocumentIds.length * 6) : 6,
              });

              if (matchedChunks.length > 0) {
                retrievedContext = matchedChunks
                  .map((chunk) => {
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
        } catch (ragError: unknown) {
          console.error("RAG Pipeline Exception:", getErrorMessage(ragError));
          ragStatus = "EXCEPTION";
        }
      }
      // No blind fallback here: if the student hasn't attached a file
      // (directly or as an active session source), the AI must not search
      // the user's whole upload history for "relevant" chunks — that was
      // leaking unrelated document content into unrelated answers.

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
        if (vizFormat === "dld") {
          finalUserPrompt = `Output ONLY raw, clean Mermaid JS diagram code ("graph LR") for a digital logic / circuit-style diagram of "${lessonTarget}". Model every input, logic gate (AND, OR, NOT, NAND, NOR, XOR), sub-process, and output as its OWN node, each labelled with its real, specific signal or concept name from ${lessonTarget} (e.g. "A", "B", "Carry In", "Sum") — never generic placeholders like "Processing Unit", "Analysis Gate", or "Step 1". If ${lessonTarget} is not literally a circuit, still use gate-style AND/OR branching nodes to model its real decision/control logic, using genuine terms from the topic at every node. Connect nodes with arrows that reflect the actual signal or logic flow. Do not wrap it in markdown code blocks.`;
        } else {
          finalUserPrompt = `Output ONLY raw, clean Mermaid JS diagram code ("graph TD") for a concept flowchart of "${lessonTarget}". Every single node label must be a real, specific concept, step, term, or example from ${lessonTarget} — never generic placeholders like "Step 1", "Process", or "Concept A". Use decision diamonds {"..."} for genuine conditional/branching logic in the topic, and plain boxes for sequential steps or components. Edges must reflect real causal or sequential relationships, not a generic funnel shape. Do not wrap it in markdown code blocks.`;
        }
      } else if (activeTab === "plan") {
        finalUserPrompt = `Create a 6-step study roadmap for ${lessonTarget}. Format precisely using: ### Step Title | Actionable Description | Time Allotment ###`;
      } else if (activeTab === "quiz") {
        const focusClause = focusArea
          ? ` The student previously scored weakest on the area "${focusArea}" — weight at least 60% of the questions to specifically probe and reinforce that area, while the rest still cover ${lessonTarget} broadly so it isn't a one-note quiz.`
          : "";
        finalUserPrompt = quizFormat === 'mcq'
          ? `Generate exactly 10 ${quizDifficulty || "basic"} multiple choice questions covering ${lessonTarget} based on the reference material provided in the system context. Every question must test a genuinely different sub-concept — do not paraphrase the same fact twice. Distractor options (wrong answers) must be plausible, specific, and topic-relevant, never obviously silly filler. Use a short, consistent, reusable Area label per question (2-4 words, e.g. "Recursion Base Cases") so related questions share the same Area string.${focusClause}`
          : `Generate 5 rapid fire conceptual short-answer questions covering ${lessonTarget} based on the reference material provided in the system context. Each question must test a distinct sub-concept, not rephrasings of the same idea.${focusClause}`;
      } else if (learnFormat === 'reel') {
        finalUserPrompt = `Write a punchy short-form vertical video script (like a TikTok/Reels explainer) about "${lessonTarget}", as a back-and-forth between two voices A and B. Exactly 24-30 lines (this is a longer-form explainer, not a teaser — cover the topic properly, not just one fact), strictly alternating A/B/A/B, following these hard rules: (1) Line 1 (A) MUST be a scroll-stopping hook — a surprising fact, bold claim, or provocative question specific to ${lessonTarget} — never a greeting or a generic "let's talk about" intro. (2) Every line is ONE short, spoken-style sentence, under 15 words — no textbook phrasing, no filler, no restating the question back before answering. (3) B reacts like a real curious person (surprise, disbelief, "wait, really?") before landing the answer, not just flat quiz-style Q&A. (4) Cover at least 3-4 distinct sub-points or examples across the script, not one fact repeated — build genuine depth, each with a concrete, specific example, number, or comparison drawn from ${lessonTarget}, never generic placeholder facts. (5) The final 2 lines must land a clear, memorable takeaway or punchline, not trail off vaguely. Match mood=${mood}, learner goal=${goal}. Format every line as "A: dialogue" or "B: dialogue" only — no character names, no stage directions, no sound effects, no markdown, no narration. Use the reference material as the primary source of facts.`;
      } else if (learnFormat === 'podcast') {
        finalUserPrompt = `Write an ultra-engaging educational podcast dialogue script between A and B deep diving into ${lessonTarget}. Match mood=${mood}, time=${timeAvailable} minutes, learner goal=${goal}. Use questions and answers naturally. No markdown headings. Use the reference material as the primary source.`;
      } else if (learnFormat === 'flashcards') {
        // Same delimited micro-format as the quiz prompt below (### Q: ... ###)
        // — a bare "---" divider was unreliable because it asked the model to
        // remember to insert a separator *between* every pair of 7 items, an
        // easy instruction to half-follow (e.g. 1-2 dividers instead of 6).
        // One self-contained, repeatable line pattern is far more robust.
        finalUserPrompt = `Generate exactly 7 flashcards about ${lessonTarget}, based on the reference material. Output ONLY 7 lines in this EXACT format, one flashcard per line, nothing else — no intro, no closing summary, no headings, no blank lines: ### CARD: <short term or question> | <concise answer, 25 words max> ### — repeat that exact pattern for all 7 cards. Example of one valid line: ### CARD: Big-O of binary search | O(log n), because each step halves the remaining search space ###`;
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

    const data = await response.json() as GroqResponse;
    if (!response.ok) throw new Error("LLM upstream request failed.");

    const reply = data.choices?.[0]?.message?.content;
    
    return jsonResponse(req, { content: reply || "", suggestions: responseSuggestions });

  } catch (error: unknown) {
    console.error("Function Root Error:", getErrorMessage(error));
    return jsonResponse(req, { error: safeErrorMessage(400) }, 400);
  }
});
