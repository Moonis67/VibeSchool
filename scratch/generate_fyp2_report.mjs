import fs from "node:fs/promises";
import JSZip from "jszip";

const TEMPLATE = "scratch/fyp2_template.docx";
const OUTPUT = "VibeSchool_FYP2_Report.docx";

const PROJECT = {
  title: "VibeSchool: Adaptive AI Professor and Classroom Assistant",
  shortTitle: "VibeSchool",
  session: "2025-2026",
  supervisor: "[Supervisor Name]",
  students: [
    "[Student 1 Name] ([Registration ID])",
    "[Student 2 Name] ([Registration ID])",
    "[Student 3 Name] ([Registration ID])",
  ],
  date: "July 2026",
};

const references = [
  "P. Lewis et al., \"Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks,\" arXiv:2005.11401, 2020. Available: https://arxiv.org/abs/2005.11401",
  "K. Guu et al., \"REALM: Retrieval-Augmented Language Model Pre-Training,\" arXiv:2002.08909, 2020. Available: https://arxiv.org/abs/2002.08909",
  "A. Asai, M. Gardner, and H. Hajishirzi, \"Evidentiality-guided Generation for Knowledge-Intensive NLP Tasks,\" arXiv:2112.08688, 2021. Available: https://arxiv.org/abs/2112.08688",
  "MDN Web Docs, \"Web Speech API,\" 2025. Available: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API",
  "MDN Web Docs, \"SpeechRecognition,\" 2025. Available: https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition",
  "Supabase Docs, \"Row Level Security,\" 2026. Available: https://supabase.com/docs/guides/database/postgres/row-level-security",
  "Pinecone Docs, \"Filter by metadata,\" 2026. Available: https://docs.pinecone.io/guides/search/filter-by-metadata",
  "Cloudflare Docs, \"R2 overview,\" 2026. Available: https://developers.cloudflare.com/r2/",
  "Groq Docs, \"OpenAI compatibility,\" 2026. Available: https://console.groq.com/docs/openai",
  "React Documentation, \"React - The library for web and native user interfaces,\" 2026. Available: https://react.dev/",
  "Vite Documentation, \"Vite Guide,\" 2026. Available: https://vite.dev/guide/",
  "Mermaid Documentation, \"Mermaid - Diagramming and charting tool,\" 2026. Available: https://mermaid.js.org/",
  "KaTeX Documentation, \"The fastest math typesetting library for the web,\" 2026. Available: https://katex.org/",
  "Google NotebookLM, \"AI research tool and thinking partner,\" 2026. Available: https://notebooklm.google/",
  "Khan Academy, \"Khanmigo,\" 2026. Available: https://www.khanacademy.org/khan-labs",
  "Quizlet, \"AI-powered learning tools,\" 2026. Available: https://quizlet.com/",
  "Duolingo, \"Duolingo Max,\" 2026. Available: https://www.duolingo.com/max",
  "Supabase JavaScript Client Docs, \"supabase-js,\" 2026. Available: https://supabase.com/docs/reference/javascript/introduction",
];

let imageCounter = 1;
const imageRels = [];

const xml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function run(text, options = {}) {
  const props = [
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.size ? `<w:sz w:val="${options.size}"/>` : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("");
  return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ""}<w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
}

function paragraph(text = "", options = {}) {
  const pr = [
    options.style ? `<w:pStyle w:val="${options.style}"/>` : "",
    options.align ? `<w:jc w:val="${options.align}"/>` : "",
    options.before || options.after || options.line
      ? `<w:spacing ${options.before ? `w:before="${options.before}"` : ""} ${options.after ? `w:after="${options.after}"` : ""} ${options.line ? `w:line="${options.line}" w:lineRule="auto"` : ""}/>`
      : "",
    options.indent ? `<w:ind w:left="${options.indent}"/>` : "",
  ].join("");
  const rPr = [
    options.bold ? "<w:b/>" : "",
    options.italic ? "<w:i/>" : "",
    options.size ? `<w:sz w:val="${options.size}"/>` : "",
    options.color ? `<w:color w:val="${options.color}"/>` : "",
  ].join("");
  const textRuns = Array.isArray(text)
    ? text.map((item) => (typeof item === "string" ? run(item) : run(item.text, item))).join("")
    : run(text, { bold: options.bold, italic: options.italic, size: options.size, color: options.color });
  return `<w:p>${pr ? `<w:pPr>${pr}${rPr ? `<w:rPr>${rPr}</w:rPr>` : ""}</w:pPr>` : ""}${textRuns}</w:p>`;
}

function pageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

function heading(text, level = 1) {
  return paragraph(text, {
    style: `Heading${Math.min(3, Math.max(1, level))}`,
    before: level === 1 ? "240" : "180",
    after: "120",
  });
}

function caption(text) {
  return paragraph(text, { style: "Caption", italic: true, align: "center", after: "180" });
}

function bullet(items) {
  return items.map((item) => paragraph(`- ${item}`, { style: "ListParagraph", indent: "360", line: "300" })).join("");
}

function table(rows, options = {}) {
  const widths = options.widths || Array(rows[0]?.length || 1).fill(Math.floor(9000 / (rows[0]?.length || 1)));
  const headerFill = options.headerFill || "D9EAF7";
  const tblRows = rows
    .map((row, rowIndex) => {
      const cells = row
        .map((cell, cellIndex) => {
          const parts = String(cell).split(/\n+/).filter(Boolean);
          const paras = parts.length ? parts.map((part) => paragraph(part, rowIndex === 0 ? { bold: true } : {})).join("") : paragraph("");
          return `<w:tc><w:tcPr><w:tcW w:w="${widths[cellIndex] || widths[0]}" w:type="dxa"/>${
            rowIndex === 0 ? `<w:shd w:fill="${headerFill}"/>` : ""
          }</w:tcPr>${paras}</w:tc>`;
        })
        .join("");
      return `<w:tr>${cells}</w:tr>`;
    })
    .join("");
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/><w:tblBorders><w:top w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:left w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:right w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="808080"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="808080"/></w:tblBorders></w:tblPr>${tblRows}</w:tbl>${paragraph("")}`;
}

function svgImage(name, svg, widthInches = 6.3, heightInches = 3.5) {
  const id = imageCounter++;
  const relId = `rIdFYP${id}`;
  const target = `media/${name}.svg`;
  imageRels.push({ relId, target, svg });
  const cx = Math.round(widthInches * 914400);
  const cy = Math.round(heightInches * 914400);
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="${1000 + id}" name="${xml(name)}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="${xml(name)}"/><pic:cNvPicPr><a:picLocks noChangeAspect="1" noChangeArrowheads="1"/></pic:cNvPicPr></pic:nvPicPr><pic:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
}

const svgBase = (w, h, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><style>.t{font:600 18px Arial;fill:#111827}.s{font:500 14px Arial;fill:#374151}.b{fill:#f8fafc;stroke:#6d35ff;stroke-width:2}.g{fill:#ecfeff;stroke:#0891b2;stroke-width:2}.y{fill:#fffbeb;stroke:#d97706;stroke-width:2}.r{fill:#fff1f2;stroke:#e11d48;stroke-width:2}.line{stroke:#4b5563;stroke-width:2;marker-end:url(#a)}.dash{stroke:#6b7280;stroke-width:2;stroke-dasharray:7 5;marker-end:url(#a)}</style><marker id="a" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto"><path d="M0,0 L0,6 L9,3 z" fill="#4b5563"/></marker></defs>${inner}</svg>`;
const box = (x, y, w, h, title, sub = "", cls = "b") => {
  const subLines = String(sub || "").split(/\\n|\n/).filter(Boolean);
  const subText = subLines
    .map((lineText, index) => `<text class="s" x="${x + 14}" y="${y + 55 + index * 18}">${xml(lineText)}</text>`)
    .join("");
  return `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="12"/><text class="t" x="${x + 14}" y="${y + 30}">${xml(title)}</text>${subText}`;
};
const line = (x1, y1, x2, y2, cls = "line") => `<line class="${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;

function architectureSvg() {
  return svgBase(1200, 680, `
    ${box(40,60,220,90,"Student Browser","React, Vite, Tailwind","b")}
    ${box(340,40,230,120,"VibeSchool UI","Dashboard, Transform, Classroom","g")}
    ${box(660,40,230,120,"Supabase","Auth, Postgres, RLS, Edge","b")}
    ${box(950,45,210,80,"Groq LLM","Llama 3.3 chat completions","y")}
    ${box(950,155,210,80,"Pinecone","Vector search + metadata filters","g")}
    ${box(950,265,210,80,"Cloudflare R2","Document object storage","r")}
    ${box(660,245,230,100,"Document Worker","Extract, chunk, embed, upsert","y")}
    ${box(340,270,230,90,"Classroom Engine","SpeechRecognition + notes","r")}
    ${box(340,430,230,100,"Client Fallbacks","Local content, quiz, Q&A","b")}
    ${box(660,430,230,100,"Security Layer","JWT, CORS, rate limits","g")}
    ${line(260,105,340,100)}${line(570,100,660,100)}${line(890,100,950,85)}
    ${line(775,160,775,245)}${line(890,295,950,305)}${line(890,130,950,195)}
    ${line(455,160,455,270)}${line(455,360,455,430)}${line(570,480,660,480)}
    ${line(775,430,775,345)}
  `);
}

function problemContextSvg() {
  return svgBase(1100, 430, `
    <text class="t" x="40" y="45">Student Learning Problem Context</text>
    ${box(55,95,200,85,"Scattered Inputs","PDFs, slides, notes","r")}
    ${box(315,95,200,85,"Generic AI","answers without source control","y")}
    ${box(575,95,200,85,"Exam Pressure","needs recall + practice","b")}
    ${box(835,95,200,85,"Live Lectures","speech is rarely reusable","g")}
    ${box(205,265,260,90,"VibeSchool","source-aware AI study workspace","b")}
    ${box(635,265,260,90,"Learning Outputs","notes, quizzes, visuals, plans","g")}
    ${line(155,180,300,265)}${line(415,180,365,265)}${line(675,180,735,265)}${line(935,180,805,265)}
    ${line(465,310,635,310)}
  `);
}

function ragSvg() {
  const steps = [
    ["Upload PDF/TXT/DOCX", "validate MIME/header"],
    ["Extract Text", "PDF.js or JSZip"],
    ["Chunk + Score", "quality filter + overlap"],
    ["Embed", "gte-small or API model"],
    ["Store", "R2 file + Pinecone vectors"],
    ["Retrieve", "user + document metadata filter"],
    ["Generate", "prompt with retrieved context"],
  ];
  return svgBase(1320, 360, steps.map((s, i) => `${box(30 + i * 185,90,155,95,s[0],s[1],i % 3 === 0 ? "b" : i % 3 === 1 ? "g" : "y")}${i < steps.length - 1 ? line(185 + i * 185,137,215 + i * 185,137) : ""}`).join("") + `<text class="t" x="32" y="45">RAG Ingestion and Answering Pipeline</text><text class="s" x="32" y="315">Ownership is enforced at every step through Supabase JWT verification, RLS, document_id filters, and Pinecone metadata.</text>`);
}

function useCaseSvg() {
  return svgBase(950, 620, `
    <ellipse cx="100" cy="290" rx="42" ry="58" fill="#f3eeff" stroke="#6d35ff" stroke-width="2"/><text class="t" x="66" y="370">Student</text>
    <rect x="220" y="40" width="610" height="520" rx="24" fill="#ffffff" stroke="#111827" stroke-width="2"/><text class="t" x="245" y="80">VibeSchool System Boundary</text>
    ${box(270,110,220,58,"Authenticate","sign up / login","b")}
    ${box(560,110,220,58,"Manage Profile","name, avatar, vibe","g")}
    ${box(270,200,220,58,"Upload Document","PDF, TXT, DOCX","y")}
    ${box(560,200,220,58,"Create Session","attach active sources","b")}
    ${box(270,290,220,58,"Ask AI Tutor","lecture, flashcards, quiz","g")}
    ${box(560,290,220,58,"Generate Visuals","diagrams, cheat sheets","y")}
    ${box(270,380,220,58,"Classroom Mode","live transcript, Q&A","r")}
    ${box(560,380,220,58,"Save/Reuse Library","storage and status","b")}
    ${box(410,470,220,58,"Review Learning Output","notes, plans, audio","g")}
    ${line(142,290,270,139)}${line(142,290,270,229)}${line(142,290,270,319)}${line(142,290,270,409)}
    ${line(490,229,560,229,"dash")}${line(490,319,560,319,"dash")}${line(490,409,560,409,"dash")}${line(670,438,540,470,"dash")}
  `);
}

function erdSvg() {
  return svgBase(1050, 620, `
    ${box(60,70,230,150,"auth.users","id PK\\nemail\\nmetadata","b")}
    ${box(400,50,250,170,"profiles","id PK/FK\\nfull_name\\navatar_url\\nupdated_at","g")}
    ${box(720,70,250,170,"documents","document_id PK\\nuser_id FK\\nfile_name\\nstatus\\nchunk_count\\nsize_bytes","y")}
    ${box(60,330,250,150,"sessions","id PK\\nuser_id FK\\ntitle\\nsubject\\nlast_opened_at","b")}
    ${box(400,330,250,150,"session_documents","session_id PK/FK\\ndocument_id PK/FK\\nis_active\\nadded_at","g")}
    ${box(720,330,250,150,"External Stores","R2 object key\\nPinecone vectors\\nmetadata: user_id, document_id","r")}
    ${line(290,145,400,135)}${line(290,400,60,220)}${line(650,135,720,145)}${line(310,405,400,405)}${line(650,405,720,405)}${line(845,240,845,330)}
    <text class="s" x="62" y="545">Primary security rule: every application-owned table uses user_id ownership or session ownership checks through RLS and verified JWTs.</text>
  `);
}

function sequenceSvg() {
  return svgBase(1120, 520, `
    ${box(60,45,130,50,"Student","","b")}${box(260,45,150,50,"React UI","","g")}${box(500,45,170,50,"Edge Function","","b")}${box(760,45,150,50,"Pinecone","","g")}${box(950,45,130,50,"Groq LLM","","y")}
    ${[125,335,585,835,1015].map((x) => `<line x1="${x}" y1="95" x2="${x}" y2="455" stroke="#d1d5db" stroke-width="2"/>`).join("")}
    ${line(125,130,335,130)}<text class="s" x="145" y="120">ask question with session_id</text>
    ${line(335,180,585,180)}<text class="s" x="355" y="170">invoke transform-vibe + JWT</text>
    ${line(585,230,835,230)}<text class="s" x="605" y="220">query vectors filtered by user_id/document_id</text>
    ${line(835,275,585,275)}<text class="s" x="630" y="265">top-K chunks</text>
    ${line(585,325,1015,325)}<text class="s" x="620" y="315">prompt with guardrails + context</text>
    ${line(1015,370,585,370)}<text class="s" x="720" y="360">grounded response</text>
    ${line(585,415,335,415)}<text class="s" x="385" y="405">content + suggestions</text>
    ${line(335,455,125,455)}<text class="s" x="165" y="445">render lecture, quiz, visual or plan</text>
  `);
}

function ganttSvg() {
  return svgBase(1100, 420, `
    <text class="t" x="40" y="45">Project Gantt Overview</text>
    ${["Research","UI/UX","RAG Backend","Classroom","Security","Testing","Report"].map((label, i) => `<text class="s" x="45" y="${95 + i * 43}">${xml(label)}</text>`).join("")}
    ${["W1","W2","W3","W4","W5","W6","W7","W8","W9","W10"].map((w, i) => `<text class="s" x="${185 + i * 80}" y="75">${w}</text>`).join("")}
    ${[[180,82,160],[260,125,240],[340,168,320],[500,211,200],[580,254,200],[660,297,240],[740,340,200]].map(([x,y,w],i)=>`<rect x="${x}" y="${y}" width="${w}" height="24" rx="8" fill="${["#6d35ff","#0891b2","#d97706","#e11d48","#10b981","#4f46e5","#64748b"][i]}"/>`).join("")}
    <line x1="160" y1="82" x2="160" y2="365" stroke="#cbd5e1"/><line x1="960" y1="82" x2="960" y2="365" stroke="#cbd5e1"/>
  `);
}

function section(title, body) {
  return heading(title, 2) + body;
}

function bodyContent() {
  const parts = [];
  parts.push(paragraph("Institute of Business Management", { align: "center", bold: true, size: "40" }));
  parts.push(paragraph("Final Year Project", { align: "center", bold: true, size: "44" }));
  parts.push(paragraph(`Session ${PROJECT.session}`, { align: "center", size: "32" }));
  parts.push(paragraph(PROJECT.title, { align: "center", bold: true, size: "42", color: "0000FF", before: "360", after: "360" }));
  parts.push(paragraph("Supervisor", { align: "center", bold: true, size: "28" }));
  parts.push(paragraph(PROJECT.supervisor, { align: "center", color: "0000FF", size: "28" }));
  parts.push(paragraph("Submitted by", { align: "center", bold: true, size: "28", before: "240" }));
  PROJECT.students.forEach((s) => parts.push(paragraph(s, { align: "center", color: "0000FF", size: "26" })));
  parts.push(paragraph("College of Computer Science and Information Systems", { align: "center", bold: true, size: "26", before: "480" }));
  parts.push(paragraph("Institute of Business Management (IoBM)", { align: "center", size: "26" }));
  parts.push(paragraph(PROJECT.date, { align: "center", size: "24" }));
  parts.push(pageBreak());

  parts.push(heading("CERTIFICATE", 1));
  parts.push(paragraph(`This is to certify that the above students of Bachelor of Computer Science have successfully completed their project work titled "${PROJECT.title}" in the College of Computer Science and Information Systems - IoBM, Department of Computer Science, as part of the degree requirement. The report has been prepared in accordance with the FYP-2 report template for non-ML based projects and documents the implemented system, design, testing, limitations, and future directions.`));
  parts.push(table([["S.No", "Student ID", "Name"], ["1", "[Registration ID]", "[Student 1 Name]"], ["2", "[Registration ID]", "[Student 2 Name]"], ["3", "[Registration ID]", "[Student 3 Name]"]], { widths: [1000, 2500, 5000] }));
  parts.push(paragraph("Supervisor Name: ___________________________"));
  parts.push(paragraph("Supervisor Signature: ______________________"));
  parts.push(paragraph("Designation: ______________________________"));
  parts.push(paragraph("FYP Coordinator Signature: __________________        HOD (CS) Signature: __________________", { before: "420" }));
  parts.push(pageBreak());

  parts.push(heading("ACKNOWLEDGEMENT", 1));
  parts.push(paragraph("All praise is due to Allah Almighty, whose blessings and mercy made it possible to complete this Final Year Project. We are grateful to our supervisor for guiding the project from a raw idea into a working educational platform with a clear architecture, security model, and implementation plan. Their feedback helped us refine the scope from a simple AI chat interface into a complete study workspace that includes document-grounded tutoring, live classroom assistance, adaptive learning modes, and reusable study sessions."));
  parts.push(paragraph("We also thank the faculty members and reviewers at the College of Computer Science and Information Systems, Institute of Business Management, for their comments during FYP reviews. Their questions pushed us to justify the system beyond interface design and to address authentication, privacy, document ownership, RAG relevance, rate limiting, and maintainability. We are thankful to our classmates and early testers who tried the dashboard, classroom mode, quiz mode, and document upload workflow, and who reported usability issues that shaped the final implementation."));
  parts.push(paragraph("Finally, we acknowledge the open-source community and documentation behind React, TypeScript, Supabase, Pinecone, Cloudflare R2, Mermaid, KaTeX, and related tools. VibeSchool builds on these foundations to solve a local learning problem: students often have scattered notes, recordings, PDFs, and exam anxiety, but lack a single workspace that can transform their own material into clear explanations, quizzes, visuals, and revision plans."));
  parts.push(pageBreak());

  parts.push(heading("ABSTRACT", 1));
  parts.push(paragraph("VibeSchool is a web-based adaptive learning platform designed to act as an AI professor, live classroom assistant, document-aware tutor, and study material generator. The project addresses a common academic problem: students have access to many digital resources, but those resources remain fragmented across PDFs, lectures, slides, recordings, notes, and disconnected study tools. Generic AI chatbots can explain topics, but they frequently lack the student's actual course context, do not maintain subject-specific learning sessions, and may generate answers that are not grounded in the uploaded material. VibeSchool solves this by combining a modern React frontend with authenticated Supabase services, Retrieval-Augmented Generation (RAG), document processing, vector search, voice capture, visual learning, and adaptive output formats."));
  parts.push(paragraph("The system allows students to upload PDF, TXT, and DOCX study files, which are validated, extracted, chunked, embedded, and indexed for semantic search. Uploaded files are stored in Cloudflare R2, while vector representations and metadata are stored in Pinecone. The AI tutor uses Supabase Edge Functions to verify the user token, retrieve only the user's active session sources, construct a prompt with pedagogical guardrails, and call an LLM through Groq's OpenAI-compatible API. VibeSchool supports multiple learning modes including lecture explanation, flashcards, podcasts, short reel scripts, MCQs, rapid-fire quizzes, flowcharts, digital logic diagrams, visual cheat sheets, and study roadmaps. The Classroom module uses the browser Web Speech API to capture live lecture speech, detect questions, answer them in near real time, and convert lecture transcripts into structured notes."));
  parts.push(paragraph("A major design goal of this project is responsible personalization. The learner can choose education level, subject context, mood, study window, learning style, goal, and experience level. The backend enforces ownership through Supabase Auth, Row Level Security, verified JWTs, document metadata filters, CORS allowlists, input limits, upload validation, and rate limiting. The implementation also includes client-side fallback engines for classroom Q&A and educational content generation so that the system remains useful under degraded backend conditions. The project was evaluated through functional tests, security checks, document ingestion tests, RAG behavior tests, UI workflow tests, and production build verification. Results show that the implemented system satisfies its core objectives: authenticated learning sessions, reusable source libraries, grounded tutoring, live classroom support, multimodal study generation, and secure handling of user-owned documents."));
  parts.push(paragraph("Keywords - Adaptive Learning, Retrieval-Augmented Generation, AI Tutor, Supabase, Pinecone, Cloudflare R2, Web Speech API, React, Educational Technology, Classroom Assistant"));
  parts.push(pageBreak());

  parts.push(heading("TABLE OF CONTENTS", 1));
  [
    "ACKNOWLEDGEMENT",
    "ABSTRACT",
    "LIST OF TABLES",
    "LIST OF FIGURES",
    "LIST OF ABBREVIATIONS",
    "Chapter 1: Introduction",
    "Chapter 2: Literature Review",
    "Chapter 3: Requirement Analysis",
    "Chapter 4: Methodology",
    "Chapter 5: System Design",
    "Chapter 6: Implementation",
    "Chapter 7: Testing and Evaluation",
    "Chapter 8: Conclusion",
    "References",
    "Appendices",
  ].forEach((item, i) => parts.push(paragraph(`${i + 1}. ${item}`)));
  parts.push(pageBreak());

  parts.push(heading("LIST OF TABLES", 1));
  [
    "Table 2.1: Reviewed Research Articles Summary",
    "Table 2.2: Reviewed Existing Systems Summary",
    "Table 2.3: Comparison of Existing Systems with Proposed System",
    "Table 3.1: Stakeholder Identification",
    "Table 3.2: Functional Requirements",
    "Table 3.3: Non-Functional Requirements",
    "Table 5.1: Module Design Summary",
    "Table 6.1: Development Environment",
    "Table 7.1: Test Cases and Results",
    "Table 7.2: Evaluation Results",
    "Table E.1: SRS Functional Requirements",
  ].forEach((item) => parts.push(paragraph(item)));
  parts.push(heading("LIST OF FIGURES", 1));
  [
    "Fig 1.1: VibeSchool problem context",
    "Fig 4.1: Iterative development methodology",
    "Fig 4.2: RAG ingestion and answering pipeline",
    "Fig 5.1: System architecture",
    "Fig 5.2: Use case diagram",
    "Fig 5.3: Tutor query sequence diagram",
    "Fig 5.4: Database and storage design",
    "Fig B.1: Project Gantt overview",
  ].forEach((item) => parts.push(paragraph(item)));
  parts.push(heading("LIST OF ABBREVIATIONS", 1));
  parts.push(table([
    ["Abbreviation", "Meaning"],
    ["AI", "Artificial Intelligence"],
    ["API", "Application Programming Interface"],
    ["CORS", "Cross-Origin Resource Sharing"],
    ["DOCX", "Microsoft Word Open XML Document"],
    ["FYP", "Final Year Project"],
    ["JWT", "JSON Web Token"],
    ["LLM", "Large Language Model"],
    ["MCQ", "Multiple Choice Question"],
    ["RAG", "Retrieval-Augmented Generation"],
    ["RLS", "Row Level Security"],
    ["SRS", "Software Requirement Specification"],
    ["TTS", "Text to Speech"],
    ["UI", "User Interface"],
    ["UX", "User Experience"],
  ], { widths: [2200, 6500] }));
  parts.push(pageBreak());

  parts.push(heading("Chapter 1", 1));
  parts.push(heading("Introduction", 1));
  parts.push(section("1.1 Background of the Project", paragraph("Education is increasingly digital, but student workflows are still fragmented. A student may attend a lecture in class, receive slides through a learning management system, download PDFs from teachers, save YouTube links, write scattered notes, and then use a generic chatbot for explanations. These tools are individually useful, but they rarely share context. The result is a learning gap: students can access information, but they cannot easily convert their own course material into level-appropriate lectures, revision sheets, quizzes, roadmaps, diagrams, and live classroom support.") + paragraph("VibeSchool was developed as a comprehensive learning workspace for this problem. Instead of building only a chatbot, the project combines document-grounded AI tutoring, live lecture transcription, adaptive content generation, personalized study sessions, and secure file reuse. It is built as a Vite React TypeScript web application with Supabase for authentication, PostgreSQL metadata, Edge Functions, Cloudflare R2 for file storage, Pinecone for vector retrieval, and Groq-hosted LLM inference. The platform is not a machine-learning training project; it is an applied software engineering project that integrates existing AI, speech, storage, and retrieval services into a cohesive product.") + svgImage("problem_context", problemContextSvg(), 6.4, 2.5) + caption("Fig 1.1: VibeSchool problem context.")));
  parts.push(section("1.2 Problem Statement", paragraph("Students need a secure and personalized platform that can transform their own study material and live classroom content into useful learning outputs. Existing general-purpose AI tools can answer questions, but they may not be grounded in the student's uploaded documents. Existing flashcard and quiz tools often focus on assessment but not live lecture support. Existing note tools may summarize documents but do not provide a full adaptive tutor with diagrams, audio scripts, visual revision sheets, session-specific source control, and classroom Q&A. Therefore, the problem is to design and implement a web-based adaptive AI learning system that securely ingests student documents, retrieves relevant context, generates study outputs, supports live classroom transcription, and maintains user-owned study sessions without leaking content across users or unrelated sessions.")));
  parts.push(section("1.3 Project Gaps", paragraph("The literature and product review revealed the following project gaps:") + bullet([
    "Generic LLM chatbots are not reliably grounded in a student's actual course documents unless the application adds document retrieval and source scoping [1].",
    "Many study platforms provide flashcards or quizzes, but do not combine document-aware tutoring, classroom transcription, visual diagrams, audio lesson formats, and study roadmaps in one workflow.",
    "Document-based AI tools often treat the uploaded notebook as one context, while VibeSchool adds explicit session-level source selection so unrelated files are not silently searched.",
    "Speech-based classroom tools are often separate from study material generators; VibeSchool connects live transcript capture, question detection, answers, and note generation.",
    "Student privacy is often handled vaguely in prototypes. VibeSchool implements JWT verification, RLS, CORS restrictions, rate limits, file validation, and metadata-filtered vector retrieval.",
  ])));
  parts.push(section("1.4 Aim / Purpose of the Project", paragraph("The aim of VibeSchool is to develop an adaptive AI-powered educational platform that helps students learn from their own documents, classroom discussions, and preferred learning style. The purpose is not to replace teachers, but to provide a dependable study companion that can explain, test, visualize, summarize, and organize learning material after class and during independent study.")));
  parts.push(section("1.5 Project Objectives", paragraph("The main objectives of this project are:") + bullet([
    "To design and develop a responsive web application for AI-assisted learning.",
    "To implement authenticated user accounts, profile management, and personalized learning preferences.",
    "To allow students to upload PDF, TXT, and DOCX documents for use as study sources.",
    "To process uploaded documents into searchable chunks using extraction, chunking, embedding, and vector indexing.",
    "To implement RAG-based tutoring that retrieves only the user's authorized and active session documents.",
    "To generate lectures, flashcards, podcasts, reel scripts, MCQs, rapid-fire quizzes, diagrams, visual cheat sheets, and roadmaps.",
    "To implement live classroom transcription, question detection, instant answers, and transcript-to-notes generation.",
    "To implement security controls including JWT validation, RLS, file validation, CORS allowlisting, and rate limiting.",
    "To evaluate the system through functional, usability, integration, security, and build verification tests.",
  ])));
  parts.push(section("1.6 Project Scope", paragraph("The project scope includes a production-oriented web application, Supabase backend services, document upload and ingestion, RAG-based answer generation, session management, classroom mode, UI components, and deployment configuration. The system supports browser-based usage on desktop and mobile screens. It supports PDF, TXT, and DOCX text extraction where the file contains extractable text. It does not train a custom machine-learning model, perform OCR on scanned images, or provide a full institutional LMS. The current version is focused on individual student learning rather than teacher administration, grading workflows, or classroom-wide analytics.")));
  parts.push(section("1.7 Organization of the Report", paragraph("Chapter 1 introduces the project background, problem, gaps, aim, objectives, and scope. Chapter 2 reviews literature and existing educational AI systems. Chapter 3 presents stakeholders, requirement gathering, functional requirements, non-functional requirements, assumptions, and constraints. Chapter 4 explains the development and implementation methodology. Chapter 5 presents architecture, UML-style design, database design, modules, and sequences. Chapter 6 documents implementation details, development environment, database implementation, functional modules, security, integration, and deployment. Chapter 7 presents testing and evaluation. Chapter 8 concludes the project, highlights novelty and industry contribution, and proposes future directions. Appendices include dataset notes, Gantt chart, plagiarism report placeholder, installation details, and the SRS.")));
  parts.push(section("1.8 Chapter Summary", paragraph("This chapter established VibeSchool as a secure, adaptive, document-aware learning platform. The problem is not merely a lack of AI answers, but a lack of grounded, personalized, and integrated study workflows. The next chapter reviews the academic and product context behind the chosen solution.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 2", 1));
  parts.push(heading("Literature Review", 1));
  parts.push(section("2.1 Introduction", paragraph("This chapter reviews research and existing systems relevant to VibeSchool. The review focuses on RAG, evidence-aware generation, speech recognition, adaptive tutoring, and educational products that transform notes or documents into study outputs.")));
  parts.push(heading("2.2 Reviewed Research Articles Summary", 2));
  parts.push(table([
    ["Ref.", "Article / Source", "Key Contribution", "Relevance to VibeSchool"],
    ["[1]", "Lewis et al., Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks", "Introduced RAG as a combination of parametric language models and non-parametric retrieved memory.", "Supports the project's decision to retrieve document chunks instead of relying only on model memory."],
    ["[2]", "Guu et al., REALM", "Shows retrieval-augmented pretraining for open-domain QA and emphasizes retrievers as explicit knowledge access.", "Supports vector retrieval as a core design pattern for grounded answers."],
    ["[3]", "Asai et al., Evidentiality-guided Generation", "Discusses the importance of relevant evidence for generation quality.", "Motivates source filtering, active session sources, and context quality checks."],
    ["[4], [5]", "MDN Web Speech API and SpeechRecognition", "Documents browser speech recognition and synthesis interfaces, including limitations and browser support concerns.", "Supports Classroom mode design and explains browser compatibility constraints."],
    ["[6]", "Supabase Row Level Security", "Explains RLS policies for secure browser-accessible databases.", "Directly informs VibeSchool's user-owned tables and session/document policies."],
    ["[7]", "Pinecone metadata filtering", "Describes filtering vector searches by metadata.", "Used for document_id and user_id scoping in RAG retrieval."],
  ], { widths: [900, 2500, 3000, 3000] }));
  parts.push(heading("2.3 Reviewed Existing Systems Summary", 2));
  parts.push(table([
    ["System", "Main Features", "Limitations Observed", "Learning for Proposed System"],
    ["Khanmigo", "AI tutor experience for guided learning and academic support.", "Primarily tied to Khan Academy's ecosystem and not a custom document RAG workspace.", "Guided tutoring should support student reasoning, not only final answers."],
    ["NotebookLM", "Source-grounded document assistant with summaries and audio overviews.", "Strong document workflows but not a live classroom cockpit or customizable study studio inside the same app.", "Grounding answers in uploaded sources reduces hallucination risk."],
    ["Quizlet", "Flashcards, practice tests, study guides, and AI-assisted learning features.", "Assessment-centered; less emphasis on RAG session scoping and live lecture capture.", "Fast quizzes and recall tools are important for retention."],
    ["Duolingo Max", "AI explanations and roleplay for language learning.", "Domain-specific to language learning rather than general academic documents.", "Interactive feedback and conversational practice improve engagement."],
    ["Generic ChatGPT-style tools", "Flexible conversation and explanation generation.", "Unless engineered carefully, they may lack file ownership, source boundaries, and classroom workflows.", "A product must wrap the model with retrieval, security, and pedagogy."],
  ], { widths: [1700, 2700, 3200, 2500] }));
  parts.push(heading("2.4 Comparison of Existing Systems with Proposed System", 2));
  parts.push(table([
    ["Feature", "Khanmigo", "NotebookLM", "Quizlet", "Generic Chatbots", "VibeSchool"],
    ["Document-grounded RAG", "Limited/custom curriculum", "Yes", "Partial", "Optional", "Yes, with session source control"],
    ["Live classroom transcription", "No", "No", "Partial through acquired/adjacent tools", "No native classroom cockpit", "Yes"],
    ["Study output diversity", "Tutor guidance", "Summaries/audio", "Flashcards/quizzes", "General text", "Lectures, flashcards, podcasts, reels, quizzes, diagrams, visuals, roadmaps"],
    ["User-owned source library", "No", "Notebook-based", "Study-set based", "Depends on tool", "Yes, reusable library with explicit attach"],
    ["Security by design", "Platform-managed", "Platform-managed", "Platform-managed", "Varies", "JWT, RLS, CORS, rate limits, MIME validation, metadata filters"],
    ["Local/degraded fallback", "No", "No", "No", "No", "Yes for selected classroom and content features"],
  ], { widths: [2100, 1500, 1600, 1500, 1800, 2500] }));
  parts.push(section("2.5 Project Gap Analysis", paragraph("The proposed system fills a combined gap rather than a single feature gap. VibeSchool joins four capabilities that are usually separate: source-grounded document tutoring, live classroom capture, adaptive learning format generation, and secure session-based file reuse. The RAG model is designed with strict ownership and active-source boundaries, which is important because educational files may contain personal notes, assignments, institution-specific documents, or paid course material. The platform also recognizes that students learn differently; some prefer short flashcards, some need diagrams, some need a strict exam-style quiz, and some benefit from audio or conversational formats.")));
  parts.push(section("2.6 Chapter Summary", paragraph("The reviewed literature supports retrieval grounding, evidence relevance, and secure authorization. The reviewed systems show that AI education products are growing, but many focus on one workflow. VibeSchool's contribution is the integration of source-aware tutoring, live classroom assistance, and multimodal study generation inside a secure student workspace.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 3", 1));
  parts.push(heading("Requirement Analysis", 1));
  parts.push(section("3.1 Introduction", paragraph("Requirement analysis defines what VibeSchool must do for students and what quality constraints it must satisfy. The requirements were derived from project goals, review feedback, inspection of student study workflows, and iterative implementation testing.")));
  parts.push(heading("3.2 Stakeholder Identification", 2));
  parts.push(table([
    ["Stakeholder", "Role / Interest", "Needs"],
    ["Student", "Primary user", "Upload study material, ask questions, generate notes, quizzes, visuals, and plans."],
    ["Teacher / Lecturer", "Indirect beneficiary", "Students can revise lectures and clarify doubts without interrupting class flow."],
    ["Supervisor / Evaluator", "Academic reviewer", "Needs evidence of design, implementation, testing, security, and documentation."],
    ["System Administrator", "Deployment and maintenance", "Needs secure configuration, environment variables, and monitoring."],
    ["External Service Providers", "Supabase, Pinecone, R2, Groq", "Provide auth, storage, vector retrieval, and AI inference services."],
  ], { widths: [2100, 3000, 4500] }));
  parts.push(section("3.3 Requirement Gathering Techniques", paragraph("Requirements were gathered through competitor analysis, literature review, user workflow observation, iterative prototyping, code-level feasibility checks, and testing feedback. The implementation evolved from a basic AI tutor into a full platform after identifying the need for document processing, source libraries, sessions, classroom mode, visual outputs, and security hardening.")));
  parts.push(heading("3.4 Functional Requirements", 2));
  parts.push(table([
    ["ID", "Requirement", "Priority"],
    ["FR-01", "The system shall allow users to register, login, and maintain authenticated sessions.", "High"],
    ["FR-02", "The system shall allow users to edit profile name and avatar.", "Medium"],
    ["FR-03", "The system shall allow upload of PDF, TXT, and DOCX files after server-side validation.", "High"],
    ["FR-04", "The system shall extract text, chunk content, generate embeddings, and store vectors for retrieval.", "High"],
    ["FR-05", "The system shall maintain a reusable document library with processing status and storage usage.", "High"],
    ["FR-06", "The system shall allow users to create Vibe Sessions and attach active source documents.", "High"],
    ["FR-07", "The AI tutor shall generate lectures, flashcards, podcasts, reel scripts, quizzes, diagrams, and study plans.", "High"],
    ["FR-08", "The system shall retrieve context only from authorized and active session sources.", "High"],
    ["FR-09", "The classroom mode shall capture live speech, maintain transcript, detect questions, and generate notes.", "High"],
    ["FR-10", "The system shall render Mermaid diagrams and KaTeX mathematical notation safely.", "Medium"],
    ["FR-11", "The system shall generate visual cheat sheet data from uploaded study material.", "Medium"],
    ["FR-12", "The system shall provide local fallback generation for selected features when backend AI is unavailable.", "Medium"],
  ], { widths: [900, 7200, 1200] }));
  parts.push(heading("3.5 Non-Functional Requirements", 2));
  parts.push(table([
    ["Category", "Requirement"],
    ["Security", "All protected Edge Functions must verify JWT access tokens and derive user_id from Supabase Auth."],
    ["Privacy", "RAG retrieval must filter by user_id and selected document_id values so one user's files cannot affect another user's answers."],
    ["Performance", "The app should build into optimized static assets and keep AI input payloads within defined limits."],
    ["Usability", "The interface must support common student actions from the first dashboard screen and remain usable on mobile."],
    ["Reliability", "Document processing failures must mark files as failed and clean temporary storage where possible."],
    ["Maintainability", "Core logic should be separated into pages, components, shared libraries, Edge Functions, and migrations."],
    ["Scalability", "Vector storage, R2 object storage, and serverless functions should allow future scale beyond local file storage."],
    ["Compatibility", "The application should run in modern browsers; Classroom speech recognition depends on browser support."],
    ["Auditability", "Security-sensitive behaviors should be documented in migrations, shared helpers, and security report."],
    ["Accessibility", "The UI should use semantic buttons, labels, readable cards, and responsive layouts."],
  ], { widths: [1800, 7600] }));
  parts.push(section("3.6 Assumptions and Constraints", paragraph("Assumptions include availability of Supabase, Pinecone, Cloudflare R2, Groq, and browser speech recognition support. The system assumes uploaded documents contain extractable text; scanned or password-protected PDFs are outside the current scope. The application depends on configured environment variables and service secrets. Since this is a non-ML based FYP implementation, no custom model training dataset is required; the system integrates existing AI services through controlled prompts and retrieval.")));
  parts.push(section("3.7 Chapter Summary", paragraph("This chapter converted the project idea into concrete requirements. The most important requirements are secure authentication, document ingestion, session-scoped RAG, multimodal generation, live classroom support, and privacy-preserving source boundaries.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 4", 1));
  parts.push(heading("Methodology", 1));
  parts.push(section("4.1 Introduction", paragraph("The project followed an iterative engineering methodology. Each iteration delivered a visible user workflow and then hardened it with backend integration, validation, and security improvements. This approach was suitable because the project combines UI, AI prompts, vector retrieval, file ingestion, speech APIs, and serverless services.")));
  parts.push(section("4.2 Development Methodology", paragraph("The development methodology was iterative and incremental. The first increment focused on the React interface and core AI tutor experience. The second increment added document upload and RAG. The third increment added sessions and reusable source libraries. The fourth increment added Classroom mode. The fifth increment hardened security and deployment. The final increment focused on testing, documentation, and report preparation.")));
  parts.push(svgImage("methodology_gantt", ganttSvg(), 6.5, 2.5));
  parts.push(caption("Fig 4.1: Iterative development methodology and schedule overview."));
  parts.push(section("4.3 System Implementation Methodology", paragraph("The implementation methodology follows a secure request pipeline. On the client, the user selects a mode, profile, source documents, and learning output. The frontend retrieves the current Supabase session token and invokes an Edge Function. The Edge Function validates method, body size, token, user identity, allowed enum values, and rate limits. For document-grounded requests, it resolves the active session sources, validates document ownership, retrieves matching vector chunks from Pinecone using user_id and document_id filters, constructs an adaptive system prompt, calls the LLM, and returns content plus suggestions. For document uploads, the system validates file type and size, stages the file, extracts text, chunks and filters it, generates embeddings, upserts vectors, stores the file in R2, and updates metadata.") + paragraph("Document ingestion algorithm: validate request and JWT; validate extension, MIME type, and file header; sanitize file name; check storage and rate limits; create a document metadata row; upload temporary object; extract text page-wise; split text into overlapping chunks; remove weak or duplicate chunks; generate embeddings; upsert vectors with user_id and document_id metadata; move the original file into permanent R2 storage; update status, hash, size, processed_at, and chunk_count.") + paragraph("Tutor answering algorithm: receive topic, mode, source, and learner profile; verify JWT; load active session sources; validate document ownership; embed the query; retrieve top-K chunks with user_id/document_id filters; construct a source-first prompt with education-level, mood, learning style, time, and goal constraints; call the LLM; return generated content and suggestions; render the result through mode-specific UI components.") + paragraph("Classroom algorithm: initialize SpeechRecognition in continuous/interim mode; append final transcript chunks; inspect chunks for question words, math patterns, or question marks; call the classroom prompt route with the current JWT; fall back to local classroomEngine when the backend fails; store Q&A history; generate notes from the final transcript.")));
  parts.push(svgImage("rag_pipeline", ragSvg(), 6.7, 1.85));
  parts.push(caption("Fig 4.2: RAG ingestion and answering methodology."));
  parts.push(section("4.4 Chapter Summary", paragraph("The methodology emphasizes incremental delivery and secure integration. Rather than relying on a single AI call, VibeSchool implements a controlled pipeline around authentication, retrieval, prompting, rendering, and fallback behavior.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 5", 1));
  parts.push(heading("System Design", 1));
  parts.push(section("5.1 Introduction", paragraph("System design explains how the frontend, backend, database, vector store, file storage, and AI services work together. The design follows modular separation: UI pages and components handle interaction; shared libraries handle client API calls and fallback engines; Supabase Edge Functions handle trusted backend logic; database migrations define ownership and session models; external services handle storage, retrieval, and AI inference.")));
  parts.push(heading("5.2 System Architecture / System Diagram", 2));
  parts.push(svgImage("system_architecture", architectureSvg(), 6.7, 3.8));
  parts.push(caption("Fig 5.1: VibeSchool system architecture."));
  parts.push(paragraph("The frontend is built with React, TypeScript, Tailwind CSS, Shadcn UI primitives, Lucide icons, Mermaid, KaTeX, and React Query. Supabase provides authentication, database access, storage metadata, Edge Functions, and RLS. Cloudflare R2 stores original user files. Pinecone stores vector chunks and supports metadata filtering. Groq provides OpenAI-compatible chat completions. A Node document worker can process queued document ingestion jobs outside the synchronous Edge Function path."));
  parts.push(heading("5.3 UML Design", 2));
  parts.push(svgImage("use_case", useCaseSvg(), 6.1, 4.0));
  parts.push(caption("Fig 5.2: Use case diagram for VibeSchool."));
  parts.push(svgImage("sequence_tutor_query", sequenceSvg(), 6.7, 3.1));
  parts.push(caption("Fig 5.3: Sequence diagram for a source-grounded tutor query."));
  parts.push(heading("5.4 Database Design", 2));
  parts.push(svgImage("database_erd", erdSvg(), 6.5, 3.8));
  parts.push(caption("Fig 5.4: Database and storage design."));
  parts.push(paragraph("The central database entities are profiles, documents, sessions, and session_documents. The documents table stores metadata such as document_id, user_id, file_name, processing_status, chunk_count, file_hash, processed_at, and size_bytes. The sessions table stores named workspaces. The session_documents table links sessions to documents and includes is_active so a user can keep a file in the global library but remove it from a specific session context. External stores are deliberately kept outside the relational database: R2 holds file objects and Pinecone holds vector records with user_id, document_id, chunk_index, page_number, and text metadata."));
  parts.push(table([
    ["Entity", "Important Fields", "Purpose"],
    ["profiles", "id, full_name, avatar_url, updated_at", "Stores user profile display information linked to Supabase Auth."],
    ["documents", "document_id, user_id, file_name, processing_status, chunk_count, file_hash, size_bytes", "Tracks uploaded source files and their processing state."],
    ["sessions", "id, user_id, title, subject, created_at, updated_at, last_opened_at", "Represents named study workspaces."],
    ["session_documents", "session_id, document_id, is_active, added_at", "Controls which library files are active sources for a session."],
    ["R2 object", "files/user_id/document_id/file_name", "Stores original user documents outside the database."],
    ["Pinecone vector", "id, values, user_id, document_id, chunk_index, page_number, text", "Supports semantic retrieval with ownership filters."],
  ], { widths: [1900, 3900, 3800] }));
  parts.push(heading("5.5 Module Design", 2));
  parts.push(table([
    ["Module", "Files / Components", "Responsibility"],
    ["Landing and Navigation", "Index, Navbar, AppShell, Footer", "Public entry, routing, layout, and navigation."],
    ["Dashboard", "Dashboard, VibeSessionsCard, StorageLibraryCard", "Shows profile summary, sessions, file library, storage usage, and study shortcuts."],
    ["AI Tutor / Transform", "Transform.tsx, aiEngine.ts, sessionsApi.ts", "Generates learning outputs, manages study studio, renders Mermaid/KaTeX, handles source selection."],
    ["Classroom", "Classroom.tsx, classroomEngine.ts", "Captures live speech, detects questions, answers, bookmarks moments, generates notes."],
    ["Profile", "Profile.tsx", "Allows profile name and avatar management with validation."],
    ["Document Ingestion", "process-document, create-document-upload, enqueue-document-processing, document-worker", "Validates uploads, extracts text, chunks, embeds, stores files/vectors, updates status."],
    ["AI Backend", "transform-vibe, generate-visual-aids, deepgram-tts, edge-tts", "Handles LLM calls, visual aid data, audio generation, and secure request processing."],
    ["Security", "security.ts, cors.ts, security_hardening.sql", "JWT checks, CORS, RLS, logout cleanup, rate limiting, sanitization."],
  ], { widths: [1800, 3100, 4900] }));
  parts.push(section("5.6 Chapter Summary", paragraph("The design provides a clear separation between presentation, trusted backend processing, persistent metadata, object storage, vector retrieval, and AI generation. This separation improves maintainability and makes the security model easier to verify.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 6", 1));
  parts.push(heading("Implementation", 1));
  parts.push(section("6.1 Introduction", paragraph("This chapter documents how VibeSchool was implemented in code. The project is a TypeScript React application with serverless Supabase backend functions and supporting migrations. The implementation emphasizes practical product workflows and security rather than model training.")));
  parts.push(heading("6.2 Development Environment", 2));
  parts.push(table([
    ["Area", "Technology"],
    ["Frontend", "React 18, TypeScript, Vite, Tailwind CSS, Shadcn UI, Lucide React, Framer Motion"],
    ["Routing / State", "React Router DOM, React Query, local VibeProvider context"],
    ["Rendering", "Mermaid for diagrams, KaTeX for math, Canvas export for cheat sheets"],
    ["Backend", "Supabase Auth, PostgreSQL, Edge Functions in Deno runtime"],
    ["Document Processing", "PDF.js / pdfjs-serverless, JSZip, custom chunking and scoring"],
    ["Storage", "Cloudflare R2 for files, Supabase metadata tables"],
    ["Vector Search", "Pinecone with metadata filters"],
    ["AI Inference", "Groq OpenAI-compatible chat completions, Supabase AI gte-small embeddings"],
    ["Deployment", "Vite static build, Supabase functions, Railway worker config, Vercel/Railway configuration files"],
  ], { widths: [2200, 7200] }));
  parts.push(section("6.3 Database Implementation", paragraph("Database implementation is defined through Supabase migrations. The documents table stores uploaded file metadata and status. The sessions table stores named workspaces for students. The session_documents table links selected files to sessions. Row Level Security policies ensure that users can only manage their own profiles, documents, sessions, and session-document links. The security hardening migration also protects legacy materials, document_sections, chat tables if present, and avatar storage paths.")));
  parts.push(section("6.4 Functional Modules Implementation", paragraph("The Dashboard module loads the authenticated user profile, displays action cards, lists Vibe Sessions, and shows storage usage. The Transform module is the largest feature module. It handles study mode selection, source attachment, tutor prompts, learning profile controls, output rendering, visual aid generation, TTS controls, and interactive quizzes. The Classroom module initializes the browser SpeechRecognition API, captures interim and final transcript chunks, detects question-like speech, calls transform-vibe with a classroom prompt, stores Q&A history, and generates notes from the final transcript. The Profile module handles profile upsert and avatar upload validation. Edge Functions implement trusted backend processing for AI generation, document ingestion, visual aids, TTS, storage usage, file deletion, temporary cleanup, and sessions.")));
  parts.push(paragraph("Important implementation files include src/pages/Transform.tsx, src/pages/Classroom.tsx, src/pages/Dashboard.tsx, src/lib/aiEngine.ts, src/lib/classroomEngine.ts, src/lib/sessionsApi.ts, supabase/functions/transform-vibe/index.ts, supabase/functions/process-document/index.ts, supabase/functions/sessions/index.ts, supabase/functions/generate-visual-aids/index.ts, workers/document-worker.mjs, and supabase/migrations/20260709000000_vibe_sessions.sql."));
  parts.push(table([
    ["Backend Function", "Purpose", "Security / Validation"],
    ["transform-vibe", "Main AI tutor and classroom answer generation.", "JWT verification, body limits, enum validation, rate limit, RAG source ownership."],
    ["process-document", "Synchronous document ingestion.", "JWT verification, MIME/header validation, storage cap, upload rate limit."],
    ["enqueue-document-processing", "Queues upload jobs for worker processing.", "Authenticated upload staging and metadata status management."],
    ["sessions", "Creates, lists, opens, renames, deletes sessions and toggles active sources.", "Owned session checks and owned document checks."],
    ["generate-visual-aids", "Builds visual cheat sheet data and optional image prompts.", "JWT verification, context limits, document ownership, visual rate limit."],
    ["get-storage-usage", "Returns used and allowed storage.", "Authenticated user scope."],
    ["delete-document", "Deletes document metadata and related storage/vector data.", "Authenticated ownership check."],
    ["cleanup-temp-storage", "Removes stale temporary uploads.", "Operational cleanup function."],
  ], { widths: [2300, 4000, 3400] }));
  parts.push(section("6.5 Security Implementation", paragraph("Security was implemented at multiple layers. Frontend protected calls include the current Supabase access token. Edge Functions verify Authorization headers and call supabase.auth.getUser(token), so user_id is never trusted from client input. RLS policies restrict database rows by ownership. Document upload validation checks allowed extensions, MIME types, and file headers. File names are sanitized and R2 keys do not depend on raw user-provided paths. AI, visual, upload, and TTS functions enforce size and rate limits. Pinecone queries include user_id filters and document_id filters so retrieval cannot cross users or unrelated sessions. Mermaid rendering uses strict mode and sanitizes SVG output before insertion. Logout clears sensitive browser storage.")));
  parts.push(section("6.6 System Integration and Deployment", paragraph("The integration path connects Vite static frontend assets with Supabase Edge Functions and external services. The frontend requires public Vite variables for Supabase URL and publishable key. Edge Functions require service secrets such as SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_HOST, R2 credentials, and optional TTS/image generation keys. Deployment configuration exists for Vercel, Railway, Wrangler, and Supabase. The build script uses Vite and removes a dist redirect artifact in postbuild. The document worker can be run through npm run worker:documents for queued processing.")));
  parts.push(section("6.7 Chapter Summary", paragraph("The implementation delivers the planned system as a functional web platform with secure backend services. The most significant implementation achievement is the integration of RAG, sessions, classroom speech capture, adaptive output generation, and security hardening into one coherent application.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 7", 1));
  parts.push(heading("Testing and Evaluation", 1));
  parts.push(section("7.1 Introduction", paragraph("Testing and evaluation focused on proving that the implemented system works across core workflows and does not violate security assumptions. Since the system integrates external services, tests include local build verification, function-level review, UI workflow testing, and security hardening checks.")));
  parts.push(section("7.2 Testing Objectives", bullet([
    "Verify that authenticated users can access dashboard, profile, transform, classroom, and subject pages.",
    "Verify that document uploads are accepted only for allowed file types and rejected for invalid files.",
    "Verify that processed documents can be used as active session sources for RAG answers.",
    "Verify that unrelated or inactive documents are not automatically used in answers.",
    "Verify that classroom transcription, question detection, and notes generation work with browser support.",
    "Verify that Mermaid and KaTeX rendering do not execute unsafe content.",
    "Verify that protected Edge Functions reject unauthenticated calls.",
    "Verify that production build completes successfully.",
  ])));
  parts.push(section("7.3 Testing Strategy", paragraph("The testing strategy combined manual workflow tests, build tests, code inspection, and security tests. Manual tests were appropriate for AI output workflows because output quality depends on prompts, selected mode, source files, and external model responses. Build verification ensured that the TypeScript/Vite project compiles. Security tests focused on authentication headers, RLS policies, file validation, rate limits, and sanitized rendering.")));
  parts.push(heading("7.4 Test Cases and Test Results", 2));
  parts.push(table([
    ["TC", "Test Case", "Expected Result", "Status"],
    ["TC-01", "Open landing page and navigate to auth.", "Public pages load and route correctly.", "Pass"],
    ["TC-02", "Authenticated user opens dashboard.", "Profile summary, action cards, sessions, and storage cards render.", "Pass"],
    ["TC-03", "Create a Vibe Session.", "Session row is created and user is navigated to Transform with session id.", "Pass"],
    ["TC-04", "List library files.", "Only current user's documents are returned.", "Pass"],
    ["TC-05", "Upload valid PDF/TXT/DOCX.", "File is validated, processed, chunked, embedded, and marked processed.", "Pass"],
    ["TC-06", "Upload unsupported extension or MIME.", "Upload is rejected with an error.", "Pass"],
    ["TC-07", "Ask a question with an active source.", "RAG retrieves relevant chunks and generates a grounded answer.", "Pass"],
    ["TC-08", "Ask without active source.", "System answers from general knowledge and does not search all user uploads.", "Pass"],
    ["TC-09", "Generate MCQs.", "Exactly 10 formatted MCQs are returned and rendered.", "Pass"],
    ["TC-10", "Generate rapid-fire quiz.", "Short-answer questions are generated and graded by keyword matching.", "Pass"],
    ["TC-11", "Generate Mermaid flowchart.", "Diagram renders or shows syntax error safely.", "Pass"],
    ["TC-12", "Render math formula.", "KaTeX renders math without crashing page.", "Pass"],
    ["TC-13", "Use Classroom mode in supported browser.", "Speech transcript updates and questions are detected.", "Pass"],
    ["TC-14", "Finish lecture.", "Transcript converts into structured Markdown notes.", "Pass"],
    ["TC-15", "Call Edge Function without JWT.", "Request is rejected with unauthorized response.", "Pass"],
    ["TC-16", "Logout.", "Session ends and sensitive client state is cleared.", "Pass"],
    ["TC-17", "Production build.", "Vite build completes successfully.", "Pass"],
  ], { widths: [800, 3600, 3900, 1000] }));
  parts.push(section("7.5 Bug Tracking and Error Handling", paragraph("Important bugs addressed during development included unauthenticated function calls, wildcard CORS behavior, raw upstream error leakage, permissive legacy policies, unsafe Mermaid SVG insertion, direct browser TTS fallback, upload validation weaknesses, and session source leakage risk. Error handling now marks failed documents, cleans temporary storage, returns safe messages where appropriate, falls back to local content engines in selected workflows, and shows user-facing toast notifications.")));
  parts.push(section("7.6 Evaluation Criteria", paragraph("The system was evaluated against functionality, security, usability, maintainability, performance feasibility, and educational usefulness. Functionality checks whether each planned module works. Security checks whether protected data is isolated. Usability checks whether students can start learning from the dashboard without reading instructions. Maintainability checks whether files are organized into pages, components, shared libraries, migrations, functions, and worker. Educational usefulness checks whether outputs are varied enough to support revision, explanation, practice, and live lecture support.")));
  parts.push(heading("7.7 Evaluation Results", 2));
  parts.push(table([
    ["Criteria", "Result"],
    ["Functionality", "Core workflows were implemented: authentication, dashboard, sessions, library, document upload, RAG tutor, quizzes, visuals, classroom, notes, profile."],
    ["Security", "Security hardening was implemented with JWT checks, RLS, CORS allowlists, file validation, rate limits, metadata filters, and logout cleanup."],
    ["Usability", "Dashboard entry points and study studio controls make the main workflows discoverable."],
    ["Maintainability", "Frontend, backend, migrations, worker, and shared helpers are separated clearly."],
    ["Scalability", "The design uses managed auth, object storage, vector database, and serverless functions; durable rate limiting remains future work."],
    ["Educational Value", "The system supports multiple learning styles and output formats, reducing dependence on a single explanation format."],
  ], { widths: [2000, 7400] }));
  parts.push(section("7.8 Chapter Summary", paragraph("Testing confirms that VibeSchool satisfies the major FYP requirements. The system is functional, secure at the application level, and ready for demonstration. Remaining limitations are mostly production-hardening improvements, not blockers for the FYP implementation.")));
  parts.push(pageBreak());

  parts.push(heading("Chapter 8", 1));
  parts.push(heading("Conclusion", 1));
  parts.push(section("8.1 Introduction", paragraph("This chapter concludes the report by summarizing the completed work, novelty, industry contribution, and future directions.")));
  parts.push(section("8.2 Conclusion", paragraph("VibeSchool successfully implements a secure adaptive AI learning platform that combines document-grounded tutoring, live classroom assistance, personalized study settings, reusable sessions, source libraries, quizzes, diagrams, visual revision aids, audio-oriented outputs, and study planning. The project demonstrates that a Final Year Project can go beyond a simple AI chatbot by engineering the surrounding product system: authentication, file validation, storage, vector search, prompt guardrails, rendering, fallback logic, and security policies.")));
  parts.push(section("8.3 Contribution / Novelty", bullet([
    "Session-scoped RAG where files must be explicitly active sources before affecting answers.",
    "Integration of AI tutor and live classroom cockpit in one student-centered workspace.",
    "Multiple study formats generated from the same source context: lecture, flashcards, podcast, reel, MCQ, rapid-fire, visual diagrams, cheat sheets, and roadmap.",
    "Security hardening designed into the FYP implementation rather than treated as an afterthought.",
    "Client fallback engines that preserve selected functionality when backend AI services are unavailable.",
  ])));
  parts.push(section("8.4 Contribution towards Industry", paragraph("VibeSchool is relevant to EdTech, universities, tuition centers, and self-learning platforms. It shows how institutions can build source-grounded AI support around existing course material without training a custom model. The session/source model is especially useful for privacy-sensitive academic environments because it prevents accidental mixing of unrelated documents. The architecture can be extended into institutional dashboards, teacher-controlled sources, classroom analytics, and LMS integrations.")));
  parts.push(section("8.5 Future Directions", bullet([
    "Add OCR support for scanned PDFs and handwritten notes.",
    "Implement durable distributed rate limiting using Redis, Upstash, or database-backed counters.",
    "Add automated RLS and Edge Function integration tests.",
    "Add teacher/admin workspaces for course-level source packs.",
    "Add citation display with page/chunk references in every RAG answer.",
    "Add offline-first notes caching and PWA support.",
    "Add subscription and quota enforcement from a reliable billing source.",
    "Add malware scanning and content moderation for uploaded files.",
    "Add richer analytics for study progress and quiz performance.",
  ])));
  parts.push(section("8.6 Chapter Summary", paragraph("The project meets its goal of delivering a comprehensive AI-powered learning system. Its strongest contribution is the combination of adaptive educational outputs, document grounding, live classroom support, and secure session-based source management.")));
  parts.push(pageBreak());

  parts.push(heading("References", 1));
  references.forEach((ref, index) => parts.push(paragraph(`[${index + 1}] ${ref}`)));
  parts.push(pageBreak());

  parts.push(heading("Appendices", 1));
  parts.push(heading("Appendix A: Dataset / Source Material", 2));
  parts.push(paragraph("VibeSchool is a non-ML based software project and does not train a custom dataset. The system works with user-uploaded study documents at runtime. For testing, sample PDFs, TXT files, DOCX files, transcripts, and topic prompts can be used. The ingestion pipeline extracts text, chunks it, filters noisy chunks, generates embeddings, and stores vector metadata. The effective runtime dataset is therefore each user's private document library."));
  parts.push(table([
    ["Data Type", "Purpose", "Storage / Handling"],
    ["PDF", "Course notes, slides exported as PDF, handouts with extractable text", "Validated, extracted, chunked, stored in R2, vectors in Pinecone"],
    ["TXT", "Plain notes or copied transcripts", "Validated as text, extracted directly"],
    ["DOCX", "Assignments, notes, report files", "Extracted with JSZip from Word XML"],
    ["Live transcript", "Classroom lecture capture", "Stored locally in page state for current session notes"],
    ["Generated outputs", "Lectures, quizzes, visuals, roadmaps", "Rendered in UI; can be copied/downloaded depending on format"],
  ], { widths: [1800, 3600, 4200] }));
  parts.push(heading("Appendix B: Gantt Chart", 2));
  parts.push(svgImage("gantt_chart", ganttSvg(), 6.7, 2.55));
  parts.push(caption("Fig B.1: Project Gantt chart."));
  parts.push(table([
    ["Phase", "Activities"],
    ["Research and Planning", "Problem selection, existing system review, architecture decisions."],
    ["Frontend Prototype", "Landing page, dashboard, transform page, classroom page, profile page."],
    ["RAG Backend", "Document validation, extraction, chunking, embeddings, Pinecone, R2."],
    ["Sessions and Library", "Vibe Sessions, active sources, storage usage, reusable files."],
    ["Security Hardening", "JWT checks, RLS, CORS, rate limits, sanitization, upload constraints."],
    ["Testing and Documentation", "Functional tests, build verification, report and appendices."],
  ], { widths: [2500, 6900] }));
  parts.push(heading("Appendix C: Plagiarism Report", 2));
  parts.push(paragraph("The official plagiarism report should be attached here after submission to the university plagiarism checking system. This generated report leaves this appendix as a placeholder because the plagiarism report is an external document produced by the institution-approved tool."));
  parts.push(heading("Appendix D: Installation and Configuration", 2));
  parts.push(bullet([
    "Install Node.js and npm.",
    "Run npm install in the project directory.",
    "Create a .env file with VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, and other public Vite variables.",
    "Configure Supabase Edge Function secrets for SUPABASE_SERVICE_ROLE_KEY, GROQ_API_KEY, PINECONE_API_KEY, PINECONE_INDEX_HOST, R2 credentials, and optional TTS/image keys.",
    "Run npm run dev for local frontend development.",
    "Run npm run build to create the production build.",
    "Deploy Supabase migrations and Edge Functions before using protected backend features.",
    "Run npm run worker:documents when using the queued document worker path.",
  ]));
  parts.push(heading("Appendix E: Software Requirement Specification (SRS)", 2));
  parts.push(heading("E.1 Introduction", 3));
  parts.push(paragraph("The SRS describes the expected behavior of VibeSchool as an adaptive AI learning platform. The system is intended for students who want to transform course documents and lectures into personalized study material."));
  parts.push(heading("E.2 Product Functions", 3));
  parts.push(bullet(["Authentication and profile management.", "Document upload, validation, processing, and library reuse.", "Session creation and active source selection.", "Document-grounded AI tutoring.", "Classroom speech transcription and notes.", "Quiz, flashcard, diagram, audio script, visual aid, and roadmap generation.", "Security controls and user data isolation."]));
  parts.push(heading("E.3 User Characteristics", 3));
  parts.push(paragraph("Primary users are school, college, and university students with basic web literacy. Users are not expected to understand RAG, vector stores, or prompt engineering. The UI therefore exposes simple controls for topic, source, mood, level, time, and output type."));
  parts.push(heading("E.4 Functional Requirements", 3));
  parts.push(table([
    ["ID", "SRS Requirement"],
    ["SRS-FR-01", "The system shall authenticate users before giving access to dashboard and study tools."],
    ["SRS-FR-02", "The system shall allow users to upload only supported file types."],
    ["SRS-FR-03", "The system shall store document metadata and processing status."],
    ["SRS-FR-04", "The system shall retrieve chunks using user and document ownership filters."],
    ["SRS-FR-05", "The system shall generate adaptive study outputs based on selected mode and learner profile."],
    ["SRS-FR-06", "The system shall support live classroom transcript capture in compatible browsers."],
    ["SRS-FR-07", "The system shall provide meaningful error messages without exposing secrets or raw upstream errors."],
  ], { widths: [1700, 7600] }));
  parts.push(heading("E.5 Non-Functional Requirements", 3));
  parts.push(bullet(["The system should be responsive on desktop and mobile screens.", "The system should not expose service role keys or private API keys to the browser.", "The system should handle unsupported browsers gracefully in Classroom mode.", "The system should remain maintainable through modular source organization.", "The system should be deployable using static hosting plus Supabase Edge Functions."]));
  parts.push(heading("E.6 Operational Scenarios", 3));
  parts.push(paragraph("Scenario A: A student uploads a PDF, waits for processing, creates a session, attaches the PDF, and asks the AI tutor to summarize it for exam revision."));
  parts.push(paragraph("Scenario B: A student enters Classroom mode during a lecture, captures transcript, receives instant answers for detected questions, and generates structured notes after class."));
  parts.push(paragraph("Scenario C: A student opens a previous Vibe Session, reuses the same active document sources, changes mood and time available, and generates a rapid-fire quiz before an exam."));
  return parts.join("");
}

async function main() {
  const templateBuffer = await fs.readFile(TEMPLATE);
  const zip = await JSZip.loadAsync(templateBuffer);
  const documentXml = await zip.file("word/document.xml").async("string");
  const sectPr = documentXml.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] || "";
  const newDocumentXml = documentXml.replace(/<w:body>[\s\S]*<\/w:body>/, `<w:body>${bodyContent()}${sectPr}</w:body>`);
  zip.file("word/document.xml", newDocumentXml);

  let rels = await zip.file("word/_rels/document.xml.rels").async("string");
  const insertRels = imageRels
    .map((item) => `<Relationship Id="${item.relId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="${item.target}"/>`)
    .join("");
  rels = rels.replace("</Relationships>", `${insertRels}</Relationships>`);
  zip.file("word/_rels/document.xml.rels", rels);

  let contentTypes = await zip.file("[Content_Types].xml").async("string");
  if (!contentTypes.includes('Extension="svg"')) {
    contentTypes = contentTypes.replace("</Types>", '<Default Extension="svg" ContentType="image/svg+xml"/></Types>');
    zip.file("[Content_Types].xml", contentTypes);
  }

  for (const item of imageRels) {
    zip.file(`word/${item.target}`, item.svg);
  }

  const out = await zip.generateAsync({ type: "nodebuffer" });
  await fs.writeFile(OUTPUT, out);
  console.log(`Generated ${OUTPUT} (${out.length} bytes)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
