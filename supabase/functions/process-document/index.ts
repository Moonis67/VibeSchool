// supabase/functions/process-document/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.4.2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Smart text chunker: prevents cutting words in half and maintains a sliding context window
function chunkTextWithOverlap(text: string, chunkSize = 600, overlap = 120): string[] {
  const chunks: string[] = [];
  if (!text) return chunks;
  
  let startIndex = 0;
  while (startIndex < text.length) {
    let endIndex = startIndex + chunkSize;
    
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(' ', endIndex);
      if (lastSpace > startIndex) {
        endIndex = lastSpace;
      }
    }
    
    const chunk = text.substring(startIndex, endIndex).trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    
    const nextIndex = endIndex - overlap;
    if (nextIndex <= startIndex) {
      startIndex = endIndex; // Fallback loop buster
    } else {
      startIndex = nextIndex;
    }
  }
  return chunks;
}

serve(async (req) => {
  // 1. Instantly resolve the CORS preflight handshake with an unblocked 200 OK
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    const { file_path, material_id } = await req.json()
    console.log(`[process-document] Starting: file_path=${file_path}, material_id=${material_id}`);

    if (!file_path || !material_id) {
      throw new Error("Missing required fields: file_path and material_id");
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Download the file from the storage bucket
    console.log("[process-document] Downloading file from storage...");
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('educational-materials')
      .download(file_path)

    if (downloadError) throw new Error(`Download failed: ${downloadError.message}`)

    const arrayBuffer = await fileData.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    console.log(`[process-document] File downloaded: ${data.length} bytes`);
    
    // 3. Extract text using an environment-agnostic serverless safe PDF engine
    console.log("[process-document] Extracting text from PDF...");
    const { getDocument } = await resolvePDFJS();
    const doc = await getDocument({ data, useSystemFonts: true }).promise;
    let fullText = "";
    
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      fullText += pageText + "\n";
    }

    console.log(`[process-document] Extracted ${fullText.length} chars from ${doc.numPages} pages`);

    if (fullText.trim().length < 10) {
      throw new Error(`PDF text extraction yielded insufficient content (${fullText.length} chars). The PDF may be image-based or empty.`);
    }

    // 4. Chunk text cleanly
    const allChunks = chunkTextWithOverlap(fullText, 600, 120);
    const safeChunks = allChunks.slice(0, 25); 
    console.log(`[process-document] Created ${safeChunks.length} chunks (from ${allChunks.length} total)`);

    // 5. Initialize Supabase Local Embedding Session
    console.log("[process-document] Generating embeddings with gte-small...");
    // @ts-ignore
    const session = new Supabase.ai.Session('gte-small')
    const insertPayload = [];

    for (let i = 0; i < safeChunks.length; i++) {
      const chunk = safeChunks[i];
      try {
        const embedding = await session.run(chunk, { mean_pool: true, normalize: true })
        
        // Validate that embedding is a proper array/Float32Array
        const embeddingArray = Array.from(embedding);
        if (embeddingArray.length === 0) {
          console.error(`[process-document] Empty embedding for chunk ${i}, skipping`);
          continue;
        }
        
        insertPayload.push({
          material_id: material_id,
          content: chunk,
          embedding: JSON.stringify(embeddingArray)
        });
      } catch (embError: any) {
        console.error(`[process-document] Embedding error on chunk ${i}: ${embError.message}`);
        // Still insert the chunk without embedding so the fallback retrieval works
        insertPayload.push({
          material_id: material_id,
          content: chunk,
          embedding: null
        });
      }
    }

    console.log(`[process-document] Generated ${insertPayload.length} embeddings, inserting into DB...`);

    // 6. Bulk Insert: Performs a single database write instead of 25 separate network requests
    if (insertPayload.length > 0) {
      const { error: batchInsertError } = await supabase
        .from('document_sections')
        .insert(insertPayload);

      if (batchInsertError) {
        console.error(`[process-document] DB insert error: ${batchInsertError.message}`);
        throw new Error(`Database batch write failed: ${batchInsertError.message}`);
      }
    }

    console.log(`[process-document] SUCCESS: ${insertPayload.length} chunks stored for material ${material_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${safeChunks.length} chunks successfully`,
        chunks_stored: insertPayload.length,
        total_text_chars: fullText.length,
        pages: doc.numPages
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error(`[process-document] FATAL ERROR: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})