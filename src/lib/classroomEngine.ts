// src/lib/classroomEngine.ts
// Client-side fallback engine for the Classroom page.
// Provides local question answering and transcript-to-notes generation.

/* ═══════════════════════════════════════════════════════════════════
   MINI KNOWLEDGE BASE — common classroom definitions
   ═══════════════════════════════════════════════════════════════════ */

const DEFINITIONS: Record<string, string> = {
  "photosynthesis": "The process by which green plants convert sunlight, CO₂, and water into glucose and oxygen. Equation: 6CO₂ + 6H₂O + light → C₆H₁₂O₆ + 6O₂.",
  "algorithm": "A step-by-step procedure for solving a problem or accomplishing a task, typically expressed as a finite sequence of instructions.",
  "mitosis": "A type of cell division resulting in two genetically identical daughter cells, each with the same number of chromosomes as the parent cell.",
  "gravity": "A fundamental force of attraction between objects with mass. On Earth's surface, gravitational acceleration g ≈ 9.8 m/s².",
  "dna": "Deoxyribonucleic acid — a double-helix molecule that carries the genetic instructions for the development and functioning of all known living organisms.",
  "cpu": "Central Processing Unit — the primary electronic circuit in a computer that executes instructions from programs by performing arithmetic, logic, and control operations.",
  "binary": "A base-2 number system using only the digits 0 and 1. It is the fundamental language of computers and digital electronics.",
  "derivative": "In calculus, the instantaneous rate of change of a function with respect to a variable. Written as f'(x) or dy/dx.",
  "integral": "In calculus, the reverse of differentiation. It computes the area under a curve. The integral of f(x) is F(x) + C.",
  "osmosis": "The movement of water molecules through a semipermeable membrane from a region of lower solute concentration to higher solute concentration.",
  "newton": "The SI unit of force. 1 Newton is the force needed to accelerate a 1 kg mass at 1 m/s². Named after Sir Isaac Newton.",
  "atom": "The smallest unit of matter that retains the chemical properties of an element. Consists of protons, neutrons, and electrons.",
  "velocity": "Speed with a specified direction. A vector quantity measured in meters per second (m/s).",
  "acceleration": "The rate of change of velocity over time. Measured in m/s². a = Δv / Δt.",
  "democracy": "A system of government where power is vested in the people, who exercise it directly or through freely elected representatives.",
  "ecosystem": "A biological community of interacting organisms and their physical environment functioning as a unit.",
  "pi": "A mathematical constant approximately equal to 3.14159. It represents the ratio of a circle's circumference to its diameter.",
  "quadratic": "A polynomial equation of degree 2 in the form ax² + bx + c = 0. Solved using the quadratic formula: x = (-b ± √(b²-4ac)) / 2a.",
  "encryption": "The process of converting plaintext data into an unreadable coded form (ciphertext) to prevent unauthorized access.",
  "evolution": "The process of change in heritable characteristics of biological populations over successive generations, driven by natural selection.",
  "voltage": "The electric potential difference between two points in a circuit. Measured in Volts (V). V = IR (Ohm's Law).",
  "hypothesis": "A testable prediction or proposed explanation for an observation, used as a starting point for scientific investigation.",
  "momentum": "The product of an object's mass and velocity. p = mv. A conserved quantity in isolated systems.",
  "frequency": "The number of occurrences of a repeating event per unit of time. Measured in Hertz (Hz).",
  "wavelength": "The distance between successive crests (or troughs) of a wave. Related to frequency by: λ = v / f.",
  "compound": "A substance formed when two or more chemical elements are bonded together in fixed proportions.",
  "function": "In mathematics, a relation that assigns exactly one output value for each input value. Written as f(x).",
  "matrix": "A rectangular array of numbers arranged in rows and columns, used in linear algebra to represent linear transformations.",
  "probability": "A measure of the likelihood of an event occurring, expressed as a number between 0 (impossible) and 1 (certain).",
  "inertia": "The tendency of an object to resist changes in its state of motion. More mass means more inertia (Newton's First Law).",
};

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "of", "to", "in",
  "for", "on", "with", "at", "by", "from", "it", "its", "this", "that",
  "these", "those", "and", "or", "but", "not", "so", "if", "as", "we",
  "he", "she", "they", "them", "their", "i", "me", "my", "you", "your",
  "about", "just", "like", "very", "really", "also", "then", "than",
  "more", "some", "any", "all", "each", "every", "both", "few", "many",
  "much", "own", "other", "such", "only", "same", "into", "over",
  "after", "before", "between", "through", "during", "without", "again",
  "there", "here", "where", "when", "what", "which", "who", "whom",
  "how", "why", "because", "since", "while", "although", "though",
  "well", "know", "think", "going", "right", "okay", "yeah", "yes",
  "said", "says", "say", "tell", "told", "get", "got", "make", "made",
  "take", "come", "goes", "went", "want", "need", "look", "see", "way",
]);

/* ═══════════════════════════════════════════════════════════════════
   FUNCTION 1: answerQuestion
   ═══════════════════════════════════════════════════════════════════ */

export function answerQuestion(questionText: string): { answer: string; explanation: string } {
  const text = questionText.trim();
  const lower = text.toLowerCase();

  // --- 1. Math evaluation ---
  const mathMatch = lower.match(/(\d+[\d,.]*)\s*(plus|\+|minus|-|times|x|\*|multiplied\s*by|divided\s*by|divided|\/)\s*(\d+[\d,.]*)/);
  if (mathMatch) {
    const num1 = parseFloat(mathMatch[1].replace(/,/g, ""));
    const op = mathMatch[2].trim();
    const num2 = parseFloat(mathMatch[3].replace(/,/g, ""));
    let result: number;
    let symbol: string;

    if (op === "plus" || op === "+") { result = num1 + num2; symbol = "+"; }
    else if (op === "minus" || op === "-") { result = num1 - num2; symbol = "−"; }
    else if (op === "times" || op === "x" || op === "*" || op.startsWith("multiplied")) { result = num1 * num2; symbol = "×"; }
    else if (op.startsWith("divided") || op === "/") {
      if (num2 === 0) return { answer: "Undefined (division by zero)", explanation: "Division by zero is mathematically undefined." };
      result = num1 / num2; symbol = "÷";
    }
    else { result = num1 + num2; symbol = "+"; }

    const displayResult = Number.isInteger(result!) ? result!.toString() : result!.toFixed(2);
    return {
      answer: displayResult,
      explanation: `${num1} ${symbol} ${num2} = ${displayResult}. This is a basic arithmetic operation.`
    };
  }

  // Square root
  const sqrtMatch = lower.match(/square\s*root\s*(?:of\s+)?(\d+[\d,.]*)/);
  if (sqrtMatch) {
    const n = parseFloat(sqrtMatch[1].replace(/,/g, ""));
    const result = Math.sqrt(n);
    const display = Number.isInteger(result) ? result.toString() : result.toFixed(4);
    return { answer: display, explanation: `√${n} = ${display}.` };
  }

  // Square
  const squareMatch = lower.match(/square\s*(?:of\s+)?(\d+[\d,.]*)/);
  if (squareMatch && !lower.includes("root")) {
    const n = parseFloat(squareMatch[1].replace(/,/g, ""));
    const result = n * n;
    return { answer: result.toString(), explanation: `${n}² = ${result}.` };
  }

  // Percentage
  const pctMatch = lower.match(/(?:what\s+is\s+)?(\d+[\d,.]*)\s*(?:percent|%)\s*of\s*(\d+[\d,.]*)/);
  if (pctMatch) {
    const pct = parseFloat(pctMatch[1].replace(/,/g, ""));
    const base = parseFloat(pctMatch[2].replace(/,/g, ""));
    const result = (pct / 100) * base;
    const display = Number.isInteger(result) ? result.toString() : result.toFixed(2);
    return { answer: display, explanation: `${pct}% of ${base} = ${display}. Formula: (${pct}/100) × ${base}.` };
  }

  // --- 2. Definition lookup ---
  const defMatch = lower.match(/(?:what\s+is\s+(?:a|an|the)?\s*|define\s+|explain\s+|tell\s+(?:me\s+)?about\s+)([a-z\s]+)/);
  if (defMatch) {
    const term = defMatch[1].trim().replace(/\?/g, "");
    // Direct lookup
    if (DEFINITIONS[term]) {
      return { answer: DEFINITIONS[term], explanation: `"${term}" is a core concept. Understanding it well is fundamental to mastering the subject.` };
    }
    // Partial match
    for (const [key, val] of Object.entries(DEFINITIONS)) {
      if (term.includes(key) || key.includes(term)) {
        return { answer: val, explanation: `This relates to "${key}" — a key concept worth studying in depth.` };
      }
    }
  }

  // --- 3. Generic fallback ---
  return {
    answer: "Question captured for review.",
    explanation: `"${text}" — This question has been recorded. Use the AI Tutor (Transform page) for a detailed explanation, or review this topic after class.`
  };
}

/* ═══════════════════════════════════════════════════════════════════
   FUNCTION 2: generateNotesFromTranscript
   ═══════════════════════════════════════════════════════════════════ */

export function generateNotesFromTranscript(transcript: string): string {
  const cleaned = transcript.replace(/\s+/g, " ").trim();
  if (cleaned.length < 10) return "# Notes\n\nInsufficient transcript content to generate notes.";

  // Split into sentences
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.split(/\s+/).length >= 3);

  const totalWords = cleaned.split(/\s+/).length;
  const estimatedMinutes = Math.max(1, Math.round(totalWords / 150));

  // Extract key phrases (most frequent meaningful words)
  const wordCounts: Record<string, number> = {};
  cleaned.toLowerCase().split(/\s+/).forEach(word => {
    const clean = word.replace(/[^a-z]/g, "");
    if (clean.length > 3 && !STOPWORDS.has(clean)) {
      wordCounts[clean] = (wordCounts[clean] || 0) + 1;
    }
  });

  const topKeywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

  // Separate questions
  const questions = sentences.filter(s => s.includes("?"));
  const statements = sentences.filter(s => !s.includes("?"));

  // Group statements into sections of 4-5
  const sections: string[][] = [];
  for (let i = 0; i < statements.length; i += 4) {
    sections.push(statements.slice(i, i + 4));
  }

  // Build markdown
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  let md = `# 📝 Lecture Notes\n\n`;
  md += `**Generated:** ${dateStr} at ${timeStr}\n`;
  md += `**Duration:** ~${estimatedMinutes} minute${estimatedMinutes > 1 ? "s" : ""} (estimated)\n`;
  md += `**Total Words Captured:** ${totalWords.toLocaleString()}\n\n`;
  md += `---\n\n`;

  // Topics
  if (topKeywords.length > 0) {
    md += `## 📌 Main Topics Detected\n\n`;
    topKeywords.forEach(kw => { md += `- ${kw}\n`; });
    md += `\n---\n\n`;
  }

  // Key Points
  md += `## 📋 Key Points\n\n`;
  if (sections.length > 0) {
    sections.forEach((group, idx) => {
      md += `### Section ${idx + 1}\n\n`;
      group.forEach(sentence => {
        md += `- ${sentence}\n`;
      });
      md += `\n`;
    });
  } else {
    md += `- ${cleaned}\n\n`;
  }
  md += `---\n\n`;

  // Questions
  md += `## ❓ Questions Raised During Lecture\n\n`;
  if (questions.length > 0) {
    questions.forEach(q => { md += `- ${q}\n`; });
  } else {
    md += `- No questions were detected during this session.\n`;
  }
  md += `\n---\n\n`;

  // Summary
  md += `## 📊 Summary\n\n`;
  md += `This lecture covered approximately **${sentences.length}** key points across **${sections.length}** sections. `;
  if (topKeywords.length >= 3) {
    md += `The main themes discussed were **${topKeywords.slice(0, 3).join("**, **")}**. `;
  }
  md += `Consider reviewing these topics in the AI Tutor for deeper understanding.\n\n`;
  md += `---\n\n`;
  md += `*Notes generated locally by VibeSchool Classroom Engine*\n`;

  return md;
}
