// supabase/functions/transform-vibe/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');
    
    if (!GROQ_API_KEY) {
      throw new Error("Server Misconfiguration: Groq API Key missing.");
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Extract parameters from BOTH potential frontend payloads
    const { 
      topic, 
      content, 
      systemPrompt: incomingSystemPrompt,
      eduLevel, 
      grade, 
      collegeYear, 
      major, 
      activeTab, 
      material_id, 
      mood, 
      learningStyle, 
      timeAvailable,
      quizFormat,
      learnFormat,
      vizFormat
    } = body;

    // --- INTERCEPT ROUTE: Is this a Live Classroom audio event? ---
    const isClassroomMode = !topic && content;

    let finalSystemPrompt = "";
    let finalUserPrompt = "";
    let finalTemperature = 0.7;

    if (isClassroomMode) {
      // Direct pass-through for the live microphone question handler
      finalSystemPrompt = incomingSystemPrompt || "You are a smart classroom assistant. Be concise.";
      finalUserPrompt = content;
      finalTemperature = 0.5; // Lower variance for direct answers
    } else {
      // --- STANDARD RAG PROFESSOR PIPELINE (Transform Hub) ---
      const userQuery = topic || "Overview";
      let retrievedContext = "";

      if (material_id) {
        // @ts-ignore
        const aiSession = new Supabase.ai.Session('gte-small');
        const queryEmbedding = await aiSession.run(userQuery, { mean_pool: true, normalize: true });

        const { data: matchedChunks } = await supabase.rpc('match_document_sections', {
          embedding: queryEmbedding,
          match_threshold: 0.2,
          match_count: 4,
          filter_material_id: material_id
        });

        if (matchedChunks) {
          retrievedContext = matchedChunks.map((chunk: any) => chunk.content).join("\n\n");
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

      finalSystemPrompt = `
        You are an Adaptive AI Professor. 
        VIBE PROFILE: Mode: ${activeTab}, Learning Style: ${learningStyle}, Tone/Mood: ${mood}, Available Study Window: ${timeAvailable} minutes.

        --- PEDAGOGICAL GUARDRAILS ---
        ${adaptiveConstraints}

        --- RAG SOURCE MATERIAL CONTEXT ---
        ${retrievedContext ? retrievedContext : "No document attached. Rely safely on base training fields."}
        --- END CONTEXT ---

        --- OUTPUT FORMATTING STYLING LAWS ---
        1. INTENSE SELECTIVITY: Do not overformat. Write general explanations using standard, clear paragraph text.
        2. CALLOUT BLOCKS: Wrap text with "> " to build structural boxes ONLY for vital, high-impact definitions or laws.
        3. LISTS: Use clean asterisks (* ) for bullet structures ONLY when detailing specific sequential items or itemized elements.
        4. HEADINGS: Use "## Heading Name" for structural sections, preceded by a horizontal rule "---".

        --- QUIZ FORMAT STRICT RULES ---
        - If activeTab is 'quiz' and format is 'mcq', you MUST match this split format string structure: ### Q: Question Text | A) Option | B) Option | C) Option | D) Option | Correct: A ###
        - If activeTab is 'quiz' and format is 'rapid', use this: ### Q: Short Question? | A: 1-3 word answer ###
      `;

      finalTemperature = mood === 'strict' ? 0.3 : 0.7;

      // Adjust task targets based on application menu flags
      if (activeTab === "visualize") {
        finalUserPrompt = `Output ONLY raw, clean Mermaid JS diagram code representing a ${vizFormat || 'flowchart'} for ${userQuery}. Do not wrap it in markdown code blocks.`;
      } else if (activeTab === "plan") {
        finalUserPrompt = `Create a 6-step study roadmap for ${userQuery}. Format precisely using: ### Step Title | Actionable Description | Time Allotment ###`;
      } else if (activeTab === "quiz") {
        finalUserPrompt = quizFormat === 'mcq' 
          ? `Generate 5 multiple choice questions covering ${userQuery} based on the source text.`
          : `Generate 5 rapid fire conceptual short-answer questions covering ${userQuery}.`;
      } else if (learnFormat === 'podcast') {
        finalUserPrompt = `Write an ultra-engaging educational podcast dialogue script between Host A and Host B deep diving into ${userQuery}.`;
      } else if (learnFormat === 'flashcards') {
        finalUserPrompt = `Generate 7 separate core flashcards about ${userQuery}. Split each individual card with "---".`;
      } else {
        finalUserPrompt = `Teach me about: ${userQuery}`;
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
    if (!response.ok) throw new Error(`Groq Upstream Failure: ${data.error?.message || "Unknown"}`);

    const reply = data.choices?.[0]?.message?.content;
    
    return new Response(JSON.stringify({ content: reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("Function Root Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});