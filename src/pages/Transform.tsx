import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { generateContent, generateFollowUp, SUGGESTED_TOPICS } from "@/lib/aiEngine";
import brainrotVideoLinks from "../../brainrot.md?raw";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Image as ImageIcon
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
        /([A-Za-z0-9_]+)\[([^\]\n]+)\|\>\s*([A-Za-z0-9_]+)\[([^\]\n]+)\]/g,
        "$1[$2] --> $3[$4]"
      );

      fixed = fixed.replace(/\s\|\>\s/g, " --> ");

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
      className="mermaid w-full overflow-x-auto p-8 bg-white rounded-xl border shadow-sm flex justify-center my-6 [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-w-none"
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
  return <div className="prose prose-lg dark:prose-invert max-w-5xl mx-auto transition-all duration-500 bg-white dark:bg-black/20 p-12 rounded-[2.5rem] shadow-sm border border-muted/20">{children}</div>;
};

const SelectionTile = ({ active, onClick, emoji, title, subtitle }: any) => (
  <div onClick={onClick} className={`cursor-pointer p-3 rounded-xl border-2 transition-all flex items-center gap-3 hover:shadow-md h-full ${active ? 'border-primary bg-primary/5 shadow-primary/10' : 'border-muted bg-card/50 hover:border-primary/30'}`}>
    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${active ? 'bg-primary/20' : 'bg-muted'}`}>{emoji}</div>
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
    const [questions, setQuestions] = useState<any[]>([]);
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
        }).filter(Boolean);
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
                        {q.options.map((opt: any) => {
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
    const [questions, setQuestions] = useState<any[]>([]);
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
        }).filter(Boolean);
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
const loadPdfJS = async (): Promise<any> => {
  if ((window as any).pdfjsLib) return (window as any).pdfjsLib;
  
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjsLib = (window as any).pdfjsLib;
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
    const pageText = textContent.items.map((item: any) => (item as any).str).join(" ");
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

const STORAGE_LIMIT_COPY = "Free storage: 50 MB total. Paid storage: 500 MB total. Live sessions: 100 MB per session.";

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

const MODE_TABS: Array<{ id: "learn" | "quiz" | "visualize" | "plan"; label: string }> = [
  { id: "learn", label: "Learn" },
  { id: "quiz", label: "Quiz" },
  { id: "visualize", label: "Visual" },
  { id: "plan", label: "Plan" },
];

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

const DEEPGRAM_TTS_TIMEOUT_MS = 12000;

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

  const match = cleanLine.match(/^(?:host\s*)?([ab])(?:\s*\([^)]*\))?\s*[:\-]\s*(.+)$/i);
  const speaker = match ? (match[1].toUpperCase() as "A" | "B") : (index % 2 === 0 ? "A" : "B");
  const text = (match ? match[2] : cleanLine)
    .replace(/^(?:trump|putin|donald|vladimir|host\s*[ab]|speaker\s*[ab])\s*[:\-]\s*/i, "")
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
  let voices = synth.getVoices();
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
    .replace(/\b(?:Host|Speaker)\s*[AB]\s*[:\-]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

const Transform = () => {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams(); 
  const hasAutoStarted = useRef(false); 
  const contentEndRef = useRef<HTMLDivElement>(null);
  const [featureGuideOpen, setFeatureGuideOpen] = useState(false);
  const [pendingAutoTopic, setPendingAutoTopic] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"learn" | "quiz" | "visualize" | "plan">("learn");
  const [learnFormat, setLearnFormat] = useState("lecture"); 
  const [vizFormat, setVizFormat] = useState("cheatsheet"); 
  const [quizFormat, setQuizFormat] = useState("mcq");
  const [isVibePanelOpen, setIsVibePanelOpen] = useState(true);
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [pendingChatRun, setPendingChatRun] = useState<string | null>(null);
  const [viewStyle, setViewStyle] = useState<"classic" | "modern" | "neo-brutalist">("classic");

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [eduLevel, setEduLevel] = useState("university");
  const [grade, setGrade] = useState("10"); 
  const [collegeYear, setCollegeYear] = useState("11"); 
  const [major, setMajor] = useState("Computer Science"); 
  const [goal, setGoal] = useState("concept"); 
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [profileContext, setProfileContext] = useState("Computer Science");
  
  const [mood, setMood] = useState("enthusiastic"); 
  const [timeAvailable, setTimeAvailable] = useState("15"); 
  const [learningStyle, setLearningStyle] = useState("academic"); 
  const [quizDifficulty, setQuizDifficulty] = useState<"basic" | "advanced">("basic");

  const [userTopic, setUserTopic] = useState(""); 
  const [bottomNewTopic, setBottomNewTopic] = useState("");
  const [materialId, setMaterialId] = useState<string | null>(null); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [historicalData, setHistoricalData] = useState<any | null>(null);
  
  const [contentStream, setContentStream] = useState<any[]>([]);
  const [relatedSuggestions, setRelatedSuggestions] = useState<string[]>([]);
  const [explainInput, setExplainInput] = useState("");
  const [diagramCode, setDiagramCode] = useState("");
  const [roadmapData, setRoadmapData] = useState<any[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentStatus, setDocumentStatus] = useState<string | null>(null);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1.15");
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

  const brainrotUrls = useMemo(() => extractVideoUrls(brainrotVideoLinks), []);
  const manualReelUrls = useMemo(() => extractVideoUrls(reelUrlsText), [reelUrlsText]);
  const reelVideoUrls = useMemo(() => {
    const merged = Array.from(new Set([...manualReelUrls, ...brainrotUrls]));
    return merged.length ? merged : FALLBACK_REEL_PATHS;
  }, [manualReelUrls, brainrotUrls]);
  const customEdgeTtsEndpoint = import.meta.env.VITE_TTS_ENDPOINT || import.meta.env.VITE_EDGE_TTS_ENDPOINT || "";
  const edgeTtsEndpoint = customEdgeTtsEndpoint || (import.meta.env.VITE_SUPABASE_URL ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/edge-tts` : "");
  const hasEdgeEndpoint = Boolean(edgeTtsEndpoint);
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
      } catch (error: any) {
        console.warn("Deepgram Aura TTS failed, falling back to browser speech.");
        toast.info("Deepgram Aura is unavailable, using browser voice.");
      }
    }
    window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    const { primary } = await pickHumanLikeVoices();
    if (primary) u.voice = primary;
    u.rate = parseFloat(playbackSpeed); u.pitch = 1.02; 
    u.onboundary = (event) => {
        const globalIndex = startFromChar + event.charIndex;
        setCharOffset(globalIndex); 
        let count = 0;
        for(let s of sentences) {
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
          handleSpeak(targetBlock.data, 0);
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
          handleSpeak(contentStream[contentStream.length-1].data, 0);
      }
  };

  const startReelVideo = () => {
    setIsReelVideoPlaying(true);
    const video = reelVideoRef.current;
    if (!video) return;
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
  const changeSpeed = (speed: string) => { setPlaybackSpeed(speed); if (isSpeaking && fullAudioText) { handleSpeak(fullAudioText, charOffset); } };

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
      const elapsed = (performance.now() - startedAt) * parseFloat(playbackSpeed);
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
      const elapsed = (performance.now() - startedAt) * parseFloat(playbackSpeed);
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

    if (hasEdgeEndpoint) {
      const ttsAbortController = new AbortController();
      const ttsRequestTimer = window.setTimeout(() => ttsAbortController.abort(), DEEPGRAM_TTS_TIMEOUT_MS);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error("Authentication required.");
        const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
        const response = await fetch(edgeTtsEndpoint, {
          method: "POST",
          signal: ttsAbortController.signal,
          headers: {
            "Content-Type": "application/json",
            ...(publishableKey ? { apikey: publishableKey } : {}),
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            text: cleanText,
            voice: selectedTtsVoice,
            speed: parseFloat(playbackSpeed),
            format: "mp3",
          }),
        });

        if (!response.ok) throw new Error("Deepgram TTS endpoint returned an error.");
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
        console.warn("Deepgram TTS endpoint failed; trying browser speech fallback.");
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
    audio.playbackRate = parseFloat(playbackSpeed);
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
      utterance.rate = parseFloat(playbackSpeed);
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
    } catch (error: any) {
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

  const blockToMemoryText = (block: any) => {
    if (!block) return "";
    if (block.type === "reel") {
      return block.data?.segments?.map((segment: DialogueSegment) => segment.text).join(" ") || "";
    }
    if (block.type === "visual-aids") {
      return block.data?.map((aid: VisualAidImage) => `${aid.title}: ${aid.subtitle || aid.lectures?.join(", ") || "visual revision sheet"}`).join(" | ") || "";
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
      `Uploaded document: ${file?.name || "none"}.`,
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

  useEffect(() => {
    if (!pendingAutoTopic) return;

    const topic = pendingAutoTopic;
    setPendingAutoTopic(null);
    handleGenerate(topic);
  }, [pendingAutoTopic]);

  useEffect(() => {
    if (!pendingChatRun) return;
    const prompt = pendingChatRun;
    setPendingChatRun(null);
    handleGenerate(prompt);
  }, [pendingChatRun, activeTab, learnFormat, quizFormat, vizFormat]);

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

  const pollDocumentStatus = async (documentId: string, fileName: string) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const { data, error } = await supabase
        .from("documents")
        .select("processing_status, chunk_count")
        .eq("document_id", documentId)
        .single();

      if (error) return;
      const status = String(data?.processing_status || "queued");
      setDocumentStatus(status);

      if (status === "processed") {
        toast.success(`${fileName} indexed: ${data?.chunk_count || 0} chunks ready in Pinecone.`);
        return;
      }
      if (status === "failed") {
        toast.error("Document processing failed. Please try re-uploading the file.");
        setMaterialId(null);
        return;
      }

      await new Promise((resolve) => window.setTimeout(resolve, attempt < 6 ? 2500 : 6000));
    }

    toast.info("File is still processing in the background. You can come back shortly.");
  };

  const supportsGzipCompression = () => typeof CompressionStream !== "undefined";

  const gzipBlob = async (blob: Blob): Promise<Blob> => {
    const stream = blob.stream().pipeThrough(new CompressionStream("gzip"));
    return await new Response(stream).blob();
  };

  const handleRemoveDocument = (documentId: string | null) => {
    setMaterialId(null);
    setFile(null);
    setDocumentStatus(null);
    if (!documentId) return;
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setIsUploading(true); setFile(selectedFile); setMaterialId(null); setDocumentStatus(null);
    const uploadMimeType = getUploadMimeType(selectedFile);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in before uploading study files.");
      }

      toast.info("Creating secure direct upload...", { id: "pdf-status" });
      const wantsCompression = supportsGzipCompression() && selectedFile.size > COMPRESSION_THRESHOLD_BYTES;
      let uploadData: DirectUploadPayload | null = null;
      try {
        const uploadResult = await supabase.functions.invoke<DirectUploadPayload>("create-document-upload", {
          body: {
            file_name: selectedFile.name,
            file_size: selectedFile.size,
            file_type: uploadMimeType,
            compress: wantsCompression,
          },
          headers: { Authorization: `Bearer ${session.access_token}` }
        });
        uploadData = uploadResult.data;
        if (uploadResult.error) {
          throw new Error(await readFunctionError(uploadResult.error));
        }
      } catch (functionError: unknown) {
        const message = getErrorMessage(functionError);
        if (/failed to fetch|networkerror|load failed/i.test(message)) {
          throw new Error(`CREATE_UPLOAD_FUNCTION_UNREACHABLE: ${message}`);
        }
        throw functionError;
      }

      if (!uploadData?.upload_url || !uploadData?.document_id) {
        throw new Error("Upload signer returned an invalid response.");
      }

      toast.info(uploadData.compress ? "Compressing and uploading..." : "Uploading directly to storage...", { id: "pdf-status" });
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

      toast.info("Queued for background indexing...", { id: "pdf-status" });
      let enqueueData: { error?: string } | null = null;
      try {
        const enqueueResult = await supabase.functions.invoke<{ error?: string }>("enqueue-document-processing", {
          body: { document_id: uploadData.document_id },
          headers: { Authorization: `Bearer ${session.access_token}` }
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

      setMaterialId(uploadData.document_id);
      setDocumentStatus("queued");
      toast.dismiss("pdf-status");
      toast.success("Upload complete. Background worker will index it into Pinecone.");
      void pollDocumentStatus(uploadData.document_id, selectedFile.name);
    } catch (error: unknown) { 
      toast.dismiss("pdf-status");
      toast.error(safeUploadError(getErrorMessage(error))); 
      setFile(null); 
      setMaterialId(null);
      setDocumentStatus(null);
    } finally { 
      setIsUploading(false); 
    }
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
      setDiagramCode(rawContent.replace(/```mermaid/g, "").replace(/```/g, "").trim());
    } else if (activeTab === "plan") {
      const steps = rawContent.split("###").map((s:string) => {
        const p = s.split("|");
        return p.length >= 2 ? { title: p[0].trim(), desc: p[1].trim(), time: p[2]?.trim() } : null;
      }).filter(Boolean);
      setRoadmapData(steps);
    } else if (activeTab === "quiz") {
      if (quizFormat === 'mcq') setContentStream(prev => [...prev, { type: 'quiz-interactive', data: rawContent, role: 'ai' }]);
      else setContentStream(prev => [...prev, { type: 'quiz-rapid', data: rawContent, role: 'ai' }]);
    } else {
      if (learnFormat === 'podcast') {
        setContentStream(prev => [...prev, { type: 'podcast', data: rawContent, role: 'ai' }]);
        setTimeout(() => handleSpeak(rawContent, 0), 500);
      } else if (learnFormat === 'reel') {
        setContentStream(prev => [...prev, { type: 'reel', data: buildReelPayload(rawContent, topicContext || "this topic"), role: 'ai' }]);
      } else {
        let type = learnFormat === 'flashcards' ? 'cards' : 'text';
        let payload = learnFormat === 'flashcards' ? rawContent.split("---").filter((x:string)=>x.length>10) : rawContent;
        setContentStream(prev => [...prev, { type, data: payload, role: 'ai', animate: type === 'text' }]);
      }
    }
    setIsEditingProfile(false);
  };

  const handleGenerate = async (topicOverride?: string) => {
    const topic = topicOverride || userTopic;
    if (!topic.trim() && !materialId) { toast.error("Enter a topic or upload a PDF reference!"); return; }
    setIsGenerating(true);
    setGenerationStartedAt(Date.now());
    setGenerationElapsed(1);
    handleStop();
    setRelatedSuggestions([]); 
    if (contentStream.length === 0 || topicOverride) { setContentStream([]); setDiagramCode(""); setRoadmapData([]); }
    
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
            source_name: file?.name || "",
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
          } catch (_) {}
          throw new Error(msg);
        }

        if (!Array.isArray(data?.aids) || data.aids.length === 0) {
          throw new Error("Pollinations did not return a visual aid image.");
        }

        setDiagramCode("");
        setRoadmapData([]);
        setContentStream(prev => [...prev, { type: 'visual-aids', data: data.aids, role: 'ai' }]);
        setRelatedSuggestions(data.suggestions || documentFocusedSuggestions(file?.name));
        setIsEditingProfile(false);
        toast.success(`Created ${data.aids.length} visual revision sheet${data.aids.length === 1 ? "" : "s"}.`);
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
          source_name: file?.name || "",
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
        } catch (_) {}
        throw new Error(msg);
      }
      if (!data?.content) throw new Error("The AI service returned an empty answer.");
      processRawContent(
        data.content,
        materialId ? documentFocusedSuggestions(file?.name) : data.suggestions,
        materialId && isDocumentInstruction(topic) ? file?.name || "uploaded document" : topic
      );

      // Log session history
      if (session?.user) {
         await supabase.from('user_session_history').insert({
            user_id: session.user.id,
            last_topic: topic,
            weak_areas: activeTab === 'quiz' ? ['Review Conceptual Edge Scenarios'] : ['General Recall Bounds'],
            suggestions: materialId ? documentFocusedSuggestions(file?.name) : [`Re-run customized logic checks parameters inside ${topic}`]
         }).catch(() => {});
      }

    } catch (e: any) {
      if (materialId) {
        toast.error(e?.message || "Document answer failed. Please try again after the file finishes indexing.");
        return;
      }
      if (activeTab === "visualize" && vizFormat === "cheatsheet") {
        toast.error(e?.message || "Visual aid generation failed. Pollinations may be busy; try again shortly.");
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
      } catch (fallbackError: any) {
        toast.error('Content generation failed.');
      }
    } 
    finally { clearInterval(interval); setIsGenerating(false); setGenerationStartedAt(null); }
  };

  const handleBottomTriggerNewTopic = () => {
     if (!bottomNewTopic.trim()) { toast.error("Please enter a new topic topic state parameters."); return; }
     setUserTopic(bottomNewTopic);
     const target = bottomNewTopic;
     setBottomNewTopic("");
     handleGenerate(target);
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

    if (contentStream.length === 0 && !diagramCode && roadmapData.length === 0) {
      setUserTopic(prompt);
      setExplainInput("");
      handleGenerate(prompt);
      return;
    }

    handleExplainMore(prompt);
  };

  const getRecentLessonContext = () => {
    const usefulBlocks = contentStream
      .filter((block) => ["text", "podcast", "cards", "reel", "question", "quiz-interactive", "quiz-rapid"].includes(block.type))
      .slice(-6);

    const compactTurns = usefulBlocks.map((block) => {
      const rawText = block.type === "reel"
        ? block.data?.segments?.map((segment: DialogueSegment) => segment.text).join(" ")
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
              source_name: file?.name || "",
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
      } catch (e: any) {
        // Fallback to local AI engine for follow-up
        console.warn(safeGenerationError());
        try {
          const followUpContent = generateFollowUp(contextualQuestion, baseTopic);
          setContentStream(prev => [...prev, { type: 'text', data: followUpContent, role: 'ai', animate: true }]);
        } catch (fallbackError: any) {
          toast.error('Follow-up generation failed.');
        }
      }
      finally { setIsGenerating(false); setGenerationStartedAt(null); }
  };

  const currentFeatureGuide = featureGuide[activeTab];
  const FeatureGuideIcon = currentFeatureGuide.icon;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans pb-20 w-full">
      <Dialog open={featureGuideOpen} onOpenChange={setFeatureGuideOpen}>
        <DialogContent className="max-w-2xl rounded-2xl border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <FeatureGuideIcon className="h-5 w-5" />
              </div>
              {currentFeatureGuide.title}
            </DialogTitle>
            <DialogDescription>{currentFeatureGuide.description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            {currentFeatureGuide.steps.map((step, index) => (
              <div key={step} className="rounded-xl border-2 bg-muted/30 p-4">
                <div className="mb-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </div>
                <p className="text-sm font-semibold leading-snug">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
            <Button variant="outline" onClick={() => setFeatureGuideOpen(false)}>
              Start from here
            </Button>
            <Button
              onClick={() => {
                setFeatureGuideOpen(false);
                document.getElementById("topic-source")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              Go to topic box
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full px-6 lg:px-10 py-24 relative z-10 flex flex-col gap-8">
        <div className="grid min-h-[78vh] gap-5 xl:grid-cols-[minmax(280px,360px)_1fr]">
          {isVibePanelOpen && (
            <aside
              className="resize-x overflow-auto rounded-2xl border-2 bg-card shadow-xl xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)]"
              style={{ minWidth: 280, maxWidth: 460 }}
            >
              <div className="flex items-center justify-between border-b bg-muted/30 p-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[0.22em] text-primary">Vibe Engine</div>
                  <div className="mt-1 text-sm font-black text-muted-foreground">{activeLevelLabel} - {activeExperienceLabel} - {profileContext || major}</div>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setIsEditingProfile((value) => !value)}>
                  {isEditingProfile ? "Hide" : "Edit"}
                </Button>
              </div>

              <div className="space-y-5 p-4">
                {isEditingProfile && (
                  <div className="space-y-4 rounded-2xl border bg-muted/20 p-3">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Level</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {VIBE_LEVEL_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setEduLevel(item.id)}
                        className={`rounded-xl border-2 p-3 text-left transition-all ${eduLevel === item.id ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-muted bg-background hover:border-primary/30"}`}
                      >
                        <span className="block text-sm font-black">{item.label}</span>
                        <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Major or Subject</Label>
                  <Select
                    value={SUBJECT_OPTIONS.includes(major) ? major : "custom"}
                    onValueChange={(value) => {
                      if (value === "custom") return;
                      setMajor(value);
                      setProfileContext(value);
                    }}
                  >
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBJECT_OPTIONS.map((subject) => (
                        <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                      ))}
                      <SelectItem value="custom">Write my own</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={profileContext}
                    onChange={(event) => {
                      setProfileContext(event.target.value);
                      setMajor(event.target.value || "Computer Science");
                    }}
                    placeholder="Write your own subject, exam, or role"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {EXPERIENCE_OPTIONS.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setExperienceLevel(item.id)}
                      className={`rounded-xl border-2 p-3 text-left transition-all ${experienceLevel === item.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-muted bg-background hover:border-indigo-200"}`}
                    >
                      <span className="block text-sm font-black">{item.label}</span>
                      <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                    </button>
                  ))}
                </div>
                    <Button className="w-full rounded-xl" onClick={() => setIsEditingProfile(false)}>
                      Save Vibe Engine
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Mode</Label>
                  <div className="grid grid-cols-4 rounded-xl bg-muted p-1">
                    {MODE_TABS.map((t) => (
                      <button key={t.id} onClick={() => setActiveTab(t.id)} className={`rounded-lg py-2 text-[10px] font-black uppercase ${activeTab === t.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground'}`}>{t.label}</button>
                    ))}
                  </div>
                </div>

                {activeTab === 'learn' && (
                  <div className="grid grid-cols-2 gap-2">
                    <SelectionTile active={learnFormat === 'lecture'} onClick={() => setLearnFormat('lecture')} emoji="Lec" title="Lecture" subtitle="Deep" />
                    <SelectionTile active={learnFormat === 'flashcards'} onClick={() => setLearnFormat('flashcards')} emoji="Card" title="Cards" subtitle="Recall" />
                    <SelectionTile active={learnFormat === 'podcast'} onClick={() => setLearnFormat('podcast')} emoji="Pod" title="Podcast" subtitle="Audio" />
                    <SelectionTile active={learnFormat === 'reel'} onClick={() => setLearnFormat('reel')} emoji="Re" title="Reel" subtitle="Captions" />
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div className="grid grid-cols-2 gap-2">
                    <SelectionTile active={quizFormat === 'mcq'} onClick={() => setQuizFormat('mcq')} emoji="Q" title="MCQs" subtitle="10 Qs" />
                    <SelectionTile active={quizFormat === 'rapid'} onClick={() => setQuizFormat('rapid')} emoji="!" title="Rapid" subtitle="Fast" />
                  </div>
                )}

                {activeTab === 'visualize' && (
                  <div className="grid grid-cols-1 gap-2">
                    <SelectionTile active={vizFormat === 'cheatsheet'} onClick={() => setVizFormat('cheatsheet')} emoji="PNG" title="Cheat Sheet" subtitle="Readable poster" />
                    <SelectionTile active={vizFormat === 'flowchart'} onClick={() => setVizFormat('flowchart')} emoji="Flow" title="Flow" subtitle="Diagram" />
                    <SelectionTile active={vizFormat === 'dld'} onClick={() => setVizFormat('dld')} emoji="DLD" title="Circuit" subtitle="Logic" />
                  </div>
                )}

                {activeTab === 'plan' && (
                  <SelectionTile active={true} onClick={() => setActiveTab('plan')} emoji="Map" title="Roadmap" subtitle="Study route" />
                )}

                <div className="rounded-2xl border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <span>Time</span>
                    <span>{timeAvailable}m</span>
                  </div>
                  <div className="grid grid-cols-5 gap-1.5">
                    {[5, 10, 15, 30, 45].map((m) => (
                      <button key={m} onClick={() => setTimeAvailable(String(m))} className={`rounded-lg py-2 text-xs font-black ${timeAvailable === String(m) ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-muted/30 p-3">
                  <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                    <Smile className="h-3.5 w-3.5" /> Mood
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "enthusiastic", label: "Hype" },
                      { id: "strict", label: "Strict" },
                      { id: "professional", label: "Pro" },
                      { id: "socratic", label: "Socratic" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setMood(item.id)}
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-black transition-all ${mood === item.id ? "border-purple-500 bg-purple-600 text-white" : "bg-background text-muted-foreground hover:border-purple-200"}`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}

          {!isVibePanelOpen && (
            <Button className="h-12 self-start rounded-xl xl:sticky xl:top-24" onClick={() => setIsVibePanelOpen(true)}>
              <Zap className="mr-2 h-4 w-4" /> Vibe Engine
            </Button>
          )}

          <section className="flex min-w-0 flex-col gap-5">
            <Card className="rounded-2xl border-2 bg-card p-4 shadow-xl">
              <div className="mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-wider">Source Dock</span>
              </div>
              <div className="grid gap-3 lg:grid-cols-[minmax(220px,340px)_1fr]">
                <Label htmlFor="file-new" className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-5 text-center transition-all hover:bg-muted/50 ${isUploading ? "bg-primary/5" : ""}`}>
                  {isUploading ? <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" /> : <Upload className="mb-2 h-6 w-6 text-muted-foreground" />}
                  <span className="text-sm font-black">{file ? file.name : "Upload lecture file"}</span>
                  <span className="mt-1 text-xs font-semibold text-muted-foreground">PDF, TXT, DOCX</span>
                  <Input id="file-new" type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleFileUpload} />
                </Label>
                <div className="space-y-3">
                  {materialId && (
                    <div className={`rounded-xl border p-3 text-xs font-bold ${
                      documentStatus === "processed"
                        ? "border-green-200 bg-green-50 text-green-700"
                        : documentStatus === "failed"
                          ? "border-red-200 bg-red-50 text-red-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                    }`}>
                      <div className="flex items-center gap-2">
                        {documentStatus === "processed" ? <CheckCircle2 className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
                        {documentStatus === "processed" ? "Vector index active" : `Indexing status: ${documentStatus || "queued"}`}
                        <XCircle className="ml-auto h-4 w-4 cursor-pointer" onClick={() => handleRemoveDocument(materialId)} />
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Quick topic</Label>
                    <Input value={userTopic} onChange={(event) => setUserTopic(event.target.value)} placeholder="Binary search, lecture 1..." className="rounded-xl" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="hidden border-2 bg-card/80 p-4 shadow-xl">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-black">Learning Workspace</span>
                <span className="text-muted-foreground">{activeTab} - {activeLevelLabel} - {profileContext || major}</span>
                <Badge variant="outline" className="ml-auto">{activeStyleLabel}</Badge>
              </div>
            </Card>

            <Card className="hidden border-2 bg-slate-50/80 p-5 shadow-xl">
              <div className="mb-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black capitalize">{activeTab === "visualize" ? "Visual" : activeTab} Panel</h2>
                    <p className="text-sm font-semibold text-muted-foreground">Choose the output style here, then keep the whole session flowing in chat.</p>
                  </div>
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                    {timeAvailable} min - {mood}
                  </Badge>
                </div>

                {activeTab === 'learn' && (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <SelectionTile active={learnFormat === 'lecture'} onClick={() => setLearnFormat('lecture')} emoji="Lec" title="Lecture" subtitle="Deep" />
                    <SelectionTile active={learnFormat === 'flashcards'} onClick={() => setLearnFormat('flashcards')} emoji="Card" title="Cards" subtitle="Recall" />
                    <SelectionTile active={learnFormat === 'podcast'} onClick={() => setLearnFormat('podcast')} emoji="Pod" title="Podcast" subtitle="Audio" />
                    <SelectionTile active={learnFormat === 'reel'} onClick={() => setLearnFormat('reel')} emoji="Re" title="Reel" subtitle="Captions" />
                  </div>
                )}

                {activeTab === 'quiz' && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <SelectionTile active={quizFormat === 'mcq'} onClick={() => setQuizFormat('mcq')} emoji="Q" title="MCQs" subtitle="10 Qs" />
                    <SelectionTile active={quizFormat === 'rapid'} onClick={() => setQuizFormat('rapid')} emoji="!" title="Rapid" subtitle="Fast" />
                  </div>
                )}

                {activeTab === 'visualize' && (
                  <div className="grid gap-2 sm:grid-cols-3">
                    <SelectionTile active={vizFormat === 'cheatsheet'} onClick={() => setVizFormat('cheatsheet')} emoji="PNG" title="Cheat Sheet" subtitle="Readable poster" />
                    <SelectionTile active={vizFormat === 'flowchart'} onClick={() => setVizFormat('flowchart')} emoji="Flow" title="Flow" subtitle="Diagram" />
                    <SelectionTile active={vizFormat === 'dld'} onClick={() => setVizFormat('dld')} emoji="DLD" title="Circuit" subtitle="Logic" />
                  </div>
                )}

                {activeTab === 'plan' && (
                  <div className="rounded-2xl border-2 border-dashed bg-background p-4 text-sm font-semibold text-muted-foreground">
                    Plan mode will turn the source into a time-boxed revision route with checkpoints.
                  </div>
                )}
              </div>

              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Chat Session</h2>
                  <p className="text-sm font-semibold text-muted-foreground">Everything stays here: lectures, MCQs, visuals, reels, follow-ups.</p>
                </div>
                {isGenerating && (
                  <Badge variant="outline" className="gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {getVibeStatusCopy()} - {generationElapsed}s
                  </Badge>
                )}
              </div>

              <div className="relative">
                {isCommandMenuOpen && (
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-xl rounded-2xl border-2 bg-popover p-2 shadow-2xl">
                    <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Choose a tool</div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {CHAT_COMMANDS.map((command) => (
                        <button key={command.key} onClick={() => applyChatCommand(command)} className="rounded-xl p-3 text-left hover:bg-muted">
                          <span className="block text-sm font-black">@{command.key} {command.label}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{command.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border-2 bg-background p-2 shadow-sm">
                  <Textarea
                    value={explainInput}
                    onChange={(event) => handleChatInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitChatComposer();
                      }
                    }}
                    placeholder="Ask anything... type @ for Lecture, MCQs, Cheat Sheet, Reel, Plan"
                    className="min-h-[58px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                  />
                  <Button size="icon" className="h-12 w-12 rounded-xl" onClick={submitChatComposer} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(relatedSuggestions.length ? relatedSuggestions : (materialId ? documentFocusedSuggestions(file?.name) : SUGGESTED_TOPICS.map((item) => item.label))).slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      handleChatInputChange(String(suggestion));
                      if (!contentStream.length) setUserTopic(String(suggestion));
                    }}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>

              {isGenerating && (
                <div className="mt-4 rounded-2xl border bg-background p-3 text-sm font-bold text-muted-foreground shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    {getVibeStatusCopy()} - {generationElapsed}s
                  </div>
                </div>
              )}
            </Card>
        
        
        <div className="hidden grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full">
            <Card className={`overflow-hidden border-2 shadow-sm ${isEditingProfile ? 'ring-2 ring-primary/20' : ''}`}>
                <div className="flex items-center justify-between border-b bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <User className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Learning DNA</div>
                          <div className="text-lg font-black">Personalization engine</div>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" className="h-9 gap-2 px-3" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                        {isEditingProfile ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                        {isEditingProfile ? "Lock" : "Edit"}
                    </Button>
                </div>
                <div className="p-4">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Start with a strategy</Label>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {PROFILE_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              onClick={() => applyProfilePreset(preset)}
                              className="rounded-xl border-2 bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                            >
                              <span className="block text-sm font-black">{preset.label}</span>
                              <span className="mt-1 block text-[10px] font-bold uppercase leading-snug text-muted-foreground">{preset.description}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1fr_0.9fr]">
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Audience level</Label>
                            <div className="grid grid-cols-3 gap-2">
                              {EDU_LEVEL_OPTIONS.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => setEduLevel(item.id)}
                                  className={`rounded-xl border-2 p-3 text-left transition-all ${eduLevel === item.id ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-muted bg-card hover:border-primary/30"}`}
                                >
                                  <span className="block text-sm font-black">{item.label}</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                                {eduLevel === "school" ? "Grade" : eduLevel === "college" ? "Year" : "Major / field"}
                              </Label>
                              <Input
                                value={eduLevel === "school" ? grade : eduLevel === "college" ? collegeYear : major}
                                onChange={(event) => {
                                  if (eduLevel === "school") setGrade(event.target.value);
                                  else if (eduLevel === "college") setCollegeYear(event.target.value);
                                  else {
                                    setMajor(event.target.value);
                                    setProfileContext(event.target.value);
                                  }
                                }}
                                placeholder={eduLevel === "school" ? "10" : eduLevel === "college" ? "1st year" : "Computer Science"}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Course, exam, or role</Label>
                              <Input
                                value={profileContext}
                                onChange={(event) => {
                                  setProfileContext(event.target.value);
                                  if (eduLevel === "university") setMajor(event.target.value || "Computer Science");
                                }}
                                placeholder="DSA interview, biology exam, calculus"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {EXPERIENCE_OPTIONS.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setExperienceLevel(item.id)}
                                className={`rounded-xl border-2 p-3 text-left transition-all ${experienceLevel === item.id ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-muted bg-card hover:border-indigo-200"}`}
                              >
                                <span className="block text-sm font-black">{item.label}</span>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                              </button>
                            ))}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            {GOAL_OPTIONS.map((item) => (
                              <button
                                key={item.id}
                                onClick={() => setGoal(item.id)}
                                className={`rounded-xl border-2 p-3 text-left transition-all ${goal === item.id ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-muted bg-card hover:border-emerald-200"}`}
                              >
                                <span className="block text-sm font-black">{item.label}</span>
                                <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3 rounded-2xl border bg-muted/30 p-3">
                          <div>
                            <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              <span>Profile strength</span>
                              <span>{profileSpecificityScore}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-background">
                              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${profileSpecificityScore}%` }} />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Learning style</Label>
                            <div className="grid grid-cols-2 gap-2">
                              {LEARNING_STYLE_OPTIONS.map((item) => (
                                <button
                                  key={item.id}
                                  onClick={() => setLearningStyle(item.id)}
                                  className={`rounded-xl border-2 bg-card p-3 text-left transition-all ${learningStyle === item.id ? "border-amber-500 bg-amber-50 text-amber-700" : "border-muted hover:border-amber-200"}`}
                                >
                                  <span className="block text-sm font-black">{item.label}</span>
                                  <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.hint}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-xl bg-background p-3">
                            <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                              <Lightbulb className="h-3.5 w-3.5" />
                              What changes
                            </div>
                            <div className="space-y-2">
                              {profileImpact.map((impact) => (
                                <div key={impact} className="flex gap-2 text-xs font-semibold leading-snug text-foreground/80">
                                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                                  <span>{impact}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Button className="w-full rounded-xl" onClick={() => setIsEditingProfile(false)}>
                        Save learning DNA
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-2xl font-black capitalize">{activeExperienceLabel} {eduLevel}</div>
                          <div className="mt-1 text-sm font-semibold text-muted-foreground">{profileContext || major || "General learning"} - {activeGoalLabel}</div>
                        </div>
                        <div className="rounded-2xl bg-primary/10 px-4 py-3 text-center text-primary">
                          <div className="text-2xl font-black">{profileSpecificityScore}%</div>
                          <div className="text-[10px] font-black uppercase">Specific</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[activeStyleLabel, `${timeAvailable} min`, mood, eduLevel === "school" ? `grade ${grade}` : eduLevel === "college" ? `year ${collegeYear}` : major].filter(Boolean).map((chip) => (
                          <span key={chip} className="rounded-full border bg-muted/40 px-3 py-1 text-xs font-bold capitalize text-muted-foreground">{chip}</span>
                        ))}
                      </div>
                      <div className="rounded-2xl border bg-muted/30 p-4">
                        <div className="mb-3 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Next generation will</div>
                        <div className="grid gap-2">
                          {profileImpact.slice(0, 3).map((impact) => (
                            <div key={impact} className="flex gap-2 text-sm font-semibold leading-snug">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                              <span>{impact}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
            </Card>

            <Card className="border-2 p-0 flex flex-col h-full">
                <div className="p-4 bg-muted/30 border-b flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /><span className="font-bold text-xs uppercase">Mode & Settings</span></div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-4 p-1 bg-muted rounded-lg shrink-0">
                     {MODE_TABS.map((t) => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)} className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === t.id ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}>{t.label}</button>
                     ))}
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                     {activeTab === 'learn' && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <SelectionTile active={learnFormat === 'lecture'} onClick={() => setLearnFormat('lecture')} emoji="🎓" title="Lecture" subtitle="Deep Dive" />
                                <SelectionTile active={learnFormat === 'flashcards'} onClick={() => setLearnFormat('flashcards')} emoji="🗂️" title="Cards" subtitle="Memorize" />
                                <SelectionTile active={learnFormat === 'podcast'} onClick={() => setLearnFormat('podcast')} emoji="🎧" title="Podcast" subtitle="Listen" />
                                <SelectionTile active={learnFormat === 'reel'} onClick={() => setLearnFormat('reel')} emoji="Re" title="Reel Learning" subtitle="Video + captions" />
                            </div>
                            <div className="rounded-2xl border bg-muted/30 p-3 space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><Timer className="h-3.5 w-3.5" /> Time Budget</div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {[5, 10, 15, 30, 45].map(m => (
                                  <button
                                    key={m}
                                    onClick={() => setTimeAvailable(m.toString())}
                                    className={`rounded-xl border px-2 py-2 text-xs font-black transition-all ${timeAvailable === m.toString() ? "border-blue-500 bg-blue-600 text-white shadow-md" : "border-border bg-white hover:border-blue-200"}`}
                                  >
                                    {m}m
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-2xl border bg-muted/30 p-3 space-y-3">
                              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground"><Smile className="h-3.5 w-3.5" /> Teaching Mood</div>
                              <div className="grid grid-cols-2 gap-2">
                                {[
                                  { id: "enthusiastic", label: "Hype", desc: "high-energy" },
                                  { id: "strict", label: "Strict", desc: "direct answers" },
                                  { id: "funny", label: "Funny", desc: "smart jokes" },
                                  { id: "professional", label: "Pro", desc: "clean tone" },
                                  { id: "encouraging", label: "Support", desc: "patient coach" },
                                  { id: "socratic", label: "Question", desc: "asks back" },
                                ].map(item => (
                                  <button
                                    key={item.id}
                                    onClick={() => setMood(item.id)}
                                    className={`rounded-xl border-2 p-3 text-left transition-all ${mood === item.id ? "border-purple-500 bg-purple-50 text-purple-700 shadow-sm" : "border-muted bg-white hover:border-purple-200"}`}
                                  >
                                    <span className="block text-sm font-black">{item.label}</span>
                                    <span className="text-[10px] font-bold uppercase text-muted-foreground">{item.desc}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                        </>
                     )}
                     {activeTab === 'quiz' && (
                       <div className="space-y-3">
                         <div className="grid grid-cols-2 gap-2">
                            <SelectionTile active={quizFormat === 'mcq'} onClick={() => setQuizFormat('mcq')} emoji="?" title="MCQ" subtitle="10 Questions" />
                            <SelectionTile active={quizFormat === 'rapid'} onClick={() => setQuizFormat('rapid')} emoji="!" title="Rapid" subtitle="Fast" />
                         </div>
                         {quizFormat === 'mcq' && (
                           <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => setQuizDifficulty("basic")} className={`rounded-xl border-2 p-4 text-left transition-all ${quizDifficulty === "basic" ? "border-green-500 bg-green-50 text-green-700" : "border-muted bg-card"}`}>
                               <span className="block text-sm font-black">Basic</span>
                               <span className="text-[10px] font-bold uppercase text-muted-foreground">Foundation checks</span>
                             </button>
                             <button onClick={() => setQuizDifficulty("advanced")} className={`rounded-xl border-2 p-4 text-left transition-all ${quizDifficulty === "advanced" ? "border-red-500 bg-red-50 text-red-700" : "border-muted bg-card"}`}>
                               <span className="block text-sm font-black">Advanced</span>
                               <span className="text-[10px] font-bold uppercase text-muted-foreground">Tricky scenarios</span>
                             </button>
                           </div>
                         )}
                       </div>
                     )}
                     {activeTab === 'visualize' && (
                       <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                          <SelectionTile active={vizFormat === 'flowchart'} onClick={() => setVizFormat('flowchart')} emoji="🔀" title="Flow" subtitle="Process" />
                          <SelectionTile active={vizFormat === 'dld'} onClick={() => setVizFormat('dld')} emoji="⚡" title="Circuit" subtitle="DLD" />
                          <SelectionTile active={vizFormat === 'cheatsheet'} onClick={() => setVizFormat('cheatsheet')} emoji="IMG" title="Cheat Sheet" subtitle="Visual poster" />
                       </div>
                     )}
                     {activeTab === 'plan' && <SelectionTile active={true} onClick={()=>{}} emoji="🗺️" title="Roadmap" subtitle="Path" />}
                  </div>
                </div>
            </Card>
        </div>

        <Card id="topic-source" className="hidden border-2 p-0 flex-col w-full mb-12 overflow-hidden shadow-sm scroll-mt-24">
            <div className="p-4 bg-muted/30 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-bold text-xs uppercase">Topic Source</span>
            </div>
            <div className="p-6 flex flex-col gap-6">
                <Label htmlFor="file" className={`p-6 rounded-xl border-2 border-dashed text-center flex flex-col justify-center items-center cursor-pointer hover:bg-muted/50 transition-all ${isUploading ? 'bg-primary/5' : ''}`}>
                    <div className="flex flex-col items-center gap-2">
                        {isUploading ? <Loader2 className="animate-spin w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                        <span className="text-sm font-semibold text-foreground">{file ? file.name : "Upload PDF, TXT, or DOCX"}</span>
                        <span className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                          Files are stored privately in R2 and indexed in Pinecone. {STORAGE_LIMIT_COPY}
                        </span>
                    </div>
                    <Input id="file" type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={handleFileUpload} />
                    {materialId && <div className="mt-3 flex items-center gap-2 text-xs bg-green-50 text-green-700 p-2 rounded border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> Vector Index Active <XCircle className="w-3 h-3 ml-auto cursor-pointer" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setMaterialId(null); setFile(null); }} />
                    </div>}
                </Label>
                
                {/* Quick Topic Chips */}
                <div className="flex flex-wrap gap-2">
                    {SUGGESTED_TOPICS.map((st) => (
                        <button
                            key={st.topic}
                            onClick={() => { setUserTopic(st.topic); }}
                            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:scale-105 hover:shadow-sm ${
                                userTopic.toLowerCase() === st.topic.toLowerCase()
                                    ? 'bg-primary/10 border-primary/40 text-primary'
                                    : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                        >
                            {st.emoji} {st.label}
                        </button>
                    ))}
                </div>

                <Textarea 
                    value={userTopic} 
                    onChange={e => setUserTopic(e.target.value)} 
                    placeholder={materialId ? "Ask about the uploaded file, e.g. Explain this, summarize it, make quiz questions..." : "Type a topic, e.g. Binary Search, Photosynthesis, Newton's Laws..."} 
                    className="resize-none min-h-[140px] text-lg bg-slate-50/30" 
                />
            </div>
        </Card>

        <div className="hidden justify-center w-full">
            <Button onClick={() => handleGenerate(userTopic)} disabled={isGenerating} className="w-full md:w-1/2 h-14 text-lg shadow-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all rounded-2xl">
                {isGenerating ? <Loader2 className="animate-spin mr-3" /> : <Sparkles className="mr-3 fill-white" />} Generate
            </Button>
        </div>

        <Card className="min-h-[600px] flex flex-col bg-slate-50/80 dark:bg-slate-900/50 backdrop-blur-md border-2 shadow-2xl overflow-hidden relative rounded-2xl">
            <div className="p-4 border-b bg-white/50 flex items-center justify-between gap-6 w-full">
               <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${(!isGenerating && contentStream.length > 0) ? 'bg-green-500' : 'bg-slate-300'}`} />
                  <span className="font-bold text-sm uppercase tracking-widest text-muted-foreground">{activeTab} Mode</span>
               </div>
               
               <div className="flex items-center gap-4">
                  {activeTab === 'learn' && contentStream.length > 0 && learnFormat === 'lecture' && (
                     <div className="flex bg-muted/80 rounded-3xl p-1.5 border border-muted shadow-inner">
                         {['classic', 'modern', 'neo-brutalist'].map((s) => (
                             <button
                                 key={s}
                                 onClick={() => setViewStyle(s as any)}
                                 className={`px-4 py-1.5 text-xs font-black uppercase rounded-xl transition-all ${viewStyle === s ? 'bg-white shadow text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                             >
                                 {s}
                             </button>
                         ))}
                     </div>
                  )}

                  {contentStream.some(b => b.type === 'text') && (
                     <Button variant="outline" size="sm" onClick={handleReadMainTextAloud} className={`h-9 px-3 rounded-xl gap-2 font-bold text-xs uppercase ${isSpeaking ? 'bg-red-50 text-red-600 border-red-200' : ''}`}>
                         {isSpeaking ? <Square className="w-3.5 h-3.5 fill-current" /> : <Volume2 className="w-3.5 h-3.5" />}
                         {isSpeaking ? "Stop" : "Read Aloud"}
                     </Button>
                  )}
               </div>
               
               {isGenerating && (
                 <span className="absolute top-4 right-4 text-xs text-muted-foreground animate-pulse font-mono tracking-tighter">
                   {getVibeStatusCopy()} - {generationElapsed}s
                 </span>
               )}
            </div>

            <div className="flex-1 p-8 lg:p-12 overflow-y-auto relative bg-white/40 dark:bg-black/20">
               {!contentStream.length && !diagramCode && !roadmapData.length && !isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                     {historicalData ? (
                        <div className="max-w-xl bg-card border-2 p-8 rounded-3xl shadow-xl space-y-4 animate-in fade-in zoom-in-95 duration-500 text-left">
                           <div className="flex items-center gap-3 border-b pb-3 text-primary">
                              <History className="w-5 h-5" />
                              <h3 className="font-black uppercase tracking-wider text-sm">Previous Session Metrics</h3>
                           </div>
                           <div>
                              <Label className="text-xs uppercase text-muted-foreground font-bold">Last Studied Area</Label>
                              <p className="text-lg font-black text-foreground capitalize">{historicalData.last_topic}</p>
                           </div>
                           {historicalData.weak_areas?.length > 0 && (
                              <div>
                                 <Label className="text-xs uppercase text-red-500 font-bold">Identified Weak Focus Points</Label>
                                 <ul className="list-disc pl-5 text-sm text-muted-foreground mt-1 space-y-0.5">
                                    {historicalData.weak_areas.map((w: string, i: number) => <li key={i}>{w}</li>)}
                                 </ul>
                              </div>
                           )}
                           {historicalData.suggestions?.length > 0 && (
                              <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
                                 <Label className="text-xs uppercase text-primary font-bold flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5" /> Study Target Suggestions</Label>
                                 <p className="text-sm mt-1 text-foreground/90 font-medium">{historicalData.suggestions[0]}</p>
                              </div>
                           )}
                        </div>
                     ) : (
                        <div className="flex flex-col items-center gap-6 max-w-lg">
                           <BrainCircuit className="w-24 h-24 stroke-1 text-slate-300 mb-2" />
                           <p className="text-2xl font-bold text-slate-600">Ready to Generate</p>
                           <p className="text-sm text-muted-foreground max-w-md">Choose a mode, pick your settings, then enter a topic above or click one of these to get started:</p>
                           <div className="flex flex-wrap justify-center gap-2">
                              {SUGGESTED_TOPICS.map((st) => (
                                  <button
                                      key={st.topic}
                                      onClick={() => { setUserTopic(st.topic); handleGenerate(st.topic); }}
                                      className="px-4 py-2 rounded-full text-sm font-semibold bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 hover:scale-105 transition-all cursor-pointer"
                                  >
                                      {st.emoji} {st.label}
                                  </button>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               )}
               {activeTab === 'visualize' && diagramCode && <div className="flex flex-col items-center"><MermaidChart chart={diagramCode} /><Button variant="ghost" className="mt-4 text-xs" onClick={() => navigator.clipboard.writeText(diagramCode)}><Share2 className="w-3 h-3 mr-2" /> Copy Code</Button></div>}
               {activeTab === 'plan' && roadmapData.length > 0 && (
                  <div className="space-y-4 border-l-4 border-indigo-500/20 ml-6 pl-8 py-4">
                     {roadmapData.map((step, idx) => (
                        <div key={idx} className="relative group"><div className="absolute -left-[45px] top-1 w-6 h-6 rounded-full bg-indigo-600 border-4 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold">{idx+1}</div><h3 className="font-bold text-xl group-hover:text-indigo-600 transition-colors">{step.title} <span className="text-xs font-normal bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full ml-2">{step.time}</span></h3><p className="text-base text-muted-foreground mt-1 leading-relaxed">{step.desc}</p></div>
                     ))}
                  </div>
               )}
               {contentStream.map((block, idx) => (
                  <div key={idx} className={`mb-12 ${block.role === 'user' ? 'flex justify-end' : ''}`}>
                     {block.role === 'user' ? <div className="bg-primary text-primary-foreground px-6 py-4 rounded-[2rem] rounded-tr-none text-lg inline-block max-w-[80%] shadow-lg">{block.data}</div> : (
                         <div className="w-full animate-in fade-in slide-in-from-bottom-6 duration-1000 relative">
                            {block.type === 'quiz-interactive' && <QuizBlock rawData={block.data} onRetry={() => handleGenerate(userTopic)} />}
                            {block.type === 'quiz-rapid' && <RapidFireBlock rawData={block.data} onRetry={() => handleGenerate(userTopic)} />}
                            {block.type === 'visual-aids' && <VisualAidsBlock aids={block.data} />}
                            {block.type === 'podcast' && (
                               <div className="bg-black text-white p-12 rounded-[4rem] shadow-2xl max-w-3xl mx-auto border border-white/10 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black z-0" />
                                  <div className="relative z-10 flex flex-col items-center justify-center mb-10 mt-4"><div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 blur-[25px] absolute transition-all duration-300 ${isSpeaking && !isPaused ? 'scale-110 opacity-80 animate-pulse' : 'scale-100 opacity-40'}`} /><div className={`w-32 h-32 rounded-full bg-black border-2 border-white/20 flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-md`}><Headphones className={`w-14 h-14 text-white transition-all ${isSpeaking && !isPaused ? 'animate-bounce' : ''}`} /></div></div>
                                  <div className="relative z-10 min-h-[140px] flex items-center justify-center text-center px-6 mb-8"><p className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-relaxed transition-all">{currentSentence || "Ready to Start..."}</p></div>
                                  <div className="relative z-10 flex flex-col items-center justify-center gap-4">
                                    <div className="flex flex-wrap items-center justify-center gap-3">
                                      <Select value={preferredTtsProvider} onValueChange={(value) => setPreferredTtsProvider(value as TtsProvider)}>
                                        <SelectTrigger className="h-10 w-[130px] bg-white/10 border-white/20 text-white text-sm rounded-full"><Volume2 className="w-4 h-4 mr-2" /> <SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-black border-white/20 text-white">
                                          <SelectItem value="browser">Browser</SelectItem>
                                          <SelectItem value="deepgram">Deepgram Aura</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      {preferredTtsProvider === "deepgram" && (
                                        <Select value={selectedTtsVoice} onValueChange={setSelectedTtsVoice}>
                                          <SelectTrigger className="h-10 w-[160px] bg-white/10 border-white/20 text-white text-sm rounded-full"><Mic className="w-4 h-4 mr-2" /> <SelectValue /></SelectTrigger>
                                          <SelectContent className="bg-black border-white/20 text-white">
                                            {DEEPGRAM_AURA_VOICES.map((voice) => (
                                              <SelectItem key={voice.id} value={voice.id}>{voice.label} - {voice.description}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      )}
                                      <Select value={playbackSpeed} onValueChange={changeSpeed}>
                                        <SelectTrigger className="h-10 w-[100px] bg-white/10 border-white/20 text-white text-sm rounded-full"><Gauge className="w-4 h-4 mr-2" /> <SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-black border-white/20 text-white"><SelectItem value="0.95">0.95x</SelectItem><SelectItem value="1.15">1.15x</SelectItem><SelectItem value="1.3">1.3x</SelectItem></SelectContent>
                                      </Select>
                                    </div>
                                    <div className="flex items-center justify-center gap-6">
                                      <Button size="icon" className="h-16 w-16 rounded-full bg-white text-black hover:bg-gray-200" onClick={togglePlayPause}>{isSpeaking && !isPaused ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}</Button>
                                      <Button size="icon" variant="ghost" className="h-16 w-16 rounded-full text-white/50 hover:text-white" onClick={handleStop}><Square className="w-6 h-6 fill-current" /></Button>
                                    </div>
                                  </div>
                               </div>
                            )}
                            {block.type === 'reel' && (() => {
                              const reel = block.data as ReelPayload;
                              const activeSegment = reel.segments[currentReelSegment] || reel.segments[0];
                              const activeVideo = reel.videoUrls[currentReelVideo % reel.videoUrls.length];
                              const captionSourceWords = activeCaptionWords.length ? activeCaptionWords : activeSegment?.text.split(/\s+/) || [];
                              const captionWindow = getCaptionWindow(captionSourceWords, activeCaptionWord);
                              return (
                                <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr] items-start">
                                  <div ref={reelStageRef} className="relative mx-auto w-full max-w-[420px] aspect-[9/16] overflow-hidden rounded-[2rem] bg-black shadow-2xl border border-white/10 fullscreen:max-w-none fullscreen:h-screen fullscreen:w-screen fullscreen:rounded-none">
                                    {!videoHadError && activeVideo ? (
                                      <video
                                        ref={reelVideoRef}
                                        key={activeVideo}
                                        src={activeVideo}
                                        className="absolute inset-0 h-full w-full object-cover"
                                        muted
                                        playsInline
                                        onLoadedData={() => {
                                          if (isReelVideoPlaying) reelVideoRef.current?.play().catch(() => {});
                                        }}
                                        onEnded={() => {
                                          setVideoHadError(false);
                                          if (isReelVideoPlaying) setCurrentReelVideo((value) => (value + 1) % reel.videoUrls.length);
                                        }}
                                        onError={() => {
                                          setVideoHadError(false);
                                          setCurrentReelVideo((value) => (value + 1) % reel.videoUrls.length);
                                        }}
                                      />
                                    ) : (
                                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.55),transparent_30%),linear-gradient(160deg,#020617,#111827_45%,#312e81)]" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/75" />
                                    <div className="absolute left-4 right-4 top-4 flex items-center justify-between text-white">
                                      <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-md">
                                        <Clapperboard className="h-4 w-4" />
                                        <span className="text-xs font-black uppercase tracking-wider">Reel Learning</span>
                                      </div>
                                      <div className="rounded-full bg-black/45 px-3 py-1.5 text-xs font-bold backdrop-blur-md">
                                        {isTtsLoading ? "Loading voice" : isReelVideoPlaying ? "Synced BG" : "BG waits"}
                                      </div>
                                    </div>
                                    <Button size="icon" variant="secondary" className="absolute right-4 top-16 z-20 h-10 w-10 rounded-full bg-black/45 text-white hover:bg-black/70" onClick={toggleReelFullscreen}>
                                      {isReelFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                                    </Button>
                                    <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 text-center">
                                      <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-black shadow-lg">
                                        <Radio className="h-3.5 w-3.5" />
                                        {activeSegment?.speaker === "B" ? "Speaker B" : "Speaker A"}
                                      </div>
                                      <div className="mx-auto max-w-full rounded-2xl bg-black/35 px-4 py-3 backdrop-blur-sm">
                                        <p className="whitespace-nowrap text-2xl font-black leading-tight text-white [text-shadow:0_3px_0_rgba(0,0,0,0.8)]">
                                          {captionWindow.words.map((word, wordIndex) => {
                                            const absoluteWordIndex = captionWindow.start + wordIndex;
                                            return (
                                            <span
                                              key={`${word}-${absoluteWordIndex}`}
                                              className={`mx-0.5 inline-block transition-all duration-150 ${absoluteWordIndex === activeCaptionWord ? "scale-110 text-yellow-300" : "text-white"}`}
                                            >
                                              {word}
                                            </span>
                                          )})}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="absolute bottom-5 left-0 right-0 flex justify-center gap-3">
                                      <Button size="icon" variant="secondary" className="h-11 w-11 rounded-full bg-white/90 text-black hover:bg-white" onClick={() => { setVideoHadError(false); setCurrentReelVideo((value) => (value + 1) % reel.videoUrls.length); }}>
                                        <RotateCcw className="h-4 w-4" />
                                      </Button>
                                      <Button size="icon" className="h-14 w-14 rounded-full bg-white text-black hover:bg-white/90" onClick={() => handlePlayReel(reel)}>
                                        {isTtsLoading ? <Loader2 className="h-7 w-7 animate-spin" /> : isSpeaking && !isPaused ? <Pause className="h-7 w-7 fill-current" /> : <Play className="ml-0.5 h-7 w-7 fill-current" />}
                                      </Button>
                                      <Button size="icon" variant="secondary" className="h-11 w-11 rounded-full bg-white/90 text-black hover:bg-white" onClick={handleStop}>
                                        <Square className="h-4 w-4 fill-current" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-4 rounded-2xl border-2 bg-card p-5 shadow-sm">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Captions className="h-5 w-5" />
                                      </div>
                                      <div>
                                        <h3 className="text-xl font-black">Reel lesson: {reel.topic}</h3>
                                        <p className="text-xs font-semibold text-muted-foreground">Dialogue audio only, captions synced over your background clips.</p>
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                      <div className="rounded-xl bg-muted/60 p-3">
                                        <div className="text-lg font-black">{reel.segments.length}</div>
                                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Lines</div>
                                      </div>
                                      <div className="rounded-xl bg-muted/60 p-3">
                                        <div className="text-lg font-black capitalize">{ttsProvider}</div>
                                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Voice</div>
                                      </div>
                                      <div className="rounded-xl bg-muted/60 p-3">
                                        <div className="text-lg font-black">{playbackSpeed}x</div>
                                        <div className="text-[10px] font-bold uppercase text-muted-foreground">Speed</div>
                                      </div>
                                    </div>
                                    <div className="grid gap-3 sm:grid-cols-2">
                                      <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-muted-foreground">TTS Engine</Label>
                                        <Select value={preferredTtsProvider} onValueChange={(value) => setPreferredTtsProvider(value as TtsProvider)}>
                                          <SelectTrigger className="h-10"><Volume2 className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="browser">Browser</SelectItem>
                                            <SelectItem value="deepgram">Deepgram Aura</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-2">
                                        <Label className="text-xs font-black uppercase text-muted-foreground">Aura Voice</Label>
                                        <Select value={selectedTtsVoice} onValueChange={setSelectedTtsVoice} disabled={preferredTtsProvider !== "deepgram"}>
                                          <SelectTrigger className="h-10"><Mic className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                          <SelectContent>
                                            {DEEPGRAM_AURA_VOICES.map((voice) => (
                                              <SelectItem key={voice.id} value={voice.id}>{voice.label} - {voice.description}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <Label className="text-xs font-black uppercase text-muted-foreground">Playback Speed</Label>
                                      <Select value={playbackSpeed} onValueChange={setPlaybackSpeed}>
                                        <SelectTrigger className="h-10"><Gauge className="mr-2 h-4 w-4 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="1.05">1.05x Natural</SelectItem>
                                          <SelectItem value="1.15">1.15x Reel Energy</SelectItem>
                                          <SelectItem value="1.3">1.3x Shorts Pace</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                                      {reel.segments.map((segment, segmentIndex) => (
                                        <button
                                          key={`${segment.speaker}-${segmentIndex}`}
                                          onClick={() => {
                                            setCurrentReelSegment(segmentIndex);
                                            setCurrentSentence(segment.text);
                                            setActiveCaptionWords(segment.text.split(/\s+/));
                                            setActiveCaptionWord(0);
                                          }}
                                          className={`w-full rounded-xl border p-3 text-left text-sm transition-all ${segmentIndex === currentReelSegment ? "border-primary bg-primary/5" : "bg-muted/20 hover:bg-muted/50"}`}
                                        >
                                          <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-primary">Speaker {segment.speaker}</span>
                                          <span className="font-semibold leading-relaxed">{segment.text}</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                            {block.type === 'cards' && (
                               <div className="flex flex-col items-center justify-center p-14 bg-white dark:bg-slate-800 rounded-[3rem] border shadow-2xl max-w-4xl mx-auto">
                                  <div className="text-3xl font-bold text-center leading-relaxed">
                                     <SmartRender text={block.data[currentCard] || block.data[0]} />
                                  </div>
                                  <div className="flex gap-8 mt-12">
                                     <Button
                                       variant="outline"
                                       className="h-14 w-20 rounded-2xl"
                                       onClick={() => setCurrentCard(c => Math.max(0, c - 1))}
                                       disabled={currentCard === 0}
                                     >
                                       <ChevronLeft className="w-8 h-8" />
                                     </Button>
                                     <span className="text-xl font-mono pt-3 text-muted-foreground">
                                       {Math.min(currentCard + 1, block.data.length)} / {block.data.length}
                                     </span>
                                     <Button
                                       variant="outline"
                                       className="h-14 w-20 rounded-2xl"
                                       onClick={() => setCurrentCard(c => Math.min(block.data.length - 1, c + 1))}
                                       disabled={currentCard >= block.data.length - 1}
                                     >
                                       <ChevronRight className="w-8 h-8" />
                                     </Button>
                                  </div>
                               </div>
                            )}
                            {block.type === 'text' && (
                               <LectureWrapper style={viewStyle}>
                                  <TypewriterSmartRender text={block.data} animate={Boolean(block.animate)} />
                                </LectureWrapper>
                            )}
                         </div>
                     )}
                  </div>
               ))}
               {/* Related Suggestions */}
               {relatedSuggestions.length > 0 && !isGenerating && (
                  <div className="mt-8 pt-6 border-t border-dashed border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                     <p className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">🔗 Explore Related Topics</p>
                     <div className="flex flex-wrap gap-2">
                        {relatedSuggestions.map((suggestion, idx) => (
                           <button
                              key={idx}
                              onClick={() => {
                                if (contentStream.length > 0) {
                                  handleExplainMore(suggestion);
                                } else {
                                  setUserTopic(suggestion);
                                  handleGenerate(suggestion);
                                }
                              }}
                              className="px-4 py-2 rounded-full text-sm font-semibold bg-primary/5 border border-primary/20 text-primary hover:bg-primary/10 hover:scale-105 transition-all cursor-pointer"
                           >
                              {suggestion}
                           </button>
                        ))}
                     </div>
                  </div>
               )}
               <div ref={contentEndRef} />
            </div>

            <div className="border-t bg-white/80 p-4 backdrop-blur-md dark:bg-slate-950/80">
              {isGenerating && (
                <div className="mb-3 rounded-2xl border bg-background p-3 text-sm font-bold text-muted-foreground shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                    </span>
                    {getVibeStatusCopy()} - {generationElapsed}s
                  </div>
                </div>
              )}

              <div className="relative">
                {isCommandMenuOpen && (
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-xl rounded-2xl border-2 bg-popover p-2 shadow-2xl">
                    <div className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">Choose a tool</div>
                    <div className="grid gap-1 sm:grid-cols-2">
                      {CHAT_COMMANDS.map((command) => (
                        <button key={command.key} onClick={() => applyChatCommand(command)} className="rounded-xl p-3 text-left hover:bg-muted">
                          <span className="block text-sm font-black">@{command.key} {command.label}</span>
                          <span className="text-xs font-semibold text-muted-foreground">{command.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2 rounded-2xl border-2 bg-background p-2 shadow-sm">
                  <Textarea
                    value={explainInput}
                    onChange={(event) => handleChatInputChange(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submitChatComposer();
                      }
                    }}
                    placeholder="Ask anything... type @ for Lecture, MCQs, Cheat Sheet, Reel, Plan"
                    className="min-h-[58px] resize-none border-0 bg-transparent text-base shadow-none focus-visible:ring-0"
                  />
                  <Button size="icon" className="h-12 w-12 rounded-xl" onClick={submitChatComposer} disabled={isGenerating}>
                    {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {(relatedSuggestions.length ? relatedSuggestions : (materialId ? documentFocusedSuggestions(file?.name) : SUGGESTED_TOPICS.map((item) => item.label))).slice(0, 6).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      handleChatInputChange(String(suggestion));
                      if (!contentStream.length) setUserTopic(String(suggestion));
                    }}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-bold text-muted-foreground hover:border-primary/40 hover:text-primary"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
        </Card>
          </section>
        </div>
        
        {/* INTERACTION AND RUNTIME TRAYS AT THE BOTTOM */}
        {contentStream.length > 0 && (
          <div className="hidden max-w-4xl mx-auto w-full space-y-4 animate-in slide-in-from-bottom-4 duration-500">
             {/* 1. Conversational Deep Explanation Follow-Up Box */}
             <div className="flex items-center gap-3 bg-card border-2 p-3 rounded-2xl shadow-lg group focus-within:border-primary transition-all">
                <Input 
                  value={explainInput} 
                  onChange={e => setExplainInput(e.target.value)} 
                  placeholder="Ask a follow up question or seek deep explanation..." 
                  className="border-0 shadow-none focus-visible:ring-0 text-base flex-1 bg-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && handleExplainMore()}
                />
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-xl bg-primary hover:bg-primary/90 shadow transition-transform group-hover:scale-105" 
                  onClick={() => handleExplainMore()}
                  disabled={isGenerating || !explainInput.trim()}
                >
                   <Send className="w-5 h-5 text-primary-foreground" />
                </Button>
             </div>

             {/* 2. Brand New Topic Request Box */}
             <div className="flex items-center gap-3 bg-muted/60 border-2 border-dashed p-3 rounded-2xl group focus-within:border-indigo-500 transition-all">
                <Input 
                  value={bottomNewTopic} 
                  onChange={e => setBottomNewTopic(e.target.value)} 
                  placeholder="Or initialize a completely brand new topic from scratch here..." 
                  className="border-0 shadow-none focus-visible:ring-0 text-base flex-1 bg-transparent placeholder:text-muted-foreground/70"
                  onKeyDown={(e) => e.key === 'Enter' && handleBottomTriggerNewTopic()}
                />
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow text-white transition-transform group-hover:scale-105" 
                  onClick={handleBottomTriggerNewTopic}
                  disabled={isGenerating || !bottomNewTopic.trim()}
                >
                   <PlusCircle className="w-5 h-5" />
                </Button>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Quick structural polyfill injection helper item
const History = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
);

export default Transform;
