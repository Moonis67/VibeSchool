import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { generateContent, generateFollowUp, SUGGESTED_TOPICS } from "@/lib/aiEngine";
import { useVibe } from "@/lib/vibeStore";
import { openSession, listLibrary, toggleSessionSource, createSession, type LibraryFile } from "@/lib/sessionsApi";
import brainrotVideoLinks from "../../brainrot.md?raw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import mermaid from "mermaid"; 
import katex from "katex"; 
import "katex/dist/katex.min.css"; 
import { 
  Loader2, Upload, CheckCircle2, BrainCircuit, BookOpen, Download,
  HelpCircle, ChevronLeft, ChevronRight, ArrowLeft, 
  Send, Sparkles, User, Save, Edit3, Zap, Map, Share2, 
  Calculator, Clock, Smile, FileText, XCircle, Mic, Play, Pause, Square, Headphones, Gauge, Radio, Lightbulb, Check, X, RefreshCw,
  Hourglass, Timer, Palette, Volume2, PlusCircle, Captions, Clapperboard, RotateCcw, Maximize2, Minimize2,
  Image as ImageIcon, GraduationCap, Layers, Cpu, Lock, Unlock
} from "lucide-react";

mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'strict' });

const cleanMathArtifacts = (text: string) => {
  return text.replace(/\\\(|\\\)|\\\[|\\\]/g, '').replace(/###/g, '##');
};

const MathRenderer = ({ formula, displayMode = false }: { formula: string, displayMode?: boolean }) => {
  const mathRef = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (mathRef.current) {
      try {
        katex.render(formula, mathRef.current, {
          throwOnError: false,
          displayMode: displayMode,
          trust: true,
          strict: false
        });
      } catch (err) {
        console.warn("KaTeX rendering failed.");
      }
    }
  }, [formula, displayMode]);
  return <span ref={mathRef} className={displayMode ? "block my-6 overflow-x-auto text-center scale-110" : "inline-block px-1"} />;
};

const MermaidChart = ({ chart }: { chart: string }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !chart) return;

    const sanitizeMermaid = (input: string) => {
      let fixed = input.replace(/```mermaid|```/g, "").trim();

      fixed = fixed.replace(/(-->\|[^|\n]+\|)>\s*/g, "$1 ");

      fixed = fixed.replace(
        /([A-Za-z0-9_]+)\[([^\]\n]+)\|>\s*([A-Za-z0-9_]+)\[([^\]\n]+)\]/g,
        "$1[$2] --> $3[$4]"
      );

      fixed = fixed.replace(/\s\|>\s/g, " --> ");

      return fixed;
    };

    const sanitizeSvg = (svg: string) =>
      svg
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
        .replace(/<foreignObject[\s\S]*?>[\s\S]*?<\/foreignObject>/gi, "")
        .replace(/\son\w+="[^"]*"/gi, "")
        .replace(/\son\w+='[^']*'/gi, "")
        .replace(/javascript:/gi, "");

    const delay = setTimeout(async () => {
      try {
        const fixedChart = sanitizeMermaid(chart);
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, fixedChart);

        if (ref.current) {
          ref.current.innerHTML = sanitizeSvg(svg);
        }
      } catch (e) {
        if (ref.current) {
          ref.current.textContent = "Diagram syntax error.";
        }
      }
    }, 200);

    return () => clearTimeout(delay);
  }, [chart]);

  return (
    <div
      ref={ref}
      className="mermaid transform-card w-full overflow-x-auto p-8 rounded-2xl flex justify-center my-6 [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-none"
    />
  );
};

const SmartRender = ({ text }: { text: string }) => {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]*?\Suppress\$\$|\\\[[\s\S]*?\\\]|\$.*?\$|\\\(.*?\\\)|```mermaid[\s\S]*?```)/g);

  return (
    <div className="space-y-6 text-left w-full">
      {parts.map((part, index) => {
        if (!part) return null;
        if (part.startsWith('```mermaid')) {
            return <MermaidChart key={index} chart={part.replace(/```mermaid|```/g, '').trim()} />;
        }
        if ((part.startsWith('$$') && part.endsWith('$$')) || (part.startsWith('\\['))) {
            return <MathRenderer key={index} formula={part.replace(/\Suppress\$\$|\\\[|\\\]/g, '').trim()} displayMode={true} />;
        }
        if ((part.startsWith('$') && part.endsWith('$')) || (part.startsWith('\\('))) {
            return <MathRenderer key={index} formula={part.replace(/\$|\\\(|\\\)/g, '').trim()} displayMode={false} />;
        }
        return part.split('\n').map((line, i) => {
            const trimmed = line.trim();
            if (!trimmed) return <div key={i} className="h-4" />;
            if (trimmed === '---') return <hr key={i} className="my-12 border-t-2 border-muted/30" />;
            if (trimmed.startsWith('## ')) {
                return (
                    <h2 key={i} className="text-3xl font-black text-primary mt-14 mb-8 flex items-center gap-3 tracking-tighter uppercase border-b-4 border-primary/10 pb-2">
                        <BookOpen className="w-8 h-8 opacity-80" /> {cleanMathArtifacts(trimmed.replace(/^##\s+/, ''))}
                    </h2>
                );
            }
            if (trimmed.startsWith('> ')) {
                return (
                    <div key={i} className="bg-primary/5 border-l-8 border-primary p-8 rounded-r-[2rem] my-8 shadow-inner italic text-xl text-foreground/90 font-serif leading-relaxed">
                        {parseBold(cleanMathArtifacts(trimmed.substring(2)))}
                    </div>
                );
            }
            if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
                return (
                    <div key={i} className="flex gap-4 ml-8 mb-4">
                        <div className="w-2.5 h-2.5 rounded-full bg-primary mt-3 shrink-0 shadow-sm" />
                        <span className="leading-relaxed text-lg text-foreground/90 font-medium">
                            {parseBold(cleanMathArtifacts(trimmed.substring(2)))}
                        </span>
                    </div>
                );
            }
            return <p key={i} className="leading-9 text-xl text-foreground/80 mb-6 font-normal tracking-wide">{parseBold(cleanMathArtifacts(trimmed))}</p>;
        });
      })}
    </div>
  );
};

const TypewriterSmartRender = ({ text, animate = false }: { text: string; animate?: boolean }) => {
  const [visibleText, setVisibleText] = useState(animate ? "" : text);
  const [isTyping, setIsTyping] = useState(animate);

  useEffect(() => {
    if (!animate) {
      setVisibleText(text);
      setIsTyping(false);
      return;
    }

    setVisibleText("");
    setIsTyping(true);
    let index = 0;
    const step = Math.max(8, Math.min(18, Math.floor(1800 / Math.max(text.length, 1))));
    const timer = window.setInterval(() => {
      index = Math.min(text.length, index + 4);
      setVisibleText(text.slice(0, index));
      if (index >= text.length) {
        window.clearInterval(timer);
        setIsTyping(false);
      }
    }, step);

    return () => window.clearInterval(timer);
  }, [text, animate]);

  return (
    <div className="relative">
      <SmartRender text={visibleText} />
      {isTyping && (
        <span className="ml-1 inline-block h-6 w-2 translate-y-1 animate-pulse rounded-sm bg-primary align-baseline" />
      )}
    </div>
  );
};

const parseBold = (text: string) => {
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
        if (part.startsWith('**')) {
            return <strong key={index} className="font-extrabold text-foreground decoration-primary/30 decoration-2 underline-offset-4">{part.slice(2, -2)}</strong>;
        }
        return part;
    });
};

const LectureWrapper = ({ style, children }: { style: string, children: React.ReactNode }) => {
  if (style === "modern") {
    return (
      <div className="space-y-8 border-l-[12px] border-indigo-500/20 pl-12 py-8 transition-all duration-700 font-sans bg-slate-50/80 dark:bg-slate-900/50 rounded-r-[2.5rem] shadow-2xl">
        {children}
      </div>
    );
  }
  if (style === "neo-brutalist") {
    return (
      <div className="bg-white text-black border-4 border-black p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all font-mono">
        <div className="border-b-4 border-black pb-4 mb-8 flex items-center gap-4">
           <div className="bg-black text-white px-4 py-1 font-bold uppercase">Raw Data</div>
           <div className="font-bold uppercase tracking-widest">System Output</div>
        </div>
        <div className="prose prose-lg max-w-none prose-headings:font-black prose-p:font-medium">{children}</div>
      </div>
    );
  }
  return <div className="prose prose-lg dark:prose-invert max-w-5xl mx-auto transition-all duration-500 transform-card p-8 md:p-10 rounded-3xl">{children}</div>;
};

const SelectionTile = ({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) => (
  <div onClick={onClick} className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center gap-3 h-full ${active ? 'border-[#6D35FF]/45 bg-[#F3EEFF] shadow-[0_10px_24px_rgba(109,53,255,0.10)]' : 'border-[#E8E4F5] bg-white/55 hover:border-[#6D35FF]/25 hover:bg-white/80'}`}>
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-[#6D35FF] text-white' : 'bg-[#F4F1FA] text-[#6B7280]'}`}>
      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-[#6B7280]'}`} />
    </div>
    <div className="text-left">
      <h3 className={`font-bold text-sm ${active ? 'text-primary' : ''}`}>{title}</h3>
      {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
    {active && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
  </div>
);

type VisualAidImage = {
  title: string;
  subtitle?: string;
  lectures?: string[];
  sections?: Array<{ heading: string; points: string[] }>;
  recall?: string[];
  accent?: string;
  imageData?: string;
  mimeType?: string;
};

type QuizOption = {
  id: string;
  text: string;
};

type QuizQuestion = {
  q: string;
  options: QuizOption[];
  correct: string;
  area: string;
};

type RapidFireQuestion = {
  q: string;
  a: string;
};

type RoadmapStep = {
  title: string;
  desc: string;
  time?: string;
};

type HistoricalData = {
  last_topic?: string;
  suggestions?: string[];
};

type ContentBlock = {
  type: string;
  data: unknown;
  role?: "ai" | "user";
  animate?: boolean;
  topic?: string;
};

type GeneratedArtifact = {
  id: string;
  title: string;
  focus: string;
  mode: "learn" | "quiz" | "visualize" | "plan";
  tool: string;
  createdAt: string;
  block: ContentBlock;
};

type PanelDragTarget = "left" | "right";

type PdfTextItem = {
  str?: string;
};

type PdfPage = {
  getTextContent: () => Promise<{ items: PdfTextItem[] }>;
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfJsLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (source: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfJsLib;
  }
}

const accentClasses: Record<string, { bg: string; text: string; ring: string; soft: string; border: string }> = {
  indigo: { bg: "bg-indigo-600", text: "text-indigo-700", ring: "ring-indigo-200", soft: "bg-indigo-50", border: "border-indigo-200" },
  cyan: { bg: "bg-cyan-600", text: "text-cyan-700", ring: "ring-cyan-200", soft: "bg-cyan-50", border: "border-cyan-200" },
  emerald: { bg: "bg-emerald-600", text: "text-emerald-700", ring: "ring-emerald-200", soft: "bg-emerald-50", border: "border-emerald-200" },
  rose: { bg: "bg-rose-600", text: "text-rose-700", ring: "ring-rose-200", soft: "bg-rose-50", border: "border-rose-200" },
  amber: { bg: "bg-amber-500", text: "text-amber-800", ring: "ring-amber-200", soft: "bg-amber-50", border: "border-amber-200" },
  violet: { bg: "bg-violet-600", text: "text-violet-700", ring: "ring-violet-200", soft: "bg-violet-50", border: "border-violet-200" },
};

const canvasAccents: Record<string, { main: string; soft: string; border: string; text: string }> = {
  indigo: { main: "#4f46e5", soft: "#eef2ff", border: "#c7d2fe", text: "#3730a3" },
  cyan: { main: "#0891b2", soft: "#ecfeff", border: "#a5f3fc", text: "#0e7490" },
  emerald: { main: "#059669", soft: "#ecfdf5", border: "#a7f3d0", text: "#047857" },
  rose: { main: "#e11d48", soft: "#fff1f2", border: "#fecdd3", text: "#be123c" },
  amber: { main: "#f59e0b", soft: "#fffbeb", border: "#fde68a", text: "#92400e" },
  violet: { main: "#7c3aed", soft: "#f5f3ff", border: "#ddd6fe", text: "#6d28d9" },
};

const canvasFont = "'Plus Jakarta Sans', Inter, Arial, sans-serif";

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

const wrapCanvasText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidth) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
};

const drawWrappedText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 4,
) => {
  const lines = wrapCanvasText(ctx, text, maxWidth).slice(0, maxLines);
  lines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return lines.length * lineHeight;
};

const drawPill = (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fill: string) => {
  ctx.font = `800 18px ${canvasFont}`;
  const width = ctx.measureText(text).width + 36;
  roundedRect(ctx, x, y, width, 40, 20);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, x + 18, y + 26);
};

const downloadCheatSheetCanvas = (aid: VisualAidImage, index: number, filename: string) => {
  const canvas = document.createElement("canvas");
  const width = 2400;
  const height = 1800;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const accent = canvasAccents[aid.accent || "indigo"] || canvasAccents.indigo;
  const sections = aid.sections?.length ? aid.sections.slice(0, 6) : [{ heading: "Core Notes", points: ["No structured points were returned. Try regenerating this sheet."] }];

  ctx.fillStyle = "#f8fafc";
  ctx.fillRect(0, 0, width, height);

  roundedRect(ctx, 80, 80, width - 160, 330, 48);
  ctx.fillStyle = accent.soft;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent.border;
  ctx.stroke();

  drawPill(ctx, "EXAM REVISION SHEET", 130, 130, accent.main);
  ctx.fillStyle = "#0f172a";
  ctx.font = `900 78px ${canvasFont}`;
  drawWrappedText(ctx, aid.title || `Cheat Sheet ${index + 1}`, 130, 245, 1600, 88, 2);
  ctx.fillStyle = "#475569";
  ctx.font = `700 30px ${canvasFont}`;
  drawWrappedText(ctx, aid.subtitle || "Generated from your lecture material", 130, 360, 1500, 38, 1);

  roundedRect(ctx, width - 330, 135, 170, 135, 28);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.fillStyle = accent.text;
  ctx.font = `900 64px ${canvasFont}`;
  ctx.textAlign = "center";
  ctx.fillText(String(index + 1).padStart(2, "0"), width - 245, 215);
  ctx.fillStyle = "#64748b";
  ctx.font = `900 17px ${canvasFont}`;
  ctx.fillText("SHEET", width - 245, 248);
  ctx.textAlign = "left";

  const gap = 32;
  const cardWidth = (width - 160 - gap * 2) / 3;
  const cardHeight = 350;
  const startX = 80;
  const startY = 460;

  sections.forEach((section, sectionIndex) => {
    const col = sectionIndex % 3;
    const row = Math.floor(sectionIndex / 3);
    const x = startX + col * (cardWidth + gap);
    const y = startY + row * (cardHeight + gap);

    roundedRect(ctx, x, y, cardWidth, cardHeight, 38);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#e2e8f0";
    ctx.stroke();

    roundedRect(ctx, x + 34, y + 34, 56, 56, 16);
    ctx.fillStyle = accent.main;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `900 24px ${canvasFont}`;
    ctx.textAlign = "center";
    ctx.fillText(String(sectionIndex + 1), x + 62, y + 70);
    ctx.textAlign = "left";

    ctx.fillStyle = "#0f172a";
    ctx.font = `900 35px ${canvasFont}`;
    drawWrappedText(ctx, section.heading, x + 110, y + 60, cardWidth - 145, 40, 2);

    let pointY = y + 135;
    section.points.slice(0, 5).forEach((point) => {
      ctx.beginPath();
      ctx.fillStyle = accent.main;
      ctx.arc(x + 46, pointY + 12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#334155";
      ctx.font = `700 25px ${canvasFont}`;
      const used = drawWrappedText(ctx, point, x + 68, pointY + 22, cardWidth - 105, 31, 2);
      pointY += Math.max(44, used + 12);
    });
  });

  const recallY = 1248;
  roundedRect(ctx, 80, recallY, width - 160, 300, 40);
  ctx.fillStyle = accent.soft;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = accent.border;
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = `900 21px ${canvasFont}`;
  ctx.fillText("RAPID RECALL", 130, recallY + 62);

  const recalls = (aid.recall?.length ? aid.recall : ["Define the core idea", "List the key steps", "Name one common trap"]).slice(0, 3);
  const recallCardWidth = (width - 260) / 3;
  recalls.forEach((question, questionIndex) => {
    const x = 130 + questionIndex * (recallCardWidth + 30);
    roundedRect(ctx, x, recallY + 95, recallCardWidth, 145, 26);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.font = `900 31px ${canvasFont}`;
    drawWrappedText(ctx, question, x + 30, recallY + 150, recallCardWidth - 60, 38, 2);
  });

  ctx.fillStyle = "#94a3b8";
  ctx.font = `800 20px ${canvasFont}`;
  ctx.fillText("Generated by Vibe School", 92, height - 80);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `${filename}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const CheatSheetPoster = ({ aid, index }: { aid: VisualAidImage; index: number }) => {
  const accent = accentClasses[aid.accent || "indigo"] || accentClasses.indigo;
  const filename = `${aid.title || `cheat-sheet-${index + 1}`}`.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || `cheat-sheet-${index + 1}`;
  const sections = aid.sections?.length ? aid.sections : [{ heading: "Core Notes", points: ["No structured points were returned. Try regenerating this sheet."] }];

  return (
    <Card className="overflow-hidden border-2 bg-white shadow-xl">
      <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="text-lg font-black">{aid.title || `Cheat Sheet ${index + 1}`}</h4>
          <p className="text-xs font-semibold text-muted-foreground">{aid.subtitle || aid.lectures?.join(", ") || "Revision snapshot"}</p>
        </div>
        <Button variant="secondary" size="sm" className="gap-2" onClick={() => downloadCheatSheetCanvas(aid, index, filename)}>
          <Download className="h-4 w-4" /> Export PNG
        </Button>
      </div>

      <div className="overflow-x-auto bg-slate-100 p-3">
        <div
          className="mx-auto min-h-[675px] w-[1200px] bg-white p-10 text-slate-950 shadow-sm"
          style={{ fontFamily: "Plus Jakarta Sans, Inter, Arial, sans-serif" }}
        >
          <div className={`rounded-[2rem] border-2 ${accent.border} ${accent.soft} p-8 ring-8 ${accent.ring}`}>
            <div className="flex items-start justify-between gap-8">
              <div>
                <div className={`mb-4 inline-flex rounded-full ${accent.bg} px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white`}>
                  Exam Revision Sheet
                </div>
                <h1 className="max-w-[820px] text-5xl font-black leading-tight tracking-tight">{aid.title}</h1>
                <p className="mt-3 max-w-[760px] text-lg font-semibold text-slate-600">{aid.subtitle || "Generated from your lecture material"}</p>
              </div>
              <div className="rounded-2xl bg-white px-5 py-4 text-right shadow-sm">
                <div className={`text-4xl font-black ${accent.text}`}>{String(index + 1).padStart(2, "0")}</div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-500">Sheet</div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-5">
            {sections.slice(0, 6).map((section, sectionIndex) => (
              <div key={`${section.heading}-${sectionIndex}`} className="min-h-[210px] rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${accent.bg} text-sm font-black text-white`}>
                    {sectionIndex + 1}
                  </div>
                  <h2 className="text-xl font-black leading-tight">{section.heading}</h2>
                </div>
                <ul className="space-y-2.5">
                  {section.points.slice(0, 5).map((point, pointIndex) => (
                    <li key={`${point}-${pointIndex}`} className="flex gap-2 text-[15px] font-semibold leading-snug text-slate-700">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent.bg}`} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={`mt-8 rounded-3xl border-2 ${accent.border} ${accent.soft} p-6`}>
            <div className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-slate-500">Rapid Recall</div>
            <div className="grid grid-cols-3 gap-4">
              {(aid.recall?.length ? aid.recall : ["Define the core idea", "List the key steps", "Name one common trap"]).slice(0, 3).map((question, questionIndex) => (
                <div key={`${question}-${questionIndex}`} className="rounded-2xl bg-white p-4 text-base font-black leading-snug shadow-sm">
                  {question}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const VisualAidsBlock = ({ aids }: { aids: VisualAidImage[] }) => {
  if (!aids?.length) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border-2 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
            <ImageIcon className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black tracking-tight">Visual Revision Sheets</h3>
            <p className="text-sm font-semibold text-muted-foreground">RAG-built cheat sheets rendered as precise browser posters with real text.</p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit bg-white text-indigo-700">{aids.length} image{aids.length === 1 ? "" : "s"}</Badge>
      </div>

      <div className="grid gap-6">
        {aids.map((aid, index) => {
          if (aid.sections?.length) {
            return <CheatSheetPoster key={`${aid.title}-${index}`} aid={aid} index={index} />;
          }

          const mimeType = aid.mimeType || "image/png";
          const imageUrl = `data:${mimeType};base64,${aid.imageData}`;
          const filename = `${aid.title || `visual-aid-${index + 1}`}`.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase() || `visual-aid-${index + 1}`;

          return (
            <Card key={`${aid.title}-${index}`} className="overflow-hidden border-2 bg-white shadow-xl">
              <div className="flex flex-col gap-3 border-b bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="text-lg font-black">{aid.title || `Visual Aid ${index + 1}`}</h4>
                  <p className="text-xs font-semibold text-muted-foreground">
                    {aid.subtitle || aid.lectures?.join(", ") || "Revision snapshot"}
                  </p>
                </div>
                <Button asChild variant="secondary" size="sm" className="gap-2">
                  <a href={imageUrl} download={`${filename}.${mimeType.includes("jpeg") ? "jpg" : "png"}`}>
                    <Download className="h-4 w-4" /> Download
                  </a>
                </Button>
              </div>
              <div className="bg-slate-100 p-3">
                <img
                  src={imageUrl}
                  alt={aid.title || `Visual aid ${index + 1}`}
                  className="mx-auto w-full rounded-xl border bg-white object-contain shadow-sm"
                />
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const inferQuestionArea = (question: string) => {
    const lower = question.toLowerCase();
    if (/definition|means|class|object|term|what is/.test(lower)) return "Definitions";
    if (/why|purpose|benefit|important|advantage|disadvantage/.test(lower)) return "Conceptual Reasoning";
    if (/code|example|scenario|apply|real-world|case/.test(lower)) return "Application";
    if (/complexity|formula|calculate|compare|difference/.test(lower)) return "Technical Details";
    return "Core Concepts";
};

const QuizBlock = ({ rawData, onRetry }: { rawData: string, onRetry: () => void }) => {
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!rawData) return;
        const parsed = rawData.split('###').map(block => {
            if (block.trim().length < 10) return null;
            const parts = block.split('|').map(s => s.trim());
            if (parts.length < 6) return null;
            return {
                q: parts[0].replace(/^Q:\s*/i, ''),
                options: [
                    { id: 'A', text: parts[1].replace(/^A\)\s*/i, '') },
                    { id: 'B', text: parts[2].replace(/^B\)\s*/i, '') },
                    { id: 'C', text: parts[3].replace(/^C\)\s*/i, '') },
                    { id: 'D', text: parts[4].replace(/^D\)\s*/i, '') },
                ],
                correct: parts[5].replace(/^Correct:\s*/i, '').charAt(0).toUpperCase(),
                area: parts[6]?.replace(/^Area:\s*/i, '').trim() || inferQuestionArea(parts[0])
            };
        }).filter((question): question is QuizQuestion => Boolean(question));
        setQuestions(parsed);
    }, [rawData]);

    const handleSelect = (qIdx: number, optId: string) => {
        if (showResults) return;
        setSelectedAnswers(prev => ({ ...prev, [qIdx]: optId }));
    };

    const checkAnswers = () => {
        if (Object.keys(selectedAnswers).length < questions.length) {
            toast.error("Answer all questions first, then I can diagnose your strengths properly.");
            return;
        }
        let correctCount = 0;
        questions.forEach((q, idx) => { if (selectedAnswers[idx] === q.correct) correctCount++; });
        setScore(correctCount);
        setShowResults(true);
        toast.success(`Score: ${correctCount}/${questions.length}`);
    };

    if (questions.length === 0) return null;
    const areaStats = questions.reduce((acc: Record<string, { correct: number; total: number }>, q, idx) => {
        const area = q.area || "Core Concepts";
        if (!acc[area]) acc[area] = { correct: 0, total: 0 };
        acc[area].total += 1;
        if (selectedAnswers[idx] === q.correct) acc[area].correct += 1;
        return acc;
    }, {});
    const rankedAreas = Object.entries(areaStats)
      .map(([area, stats]) => ({ area, ...stats, pct: stats.total ? stats.correct / stats.total : 0 }))
      .sort((a, b) => b.pct - a.pct);
    const strongest = rankedAreas[0];
    const weakest = [...rankedAreas].sort((a, b) => a.pct - b.pct)[0];

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {questions.map((q, idx) => (
                <Card key={idx} className="p-6 border-2 shadow-sm relative overflow-hidden">
                    <div className="flex gap-4 mb-4">
                        <span className="text-xl font-bold text-muted-foreground/50">{String(idx + 1).padStart(2, "0")}</span>
                        <div>
                          <h3 className="text-lg font-bold leading-relaxed">{q.q}</h3>
                          <span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-primary">{q.area}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-8">
                        {q.options.map((opt: QuizOption) => {
                            const isSelected = selectedAnswers[idx] === opt.id;
                            const isCorrect = q.correct === opt.id;
                            let styleClass = "border-muted bg-card hover:bg-muted/50";
                            if (showResults) {
                                if (isCorrect) styleClass = "border-green-500 bg-green-50 text-green-700 ring-1 ring-green-500";
                                else if (isSelected && !isCorrect) styleClass = "border-red-500 bg-red-50 text-red-700 opacity-60";
                                else styleClass = "opacity-50 grayscale";
                            } else if (isSelected) styleClass = "border-primary bg-primary/10 ring-1 ring-primary";
                            return (
                                <div key={opt.id} onClick={() => handleSelect(idx, opt.id)} className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-3 ${styleClass}`}>
                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-xs font-bold ${isSelected || (showResults && isCorrect) ? 'bg-white border-transparent' : 'bg-transparent border-muted-foreground/30'}`}>{opt.id}</div>
                                    <span className="text-sm font-medium">{opt.text}</span>
                                    {showResults && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                                    {showResults && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-500 ml-auto" />}
                                </div>
                            );
                        })}
                    </div>
                </Card>
            ))}
            <div className="flex flex-col items-center justify-center pt-6 pb-12 gap-4">
                {!showResults ? (
                    <Button size="lg" onClick={checkAnswers} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-xl px-12 rounded-full h-14 text-lg">
                        Check Answers <CheckCircle2 className="ml-2 w-5 h-5" />
                    </Button>
                ) : (
                    <div className="animate-in zoom-in space-y-4 w-full max-w-3xl">
                        <div><p className="text-2xl font-bold mb-1">Score: <span className="text-indigo-600">{score}</span> / {questions.length}</p></div>
                        <div className="grid gap-3 md:grid-cols-2 text-left">
                          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wider text-green-700">Most Competitive</p>
                            <p className="mt-1 text-lg font-black text-green-900">{strongest?.area || "Not enough data"}</p>
                            <p className="text-sm text-green-700">{strongest ? `${strongest.correct}/${strongest.total} correct` : "Answer the quiz to unlock this."}</p>
                          </div>
                          <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-4">
                            <p className="text-xs font-black uppercase tracking-wider text-amber-700">Needs More Time</p>
                            <p className="mt-1 text-lg font-black text-amber-900">{weakest?.area || "Not enough data"}</p>
                            <p className="text-sm text-amber-700">{weakest ? `${weakest.correct}/${weakest.total} correct` : "Answer the quiz to unlock this."}</p>
                          </div>
                        </div>
                        <Button size="lg" variant="secondary" onClick={onRetry} className="h-12 px-8 mx-auto flex"><RefreshCw className="w-4 h-4 mr-2" /> Attempt 10 More</Button>
                    </div>
                )}
            </div>
        </div>
    );
};

const RapidFireBlock = ({ rawData, onRetry }: { rawData: string, onRetry: () => void }) => {
    const [questions, setQuestions] = useState<RapidFireQuestion[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [userInput, setUserInput] = useState("");
    const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);

    useEffect(() => {
        if (!rawData) return;
        const parsed = rawData.split('###').map(block => {
            const parts = block.split('|');
            if (parts.length < 2) return null;
            return { q: parts[0].replace(/^Q:\s*/i, '').trim(), a: parts[1].replace(/^A:\s*/i, '').trim() };
        }).filter((question): question is RapidFireQuestion => Boolean(question));
        setQuestions(parsed);
    }, [rawData]);

    const handleCheck = () => {
        const correctAns = questions[currentIdx].a.toLowerCase();
        const userAns = userInput.toLowerCase().trim();
        const stopwords = ['the', 'a', 'an', 'is', 'of', 'to', 'in', 'it', 'and'];
        const keywords = correctAns.split(' ').filter((w: string) => !stopwords.includes(w) && w.length > 2);
        const matchCount = keywords.filter((k: string) => userAns.includes(k)).length;
        const isMatch = (matchCount >= Math.ceil(keywords.length * 0.5)) || userAns === correctAns || userAns.includes(correctAns);
        setFeedback(isMatch ? "correct" : "wrong");
    };

    const handleNext = () => {
        if (currentIdx < questions.length - 1) { setCurrentIdx(prev => prev + 1); setUserInput(""); setFeedback(null); } 
        else { setIsCompleted(true); }
    };

    if (questions.length === 0) return null;
    const currentQ = questions[currentIdx];

    if (isCompleted) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-card rounded-xl border-2">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4"><Sparkles className="w-8 h-8"/></div>
                <h3 className="text-2xl font-bold mb-2">Rapid Fire Complete!</h3>
                <Button onClick={onRetry} variant="outline" size="lg"><RefreshCw className="w-4 h-4 mr-2"/> Start New Round</Button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-8">
            <div className="flex justify-between text-sm text-muted-foreground mb-4 uppercase font-bold tracking-wider"><span>Rapid Fire</span><span>{currentIdx + 1} / {questions.length}</span></div>
            <Card className={`p-8 border-2 shadow-md transition-all ${feedback === 'correct' ? 'border-green-500 bg-green-50/50' : feedback === 'wrong' ? 'border-red-500 bg-red-50/50' : ''}`}>
                <h3 className="text-2xl font-bold mb-6 text-center leading-relaxed">{currentQ.q}</h3>
                {!feedback ? (
                    <div className="space-y-4">
                        <Input value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Type answer..." className="text-lg h-14 text-center" onKeyDown={(e) => e.key === 'Enter' && handleCheck()} autoFocus />
                        <Button onClick={handleCheck} className="w-full h-12 text-lg font-bold" disabled={!userInput.trim()}>Submit</Button>
                    </div>
                ) : (
                    <div className="text-center animate-in fade-in slide-in-from-bottom-2">
                        {feedback === 'correct' ? <div className="flex flex-col items-center gap-2 text-green-700 mb-6"><CheckCircle2 className="w-12 h-12" /><span className="text-xl font-bold">Correct!</span></div> : <div className="flex flex-col items-center gap-2 text-red-700 mb-6"><XCircle className="w-12 h-12" /><span className="text-xl font-bold">Not quite.</span><div className="bg-white/80 p-3 rounded-lg border border-red-200 mt-2"><span className="text-xs uppercase font-bold text-red-400 block">Answer</span><span className="text-lg text-red-900">{currentQ.a}</span></div></div>}
                        <Button onClick={handleNext} size="lg" className="px-8 rounded-full">Next <ArrowLeft className="w-4 h-4 ml-2 rotate-180" /></Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

// Dynamic PDF.js loader to prevent bundling size and worker issues in Vite
const loadPdfJS = async (): Promise<PdfJsLib> => {
  if (window.pdfjsLib) return window.pdfjsLib;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = window.pdfjsLib;
      if (!pdfjsLib) {
        reject(new Error("PDF parsing library loaded without exposing pdfjsLib."));
        return;
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    script.onerror = () => reject(new Error("Failed to load PDF parsing library from CDN."));
    document.head.appendChild(script);
  });
};

// Client-side text extraction from PDF file
const extractTextFromPDF = async (file: File, onProgress: (msg: string) => void): Promise<string> => {
  onProgress("Loading PDF reader engine...");
  const pdfjsLib = await loadPdfJS();
  const arrayBuffer = await file.arrayBuffer();
  
  onProgress("Parsing PDF pages...");
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  
  for (let i = 1; i <= pdf.numPages; i++) {
    onProgress(`Extracting page ${i} of ${pdf.numPages}...`);
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str || "").join(" ");
    fullText += pageText + "\n";
  }
  return fullText;
};

// Client-side overlapping text chunker. Larger chunks reduce embedding work for long PDFs.
function chunkTextWithOverlapClient(text: string, chunkSize = 1400, overlap = 180): string[] {
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
      startIndex = endIndex;
    } else {
      startIndex = nextIndex;
    }
  }
  return chunks;
}

const safeUploadError = (message: string) => {
  if (/CREATE_UPLOAD_FUNCTION_UNREACHABLE/i.test(message)) {
    return "Could not reach the upload signer Edge Function. Deploy create-document-upload and set ALLOWED_ORIGINS to your app URL.";
  }
  if (/DIRECT_R2_UPLOAD_BLOCKED/i.test(message)) {
    return "Direct R2 upload was blocked. Configure R2 bucket CORS to allow PUT from your app domain.";
  }
  if (/ENQUEUE_FUNCTION_UNREACHABLE/i.test(message)) {
    return "Upload reached storage, but queueing failed. Deploy enqueue-document-processing and check Edge Function CORS.";
  }
  return message || "Upload failed. Please check the file type, size, and your session, then try again.";
};

const safeGenerationError = () => "AI generation is temporarily unavailable. Using local fallback when possible.";

const STORAGE_LIMIT_COPY = "Files are held in temporary storage only while being indexed, then deleted. Up to 50 MB in flight at a time, up to 10 files per upload.";

const isDocumentInstruction = (value: string) => {
  return /^(explain|explain me|explain this|explain me this|summari[sz]e|summari[sz]e this|what is this|teach me this|break this down|tell me about this|this)$/i.test(value.trim());
};

const documentFocusedSuggestions = (fileName?: string | null) => {
  const base = fileName?.replace(/\.[^.]+$/, "").trim() || "this document";
  return [
    `Summarize ${base}`,
    `Key points from ${base}`,
    `Questions from ${base}`,
  ];
};

const getUploadMimeType = (file: File) => {
  if (file.type) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "application/pdf";
  if (extension === "txt") return "text/plain";
  if (extension === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
};

type DialogueSegment = {
  speaker: "A" | "B";
  text: string;
  durationMs: number;
};

type ReelPayload = {
  script: string;
  segments: DialogueSegment[];
  videoUrls: string[];
  topic: string;
};

type TtsVoiceOption = {
  id: string;
  label: string;
  description: string;
};

type DirectUploadPayload = {
  document_id: string;
  upload_url: string;
  upload_method?: string;
  upload_headers?: Record<string, string>;
  compress?: boolean;
};

type UploadedDocument = {
  id: string;
  name: string;
  status: "uploading" | "queued" | "processing" | "processed" | "failed";
};

const MAX_UPLOAD_FILES = 10;

const COMPRESSION_THRESHOLD_BYTES = 3 * 1024 * 1024;

const FALLBACK_REEL_PATHS = [
  "/reels/reel-1.mp4",
  "/reels/reel-2.mp4",
  "/reels/reel-3.mp4",
];

type TtsProvider = "deepgram" | "browser";

type ProfilePreset = {
  id: string;
  label: string;
  description: string;
  eduLevel: string;
  experienceLevel: string;
  goal: string;
  learningStyle: string;
  mood: string;
  timeAvailable: string;
};

const PROFILE_PRESETS: ProfilePreset[] = [
  {
    id: "exam-sprint",
    label: "Exam Sprint",
    description: "Traps, recall cues, fast self-checks",
    eduLevel: "school",
    experienceLevel: "rusty",
    goal: "exam",
    learningStyle: "academic",
    mood: "strict",
    timeAvailable: "10",
  },
  {
    id: "deep-mastery",
    label: "Deep Mastery",
    description: "Nuance, mechanisms, edge cases",
    eduLevel: "university",
    experienceLevel: "advanced",
    goal: "concept",
    learningStyle: "socratic",
    mood: "professional",
    timeAvailable: "30",
  },
  {
    id: "career-ready",
    label: "Career Ready",
    description: "Practical usage and interview wording",
    eduLevel: "university",
    experienceLevel: "intermediate",
    goal: "interview",
    learningStyle: "analogical",
    mood: "professional",
    timeAvailable: "15",
  },
];

const EDU_LEVEL_OPTIONS = [
  { id: "school", label: "School", hint: "Plain language" },
  { id: "college", label: "College", hint: "Applied depth" },
  { id: "university", label: "University", hint: "Rigorous" },
];

const EXPERIENCE_OPTIONS = [
  { id: "beginner", label: "Beginner", hint: "Define terms first" },
  { id: "rusty", label: "Rusty", hint: "Refresh gaps" },
  { id: "intermediate", label: "Intermediate", hint: "Move faster" },
  { id: "advanced", label: "Advanced", hint: "Include edge cases" },
];

const GOAL_OPTIONS = [
  { id: "concept", label: "Understand", hint: "Why it works" },
  { id: "exam", label: "Exam Prep", hint: "Traps and recall" },
  { id: "interview", label: "Interview", hint: "Say it clearly" },
  { id: "project", label: "Project", hint: "Use it in work" },
];

const LEARNING_STYLE_OPTIONS = [
  { id: "academic", label: "Structured", hint: "Clean theory" },
  { id: "visual", label: "Visual", hint: "Maps and frames" },
  { id: "analogical", label: "Analogies", hint: "Relatable models" },
  { id: "socratic", label: "Socratic", hint: "Guided questions" },
];

const VIBE_LEVEL_OPTIONS = [
  { id: "school", label: "School", hint: "simple, clear" },
  { id: "college", label: "College", hint: "practical depth" },
  { id: "university", label: "University", hint: "rigorous detail" },
  { id: "auto", label: "Let AI decide", hint: "adaptive" },
];

const SUBJECT_OPTIONS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "Economics",
  "Psychology",
  "Business",
  "Medicine",
  "Engineering",
  "Law",
  "History",
];

type ChatCommand = {
  key: string;
  label: string;
  description: string;
  tab: "learn" | "quiz" | "visualize" | "plan";
  learnFormat?: string;
  quizFormat?: string;
  vizFormat?: string;
};

type StudioToolConfig = ChatCommand & {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  altLabels?: string[];
  accent?: keyof typeof accentClasses;
};

const CHAT_COMMANDS: ChatCommand[] = [
  { key: "lecture", label: "Lecture", description: "Deep explanation", tab: "learn", learnFormat: "lecture" },
  { key: "cards", label: "Cards", description: "Flashcards", tab: "learn", learnFormat: "flashcards" },
  { key: "mcq", label: "MCQs", description: "10-question quiz", tab: "quiz", quizFormat: "mcq" },
  { key: "rapid", label: "Rapid", description: "Fast recall", tab: "quiz", quizFormat: "rapid" },
  { key: "visual", label: "Visual", description: "Flow diagram", tab: "visualize", vizFormat: "flowchart" },
  { key: "sheet", label: "Cheat Sheet", description: "Readable poster", tab: "visualize", vizFormat: "cheatsheet" },
  { key: "reel", label: "Reel", description: "Short video lesson", tab: "learn", learnFormat: "reel" },
  { key: "plan", label: "Plan", description: "Study roadmap", tab: "plan" },
];

const STUDIO_TOOLS: StudioToolConfig[] = [
  { id: "study-guide", key: "lecture", label: "Study Guide", description: "Deep explanation", tab: "learn", learnFormat: "lecture", icon: GraduationCap, altLabels: ["Lecture"], accent: "indigo" },
  { id: "flashcards", key: "cards", label: "Flashcards", description: "Quick recall cards", tab: "learn", learnFormat: "flashcards", icon: Layers, accent: "violet" },
  { id: "podcast", key: "podcast", label: "Podcast", description: "Audio study session", tab: "learn", learnFormat: "podcast", icon: Headphones, accent: "cyan" },
  { id: "reel", key: "reel", label: "Reel Script", description: "Short video lesson", tab: "learn", learnFormat: "reel", icon: Clapperboard, altLabels: ["Reel"], accent: "rose" },
  { id: "mcq", key: "mcq", label: "MCQ Quiz", description: "10-question quiz", tab: "quiz", quizFormat: "mcq", icon: HelpCircle, altLabels: ["Quiz", "MCQs"], accent: "amber" },
  { id: "rapid", key: "rapid", label: "Rapid Quiz", description: "Fast recall drill", tab: "quiz", quizFormat: "rapid", icon: Zap, altLabels: ["Rapid"], accent: "emerald" },
  { id: "cheatsheet", key: "sheet", label: "Cheat Sheet", description: "Readable poster", tab: "visualize", vizFormat: "cheatsheet", icon: ImageIcon, accent: "rose" },
  { id: "flow", key: "visual", label: "Flow Diagram", description: "Concept flow map", tab: "visualize", vizFormat: "flowchart", icon: Share2, altLabels: ["Mind Map"], accent: "violet" },
  { id: "dld", key: "dld", label: "DLD Circuit", description: "Circuit visual", tab: "visualize", vizFormat: "dld", icon: Cpu, accent: "cyan" },
  { id: "plan", key: "plan", label: "Study Plan", description: "Step-by-step roadmap", tab: "plan", icon: Map, altLabels: ["Roadmap", "Plan"], accent: "emerald" },
];

const TOOL_HERO_COPY: Record<string, string> = {
  "study-guide": "A full, structured explanation of your topic — built for reading start to finish.",
  flashcards: "Bite-sized cards for rapid recall. Swipe through them right before a test.",
  podcast: "Turn a topic into a spoken lesson you can listen to like a podcast episode.",
  reel: "A short, punchy video script you can turn into a 30-second reel.",
  mcq: "A 10-question multiple choice quiz to check what actually stuck.",
  rapid: "Fast, typed recall questions — no multiple choice, just you and the answer.",
  cheatsheet: "A dense, printable revision poster with everything you need before an exam.",
  flow: "A visual flowchart that maps out how the concept connects, step by step.",
  dld: "A circuit-style visual for digital logic and hardware concepts.",
  plan: "A day-by-day roadmap that breaks a big topic into a plan you can follow.",
};

const DEEPGRAM_AURA_VOICES: TtsVoiceOption[] = [
  { id: "aura-2-thalia-en", label: "Thalia", description: "Confident reel host" },
  { id: "aura-2-aurora-en", label: "Aurora", description: "Cheerful and punchy" },
  { id: "aura-2-atlas-en", label: "Atlas", description: "Friendly creator energy" },
  { id: "aura-2-selene-en", label: "Selene", description: "Expressive storyteller" },
  { id: "aura-2-ophelia-en", label: "Ophelia", description: "Bright and enthusiastic" },
  { id: "aura-2-aries-en", label: "Aries", description: "Warm energetic narrator" },
  { id: "aura-2-apollo-en", label: "Apollo", description: "Casual confident male" },
  { id: "aura-2-zeus-en", label: "Zeus", description: "Deep cinematic male" },
];

const DEEPGRAM_TTS_MIN_TIMEOUT_MS = 25000;
const DEEPGRAM_TTS_MAX_TIMEOUT_MS = 90000;
const getDeepgramTtsTimeoutMs = (text: string) =>
  Math.min(DEEPGRAM_TTS_MAX_TIMEOUT_MS, Math.max(DEEPGRAM_TTS_MIN_TIMEOUT_MS, 12000 + text.length * 8));

const extractVideoUrls = (raw: string) => {
  const matches = raw.match(/https?:\/\/[^\s)\]'"<>]+/gi) || [];
  return Array.from(new Set(matches.map((url) => url.replace(/[.,;]+$/, ""))));
};

const normalizeDialogueLine = (line: string, index: number): DialogueSegment | null => {
  const cleanLine = line
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .trim();

  if (!cleanLine) return null;

  const match = cleanLine.match(/^(?:host\s*)?([ab])(?:\s*\([^)]*\))?\s*[:-]\s*(.+)$/i);
  const speaker = match ? (match[1].toUpperCase() as "A" | "B") : (index % 2 === 0 ? "A" : "B");
  const text = (match ? match[2] : cleanLine)
    .replace(/^(?:trump|putin|donald|vladimir|host\s*[ab]|speaker\s*[ab])\s*[:-]\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!text) return null;
  const wordCount = text.split(/\s+/).length;
  return {
    speaker,
    text,
    durationMs: Math.min(9000, Math.max(1900, wordCount * 360)),
  };
};

const buildDialogueSegments = (rawScript: string): DialogueSegment[] => {
  const rawLines = rawScript
    .replace(/```[\s\S]*?```/g, "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const fromLines = rawLines
    .map((line, index) => normalizeDialogueLine(line, index))
    .filter(Boolean) as DialogueSegment[];

  if (fromLines.length > 1) return fromLines;

  return rawScript
    .replace(/[*#_`]/g, "")
    .split(/(?<=[.!?])\s+/)
    .map((line, index) => normalizeDialogueLine(line, index))
    .filter(Boolean) as DialogueSegment[];
};

const getSpeechVoices = async () => {
  const synth = window.speechSynthesis;
  const voices = synth.getVoices();
  if (voices.length) return voices;

  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const timer = window.setTimeout(() => resolve(synth.getVoices()), 700);
    synth.onvoiceschanged = () => {
      window.clearTimeout(timer);
      resolve(synth.getVoices());
    };
  });
};

const pickHumanLikeVoices = async () => {
  const voices = await getSpeechVoices();
  const english = voices.filter((voice) => voice.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const scoreVoice = (voice: SpeechSynthesisVoice) => {
    const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
    let score = 0;
    ["natural", "neural", "online", "google", "microsoft", "aria", "jenny", "guy", "david", "zira", "samantha", "daniel"].forEach((token) => {
      if (name.includes(token)) score += 2;
    });
    if (!voice.localService) score += 1;
    if (voice.default) score += 1;
    return score;
  };
  const ranked = [...pool].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return {
    primary: ranked[0] || null,
    secondary: ranked.find((voice) => voice.name !== ranked[0]?.name) || ranked[0] || null,
  };
};

const getWordIndexFromChar = (text: string, charIndex: number) => {
  const words = Array.from(text.matchAll(/\S+/g));
  const index = words.findIndex((match) => {
    const start = match.index || 0;
    return charIndex >= start && charIndex <= start + match[0].length;
  });
  return index >= 0 ? index : 0;
};

const getCaptionWindow = (words: string[], activeWord: number, maxWords = 7) => {
  if (words.length <= maxWords) return { words, start: 0 };
  const safeActive = Math.max(0, Math.min(activeWord, words.length - 1));
  let start = Math.max(0, safeActive - Math.floor(maxWords / 2));
  start = Math.min(start, Math.max(0, words.length - maxWords));
  return { words: words.slice(start, start + maxWords), start };
};

const stripDialogueLabels = (text: string) => {
  return buildDialogueSegments(text).map((segment) => segment.text).join("\n");
};

const sanitizeSpeechText = (text: string) => {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/#[A-Za-z0-9_-]+/g, " ")
    .replace(/@[A-Za-z0-9_-]+/g, " ")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[*_`>#|~]/g, " ")
    .replace(/\b(?:Host|Speaker)\s*[AB]\s*[:-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

const Transform = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const hasAutoStarted = useRef(false);
  const isGeneratingRef = useRef(false);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const currentGenerationRequestRef = useRef<{ title: string; focus: string; mode: "learn" | "quiz" | "visualize" | "plan"; tool: string } | null>(null);
  const contentEndRef = useRef<HTMLDivElement>(null);
  const studioFocusInputRef = useRef<HTMLTextAreaElement>(null);
  const [featureGuideOpen, setFeatureGuideOpen] = useState(false);
  const [pendingAutoTopic, setPendingAutoTopic] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'sources' | 'chat' | 'studio'>('chat');
  const [isCreatingReel, setIsCreatingReel] = useState(false);

  // Additive bridge to the dashboard's Vibe Engine (src/lib/vibeStore.tsx).
  // Only seeds initial values and mirrors changes back — the generation
  // pipeline below still reads exclusively from its own local state.
  const vibe = useVibe();

  const [activeTab, setActiveTab] = useState<"learn" | "quiz" | "visualize" | "plan">(() => vibe.mode || "learn");
  const [learnFormat, setLearnFormat] = useState("lecture"); 
  const [vizFormat, setVizFormat] = useState("cheatsheet"); 
  const [quizFormat, setQuizFormat] = useState("mcq");
  const [isVibePanelOpen, setIsVibePanelOpen] = useState(true);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [pendingChatRun, setPendingChatRun] = useState<string | null>(null);
  const viewStyle = "classic";
  const [leftPanelWidth, setLeftPanelWidth] = useState(320);
  const [rightPanelWidth, setRightPanelWidth] = useState(360);
  const [panelDragTarget, setPanelDragTarget] = useState<PanelDragTarget | null>(null);
  const [isSourcePanelLocked, setIsSourcePanelLocked] = useState(false);
  const [isSourcePanelHovered, setIsSourcePanelHovered] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [eduLevel, setEduLevel] = useState(() => vibe.level || "university");
  const [grade, setGrade] = useState("10");
  const [collegeYear, setCollegeYear] = useState("11");
  const [major, setMajor] = useState(() => vibe.subject || "Computer Science");
  const [goal, setGoal] = useState("concept");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [profileContext, setProfileContext] = useState(() => vibe.subject || "Computer Science");

  const [mood, setMood] = useState(() => vibe.mood || "enthusiastic");
  const [timeAvailable, setTimeAvailable] = useState(() => vibe.timeAvailable || "15");
  const [learningStyle, setLearningStyle] = useState("academic"); 
  const [quizDifficulty, setQuizDifficulty] = useState<"basic" | "advanced">("basic");

  const [userTopic, setUserTopic] = useState("");
  const [bottomNewTopic, setBottomNewTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [historicalData, setHistoricalData] = useState<HistoricalData | null>(null);
  
  const [contentStream, setContentStream] = useState<ContentBlock[]>([]);
  const [generationHistory, setGenerationHistory] = useState<GeneratedArtifact[]>(() => {
    try {
      const raw = localStorage.getItem("vibeschool.generationHistory");
      return raw ? JSON.parse(raw) as GeneratedArtifact[] : [];
    } catch {
      return [];
    }
  });
  const [studioFocus, setStudioFocus] = useState("");
  const [focusSuggestions, setFocusSuggestions] = useState<string[]>([]);
  const [isFocusPickerOpen, setIsFocusPickerOpen] = useState(false);
  const [isToolWorkspaceOpen, setIsToolWorkspaceOpen] = useState(false);
  const [heroTool, setHeroTool] = useState<StudioToolConfig | null>(null);
  const [toolSessionStart, setToolSessionStart] = useState(0);
  const [expandedScripts, setExpandedScripts] = useState<Record<number, boolean>>({});
  const [relatedSuggestions, setRelatedSuggestions] = useState<string[]>([]);
  const [explainInput, setExplainInput] = useState("");
  const [diagramCode, setDiagramCode] = useState("");
  const [roadmapData, setRoadmapData] = useState<RoadmapStep[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [storageUsage, setStorageUsage] = useState<{ usedBytes: number; capBytes: number } | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [isLibraryPickerOpen, setIsLibraryPickerOpen] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  // Backward-compat derived values: most of the generation pipeline below
  // was written against a single active document. `materialId` now carries
  // a comma-joined list of every processed document's id (Pinecone filter
  // parses it with $in when there's more than one), and the label is used
  // anywhere a single file name used to be shown.
  const processedDocuments = documents.filter((doc) => doc.status === "processed");
  const materialId = processedDocuments.length ? processedDocuments.map((doc) => doc.id).join(",") : null;
  const primaryDocumentLabel = documents.length === 1
    ? documents[0].name
    : documents.length > 1
      ? `${documents.length} uploaded files`
      : "";
  const isSourcePanelOpen = isMobile || isSourcePanelLocked || isSourcePanelHovered;

  useEffect(() => {
    try {
      localStorage.setItem("vibeschool.generationHistory", JSON.stringify(generationHistory.slice(0, 18)));
    } catch {
      // Large visual artifacts may exceed storage; session history still works in memory.
    }
  }, [generationHistory]);

  useEffect(() => {
    if (!panelDragTarget) return;
    const onPointerMove = (event: PointerEvent) => {
      const rect = workspaceRef.current?.getBoundingClientRect();
      if (!rect) return;
      if (panelDragTarget === "left") {
        setLeftPanelWidth(Math.min(420, Math.max(260, event.clientX - rect.left)));
      } else {
        setRightPanelWidth(Math.min(480, Math.max(300, rect.right - event.clientX)));
      }
    };
    const stopDragging = () => setPanelDragTarget(null);
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      document.body.style.cursor = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [panelDragTarget]);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1.15");
  const playbackSpeedRef = useRef("1.15");
  const [currentSentence, setCurrentSentence] = useState("Ready...");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [fullAudioText, setFullAudioText] = useState("");
  const [charOffset, setCharOffset] = useState(0);
  const [activeCaptionWords, setActiveCaptionWords] = useState<string[]>([]);
  const [activeCaptionWord, setActiveCaptionWord] = useState(0);
  const [currentReelSegment, setCurrentReelSegment] = useState(0);
  const [currentReelVideo, setCurrentReelVideo] = useState(0);
  const [reelUrlsText, setReelUrlsText] = useState("");
  const [ttsProvider, setTtsProvider] = useState<TtsProvider>("browser");
  const [preferredTtsProvider, setPreferredTtsProvider] = useState<TtsProvider>("deepgram");
  const [selectedTtsVoice, setSelectedTtsVoice] = useState("aura-2-thalia-en");
  const reelSpeechRunRef = useRef(0);
  const reelAudioRef = useRef<HTMLAudioElement | null>(null);
  const reelTimerRef = useRef<number | null>(null);
  const reelStageRef = useRef<HTMLDivElement | null>(null);
  const reelVideoRef = useRef<HTMLVideoElement | null>(null);
  const [videoHadError, setVideoHadError] = useState(false);
  const [isReelVideoPlaying, setIsReelVideoPlaying] = useState(false);
  const [isReelFullscreen, setIsReelFullscreen] = useState(false);
  const getPlaybackSpeed = () => parseFloat(playbackSpeedRef.current) || 1.15;

  const brainrotUrls = useMemo(() => extractVideoUrls(brainrotVideoLinks), []);
  const manualReelUrls = useMemo(() => extractVideoUrls(reelUrlsText), [reelUrlsText]);
  const reelVideoUrls = useMemo(() => {
    const merged = Array.from(new Set([...manualReelUrls, ...brainrotUrls]));
    return merged.length ? merged : FALLBACK_REEL_PATHS;
  }, [manualReelUrls, brainrotUrls]);
  const customDeepgramTtsEndpoint =
    import.meta.env.VITE_DEEPGRAM_TTS_ENDPOINT || import.meta.env.VITE_TTS_ENDPOINT || "";
  const deepgramTtsEndpoint =
    customDeepgramTtsEndpoint || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deepgram-tts` : "");
  const hasDeepgramEndpoint = Boolean(deepgramTtsEndpoint);
  const activeGoalLabel = GOAL_OPTIONS.find((item) => item.id === goal)?.label || goal;
  const activeExperienceLabel = EXPERIENCE_OPTIONS.find((item) => item.id === experienceLevel)?.label || experienceLevel;
  const activeStyleLabel = LEARNING_STYLE_OPTIONS.find((item) => item.id === learningStyle)?.label || learningStyle;
  const activeLevelLabel = VIBE_LEVEL_OPTIONS.find((item) => item.id === eduLevel)?.label || eduLevel;
  const apiEduLevel = eduLevel === "auto" ? "university" : eduLevel;
  const profileSpecificityScore = useMemo(() => {
    let score = 35;
    if ((profileContext || major).trim().length >= 4) score += 25;
    if (experienceLevel !== "beginner") score += 15;
    if (goal !== "concept") score += 15;
    if (learningStyle !== "academic") score += 10;
    return Math.min(100, score);
  }, [experienceLevel, goal, learningStyle, major, profileContext]);
  const profileImpact = useMemo(() => {
    const impacts = [
      eduLevel === "auto"
        ? "Lets AI infer the right academic depth from the source and question."
        : eduLevel === "school"
        ? `Uses grade ${grade || "10"} language and defines jargon immediately.`
        : eduLevel === "college"
          ? `Uses practical college-level examples and year ${collegeYear || "1"} pacing.`
          : `Uses ${major || "your field"} depth, formulas, and professional terms.`,
      goal === "exam"
        ? "Adds likely test traps, recall cues, and MCQ-style wording."
        : goal === "interview"
          ? "Shapes answers into short verbal explanations and comparisons."
          : goal === "project"
            ? "Prioritizes implementation choices, tradeoffs, and real usage."
            : "Builds deep understanding before memorization.",
      experienceLevel === "advanced"
        ? "Skips obvious basics faster and includes edge cases."
        : experienceLevel === "rusty"
          ? "Refreshes missing links before going deeper."
          : experienceLevel === "intermediate"
            ? "Keeps foundations brief and moves at a stronger pace."
            : "Assumes low prior confidence and explains from first principles.",
      learningStyle === "visual"
        ? "Uses mental maps, frameworks, and spatial structure."
        : learningStyle === "analogical"
          ? "Uses analogies before formal definitions."
          : learningStyle === "socratic"
            ? "Guides with questions before giving the answer."
            : "Uses clean headings, definitions, examples, and checks.",
    ];
    return impacts;
  }, [collegeYear, eduLevel, experienceLevel, goal, grade, learningStyle, major]);
  const featureGuide = {
    learn: {
      title: "AI Tutor",
      description: "Ask for a lecture, flashcards, podcast, or reel-style lesson. The tutor keeps your level, mood, and time window in mind.",
      steps: ["Choose a learning format", "Type a topic or upload a PDF", "Play, pause, or ask follow-up questions"],
      icon: BookOpen,
    },
    quiz: {
      title: "Quiz Builder",
      description: "Generate MCQs or rapid-fire questions from any topic, then check your answers instantly.",
      steps: ["Pick MCQ or Rapid", "Enter the topic", "Use results to spot weak areas"],
      icon: BrainCircuit,
    },
    visualize: {
      title: "Visualizer",
      description: "Turn ideas into flowcharts, digital-logic style diagrams, or image cheat sheets for fast visual revision.",
      steps: ["Choose Flow, Circuit, or Cheat Sheet", "Enter a topic or upload lecture notes", "Review, copy, or download the visual"],
      icon: Share2,
    },
    plan: {
      title: "Pathfinder",
      description: "Build a compact roadmap with ordered steps and time estimates for learning a topic.",
      steps: ["Enter your target topic", "Generate a plan", "Work through each milestone"],
      icon: Map,
    },
  } as const;

  useEffect(() => {
    const fetchSessionHistory = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (user) {
         const { data, error } = await supabase
           .from('user_session_history')
           .select('*')
           .eq('user_id', user.id)
           .order('updated_at', { ascending: false })
           .limit(1)
           .maybeSingle();
         if (!error && data) setHistoricalData(data);
       }
    };
    fetchSessionHistory();
    return () => { window.speechSynthesis.cancel(); };
  }, []);

  useEffect(() => {
    const latestCardsBlock = [...contentStream].reverse().find((block) => block.type === 'cards');
    if (latestCardsBlock) {
      setCurrentCard(0);
    }
  }, [contentStream]);

  // Mirror local personalization state back to the shared Vibe Engine store so
  // the dashboard reflects the latest subject/level/mood/time/mode.
  useEffect(() => {
    vibe.setVibe({
      subject: profileContext || major,
      level: eduLevel === "auto" ? "university" : eduLevel,
      mood,
      timeAvailable,
      mode: activeTab,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileContext, major, eduLevel, mood, timeAvailable, activeTab]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsReelFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const applyProfilePreset = (preset: ProfilePreset) => {
    setEduLevel(preset.eduLevel);
    setExperienceLevel(preset.experienceLevel);
    setGoal(preset.goal);
    setLearningStyle(preset.learningStyle);
    setMood(preset.mood);
    setTimeAvailable(preset.timeAvailable);
    if (!profileContext.trim()) {
      setProfileContext(major || "Computer Science");
    }
  };

  const clearReelTimers = () => {
    if (reelTimerRef.current) {
      window.clearInterval(reelTimerRef.current);
      reelTimerRef.current = null;
    }
  };

  const handleSpeak = async (text: string, startFromChar = 0, preferEdge = true) => {
    const labelFreeText = stripDialogueLabels(text);
    if (startFromChar === 0) setFullAudioText(labelFreeText);
    const cleanText = sanitizeSpeechText(labelFreeText.substring(startFromChar));
    const sentences = cleanText.match(/[^.!?]+[.!?]+/g) || [cleanText];
    if (preferEdge && startFromChar === 0) {
      try {
        const usedDeepgram = await playDeepgramAudio(cleanText, () => syncEstimatedTextCaptions(cleanText, performance.now()));
        if (usedDeepgram) return;
      } catch {
        console.warn("Deepgram Aura TTS failed, falling back to browser speech.");
        toast.info("Deepgram Aura is unavailable, using browser voice.");
      }
    }
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    const { primary } = await pickHumanLikeVoices();
    if (primary) u.voice = primary;
    u.rate = getPlaybackSpeed(); u.pitch = 1.02; 
    u.onboundary = (event) => {
        const globalIndex = startFromChar + event.charIndex;
        setCharOffset(globalIndex); 
        let count = 0;
        for(const s of sentences) {
            if (globalIndex >= count && globalIndex < count + s.length) { setCurrentSentence(s.trim()); break; }
            count += s.length;
        }
    };
    u.onend = () => { setIsSpeaking(false); setIsPaused(false); setCurrentSentence("Finished."); setCharOffset(0); };
    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
    setTtsProvider("browser");
    setIsSpeaking(true); setIsPaused(false);
  };

  const handleReadMainTextAloud = () => {
    const targetBlock = [...contentStream].reverse().find(b => b.type === 'text');
    if (targetBlock && targetBlock.data) {
       if (isSpeaking) {
          handleStop();
       } else {
          handleSpeak(String(targetBlock.data), 0);
       }
    } else {
       toast.error("No legible text content available to parse.");
    }
  };

  const togglePlayPause = () => {
      if (isSpeaking && !isPaused) {
        window.speechSynthesis.pause();
        reelAudioRef.current?.pause();
        setIsPaused(true);
      } 
      else if (isPaused) {
        window.speechSynthesis.resume();
        reelAudioRef.current?.play().catch(() => {});
        setIsPaused(false);
      } 
      else if (contentStream.length > 0 && contentStream[contentStream.length-1].type === 'podcast') {
          handleSpeak(String(contentStream[contentStream.length-1].data), 0);
      }
  };

  const startReelVideo = () => {
    setIsReelVideoPlaying(true);
    const video = reelVideoRef.current;
    if (!video) return;
    video.playbackRate = getPlaybackSpeed();
    video.play().catch(() => {});
  };

  const pauseReelVideo = () => {
    setIsReelVideoPlaying(false);
    reelVideoRef.current?.pause();
  };

  const resetReelVideo = () => {
    setIsReelVideoPlaying(false);
    const video = reelVideoRef.current;
    if (!video) return;
    video.pause();
    try {
      video.currentTime = 0;
    } catch {
      // Some remote videos disallow seeking before metadata is available.
    }
  };

  const handleStop = () => {
    reelSpeechRunRef.current += 1;
    clearReelTimers();
    window.speechSynthesis.cancel();
    if (reelAudioRef.current) {
      reelAudioRef.current.pause();
      reelAudioRef.current.currentTime = 0;
      reelAudioRef.current.src = "";
      reelAudioRef.current = null;
    }
    resetReelVideo();
    setIsTtsLoading(false);
    setIsSpeaking(false);
    setIsPaused(false);
    setCurrentSentence("Ready...");
    setCharOffset(0);
    setActiveCaptionWords([]);
    setActiveCaptionWord(0);
    setCurrentReelSegment(0);
  };
  const changeSpeed = (speed: string) => {
    playbackSpeedRef.current = speed;
    setPlaybackSpeed(speed);
    if (reelAudioRef.current) reelAudioRef.current.playbackRate = parseFloat(speed) || 1.15;
    if (reelVideoRef.current) reelVideoRef.current.playbackRate = parseFloat(speed) || 1.15;
    if (isSpeaking && fullAudioText) {
      handleSpeak(fullAudioText, charOffset);
    }
  };

  const handleReelSpeedChange = (speed: string) => {
    changeSpeed(speed);
    if (ttsProvider === "browser" && window.speechSynthesis?.speaking) {
      toast.info("Speed will apply from the next spoken line. Press stop/play to restart immediately.");
    }
  };

  const handleReelProviderChange = (provider: TtsProvider) => {
    if (isSpeaking) handleStop();
    setPreferredTtsProvider(provider);
    setTtsProvider(provider);
  };

  const toggleReelFullscreen = async () => {
    if (!reelStageRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await reelStageRef.current.requestFullscreen();
      }
    } catch {
      toast.error("Fullscreen is not available in this browser.");
    }
  };

  const buildReelPayload = (rawContent: string, topic: string): ReelPayload => {
    const segments = buildDialogueSegments(rawContent);
    return {
      script: rawContent,
      segments,
      videoUrls: reelVideoUrls,
      topic,
    };
  };

  const syncEstimatedCaptions = (segments: DialogueSegment[], startedAt: number) => {
    clearReelTimers();
    const totalDuration = segments.reduce((sum, segment) => sum + segment.durationMs, 0);
    reelTimerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) * getPlaybackSpeed();
      let cursor = 0;
      let activeIndex = segments.length - 1;
      for (let index = 0; index < segments.length; index += 1) {
        const nextCursor = cursor + segments[index].durationMs;
        if (elapsed <= nextCursor) {
          activeIndex = index;
          break;
        }
        cursor = nextCursor;
      }
      const active = segments[activeIndex];
      const localElapsed = Math.max(0, elapsed - cursor);
      const words = active.text.split(/\s+/);
      setCurrentReelSegment(activeIndex);
      setCurrentSentence(active.text);
      setActiveCaptionWords(words);
      setActiveCaptionWord(Math.min(words.length - 1, Math.floor((localElapsed / active.durationMs) * words.length)));
      if (elapsed >= totalDuration) {
        clearReelTimers();
        setIsSpeaking(false);
        setIsPaused(false);
      }
    }, 80);
  };

  const syncEstimatedTextCaptions = (text: string, startedAt: number) => {
    clearReelTimers();
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const durations = sentences.map((sentence) => Math.min(8500, Math.max(1800, sentence.split(/\s+/).length * 360)));
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    reelTimerRef.current = window.setInterval(() => {
      const elapsed = (performance.now() - startedAt) * getPlaybackSpeed();
      let cursor = 0;
      let activeIndex = sentences.length - 1;
      for (let index = 0; index < sentences.length; index += 1) {
        const nextCursor = cursor + durations[index];
        if (elapsed <= nextCursor) {
          activeIndex = index;
          break;
        }
        cursor = nextCursor;
      }
      setCurrentSentence(sentences[activeIndex].trim());
      if (elapsed >= totalDuration) {
        clearReelTimers();
      }
    }, 120);
  };

  const playDeepgramAudio = async (
    text: string,
    sync?: () => void,
    options?: {
      isCurrent?: () => boolean;
      onPlaybackStart?: () => void;
      onPlaybackEnd?: () => void;
    },
  ) => {
    if (preferredTtsProvider !== "deepgram") return false;

    const cleanText = sanitizeSpeechText(text);
    if (!cleanText) return false;

    let audioUrl = "";
    let revokeAudioUrl = false;
    setIsTtsLoading(true);

    if (hasDeepgramEndpoint) {
      const ttsAbortController = new AbortController();
      const ttsRequestTimer = window.setTimeout(() => ttsAbortController.abort(), getDeepgramTtsTimeoutMs(cleanText));
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
        const response = await fetch(deepgramTtsEndpoint, {
          method: "POST",
          signal: ttsAbortController.signal,
          headers: {
            "Content-Type": "application/json",
            ...(publishableKey ? { apikey: publishableKey } : {}),
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({
            text: cleanText,
            voice: selectedTtsVoice,
            speed: getPlaybackSpeed(),
            format: "mp3",
          }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(`Deepgram TTS endpoint returned ${response.status}${detail ? `: ${detail.slice(0, 160)}` : ""}.`);
        }
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await response.json();
          if (data.audioUrl || data.url) {
            audioUrl = data.audioUrl || data.url;
          } else if (data.audioBase64 || data.audio) {
            audioUrl = `data:${data.mimeType || "audio/mpeg"};base64,${data.audioBase64 || data.audio}`;
          } else {
            throw new Error("Deepgram TTS JSON response did not include audioUrl or audioBase64.");
          }
        } else {
          const blob = await response.blob();
          audioUrl = URL.createObjectURL(blob);
          revokeAudioUrl = true;
        }
      } catch (error) {
        console.warn("Deepgram TTS endpoint failed; trying browser speech fallback.", error);
        if (error instanceof Error) toast.error(error.message);
      } finally {
        window.clearTimeout(ttsRequestTimer);
      }
    }

    if (!audioUrl) {
      setIsTtsLoading(false);
      throw new Error("Deepgram TTS did not return audio.");
    }

    if (options?.isCurrent && !options.isCurrent()) {
      if (revokeAudioUrl) URL.revokeObjectURL(audioUrl);
      setIsTtsLoading(false);
      return false;
    }

    const audio = new Audio(audioUrl);
    reelAudioRef.current = audio;
    audio.playbackRate = getPlaybackSpeed();
    audio.onended = () => {
      if (revokeAudioUrl) URL.revokeObjectURL(audioUrl);
      clearReelTimers();
      options?.onPlaybackEnd?.();
      setIsTtsLoading(false);
      setIsSpeaking(false);
      setIsPaused(false);
    };
    audio.onerror = () => {
      if (revokeAudioUrl) URL.revokeObjectURL(audioUrl);
      clearReelTimers();
      options?.onPlaybackEnd?.();
      setIsTtsLoading(false);
      setIsSpeaking(false);
      setIsPaused(false);
      toast.error("Deepgram Aura audio could not play.");
    };
    try {
      await audio.play();
    } catch (error) {
      if (revokeAudioUrl) URL.revokeObjectURL(audioUrl);
      options?.onPlaybackEnd?.();
      setIsTtsLoading(false);
      throw error;
    }

    if (options?.isCurrent && !options.isCurrent()) {
      audio.pause();
      if (revokeAudioUrl) URL.revokeObjectURL(audioUrl);
      setIsTtsLoading(false);
      return false;
    }

    options?.onPlaybackStart?.();
    sync?.();
    setTtsProvider("deepgram");
    setIsTtsLoading(false);
    setIsSpeaking(true);
    setIsPaused(false);
    return true;
  };

  const tryPlayDeepgramReel = async (payload: ReelPayload) => {
    const text = payload.segments.map((segment) => sanitizeSpeechText(segment.text)).join("\n");
    const runId = reelSpeechRunRef.current;
    return playDeepgramAudio(
      text,
      () => syncEstimatedCaptions(payload.segments, performance.now()),
      {
        isCurrent: () => reelSpeechRunRef.current === runId,
        onPlaybackStart: startReelVideo,
        onPlaybackEnd: resetReelVideo,
      },
    );
  };

  const playBrowserReelSpeech = async (payload: ReelPayload) => {
    if (!("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      toast.error("Browser speech synthesis is not available here.");
      setIsSpeaking(false);
      setIsPaused(false);
      return;
    }

    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    const runId = reelSpeechRunRef.current + 1;
    reelSpeechRunRef.current = runId;
    const voices = await pickHumanLikeVoices();
    let index = 0;

    const speakNext = () => {
      if (runId !== reelSpeechRunRef.current || index >= payload.segments.length) {
        if (index >= payload.segments.length) {
          resetReelVideo();
          setIsTtsLoading(false);
          setIsSpeaking(false);
          setIsPaused(false);
        }
        return;
      }

      const segment = payload.segments[index];
      const spokenSegment = sanitizeSpeechText(segment.text);
      if (!spokenSegment) {
        index += 1;
        speakNext();
        return;
      }
      const words = spokenSegment.split(/\s+/);
      setCurrentReelSegment(index);
      setCurrentSentence(spokenSegment);
      setActiveCaptionWords(words);
      setActiveCaptionWord(0);

      const utterance = new SpeechSynthesisUtterance(spokenSegment);
      const chosenVoice = segment.speaker === "A" ? voices.primary : voices.secondary;
      if (chosenVoice) utterance.voice = chosenVoice;
      utterance.rate = getPlaybackSpeed();
      utterance.pitch = segment.speaker === "A" ? 1.02 : 0.95;
      utterance.volume = 1;
      utterance.lang = chosenVoice?.lang || "en-US";
      const currentSegmentIndex = index;
      const watchdog = window.setTimeout(() => {
        if (runId === reelSpeechRunRef.current && index === currentSegmentIndex && !window.speechSynthesis.speaking) {
          resetReelVideo();
          setIsTtsLoading(false);
          setIsSpeaking(false);
          setIsPaused(false);
          toast.error("Browser voice did not start. Try clicking play once more or check browser audio permissions.");
        }
      }, 1400);
      utterance.onstart = () => {
        window.clearTimeout(watchdog);
        if (currentSegmentIndex === 0) startReelVideo();
        setIsTtsLoading(false);
        setIsSpeaking(true);
        setIsPaused(false);
      };
      utterance.onboundary = (event) => {
        if (event.name === "word" || event.charIndex >= 0) {
          setActiveCaptionWord(getWordIndexFromChar(spokenSegment, event.charIndex));
        }
      };
      utterance.onend = () => {
        window.clearTimeout(watchdog);
        index += 1;
        speakNext();
      };
      utterance.onerror = () => {
        window.clearTimeout(watchdog);
        index += 1;
        speakNext();
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.resume();
      window.setTimeout(() => {
        if (runId === reelSpeechRunRef.current) {
          window.speechSynthesis.speak(utterance);
        }
      }, 80);
    };

    setTtsProvider("browser");
    setIsTtsLoading(true);
    setIsSpeaking(true);
    setIsPaused(false);
    speakNext();
  };

  const handlePlayReel = async (payload: ReelPayload) => {
    if (!payload.segments.length) {
      toast.error("No dialogue was generated for this reel.");
      return;
    }

    const audioIsPlaying = Boolean(reelAudioRef.current && !reelAudioRef.current.paused);
    const speechIsPlaying = window.speechSynthesis?.speaking;

    if (isSpeaking && !isPaused && (audioIsPlaying || speechIsPlaying)) {
      window.speechSynthesis.pause();
      reelAudioRef.current?.pause();
      pauseReelVideo();
      setIsPaused(true);
      return;
    }

    if (isPaused && (reelAudioRef.current || window.speechSynthesis?.paused)) {
      window.speechSynthesis.resume();
      await reelAudioRef.current?.play().catch(() => {});
      startReelVideo();
      setIsPaused(false);
      return;
    }

    handleStop();
    resetReelVideo();
    setVideoHadError(false);

    try {
      const usedDeepgram = await tryPlayDeepgramReel(payload);
      if (!usedDeepgram) await playBrowserReelSpeech(payload);
    } catch {
      console.warn("Deepgram Aura TTS failed, falling back to browser speech.");
      toast.info("Using browser voice because Deepgram Aura is unavailable.");
      await playBrowserReelSpeech(payload);
    }
  };

  const getLearnerProfileSummary = () => {
    const levelDetail = eduLevel === "auto"
      ? "AI decides"
      : eduLevel === "school"
      ? `grade ${grade || "10"}`
      : eduLevel === "college"
        ? `year ${collegeYear || "1"}`
        : major || "general major";
    return [
      `Level: ${eduLevel} (${levelDetail})`,
      `Experience: ${activeExperienceLabel}`,
      `Goal: ${activeGoalLabel}`,
      `Learning style: ${activeStyleLabel}`,
      `Context: ${profileContext || major || "General learning"}`,
      `Mood: ${mood}`,
      `Time: ${timeAvailable} minutes`
    ].join(" | ");
  };

  const blockToMemoryText = (block: ContentBlock) => {
    if (!block) return "";
    if (block.type === "reel") {
      return (block.data as ReelPayload | undefined)?.segments?.map((segment: DialogueSegment) => segment.text).join(" ") || "";
    }
    if (block.type === "visual-aids") {
      return (block.data as VisualAidImage[] | undefined)?.map((aid: VisualAidImage) => `${aid.title}: ${aid.subtitle || aid.lectures?.join(", ") || "visual revision sheet"}`).join(" | ") || "";
    }
    if (block.type === "cards" && Array.isArray(block.data)) return block.data.join(" ");
    return String(block.data || "");
  };

  const getTemporaryMemory = () => {
    const chatTurns = contentStream
      .filter((block) => ["text", "podcast", "cards", "reel", "visual-aids", "question", "quiz-interactive", "quiz-rapid"].includes(block.type))
      .slice(-8)
      .map((block) => {
        const speaker = block.role === "user" ? "Student" : "Tutor";
        return `${speaker}: ${sanitizeSpeechText(blockToMemoryText(block)).slice(0, 520)}`;
      })
      .filter((turn) => turn.length > 12);

    const modeMemory = [
      diagramCode ? `Recent visual diagram code: ${sanitizeSpeechText(diagramCode).slice(0, 500)}` : "",
      roadmapData.length ? `Recent roadmap: ${roadmapData.map((step) => `${step.title}: ${step.desc}`).join(" | ").slice(0, 700)}` : "",
    ].filter(Boolean);

    return [
      `Temporary session memory. Preserve continuity across mode and setting changes.`,
      `Current settings: mode=${activeTab}, learnFormat=${learnFormat}, quizFormat=${quizFormat}, vizFormat=${vizFormat}, mood=${mood}, time=${timeAvailable}m, learningStyle=${learningStyle}.`,
      `Learner profile: ${getLearnerProfileSummary()}.`,
      `Uploaded document: ${primaryDocumentLabel || "none"}.`,
      ...modeMemory,
      `Recent conversation:\n${chatTurns.join("\n") || "No prior messages yet."}`,
    ].join("\n\n").slice(0, 3200);
  };

  useEffect(() => {
    const topic = searchParams.get("topic");
    const mode = searchParams.get("mode");
    const format = searchParams.get("format");
    const quiz = searchParams.get("quiz");
    const viz = searchParams.get("viz");
    const style = searchParams.get("style");
    const guide = searchParams.get("guide");
    const session = searchParams.get("session");
    if (session && session !== sessionId) setSessionId(session);

    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    setFeatureGuideOpen(guide === "1");

    if (mode === 'roadmap' || mode === 'plan') setActiveTab('plan');
    else if (mode === 'diagram' || mode === 'visualize') setActiveTab('visualize');
    else if (mode === 'quiz') setActiveTab('quiz');
    else if (mode === 'learn' || mode === 'chat') setActiveTab('learn');

    if (format === 'lecture' || format === 'flashcards' || format === 'podcast' || format === 'reel') {
      setLearnFormat(format);
    }
    if (quiz === 'mcq' || quiz === 'rapid') {
      setQuizFormat(quiz);
    }
    if (viz === 'flowchart' || viz === 'dld' || viz === 'cheatsheet') {
      setVizFormat(viz);
    }
    if (style === 'visual' || style === 'socratic' || style === 'analogical' || style === 'academic') {
      setLearningStyle(style);
    }

    if (topic && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setUserTopic(topic);
      setIsEditingProfile(false);
      setPendingAutoTopic(topic);
    }
  }, [searchParams]);

  // Pulls in whichever files are already active sources of this session (set
  // on an earlier visit, or by a prior turn in this same session) so they
  // show up as attached without the user re-picking them every time they
  // come back. A brand-new session simply has none yet.
  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    openSession(sessionId)
      .then((sources) => {
        if (cancelled) return;
        const activeDocs = sources
          .filter((row) => row.is_active && row.documents)
          .map((row) => ({
            id: row.documents!.document_id,
            name: row.documents!.file_name,
            status: row.documents!.processing_status as UploadedDocument["status"],
          }));
        setDocuments((prev) => {
          const existingIds = new Set(prev.map((doc) => doc.id));
          return [...prev, ...activeDocs.filter((doc) => !existingIds.has(doc.id))];
        });
      })
      .catch(() => { /* best-effort — chat still works without prior sources */ });
    return () => { cancelled = true; };
  }, [sessionId]);

  useEffect(() => {
    if (!pendingAutoTopic) return;

    const topic = pendingAutoTopic;
    setPendingAutoTopic(null);
    handleGenerate(topic);
  }, [pendingAutoTopic]);

   
  useEffect(() => {
    if (!pendingChatRun) return;
    // Small delay to let state (activeTab/learnFormat/etc.) settle
    // after applyChatCommand sets them synchronously.
    const timer = window.setTimeout(() => {
      const prompt = pendingChatRun;
      setPendingChatRun(null);
      handleGenerate(prompt);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [pendingChatRun]);

  useEffect(() => {
    if (!isGenerating || !generationStartedAt) return;
    const timer = window.setInterval(() => {
      setGenerationElapsed(Math.max(1, Math.floor((Date.now() - generationStartedAt) / 1000)));
    }, 250);
    return () => window.clearInterval(timer);
  }, [isGenerating, generationStartedAt]);

  useEffect(() => {
    const hasOutput =
      contentStream.length > 0 ||
      Boolean(diagramCode) ||
      roadmapData.length > 0 ||
      relatedSuggestions.length > 0;

    if (hasOutput) {
      contentEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [contentStream, diagramCode, roadmapData, relatedSuggestions]);

  const updateDocumentStatus = (documentId: string, status: UploadedDocument["status"]) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === documentId ? { ...doc, status } : doc)));
  };

  const fetchStorageUsage = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      const { data, error } = await supabase.functions.invoke<{ used_bytes: number; cap_bytes: number }>("get-storage-usage", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data) return;
      setStorageUsage({ usedBytes: data.used_bytes, capBytes: data.cap_bytes });
    } catch {
      // Best-effort UI indicator; not critical to the upload flow.
    }
  };

  // Opens the "attach from library" picker. A session is created on the fly
  // the first time a user tries to browse their library from a session-less
  // chat, so attaching a file always has somewhere to stick as an active
  // source.
  const openLibraryPicker = async () => {
    setIsLibraryPickerOpen(true);
    setIsLibraryLoading(true);
    try {
      let activeSessionId = sessionId;
      if (!activeSessionId) {
        const created = await createSession(userTopic || "New Session");
        activeSessionId = created.id;
        setSessionId(created.id);
        navigate(`/transform?mode=learn&session=${created.id}`, { replace: true });
      }
      const files = await listLibrary(activeSessionId);
      setLibraryFiles(files);
    } catch {
      toast.error("Could not load your file library.");
      setIsLibraryPickerOpen(false);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleToggleLibrarySource = async (file: LibraryFile) => {
    if (!sessionId) return;
    const nextActive = !file.is_active_in_session;
    setLibraryFiles((prev) => prev.map((f) => (f.document_id === file.document_id ? { ...f, is_active_in_session: nextActive } : f)));
    setDocuments((prev) => {
      if (nextActive) {
        if (prev.some((doc) => doc.id === file.document_id)) return prev;
        return [...prev, { id: file.document_id, name: file.file_name, status: file.processing_status as UploadedDocument["status"] }];
      }
      return prev.filter((doc) => doc.id !== file.document_id);
    });
    try {
      await toggleSessionSource(sessionId, file.document_id, nextActive);
    } catch {
      toast.error(`Could not update "${file.file_name}" as a source.`);
    }
  };

  useEffect(() => {
    void fetchStorageUsage();
  }, []);

  const pollDocumentStatus = async (documentId: string, fileName: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const { data, error } = await supabase
        .from("documents")
        .select("processing_status, chunk_count")
        .eq("document_id", documentId)
        .single();

      if (error) return;
      const status = String(data?.processing_status || "queued") as UploadedDocument["status"];
      updateDocumentStatus(documentId, status);

      if (status === "processed") {
        toast.success(`${fileName} indexed: ${data?.chunk_count || 0} chunks ready in Pinecone.`);
        void fetchStorageUsage();
        return;
      }
      if (status === "failed") {
        toast.error(`${fileName}: processing failed. Please try re-uploading the file.`);
        void fetchStorageUsage();
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, attempt < 6 ? 2500 : 6000));
    }

    toast.info(`${fileName} is still processing in the background. You can come back shortly.`);
  };

  const supportsGzipCompression = () => typeof CompressionStream !== "undefined";

  const gzipBlob = async (blob: Blob): Promise<Blob> => {
    const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
    return await new Response(stream).blob();
  };

  const handleRemoveDocument = (documentId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    void (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const { error } = await supabase.functions.invoke("delete-document", {
          body: { document_id: documentId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (error) throw error;
      } catch (error: unknown) {
        console.error("Failed to delete document:", error);
        toast.error("Couldn't remove the document from storage. It will be cleared automatically later.");
      } finally {
        void fetchStorageUsage();
      }
    })();
  };

  const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error || "");

  const readFunctionError = async (error: { message?: string; context?: { json: () => Promise<unknown> } }) => {
    let msg = error?.message || "Request failed.";
    try {
      const body = await error.context?.json();
      if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;
        if (typeof record.error === "string") msg = record.error;
        else if (typeof record.message === "string") msg = record.message;
      }
    } catch (_) {
      // The network layer sometimes has no JSON body.
    }
    return msg;
  };

  const getFunctionErrorStatus = (error: { context?: { status?: number } }) => error?.context?.status;

  // Batch uploads land in R2 faster than the (single-threaded) worker can
  // clear them, so the per-user temp cap can bounce a file that would fit
  // fine a few seconds later. Instead of failing immediately on a 413,
  // wait for the worker to catch up and retry.
  const STORAGE_CAP_RETRY_INTERVAL_MS = 5000;
  const STORAGE_CAP_MAX_WAIT_MS = 120 * 1000;

  // Uploads a single file end-to-end and reports its own failures — never
  // throws, so the caller can loop over a batch without one bad file
  // aborting the rest.
  const uploadSingleFile = async (selectedFile: File, accessToken: string) => {
    const uploadMimeType = getUploadMimeType(selectedFile);
    let documentId: string | null = null;

    try {
      const wantsCompression = supportsGzipCompression() && selectedFile.size > COMPRESSION_THRESHOLD_BYTES;
      let uploadData: DirectUploadPayload | null = null;
      const waitStartedAt = Date.now();
      let waitingToastId: string | null = null;

      while (true) {
        let uploadResult: Awaited<ReturnType<typeof supabase.functions.invoke<DirectUploadPayload>>>;
        try {
          uploadResult = await supabase.functions.invoke<DirectUploadPayload>("create-document-upload", {
            body: {
              file_name: selectedFile.name,
              file_size: selectedFile.size,
              file_type: uploadMimeType,
              compress: wantsCompression,
            },
            headers: { Authorization: `Bearer ${accessToken}` }
          });
        } catch (functionError: unknown) {
          const message = getErrorMessage(functionError);
          if (/failed to fetch|networkerror|load failed/i.test(message)) {
            throw new Error(`CREATE_UPLOAD_FUNCTION_UNREACHABLE: ${message}`);
          }
          throw functionError;
        }

        uploadData = uploadResult.data;
        if (!uploadResult.error) {
          if (waitingToastId) toast.dismiss(waitingToastId);
          break;
        }

        const status = getFunctionErrorStatus(uploadResult.error);
        if (status === 413 && Date.now() - waitStartedAt < STORAGE_CAP_MAX_WAIT_MS) {
          if (!waitingToastId) {
            waitingToastId = `storage-wait-${selectedFile.name}-${Date.now()}`;
            toast.info(`${selectedFile.name}: waiting for temp storage space to free up...`, { id: waitingToastId });
          }
          void fetchStorageUsage();
          await new Promise((resolve) => window.setTimeout(resolve, STORAGE_CAP_RETRY_INTERVAL_MS));
          continue;
        }

        if (waitingToastId) toast.dismiss(waitingToastId);
        throw new Error(await readFunctionError(uploadResult.error));
      }

      if (!uploadData?.upload_url || !uploadData?.document_id) {
        throw new Error("Upload signer returned an invalid response.");
      }

      documentId = uploadData.document_id;
      setDocuments((prev) => [...prev, { id: documentId as string, name: selectedFile.name, status: "uploading" }]);

      let putResponse: Response;
      try {
        const uploadBody = uploadData.compress ? await gzipBlob(selectedFile) : selectedFile;
        putResponse = await fetch(uploadData.upload_url, {
          method: uploadData.upload_method || "PUT",
          headers: uploadData.upload_headers || { "Content-Type": uploadMimeType },
          body: uploadBody,
        });
      } catch (storageError: unknown) {
        const message = getErrorMessage(storageError);
        if (/failed to fetch|networkerror|load failed/i.test(message)) {
          throw new Error(`DIRECT_R2_UPLOAD_BLOCKED: ${message}`);
        }
        throw storageError;
      }
      if (!putResponse.ok) {
        const details = await putResponse.text().catch(() => "");
        throw new Error(`Direct storage upload failed (${putResponse.status}): ${details || putResponse.statusText}`);
      }
      void fetchStorageUsage();

      let enqueueData: { error?: string } | null = null;
      try {
        const enqueueResult = await supabase.functions.invoke<{ error?: string }>("enqueue-document-processing", {
          body: { document_id: documentId },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        enqueueData = enqueueResult.data;
        if (enqueueResult.error) {
          throw new Error(await readFunctionError(enqueueResult.error));
        }
      } catch (enqueueFunctionError: unknown) {
        const message = getErrorMessage(enqueueFunctionError);
        if (/failed to fetch|networkerror|load failed/i.test(message)) {
          throw new Error(`ENQUEUE_FUNCTION_UNREACHABLE: ${message}`);
        }
        throw enqueueFunctionError;
      }

      if (enqueueData?.error) throw new Error(enqueueData.error);

      updateDocumentStatus(documentId, "queued");
      void pollDocumentStatus(documentId, selectedFile.name);
    } catch (error: unknown) {
      toast.error(`${selectedFile.name}: ${safeUploadError(getErrorMessage(error))}`);
      if (documentId) {
        updateDocumentStatus(documentId, "failed");
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target;
    const selectedFiles = Array.from(inputEl.files || []);
    if (!selectedFiles.length) return;

    const availableSlots = MAX_UPLOAD_FILES - documents.length;
    if (availableSlots <= 0) {
      toast.error(`You can upload up to ${MAX_UPLOAD_FILES} files at a time. Remove one before adding another.`);
      inputEl.value = "";
      return;
    }

    const filesToUpload = selectedFiles.slice(0, availableSlots);
    if (selectedFiles.length > filesToUpload.length) {
      toast.info(`Only uploading the first ${filesToUpload.length} of ${selectedFiles.length} files — the ${MAX_UPLOAD_FILES}-file limit was reached.`);
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      toast.error("Please sign in before uploading study files.");
      inputEl.value = "";
      return;
    }

    setIsUploading(true);
    for (const selectedFile of filesToUpload) {
      await uploadSingleFile(selectedFile, session.access_token);
    }
    setIsUploading(false);
    inputEl.value = "";
    void fetchStorageUsage();
  };

  const getActiveToolLabel = () => {
    if (activeTab === "learn") {
      if (learnFormat === "flashcards") return "Flashcards";
      if (learnFormat === "podcast") return "Podcast";
      if (learnFormat === "reel") return "Reel Script";
      return "Study Guide";
    }
    if (activeTab === "quiz") return quizFormat === "rapid" ? "Rapid Quiz" : "MCQ Quiz";
    if (activeTab === "visualize") {
      if (vizFormat === "cheatsheet") return "Cheat Sheet";
      if (vizFormat === "dld") return "DLD Circuit";
      return "Flow Diagram";
    }
    return "Study Plan";
  };

  // Only mines keywords from real signal (actual chat turns, topic, doc name) — never
  // from getTemporaryMemory()'s templated sentences, which used to leak boilerplate
  // words like "none" / "conversation" / "prior" / "messages" into suggestions.
  const getStudioFocusSuggestions = (toolLabel = getActiveToolLabel()) => {
    const chatText = contentStream
      .filter((block) => ["text", "podcast", "cards", "reel", "visual-aids", "question", "quiz-interactive", "quiz-rapid"].includes(block.type))
      .slice(-8)
      .map((block) => sanitizeSpeechText(blockToMemoryText(block)))
      .join(" ");
    const signalText = [userTopic, primaryDocumentLabel, chatText].filter(Boolean).join(" ");
    const STOPWORDS = new Set([
      "this", "that", "with", "from", "your", "uploaded", "document", "student", "tutor",
      "recent", "current", "learning", "general", "source", "none", "conversation", "prior",
      "messages", "session", "temporary", "memory", "settings", "mode", "format", "profile",
      "preserve", "continuity", "across", "changes", "roadmap", "diagram", "visual", "code",
      "there", "which", "these", "those", "about", "topic", "using", "study", "guide",
    ]);
    const keywords = Array.from(new Set(
      signalText
        .toLowerCase()
        .match(/\b[a-z][a-z0-9+#-]{3,}\b/g)
        ?.filter((word) => !STOPWORDS.has(word))
        .slice(-12) || []
    ));
    const base = userTopic.trim() || primaryDocumentLabel || profileContext || major || "the current lesson";
    const tool = toolLabel.toLowerCase();
    if (!keywords.length) {
      return [
        `${base}: core ideas and definitions`,
        `${base}: common mistakes and exam traps`,
        `${base}: practical examples and interview wording`,
      ];
    }
    return [
      `${tool} focused on ${keywords.slice(-4).join(", ")}`,
      `${base}: simplify ${keywords.slice(0, 3).join(", ")}`,
      `${base}: test me on ${keywords.slice(-3).join(", ")}`,
    ];
  };

  // Populates the tool-specific suggestion chips. Never auto-fills the focus textarea —
  // suggestions stay visible-but-optional so a stray click on a tool doesn't leave the
  // input full of half-meaningful placeholder text the user never typed.
  const openStudioFocusPicker = (toolLabel?: string, clearInput = false) => {
    const suggestions = getStudioFocusSuggestions(toolLabel);
    setFocusSuggestions(suggestions);
    if (clearInput) setStudioFocus("");
    setIsFocusPickerOpen(true);
  };

  const addGenerationArtifact = (block: ContentBlock, focus: string) => {
    const tool = getActiveToolLabel();
    const artifact: GeneratedArtifact = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: currentGenerationRequestRef.current?.title || tool,
      focus,
      mode: currentGenerationRequestRef.current?.mode || activeTab,
      tool: currentGenerationRequestRef.current?.tool || tool,
      createdAt: new Date().toISOString(),
      block,
    };
    setGenerationHistory((prev) => [artifact, ...prev].slice(0, 18));
  };

  const reuseGeneratedArtifact = (artifact: GeneratedArtifact) => {
    setActiveTab(artifact.mode);
    setIsToolWorkspaceOpen(true);
    if (artifact.block.type === "diagram") {
      setDiagramCode(String(artifact.block.data));
      return;
    }
    if (artifact.block.type === "roadmap") {
      setRoadmapData(Array.isArray(artifact.block.data) ? artifact.block.data as RoadmapStep[] : []);
      return;
    }
    setContentStream((prev) => [...prev, artifact.block]);
  };

  const applyStudioTool = (tool: StudioToolConfig) => {
    setActiveTab(tool.tab);
    if (tool.learnFormat) setLearnFormat(tool.learnFormat);
    if (tool.quizFormat) setQuizFormat(tool.quizFormat);
    if (tool.vizFormat) setVizFormat(tool.vizFormat);
    setIsToolWorkspaceOpen(true);
    openStudioFocusPicker(tool.label, true);
  };

  const isStudioToolActive = (tool: StudioToolConfig) => {
    if (tool.tab !== activeTab) return false;
    if (tool.learnFormat && tool.learnFormat !== learnFormat) return false;
    if (tool.quizFormat && tool.quizFormat !== quizFormat) return false;
    if (tool.vizFormat && tool.vizFormat !== vizFormat) return false;
    if (tool.tab === "plan") return activeTab === "plan";
    return true;
  };

  const getToolArtifact = (tool: StudioToolConfig) => {
    const labels = new Set([tool.label, ...(tool.altLabels || [])].map((label) => label.toLowerCase()));
    return generationHistory.find((item) => labels.has(item.tool.toLowerCase()) || labels.has(item.title.toLowerCase()));
  };

  const selectStudioTool = (tool: StudioToolConfig) => {
    applyStudioTool(tool);
    const latest = getToolArtifact(tool);
    setToolSessionStart(contentStream.length);
    if (latest) {
      setHeroTool(null);
      setIsFocusPickerOpen(false);
      reuseGeneratedArtifact(latest);
      toast.success(`Reopened your ${tool.label}`, { icon: "📂" });
    } else {
      setHeroTool(tool);
    }
  };

  const handleStudioGenerate = () => {
    if (!isFocusPickerOpen && !studioFocus.trim()) {
      openStudioFocusPicker();
      toast.info("Pick what this generation should focus on.");
      return;
    }
    const focus = studioFocus.trim() || focusSuggestions[0] || userTopic.trim() || primaryDocumentLabel || "the current lesson";
    if (!focus.trim() && !materialId) {
      toast.error("Choose what the tool should focus on first.");
      return;
    }
    setUserTopic(focus);
    setIsFocusPickerOpen(false);
    const toolLabel = getActiveToolLabel();
    currentGenerationRequestRef.current = {
      title: toolLabel,
      focus,
      mode: activeTab,
      tool: toolLabel,
    };
    void handleGenerate(focus);
  };

  // Called wherever a tool's generation is confirmed to have produced content.
  // Clears the "hero" empty state for the active tool and gives it one small,
  // celebratory moment instead of silently dumping content into the feed.
  const clearHeroIfActive = () => {
    setHeroTool((current) => {
      if (current) toast.success(`✨ Your ${current.label} is ready`, { icon: "🎉" });
      return null;
    });
  };

  // Shared helper to process raw AI content into the right state
  const processRawContent = (rawContent: string, suggestions?: string[], topicContext = userTopic) => {
    if (suggestions && suggestions.length > 0) {
      setRelatedSuggestions(suggestions);
    }
    // Strip inline suggestions if present
    const suggestionsMatch = rawContent.match(/### NEXT_STEPS: (.*)/);
    if (suggestionsMatch) {
      if (!suggestions || suggestions.length === 0) {
        setRelatedSuggestions(suggestionsMatch[1].split('|').map((s: string) => s.trim()));
      }
      rawContent = rawContent.replace(suggestionsMatch[0], '').trim();
    }
    if (activeTab === "visualize") {
      const cleanedDiagram = rawContent.replace(/```mermaid/g, "").replace(/```/g, "").trim();
      setDiagramCode(cleanedDiagram);
      addGenerationArtifact({ type: "diagram", data: cleanedDiagram, role: "ai", topic: topicContext }, topicContext);
    } else if (activeTab === "plan") {
      const steps = rawContent.split("###").map((s:string) => {
        const p = s.split("|");
        return p.length >= 2 ? { title: p[0].trim(), desc: p[1].trim(), time: p[2]?.trim() } : null;
      }).filter((step): step is RoadmapStep => Boolean(step));
      setRoadmapData(steps);
      addGenerationArtifact({ type: "roadmap", data: steps, role: "ai", topic: topicContext }, topicContext);
    } else if (activeTab === "quiz") {
      const block: ContentBlock = quizFormat === 'mcq'
        ? { type: 'quiz-interactive', data: rawContent, role: 'ai', topic: topicContext }
        : { type: 'quiz-rapid', data: rawContent, role: 'ai', topic: topicContext };
      setContentStream(prev => [...prev, block]);
      addGenerationArtifact(block, topicContext);
    } else {
      if (learnFormat === 'podcast') {
        const block: ContentBlock = { type: 'podcast', data: rawContent, role: 'ai', topic: topicContext };
        setContentStream(prev => [...prev, block]);
        addGenerationArtifact(block, topicContext);
        setTimeout(() => handleSpeak(rawContent, 0), 500);
      } else if (learnFormat === 'reel') {
        // Show the reel script as text first — user manually clicks "Create Reel" after
        const block: ContentBlock = { type: 'reel-script', data: rawContent, role: 'ai', topic: topicContext || "this topic", animate: true };
        setContentStream(prev => [...prev, block]);
        addGenerationArtifact(block, topicContext);
      } else {
        const type = learnFormat === 'flashcards' ? 'cards' : 'text';
        const payload = learnFormat === 'flashcards' ? rawContent.split("---").filter((x:string)=>x.length>10) : rawContent;
        const block: ContentBlock = { type, data: payload, role: 'ai', animate: type === 'text', topic: topicContext };
        setContentStream(prev => [...prev, block]);
        addGenerationArtifact(block, topicContext);
      }
    }
    setIsEditingProfile(false);
    clearHeroIfActive();
  };

  const handleGenerate = async (topicOverride?: string) => {
    const topic = topicOverride || userTopic;
    if (!topic.trim() && !materialId) { toast.error("Enter a topic or upload a PDF reference!"); return; }
    // Guard: prevent duplicate concurrent calls
    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setGenerationStartedAt(Date.now());
    setGenerationElapsed(1);
    handleStop();
    setRelatedSuggestions([]); 
    setDiagramCode("");
    setRoadmapData([]);
    
    const actions = ["Analyzing Prompt...", "Searching Vector Store...", "Structuring Context...", "Synthesizing..."];
    let i = 0; setAgentStatus(actions[0]);
    const interval = setInterval(() => { i=(i+1)%actions.length; setAgentStatus(actions[i]); }, 1500);
    
    let usedFallback = false;
    try {
      // 1. Try Supabase Edge Function first
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("AUTH_REQUIRED");

      if (activeTab === "visualize" && vizFormat === "cheatsheet") {
        setAgentStatus("Designing visual sheets...");
        const { data, error } = await supabase.functions.invoke('generate-visual-aids', {
          body: {
            topic,
            material_id: materialId,
            source_name: primaryDocumentLabel || "",
            eduLevel: apiEduLevel,
            grade,
            collegeYear,
            major,
            goal,
            experienceLevel,
            learningStyle,
            timeAvailable,
            session_context: getTemporaryMemory()
          },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });

        if (error) {
          let msg = error.message;
          try {
            const body = await error.context.json();
            if (body?.error) msg = body.error;
            else if (body?.message) msg = body.message;
          } catch {
            // Ignore non-JSON error bodies from function responses.
          }
          throw new Error(msg);
        }

        if (!Array.isArray(data?.aids) || data.aids.length === 0) {
          throw new Error("Pollinations did not return a visual aid image.");
        }

        setDiagramCode("");
        setRoadmapData([]);
        const block: ContentBlock = { type: 'visual-aids', data: data.aids, role: 'ai', topic };
        setContentStream(prev => [...prev, block]);
        addGenerationArtifact(block, topic);
        setRelatedSuggestions(data.suggestions || documentFocusedSuggestions(primaryDocumentLabel));
        setIsEditingProfile(false);
        toast.success(`Created ${data.aids.length} visual revision sheet${data.aids.length === 1 ? "" : "s"}.`);
        setHeroTool(null);
        return;
      }
      
      const { data, error } = await supabase.functions.invoke('transform-vibe', {
        body: { 
          topic, 
          eduLevel: apiEduLevel, 
          grade, 
          collegeYear, 
          major, 
          activeTab,
          material_id: materialId,
          session_id: sessionId,
          source_name: primaryDocumentLabel || "",
          mood, 
          learningStyle, 
          timeAvailable,
          goal,
          experienceLevel,
          profileContext,
          quizDifficulty,
          quizFormat,
          learnFormat,
          vizFormat,
          session_context: getTemporaryMemory()
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (error) {
        let msg = error.message;
        try {
          const body = await error.context.json();
          if (body?.error) msg = body.error;
          else if (body?.message) msg = body.message;
        } catch {
          // Ignore non-JSON error bodies from function responses.
        }
        throw new Error(msg);
      }
      if (!data?.content) throw new Error("The AI service returned an empty answer.");
      processRawContent(
        data.content,
        materialId ? documentFocusedSuggestions(primaryDocumentLabel) : data.suggestions,
        materialId && isDocumentInstruction(topic) ? primaryDocumentLabel || "uploaded document" : topic
      );

      // Log session history
      if (session?.user) {
         await supabase.from('user_session_history').insert({
            user_id: session.user.id,
            last_topic: topic,
            weak_areas: activeTab === 'quiz' ? ['Review Conceptual Edge Scenarios'] : ['General Recall Bounds'],
            suggestions: materialId ? documentFocusedSuggestions(primaryDocumentLabel) : [`Re-run customized logic checks parameters inside ${topic}`]
         }).catch(() => {});
      }

    } catch (e: unknown) {
      if (materialId) {
        toast.error(getErrorMessage(e) || "Document answer failed. Please try again after the file finishes indexing.");
        return;
      }
      if (activeTab === "visualize" && vizFormat === "cheatsheet") {
        toast.error(getErrorMessage(e) || "Visual aid generation failed. Pollinations may be busy; try again shortly.");
        return;
      }

      // 2. Fallback to client-side AI engine
      console.warn(safeGenerationError());
      usedFallback = true;
      try {
        const result = generateContent({
          topic,
          activeTab,
          learnFormat,
          quizFormat,
          vizFormat,
          mood,
          timeAvailable,
          learningStyle,
          eduLevel: apiEduLevel,
          grade,
          collegeYear,
          major,
          goal,
          experienceLevel,
          profileContext,
          quizDifficulty
        });
        processRawContent(result.content, result.suggestions, topic);
        toast.info('Generated locally — connect Supabase for AI-powered content.', { duration: 3000 });
      } catch {
        toast.error('Content generation failed.');
      }
    } 
    finally { clearInterval(interval); setIsGenerating(false); isGeneratingRef.current = false; currentGenerationRequestRef.current = null; setGenerationStartedAt(null); }
  };

  const handleBottomTriggerNewTopic = () => {
     if (!bottomNewTopic.trim()) { toast.error("Please enter a new topic topic state parameters."); return; }
     setUserTopic(bottomNewTopic);
     const target = bottomNewTopic;
     setBottomNewTopic("");
     handleGenerate(target);
  };

  const handleCreateReelFromScript = (scriptText: string, topic: string) => {
    if (isCreatingReel) return;
    setIsCreatingReel(true);
    try {
      const payload = buildReelPayload(scriptText, topic);
      if (!payload.segments.length) {
        toast.error("Could not parse dialogue from the script. Try regenerating.");
        return;
      }
      const block: ContentBlock = { type: 'reel', data: payload, role: 'ai', topic };
      setContentStream(prev => [...prev, block]);
      addGenerationArtifact(block, topic);
      toast.success("Reel created! Press play to start.");
    } catch {
      toast.error("Failed to create reel from script.");
    } finally {
      setIsCreatingReel(false);
    }
  };

  const applyChatCommand = (command: ChatCommand) => {
    setActiveTab(command.tab);
    if (command.learnFormat) setLearnFormat(command.learnFormat);
    if (command.quizFormat) setQuizFormat(command.quizFormat);
    if (command.vizFormat) setVizFormat(command.vizFormat);
    setIsCommandMenuOpen(false);
    setExplainInput((value) => value.replace(/@\w*$/, "").trimStart());
  };

  const parseChatCommand = (value: string) => {
    const match = value.match(/@(\w+)/);
    if (!match) return { command: null as null | ChatCommand, cleaned: value.trim() };
    const command = CHAT_COMMANDS.find((item) => item.key.toLowerCase() === match[1].toLowerCase()) || null;
    return {
      command,
      cleaned: value.replace(match[0], "").trim(),
    };
  };

  const handleChatInputChange = (value: string) => {
    setExplainInput(value);
    setIsCommandMenuOpen(/@\w*$/.test(value) || value.endsWith("@"));
  };

  const getVibeStatusCopy = () => {
    if (activeTab === "visualize" && vizFormat === "cheatsheet") return "Forging a readable exam-grade poster";
    if (activeTab === "visualize") return "Mapping the concept into clean visual logic";
    if (activeTab === "quiz") return "Setting traps, checking recall, sharpening questions";
    if (activeTab === "plan") return "Building the study route with no wasted steps";
    if (learnFormat === "reel") return "Cutting the lesson into reel-ready beats";
    if (learnFormat === "podcast") return "Writing a tight two-voice study session";
    if (learnFormat === "flashcards") return "Compressing the topic into memory cards";
    return "Thinking hard, trimming fluff, keeping the signal";
  };

  const submitChatComposer = () => {
    const raw = explainInput.trim();
    if (!raw && !materialId) {
      toast.error("Ask anything or upload a source first.");
      return;
    }

    const { command, cleaned } = parseChatCommand(raw);
    const prompt = cleaned || userTopic || (materialId ? "Explain this source" : "");
    if (!prompt.trim()) {
      toast.error("Add a topic or question after the command.");
      return;
    }

    if (command) {
      applyChatCommand(command);
      setUserTopic(prompt);
      setExplainInput("");
      setPendingChatRun(prompt);
      return;
    }

    if (!userTopic.trim()) setUserTopic(prompt);
    handleExplainMore(prompt);
  };

  const getRecentLessonContext = () => {
    const usefulBlocks = contentStream
      .filter((block) => ["text", "podcast", "cards", "reel", "question", "quiz-interactive", "quiz-rapid"].includes(block.type))
      .slice(-6);

    const compactTurns = usefulBlocks.map((block) => {
      const rawText = block.type === "reel"
        ? (block.data as ReelPayload | undefined)?.segments?.map((segment: DialogueSegment) => segment.text).join(" ")
        : Array.isArray(block.data)
          ? block.data.join(" ")
          : String(block.data || "");

      return `${block.role === "user" ? "Student" : "Tutor"}: ${sanitizeSpeechText(rawText).slice(0, 420)}`;
    }).filter((turn) => turn.length > 12);

    const joined = compactTurns.join("\n");
    const keywords = Array.from(new Set(
      joined
        .toLowerCase()
        .match(/\b[a-z][a-z0-9+#-]{3,}\b/g)
        ?.filter((word) => !["this", "that", "with", "from", "they", "have", "what", "when", "where", "which", "would", "should", "about", "there", "because", "student", "tutor"].includes(word))
        .slice(-24) || []
    ));

    return [
      `Learner profile: ${getLearnerProfileSummary()}`,
      `Important keywords in current session: ${keywords.join(", ") || "none yet"}`,
      `Recent compact context:\n${joined || "No prior answer text captured."}`
    ].join("\n\n").slice(0, 1800);
  };

  const isVagueFollowUp = (value: string) => {
    return /^(tell me more|explain more|more|go deeper|continue|expand|elaborate|detail it|make it clearer|simplify|again|why|how so)\b/i.test(value.trim());
  };

  const handleExplainMore = async (query?: string) => {
      const q = query || explainInput;
      if (!q.trim()) return;
      const baseTopic = userTopic.trim() || historicalData?.last_topic || "the current lesson";
      const recentContext = getRecentLessonContext();
      const vagueFollowUp = isVagueFollowUp(q);
      const contextualQuestion = vagueFollowUp
        ? `Expand the current topic "${baseTopic}" based on the previous answer. Student wording: "${q}"`
        : q;

      setExplainInput(""); setRelatedSuggestions([]); 
      setContentStream(prev => [...prev, { type: 'question', data: q, role: 'user' }]);
      setIsGenerating(true);
      setGenerationStartedAt(Date.now());
      setGenerationElapsed(1);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("AUTH_REQUIRED");
        const { data, error } = await supabase.functions.invoke('transform-vibe', {
            body: { 
              topic: contextualQuestion,
              material_id: materialId,
              session_id: sessionId,
              source_name: primaryDocumentLabel || "",
              activeTab: "learn",
              learnFormat: "lecture",
              mood,
              learningStyle,
              timeAvailable,
              eduLevel: apiEduLevel,
              grade,
              collegeYear,
              major,
              goal,
              experienceLevel,
              profileContext,
              session_context: getTemporaryMemory(),
              content: [
                `Current lesson topic: ${baseTopic}`,
                `Student follow-up: ${q}`,
                `Compact context window: ${recentContext || "No prior answer text captured. Use the current lesson topic."}`,
                "Task: Answer the student's follow-up using only the compact context plus the current topic. If the follow-up is vague, expand the most relevant recent keyword. Keep it concise, practical, and useful."
              ].join("\n\n"),
              systemPrompt: [
                "You are a contextual AI tutor handling follow-up questions.",
                "Use the current lesson topic, learner profile, keywords, and recent compact context as the source of truth.",
                "Do not treat vague phrases like 'tell me more' as the subject.",
                "Answer in 2-4 short sections maximum, using fewer tokens than a full lesson.",
                "Do not repeat markdown symbols aloud or include filler."
              ].join(" ")
            },
            headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if(error) throw error;
        setContentStream(prev => [...prev, { type: 'text', data: data.content, role: 'ai', animate: true }]);
      } catch {
        // Fallback to local AI engine for follow-up
        console.warn(safeGenerationError());
        try {
          const followUpContent = generateFollowUp(contextualQuestion, baseTopic);
          setContentStream(prev => [...prev, { type: 'text', data: followUpContent, role: 'ai', animate: true }]);
        } catch {
          toast.error('Follow-up generation failed.');
        }
      }
      finally { setIsGenerating(false); setGenerationStartedAt(null); }
  };

  const currentFeatureGuide = featureGuide[activeTab];
  const FeatureGuideIcon = currentFeatureGuide.icon;
  const activeStudioTool = STUDIO_TOOLS.find((tool) => isStudioToolActive(tool)) || STUDIO_TOOLS[0];
  const activeToolArtifact = activeStudioTool ? getToolArtifact(activeStudioTool) : null;
  const latestReelScript = [...contentStream].reverse().find((block) => block.type === 'reel-script');
  const latestReel = [...contentStream].reverse().find((block) => block.type === 'reel');
  const ActiveStudioToolIcon = activeStudioTool.icon;
  const activeToolAccent = accentClasses[activeStudioTool.accent || "indigo"];
  const visibleStream = isToolWorkspaceOpen ? contentStream.slice(toolSessionStart) : contentStream;
  const hasVisibleToolResult =
    visibleStream.length > 0 ||
    (activeTab === "visualize" && Boolean(diagramCode)) ||
    (activeTab === "plan" && roadmapData.length > 0);
  const showToolHero = isToolWorkspaceOpen && Boolean(heroTool) && !hasVisibleToolResult && !isGenerating;
  const showToolFirstRunLoading = isToolWorkspaceOpen && isGenerating && !hasVisibleToolResult;
  const exitToolFocus = () => {
    setIsToolWorkspaceOpen(false);
    setHeroTool(null);
    setToolSessionStart(0);
    setIsFocusPickerOpen(false);
  };

  return (
    <div className="transform-page flex flex-col h-full w-full overflow-hidden">
      {/* Feature Guide Dialog */}
      <Dialog open={featureGuideOpen} onOpenChange={setFeatureGuideOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl">
              <div className="h-9 w-9 rounded-xl bg-[#6D35FF]/10 text-[#6D35FF] flex items-center justify-center">
                <FeatureGuideIcon className="h-4 w-4" />
              </div>
              {currentFeatureGuide.title}
            </DialogTitle>
            <DialogDescription>{currentFeatureGuide.description}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-3">
            {currentFeatureGuide.steps.map((step, index) => (
              <div key={step} className="rounded-xl border bg-[#F3EEFF]/50 p-4">
                <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#6D35FF] text-[10px] font-bold text-white">{index + 1}</div>
                <p className="text-sm font-semibold leading-snug">{step}</p>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={() => setFeatureGuideOpen(false)}>Got it</Button>
        </DialogContent>
      </Dialog>

      {/* Library picker — attach any previously uploaded file as a source of
          this session. Nothing here is auto-selected: toggling a file just
          flips whether it's an active source, it never deletes the file. */}
      <Dialog open={isLibraryPickerOpen} onOpenChange={setIsLibraryPickerOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-lg">
              <div className="h-9 w-9 rounded-xl bg-[#6D35FF]/10 text-[#6D35FF] flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              Your file library
            </DialogTitle>
            <DialogDescription>Pick which files this session should use as sources. Files stay in your library either way.</DialogDescription>
          </DialogHeader>
          {isLibraryLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#6D35FF]" />
            </div>
          ) : libraryFiles.length === 0 ? (
            <div className="py-8 text-center text-sm text-[#6B7280]">
              No files yet. Upload one with "Add" to start your library.
            </div>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {libraryFiles.map((file) => (
                <button
                  key={file.document_id}
                  type="button"
                  disabled={file.processing_status !== "processed"}
                  onClick={() => handleToggleLibrarySource(file)}
                  className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    file.is_active_in_session ? "border-[#6D35FF]/40 bg-[#F3EEFF]" : "border-[#E8E4F5] bg-white/70 hover:bg-[#F3EEFF]/50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-bold text-[#111827]">{file.file_name}</p>
                    <p className="text-[11px] text-[#6B7280]">{file.processing_status}</p>
                  </div>
                  {file.is_active_in_session ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-[#6D35FF]" />
                  ) : (
                    <PlusCircle className="h-4 w-4 shrink-0 text-[#6B7280]" />
                  )}
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Mobile Tab Bar */}
      {isMobile && (
        <div className="transform-panel-header flex shrink-0 border-b" style={{ borderColor: '#E8E4F5' }}>
          {([['sources', 'Sources'], ['chat', 'Chat'], ['studio', 'Studio']] as const).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setMobileTab(id)}
              className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${mobileTab === id ? 'text-[#6D35FF] border-b-2 border-[#6D35FF] bg-[#F3EEFF]/50' : 'text-[#6B7280]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 3-Panel Workspace */}
      <div ref={workspaceRef} className="flex flex-1 min-h-0 gap-0 overflow-hidden p-0 md:p-2">

        {/* ═══════════════ LEFT PANEL: SOURCES ═══════════════ */}
        {(!isMobile || mobileTab === 'sources') && (
          <aside
            className="transform-panel group/source flex flex-col w-full shrink-0 overflow-hidden transition-[width,box-shadow] duration-200 ease-out md:rounded-2xl md:border"
            onMouseEnter={() => setIsSourcePanelHovered(true)}
            onMouseLeave={() => {
              if (!isSourcePanelLocked) setIsSourcePanelHovered(false);
            }}
            style={{ borderColor: '#E8E4F5', width: isMobile ? undefined : isSourcePanelOpen ? leftPanelWidth : 52 }}
          >
            {!isSourcePanelOpen && (
              <div className="flex h-full flex-col items-center justify-between py-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F3EEFF] text-[#6D35FF] shadow-[0_8px_18px_rgba(109,53,255,0.10)]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="origin-center rotate-90 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#6B7280]">
                    Sources
                  </div>
                </div>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8E4F5] bg-white/70 text-[#6D35FF] transition-colors hover:bg-[#F3EEFF]"
                  aria-label="Lock sources panel open"
                  onClick={() => {
                    setIsSourcePanelLocked(true);
                    setIsSourcePanelHovered(true);
                  }}
                >
                  <Unlock className="h-3.5 w-3.5" />
                </button>
                {documents.length > 0 && (
                  <span className="rounded-full bg-[#6D35FF] px-2 py-0.5 text-[10px] font-black text-white">
                    {documents.length}
                  </span>
                )}
              </div>
            )}

            {isSourcePanelOpen && (
              <>
            {/* Panel Header */}
            <div className="transform-panel-header shrink-0 p-4 border-b" style={{ borderColor: '#E8E4F5' }}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-extrabold text-[#111827]">Sources</h2>
                  <p className="text-[11px] font-medium text-[#6B7280] mt-0.5">Ground answers in your lectures</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-xl border text-[#6D35FF] transition-all ${isSourcePanelLocked ? 'border-[#6D35FF]/30 bg-[#F3EEFF]' : 'border-[#E8E4F5] bg-white/70 hover:bg-[#F3EEFF]'}`}
                    aria-label={isSourcePanelLocked ? "Unlock sources panel" : "Lock sources panel open"}
                    onClick={() => {
                      setIsSourcePanelLocked((value) => !value);
                      setIsSourcePanelHovered(true);
                    }}
                  >
                    {isSourcePanelLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                  </button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-[#E8E4F5] bg-white/70 px-2.5 text-[11px] font-bold text-[#6D35FF] hover:bg-[#F3EEFF]"
                    onClick={openLibraryPicker}
                  >
                    <FileText className="mr-1.5 h-3.5 w-3.5" /> Library
                  </Button>
                  <Label htmlFor="file-panel" className={`cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-[#6D35FF] text-white px-3 py-1.5 text-[11px] font-bold hover:bg-[#4C1D95] transition-colors ${documents.length >= MAX_UPLOAD_FILES ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <PlusCircle className="h-3.5 w-3.5" /> Add
                  </Label>
                </div>
                <Input id="file-panel" type="file" accept=".pdf,.txt,.docx" multiple disabled={documents.length >= MAX_UPLOAD_FILES} className="hidden" onChange={handleFileUpload} />
              </div>
            </div>

            {/* Scrollable source content */}
            <div className="transform-scroll flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {/* Upload area */}
              <Label htmlFor="file-drop" className={`transform-dropzone flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-5 text-center transition-all hover:bg-[#F3EEFF]/60 hover:border-[#6D35FF]/30 ${isUploading ? 'bg-[#F3EEFF] border-[#6D35FF]/30' : 'border-[#E8E4F5]'} ${documents.length >= MAX_UPLOAD_FILES ? 'opacity-50 cursor-not-allowed' : ''}`}>
                {isUploading ? <Loader2 className="mb-2 h-5 w-5 animate-spin text-[#6D35FF]" /> : <Upload className="mb-2 h-5 w-5 text-[#6B7280]" />}
                <span className="text-[13px] font-bold text-[#111827]">Add lecture files</span>
                <span className="mt-1 text-[11px] font-medium text-[#6B7280]">PDF, TXT, DOCX</span>
                <Input id="file-drop" type="file" accept=".pdf,.txt,.docx" multiple disabled={documents.length >= MAX_UPLOAD_FILES} className="hidden" onChange={handleFileUpload} />
              </Label>

              {/* Storage usage */}
              {storageUsage && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <span>Temp storage</span>
                    <span>{(storageUsage.usedBytes / (1024 * 1024)).toFixed(1)} / {(storageUsage.capBytes / (1024 * 1024)).toFixed(0)} MB</span>
                  </div>
                  <Progress value={Math.min(100, (storageUsage.usedBytes / storageUsage.capBytes) * 100)} className={`h-1.5 ${storageUsage.usedBytes / storageUsage.capBytes > 0.85 ? '[&>div]:bg-red-500' : storageUsage.usedBytes / storageUsage.capBytes > 0.6 ? '[&>div]:bg-amber-500' : '[&>div]:bg-[#6D35FF]'}`} />
                </div>
              )}

              {/* Document list */}
              {documents.length > 0 ? (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className={`rounded-xl border p-3 text-[12px] font-semibold transition-all ${
                      doc.status === 'processed' ? 'border-green-200 bg-[#ECFDF5] text-green-700' :
                      doc.status === 'failed' ? 'border-red-200 bg-[#FEF2F2] text-red-700' :
                      'border-amber-200 bg-[#FFFBEB] text-amber-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {doc.status === 'processed' ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : doc.status === 'failed' ? <X className="h-3.5 w-3.5 shrink-0" /> : <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                        <span className="truncate flex-1">{doc.name}</span>
                        {doc.status !== 'processed' && <span className="text-[10px] uppercase opacity-70">{doc.status}</span>}
                        <XCircle className="h-3.5 w-3.5 shrink-0 cursor-pointer opacity-50 hover:opacity-100" onClick={() => handleRemoveDocument(doc.id)} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="mx-auto h-8 w-8 text-[#E8E4F5] mb-3" />
                  <p className="text-[13px] font-bold text-[#111827]">Add your lectures first</p>
                  <p className="text-[11px] text-[#6B7280] mt-1 leading-relaxed max-w-[200px] mx-auto">VibeSchool answers better when it can read your notes, slides, and PDFs.</p>
                </div>
              )}

              {/* Quick topic */}
              <div className="space-y-2 pt-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Quick topic</label>
                <Input value={userTopic} onChange={(e) => setUserTopic(e.target.value)} placeholder="Binary search, lecture 1…" className="rounded-xl h-9 text-sm border-[#E8E4F5]" />
              </div>

              {/* Source status */}
              {materialId && (
                <div className="rounded-xl bg-[#ECFDF5] border border-green-200 p-3 flex items-center gap-2 text-[11px] font-bold text-green-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>RAG index active · {processedDocuments.length} source{processedDocuments.length !== 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
              </>
            )}
          </aside>
        )}

        {!isMobile && isSourcePanelLocked && (
          <div
            role="separator"
            aria-label="Resize sources panel"
            onPointerDown={() => setPanelDragTarget("left")}
            className="mx-1 w-1 shrink-0 cursor-col-resize rounded-full bg-transparent hover:bg-[#6D35FF]/25 transition-colors"
          />
        )}

        {/* ═══════════════ CENTER PANEL: CHAT ═══════════════ */}
        {(!isMobile || mobileTab === 'chat') && (
          <section className="transform-center flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden md:mx-2 md:rounded-2xl md:border" style={{ borderColor: '#E8E4F5' }}>
            {/* Panel Header — becomes the active tool's own panel when one is focused */}
            {isToolWorkspaceOpen && activeStudioTool ? (
              <div className={`shrink-0 px-4 py-3 border-b flex items-center justify-between gap-3 ${activeToolAccent.soft}`} style={{ borderColor: '#E8E4F5' }}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${activeToolAccent.bg} text-white shadow-sm`}>
                    <ActiveStudioToolIcon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-extrabold text-[#111827]">{activeStudioTool.label}</h2>
                    <p className={`text-[10px] font-bold uppercase tracking-wider ${activeToolAccent.text}`}>
                      {isGenerating ? `${agentStatus} · ${generationElapsed}s` : activeToolArtifact ? "Generated · in your history" : "Ready to generate"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {hasVisibleToolResult && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-lg bg-white text-[10px] font-bold"
                      onClick={() => {
                        openStudioFocusPicker(activeStudioTool.label, true);
                        studioFocusInputRef.current?.focus();
                      }}
                    >
                      <RefreshCw className="mr-1.5 h-3 w-3" /> New focus
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-bold text-[#6B7280] hover:bg-white/60" onClick={exitToolFocus}>
                    <ArrowLeft className="mr-1.5 h-3 w-3" /> All chat
                  </Button>
                </div>
              </div>
            ) : (
              <div className="transform-panel-header shrink-0 px-5 py-3 border-b flex items-center justify-between gap-3" style={{ borderColor: '#E8E4F5' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <h2 className="text-[15px] font-extrabold text-[#111827]">Study Chat</h2>
                  {materialId ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#ECFDF5] border border-green-200 px-2 py-0.5 text-[10px] font-bold text-green-700">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Using sources
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EEFF] px-2 py-0.5 text-[10px] font-bold text-[#6D35FF]">No source selected</span>
                  )}
                </div>
                {isGenerating && (
                  <Badge variant="outline" className="gap-1.5 text-[10px] font-bold shrink-0 animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {agentStatus} · {generationElapsed}s
                  </Badge>
                )}
              </div>
            )}

            {/* Messages area — internal scroll */}
            <div className="transform-scroll flex-1 min-h-0 overflow-y-auto px-4 py-4 md:px-5">
              {isToolWorkspaceOpen && activeStudioTool && (
                <div className="mb-5 space-y-3">
                  {/* Hero empty state — this tool has never been generated in this session.
                      Purely informational: the actual focus input + Generate button live in
                      the sticky composer below, the same place every other chat turn happens. */}
                  {showToolHero && (
                    <div className="animate-in fade-in zoom-in-95 duration-300 rounded-2xl border-2 border-[#E8E4F5] bg-white/70 p-8 text-center">
                      <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${activeToolAccent.soft} ${activeToolAccent.text}`}>
                        <ActiveStudioToolIcon className="h-8 w-8" />
                      </div>
                      <h3 className="mb-2 text-lg font-extrabold text-[#111827]">Let's build your {activeStudioTool.label}</h3>
                      <p className="mx-auto max-w-md text-[13px] leading-relaxed text-[#6B7280]">
                        {TOOL_HERO_COPY[activeStudioTool.id] || activeStudioTool.description}
                      </p>
                      <p className={`mt-5 text-[11px] font-bold uppercase tracking-wider ${activeToolAccent.text}`}>
                        ↓ Tell it what to focus on below
                      </p>
                    </div>
                  )}

                  {/* Reel-only follow-up actions on an already generated script */}
                  {activeStudioTool.id === "reel" && hasVisibleToolResult && (latestReelScript || latestReel) && (
                    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E8E4F5] bg-white/70 p-3">
                      {latestReelScript && (
                        <Button
                          size="sm"
                          className={`gap-1.5 rounded-xl text-[12px] font-bold text-white ${activeToolAccent.bg} hover:opacity-90`}
                          onClick={() => handleCreateReelFromScript(String(latestReelScript.data), latestReelScript.topic || userTopic)}
                          disabled={isCreatingReel}
                        >
                          {isCreatingReel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
                          Create Reel from script
                        </Button>
                      )}
                      {latestReel && !latestReelScript && (
                        <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-[12px] font-bold" onClick={() => setContentStream((prev) => [...prev, latestReel])}>
                          Open Reel
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
              {showToolFirstRunLoading && (
                <div className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed ${activeToolAccent.border} ${activeToolAccent.soft} py-14 text-center`}>
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${activeToolAccent.bg} text-white`}>
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                  <p className="text-[14px] font-extrabold text-[#111827]">Crafting your {activeStudioTool.label}…</p>
                  <p className={`mt-1 text-[11px] font-bold uppercase tracking-wider ${activeToolAccent.text}`}>{agentStatus}</p>
                </div>
              )}
              {/* Generic empty state — only before the user has picked any Studio tool */}
              {!isToolWorkspaceOpen && !contentStream.length && !diagramCode && !roadmapData.length && !isGenerating && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#F3EEFF] flex items-center justify-center mb-5">
                    <BrainCircuit className="w-8 h-8 text-[#6D35FF]" />
                  </div>
                  <h3 className="text-lg font-extrabold text-[#111827] mb-2">What should we work on?</h3>
                  <p className="text-[13px] text-[#6B7280] mb-6 max-w-md leading-relaxed">Ask from your lectures, generate study material, or turn a concept into a reel script.</p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {["Explain this topic simply", "Make a quiz from my sources", "Summarize selected lecture", "Generate a reel script", "Turn this into exam notes"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => { setExplainInput(suggestion); if (!contentStream.length) setUserTopic(suggestion); }}
                        className="rounded-full border border-[#E8E4F5] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] hover:border-[#6D35FF]/40 hover:text-[#6D35FF] hover:bg-[#F3EEFF] transition-all"
                      >{suggestion}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Historical data empty state */}
              {!isToolWorkspaceOpen && !contentStream.length && !diagramCode && !roadmapData.length && !isGenerating && historicalData && (
                <div className="max-w-lg mx-auto bg-white border border-[#E8E4F5] p-5 rounded-2xl shadow-sm mt-4 text-left">
                  <div className="flex items-center gap-2 border-b border-[#E8E4F5] pb-3 mb-3">
                    <History className="w-4 h-4 text-[#6D35FF]" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D35FF]">Previous Session</span>
                  </div>
                  <p className="text-[14px] font-extrabold text-[#111827] capitalize">{historicalData.last_topic}</p>
                  {historicalData.suggestions?.[0] && (
                    <p className="text-[12px] text-[#6B7280] mt-2">{historicalData.suggestions[0]}</p>
                  )}
                </div>
              )}

              {/* Diagram / Plan output */}
              {activeTab === 'visualize' && diagramCode && (
                <div className="flex flex-col items-center"><MermaidChart chart={diagramCode} /><Button variant="ghost" className="mt-3 text-xs" onClick={() => navigator.clipboard.writeText(diagramCode)}><Share2 className="w-3 h-3 mr-1.5" /> Copy Code</Button></div>
              )}
              {activeTab === 'plan' && roadmapData.length > 0 && (
                <div className="space-y-4 border-l-4 border-[#6D35FF]/20 ml-4 pl-6 py-4">
                  {roadmapData.map((step: RoadmapStep, idx: number) => (
                    <div key={idx} className="relative">
                      <div className="absolute -left-[35px] top-1 w-5 h-5 rounded-full bg-[#6D35FF] border-4 border-white shadow-sm flex items-center justify-center text-[9px] text-white font-bold">{idx+1}</div>
                      <h3 className="font-bold text-[15px] text-[#111827]">{step.title} <span className="text-[10px] font-semibold bg-[#F3EEFF] text-[#6D35FF] px-2 py-0.5 rounded-full ml-1.5">{step.time}</span></h3>
                      <p className="text-[13px] text-[#6B7280] mt-1 leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Content stream */}
              {visibleStream.map((block, idx) => (
                <div key={idx} className={`mb-6 ${block.role === 'user' ? 'flex justify-end' : ''}`}>
                  {block.role === 'user' ? (
                    <div className="bg-[#6D35FF] text-white px-4 py-3 rounded-2xl rounded-tr-sm text-[14px] font-medium inline-block max-w-[80%] shadow-[0_14px_28px_rgba(109,53,255,0.20)]">{String(block.data)}</div>
                  ) : (
                    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
                      {block.type === 'quiz-interactive' && <QuizBlock rawData={String(block.data)} onRetry={() => handleGenerate(userTopic)} />}
                      {block.type === 'quiz-rapid' && <RapidFireBlock rawData={String(block.data)} onRetry={() => handleGenerate(userTopic)} />}
                      {block.type === 'visual-aids' && <VisualAidsBlock aids={block.data as VisualAidImage[]} />}

                      {/* Podcast player */}
                      {block.type === 'podcast' && (
                        <div className="bg-black text-white p-8 rounded-2xl shadow-lg max-w-2xl mx-auto border border-white/10 relative overflow-hidden">
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black z-0" />
                          <div className="relative z-10 flex flex-col items-center">
                            <div className={`w-20 h-20 rounded-full bg-black border-2 border-white/20 flex items-center justify-center mb-4 ${isSpeaking && !isPaused ? 'animate-pulse' : ''}`}>
                              <Headphones className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-[15px] font-semibold text-center text-white/90 min-h-[48px] mb-4">{currentSentence || "Ready…"}</p>
                            <div className="flex items-center gap-3">
                              <Select value={preferredTtsProvider} onValueChange={(v) => setPreferredTtsProvider(v as TtsProvider)}>
                                <SelectTrigger className="h-8 w-28 bg-white/10 border-white/20 text-white text-[11px] rounded-full"><Volume2 className="w-3 h-3 mr-1.5" /> <SelectValue /></SelectTrigger>
                                <SelectContent className="bg-black border-white/20 text-white">
                                  <SelectItem value="browser">Browser</SelectItem>
                                  <SelectItem value="deepgram">Deepgram</SelectItem>
                                </SelectContent>
                              </Select>
                              {preferredTtsProvider === 'deepgram' && (
                                <Select value={selectedTtsVoice} onValueChange={setSelectedTtsVoice}>
                                  <SelectTrigger className="h-8 w-36 bg-white/10 border-white/20 text-white text-[11px] rounded-full"><Mic className="w-3 h-3 mr-1.5" /> <SelectValue /></SelectTrigger>
                                  <SelectContent className="bg-black border-white/20 text-white">
                                    {DEEPGRAM_AURA_VOICES.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              )}
                              <Button size="icon" className="h-12 w-12 rounded-full bg-white text-black hover:bg-gray-200" onClick={togglePlayPause}>
                                {isSpeaking && !isPaused ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                              </Button>
                              <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full text-white/50 hover:text-white" onClick={handleStop}>
                                <Square className="w-4 h-4 fill-current" />
                              </Button>
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedScripts((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                              className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-bold text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                            >
                              <FileText className="h-3 w-3" /> {expandedScripts[idx] ? "Hide script" : "View script"}
                            </button>
                            {expandedScripts[idx] && (
                              <div className="mt-3 max-h-56 w-full overflow-y-auto rounded-xl bg-white/5 p-4 text-left text-[13px] leading-relaxed text-white/80 animate-in fade-in slide-in-from-top-2 duration-200">
                                {String(block.data)}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Reel Script (text first — user chooses to create reel) */}
                      {block.type === 'reel-script' && (
                        <div className="space-y-4">
                          <LectureWrapper style={viewStyle}>
                            <TypewriterSmartRender text={String(block.data)} animate={Boolean(block.animate)} />
                          </LectureWrapper>
                          <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-[#F3EEFF] border border-[#E8E4F5]">
                            <Button
                              size="sm"
                              className="gap-1.5 rounded-xl bg-[#6D35FF] hover:bg-[#4C1D95] text-white text-[12px] font-bold"
                              onClick={() => handleCreateReelFromScript(String(block.data), block.topic || userTopic)}
                              disabled={isCreatingReel}
                            >
                              {isCreatingReel ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Clapperboard className="h-3.5 w-3.5" />}
                              Create Reel from this
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-[12px] font-bold" onClick={() => navigator.clipboard.writeText(String(block.data)).then(() => toast.success("Copied!"))}>
                              <FileText className="h-3.5 w-3.5" /> Copy Text
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-[12px] font-bold" onClick={() => { setLearnFormat('reel'); handleGenerate(block.topic || userTopic); }}>
                              <RefreshCw className="h-3.5 w-3.5" /> Regenerate
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Reel player */}
                      {block.type === 'reel' && (() => {
                        const reel = block.data as ReelPayload;
                        const activeSegment = reel.segments[currentReelSegment] || reel.segments[0];
                        const activeVideo = reel.videoUrls[currentReelVideo % reel.videoUrls.length];
                        const captionSourceWords = activeCaptionWords.length ? activeCaptionWords : activeSegment?.text.split(/\s+/) || [];
                        const captionWindow = getCaptionWindow(captionSourceWords, activeCaptionWord);
                        return (
                          <div className="max-w-4xl mx-auto grid gap-5 lg:grid-cols-[minmax(260px,380px)_1fr] items-start">
                            <div ref={reelStageRef} className="relative mx-auto w-full max-w-[380px] aspect-[9/16] overflow-hidden rounded-2xl bg-black shadow-lg border border-white/10 fullscreen:max-w-none fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none">
                              {!videoHadError && activeVideo ? (
                                <video ref={reelVideoRef} key={activeVideo} src={activeVideo} className="absolute inset-0 h-full w-full object-cover" muted playsInline
                                  onLoadedData={() => {
                                    if (reelVideoRef.current) reelVideoRef.current.playbackRate = getPlaybackSpeed();
                                    if (isReelVideoPlaying) reelVideoRef.current?.play().catch(() => {});
                                  }}
                                  onEnded={() => { setVideoHadError(false); if (isReelVideoPlaying) setCurrentReelVideo((v) => (v + 1) % reel.videoUrls.length); }}
                                  onError={() => { setVideoHadError(false); setCurrentReelVideo((v) => (v + 1) % reel.videoUrls.length); }}
                                />
                              ) : (
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(109,53,255,0.4),transparent_30%),linear-gradient(160deg,#020617,#111827_45%,#312e81)]" />
                              )}
                              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75" />
                              <div className="absolute left-3 right-3 top-3 flex items-center justify-between text-white">
                                <div className="flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur-md">
                                  <Clapperboard className="h-3 w-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-wider">Reel</span>
                                </div>
                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-black/45 text-white hover:bg-black/70" onClick={toggleReelFullscreen}>
                                  {isReelFullscreen ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                                </Button>
                              </div>
                              <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 text-center">
                                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-0.5 text-[10px] font-bold uppercase text-black">
                                  <Radio className="h-3 w-3" /> {activeSegment?.speaker === 'B' ? 'Speaker B' : 'Speaker A'}
                                </div>
                                <div className="mx-auto rounded-xl bg-black/35 px-3 py-2 backdrop-blur-sm">
                                  <p className="text-lg font-bold leading-tight text-white [text-shadow:0_2px_0_rgba(0,0,0,0.8)]">
                                    {captionWindow.words.map((word, wi) => {
                                      const absIdx = captionWindow.start + wi;
                                      return <span key={`${word}-${absIdx}`} className={`mx-0.5 inline-block transition-all duration-150 ${absIdx === activeCaptionWord ? 'scale-110 text-yellow-300' : 'text-white'}`}>{word}</span>;
                                    })}
                                  </p>
                                </div>
                              </div>
                              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2.5">
                                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white" onClick={() => { setVideoHadError(false); setCurrentReelVideo((v) => (v + 1) % reel.videoUrls.length); }}>
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="icon" className="h-12 w-12 rounded-full bg-white text-black hover:bg-white/90" onClick={() => handlePlayReel(reel)}>
                                  {isTtsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : isSpeaking && !isPaused ? <Pause className="h-5 w-5 fill-current" /> : <Play className="ml-0.5 h-5 w-5 fill-current" />}
                                </Button>
                                <Button size="icon" variant="secondary" className="h-9 w-9 rounded-full bg-white/90 text-black hover:bg-white" onClick={handleStop}>
                                  <Square className="h-3.5 w-3.5 fill-current" />
                                </Button>
                              </div>
                            </div>
                            {/* Reel transcript */}
                            <div className="transform-card space-y-3 rounded-2xl p-4">
                              <div className="flex items-center gap-2">
                                <Captions className="h-4 w-4 text-[#6D35FF]" />
                                <h3 className="text-[14px] font-extrabold text-[#111827]">{reel.topic}</h3>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="rounded-xl bg-[#F8F7FC] p-2"><div className="text-[14px] font-bold">{reel.segments.length}</div><div className="text-[9px] font-bold uppercase text-[#6B7280]">Lines</div></div>
                                <div className="rounded-xl bg-[#F8F7FC] p-2"><div className="text-[14px] font-bold capitalize">{preferredTtsProvider}</div><div className="text-[9px] font-bold uppercase text-[#6B7280]">Voice</div></div>
                                <div className="rounded-xl bg-[#F8F7FC] p-2"><div className="text-[14px] font-bold">{playbackSpeed}x</div><div className="text-[9px] font-bold uppercase text-[#6B7280]">Speed</div></div>
                              </div>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Voice Engine</Label>
                                  <Select value={preferredTtsProvider} onValueChange={(value) => handleReelProviderChange(value as TtsProvider)}>
                                    <SelectTrigger className="h-9 rounded-xl border-[#E8E4F5] bg-white text-[12px] font-bold">
                                      <Volume2 className="mr-1.5 h-3.5 w-3.5 text-[#6D35FF]" />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="deepgram">Deepgram Aura</SelectItem>
                                      <SelectItem value="browser">Browser Voice</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Speed</Label>
                                  <Select value={playbackSpeed} onValueChange={handleReelSpeedChange}>
                                    <SelectTrigger className="h-9 rounded-xl border-[#E8E4F5] bg-white text-[12px] font-bold">
                                      <Gauge className="mr-1.5 h-3.5 w-3.5 text-[#6D35FF]" />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="0.85">0.85x</SelectItem>
                                      <SelectItem value="1">1x</SelectItem>
                                      <SelectItem value="1.15">1.15x</SelectItem>
                                      <SelectItem value="1.3">1.3x</SelectItem>
                                      <SelectItem value="1.5">1.5x</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              {preferredTtsProvider === "deepgram" && (
                                <div className="space-y-1">
                                  <Label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Aura Voice</Label>
                                  <Select value={selectedTtsVoice} onValueChange={(voice) => { if (isSpeaking) handleStop(); setSelectedTtsVoice(voice); }}>
                                    <SelectTrigger className="h-9 rounded-xl border-[#E8E4F5] bg-white text-[12px] font-bold">
                                      <Mic className="mr-1.5 h-3.5 w-3.5 text-[#6D35FF]" />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {DEEPGRAM_AURA_VOICES.map((voice) => (
                                        <SelectItem key={voice.id} value={voice.id}>{voice.label}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                                {reel.segments.map((seg, si) => (
                                  <button key={`${seg.speaker}-${si}`} onClick={() => { setCurrentReelSegment(si); setCurrentSentence(seg.text); setActiveCaptionWords(seg.text.split(/\s+/)); setActiveCaptionWord(0); }}
                                    className={`w-full rounded-lg border p-2 text-left text-[12px] transition-all ${si === currentReelSegment ? 'border-[#6D35FF] bg-[#F3EEFF]' : 'bg-[#F8F7FC] hover:bg-[#F3EEFF]/50 border-transparent'}`}>
                                    <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-[#6D35FF]">Speaker {seg.speaker}</span>
                                    <span className="font-medium leading-snug text-[#111827]">{seg.text}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Flashcards */}
                      {block.type === 'cards' && (() => {
                        const cards = Array.isArray(block.data) ? block.data.map(String) : [String(block.data)];
                        return (
                          <div className="transform-card flex flex-col items-center justify-center p-8 rounded-2xl max-w-2xl mx-auto">
                            <div className="text-xl font-semibold text-center leading-relaxed">
                              <SmartRender text={cards[currentCard] || cards[0]} />
                            </div>
                            <div className="flex gap-6 mt-8 items-center">
                              <Button variant="outline" className="h-10 w-14 rounded-xl" onClick={() => setCurrentCard(c => Math.max(0, c - 1))} disabled={currentCard === 0}><ChevronLeft className="w-5 h-5" /></Button>
                              <span className="text-[14px] font-mono text-[#6B7280]">{Math.min(currentCard + 1, cards.length)} / {cards.length}</span>
                              <Button variant="outline" className="h-10 w-14 rounded-xl" onClick={() => setCurrentCard(c => Math.min(cards.length - 1, c + 1))} disabled={currentCard >= cards.length - 1}><ChevronRight className="w-5 h-5" /></Button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Text / lecture */}
                      {block.type === 'text' && (
                        <div>
                          <LectureWrapper style={viewStyle}>
                            <TypewriterSmartRender text={String(block.data)} animate={Boolean(block.animate)} />
                          </LectureWrapper>
                          {/* Action row for text blocks */}
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-[11px] font-bold" onClick={handleReadMainTextAloud}>
                              {isSpeaking ? <Square className="h-3 w-3 fill-current" /> : <Volume2 className="h-3 w-3" />}
                              {isSpeaking ? 'Stop' : 'Read Aloud'}
                            </Button>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl text-[11px] font-bold" onClick={() => navigator.clipboard.writeText(String(block.data)).then(() => toast.success("Copied!"))}>
                              <FileText className="h-3 w-3" /> Copy
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {/* Related suggestions */}
              {relatedSuggestions.length > 0 && !isGenerating && (
                <div className="mt-6 pt-4 border-t border-dashed border-[#E8E4F5]">
                  <p className="text-[10px] font-bold uppercase text-[#6B7280] mb-2 tracking-wider">Explore Related</p>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedSuggestions.map((s, i) => (
                      <button key={i} onClick={() => { if (contentStream.length > 0) { handleExplainMore(s); } else { setUserTopic(s); handleGenerate(s); } }}
                        className="rounded-full border border-[#E8E4F5] bg-white px-3 py-1 text-[11px] font-semibold text-[#6D35FF] hover:bg-[#F3EEFF] transition-all">{s}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Generation loading indicator */}
              {isGenerating && (
                <div className="transform-card mt-4 rounded-xl p-3 text-[13px] font-semibold text-[#6B7280]">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#6D35FF] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#6D35FF]" />
                    </span>
                    {getVibeStatusCopy()} · {generationElapsed}s
                  </div>
                </div>
              )}

              <div ref={contentEndRef} />
            </div>

            {/* Chat Input — sticky bottom. Swaps to the active tool's own focus + Generate
                bar while a Studio tool is selected, instead of duplicating a second input
                in the middle of the panel. */}
            {isToolWorkspaceOpen && activeStudioTool ? (
              <div className="transform-panel-header shrink-0 border-t p-3" style={{ borderColor: '#E8E4F5' }}>
                <div className="flex items-end gap-2 rounded-xl border border-[#E8E4F5] bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                  <Textarea
                    ref={studioFocusInputRef}
                    value={studioFocus}
                    onChange={(e) => setStudioFocus(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleStudioGenerate(); } }}
                    placeholder={focusSuggestions[0] ? `e.g. ${focusSuggestions[0]}` : `Focus for ${activeStudioTool.label}…`}
                    className="min-h-[42px] max-h-32 resize-none border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0 placeholder:text-[#6B7280]/60"
                  />
                  <Button size="icon" className={`h-9 w-9 rounded-lg shrink-0 ${activeToolAccent.bg} hover:opacity-90`} onClick={handleStudioGenerate} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Sparkles className="h-4 w-4 text-white" />}
                  </Button>
                </div>
                {/* Tool-specific quick focus chips, tailored to your sources / Vibe profile */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {focusSuggestions.slice(0, 5).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStudioFocus(s)}
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all ${studioFocus === s ? `${activeToolAccent.border} ${activeToolAccent.soft} ${activeToolAccent.text}` : "border-[#E8E4F5] bg-white text-[#6B7280] hover:border-[#6D35FF]/40 hover:text-[#6D35FF]"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="transform-panel-header shrink-0 border-t p-3" style={{ borderColor: '#E8E4F5' }}>
                <div className="relative">
                  {isCommandMenuOpen && (
                    <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-xl rounded-xl border border-[#E8E4F5] bg-white p-2 shadow-lg">
                      <div className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Choose a tool</div>
                      <div className="grid gap-1 sm:grid-cols-2">
                        {CHAT_COMMANDS.map((cmd) => (
                          <button key={cmd.key} onClick={() => applyChatCommand(cmd)} className="rounded-lg p-2.5 text-left hover:bg-[#F3EEFF] transition-colors">
                            <span className="block text-[12px] font-bold text-[#111827]">@{cmd.key} {cmd.label}</span>
                            <span className="text-[10px] text-[#6B7280]">{cmd.description}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex items-end gap-2 rounded-xl border border-[#E8E4F5] bg-white/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                    <Textarea
                      value={explainInput}
                      onChange={(e) => handleChatInputChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitChatComposer(); } }}
                      placeholder="Ask from your lectures or generate study material… type @ for tools"
                      className="min-h-[42px] max-h-32 resize-none border-0 bg-transparent text-[14px] shadow-none focus-visible:ring-0 placeholder:text-[#6B7280]/60"
                    />
                    <Button size="icon" className="h-9 w-9 rounded-lg bg-[#6D35FF] hover:bg-[#4C1D95] shrink-0" onClick={submitChatComposer} disabled={isGenerating}>
                      {isGenerating ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : <Send className="h-4 w-4 text-white" />}
                    </Button>
                  </div>
                </div>
                {/* Quick suggestion chips */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(relatedSuggestions.length ? relatedSuggestions : (materialId ? documentFocusedSuggestions(primaryDocumentLabel) : SUGGESTED_TOPICS.map((item) => item.label))).slice(0, 5).map((s) => (
                    <button key={s} onClick={() => { handleChatInputChange(String(s)); if (!contentStream.length) setUserTopic(String(s)); }}
                      className="rounded-full border border-[#E8E4F5] bg-white px-2.5 py-1 text-[10px] font-semibold text-[#6B7280] hover:border-[#6D35FF]/40 hover:text-[#6D35FF] transition-all">{s}</button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {!isMobile && (
          <div
            role="separator"
            aria-label="Resize studio panel"
            onPointerDown={() => setPanelDragTarget("right")}
            className="mx-1 w-1 shrink-0 cursor-col-resize rounded-full bg-transparent hover:bg-[#6D35FF]/25 transition-colors"
          />
        )}

        {/* ═══════════════ RIGHT PANEL: STUDIO ═══════════════ */}
        {(!isMobile || mobileTab === 'studio') && (
          <div className="relative z-20 flex w-full shrink-0 flex-col gap-2 overflow-visible" style={{ width: isMobile ? undefined : rightPanelWidth }}>
            <div className="relative z-30 shrink-0">
              <div className="transform-panel flex min-h-11 items-center justify-between gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: '#E8E4F5' }}>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <Zap className="h-4 w-4 shrink-0 text-[#6D35FF]" />
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-[#6D35FF]">Vibe</span>
                  <div className="min-w-0 flex-1 truncate text-[11px] font-bold capitalize text-[#6B7280]">
                    {[activeLevelLabel, activeExperienceLabel, `${timeAvailable}m`, mood, profileContext || major].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-7 shrink-0 rounded-lg px-2 text-[10px] font-bold" onClick={() => setIsEditingProfile(v => !v)}>
                  {isEditingProfile ? 'Hide' : 'Edit'}
                </Button>
              </div>

              {isEditingProfile && (
                <div className="transform-panel mt-2 rounded-2xl border p-4 shadow-[0_18px_42px_rgba(47,26,96,0.12)] animate-in fade-in slide-in-from-top-2" style={{ borderColor: '#E8E4F5' }}>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Level</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {VIBE_LEVEL_OPTIONS.map((item) => (
                          <button key={item.id} onClick={() => setEduLevel(item.id)} className={`rounded-lg border p-2 text-left transition-all ${eduLevel === item.id ? 'border-[#6D35FF] bg-[#F3EEFF] text-[#6D35FF]' : 'border-[#E8E4F5] bg-white text-[#6B7280] hover:border-[#6D35FF]/30'}`}>
                            <span className="block text-[11px] font-bold">{item.label}</span>
                            <span className="text-[9px] font-medium">{item.hint}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Subject</label>
                      <Input value={profileContext} onChange={(e) => { setProfileContext(e.target.value); setMajor(e.target.value || 'Computer Science'); }} placeholder="Computer Science" className="h-8 rounded-lg text-[12px] border-[#E8E4F5]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Time</label>
                      <div className="grid grid-cols-5 gap-1">
                        {[5, 10, 15, 30, 45].map((m) => (
                          <button key={m} onClick={() => setTimeAvailable(String(m))} className={`rounded-lg py-1.5 text-[11px] font-bold ${timeAvailable === String(m) ? 'bg-[#6D35FF] text-white' : 'bg-white/70 text-[#6B7280] hover:bg-[#F3EEFF]'}`}>{m}m</button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">Mood</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {[{ id: 'enthusiastic', label: 'Hype' }, { id: 'strict', label: 'Strict' }, { id: 'professional', label: 'Pro' }, { id: 'socratic', label: 'Socratic' }].map((item) => (
                          <button key={item.id} onClick={() => setMood(item.id)} className={`rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition-all ${mood === item.id ? 'border-[#6D35FF] bg-[#F3EEFF] text-[#6D35FF]' : 'border-[#E8E4F5] bg-white text-[#6B7280]'}`}>{item.label}</button>
                        ))}
                      </div>
                    </div>
                    <Button className="w-full rounded-lg h-8 text-[12px] bg-[#6D35FF] hover:bg-[#4C1D95]" onClick={() => setIsEditingProfile(false)}>Save Vibe</Button>
                  </div>
                </div>
              )}
            </div>

            <aside className="transform-panel flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-2xl md:border" style={{ borderColor: '#E8E4F5' }}>
            {/* Panel Header */}
            <div className="transform-panel-header shrink-0 p-4 border-b" style={{ borderColor: '#E8E4F5' }}>
              <h2 className="text-[15px] font-extrabold text-[#111827]">Study Studio</h2>
              <p className="text-[11px] font-medium text-[#6B7280] mt-0.5">Generate from your sources</p>
            </div>

            {/* Scrollable studio content */}
            <div className="transform-scroll flex-1 min-h-0 overflow-y-auto p-4">

              <div className="grid grid-cols-1 gap-2">
                {STUDIO_TOOLS.map((tool) => {
                  const used = Boolean(getToolArtifact(tool));
                  const active = isStudioToolActive(tool);
                  const accent = accentClasses[tool.accent || "indigo"];
                  return (
                    <button
                      key={tool.id}
                      onClick={() => selectStudioTool(tool)}
                      className={`group relative flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                        active
                          ? `${accent.border} ${accent.soft} shadow-[0_10px_22px_rgba(109,53,255,0.10)]`
                          : used
                          ? "border-green-200 bg-green-50/70 hover:border-green-300"
                          : "border-[#E8E4F5] bg-white/70 hover:border-[#E8E4F5]"
                      }`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.bg} text-white shadow-sm transition-transform group-hover:scale-110`}>
                        <tool.icon className="h-4.5 w-4.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-[13px] font-extrabold ${active ? accent.text : "text-[#111827]"}`}>{tool.label}</p>
                        <p className="truncate text-[11px] font-medium text-[#6B7280]">{tool.description}</p>
                      </div>
                      {used && <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />}
                    </button>
                  );
                })}
              </div>

            </div>
          </aside>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick structural polyfill injection helper item
const History = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);

export default Transform;
