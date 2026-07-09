import {
  Atom,
  BookOpen,
  BrainCircuit,
  Calculator,
  FileText,
  FlaskConical,
  Headphones,
  History,
  Image,
  Layers,
  Map,
  MessageSquare,
  Mic,
  Music,
  Palette,
  PenTool,
  Share2,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type SectionIllustrationType =
  | "ai-chat"
  | "classroom"
  | "hero-learning"
  | "pathfinder"
  | "podcast"
  | "quiz"
  | "sessions"
  | "storage-file"
  | "subject-arts"
  | "subject-biology"
  | "subject-computer-science"
  | "subject-history"
  | "subject-math"
  | "subject-physics"
  | "visual-learning"
  | "visualizer";

type SectionIllustrationProps = {
  type: SectionIllustrationType;
  size?: "xs" | "sm" | "md" | "lg";
  floating?: boolean;
  className?: string;
};

const sizeClasses = {
  xs: "h-12 w-12",
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-56 w-56",
};

const iconSizes = {
  xs: "h-5 w-5",
  sm: "h-7 w-7",
  md: "h-10 w-10",
  lg: "h-20 w-20",
};

const config: Record<SectionIllustrationType, {
  icon: typeof Sparkles;
  accent: string;
  soft: string;
}> = {
  "ai-chat": { icon: MessageSquare, accent: "text-blue-500", soft: "from-blue-100 to-indigo-100" },
  classroom: { icon: Mic, accent: "text-rose-500", soft: "from-rose-100 to-orange-100" },
  "hero-learning": { icon: Sparkles, accent: "text-violet-500", soft: "from-violet-100 to-blue-100" },
  pathfinder: { icon: Map, accent: "text-emerald-500", soft: "from-emerald-100 to-teal-100" },
  podcast: { icon: Headphones, accent: "text-cyan-500", soft: "from-cyan-100 to-sky-100" },
  quiz: { icon: BrainCircuit, accent: "text-amber-500", soft: "from-amber-100 to-yellow-100" },
  sessions: { icon: Layers, accent: "text-violet-500", soft: "from-violet-100 to-fuchsia-100" },
  "storage-file": { icon: FileText, accent: "text-slate-500", soft: "from-slate-100 to-zinc-100" },
  "subject-arts": { icon: Palette, accent: "text-pink-500", soft: "from-pink-100 to-rose-100" },
  "subject-biology": { icon: FlaskConical, accent: "text-green-500", soft: "from-green-100 to-emerald-100" },
  "subject-computer-science": { icon: Zap, accent: "text-indigo-500", soft: "from-indigo-100 to-blue-100" },
  "subject-history": { icon: History, accent: "text-orange-500", soft: "from-orange-100 to-amber-100" },
  "subject-math": { icon: Calculator, accent: "text-blue-500", soft: "from-blue-100 to-cyan-100" },
  "subject-physics": { icon: Atom, accent: "text-purple-500", soft: "from-purple-100 to-indigo-100" },
  "visual-learning": { icon: BookOpen, accent: "text-red-500", soft: "from-red-100 to-pink-100" },
  visualizer: { icon: Share2, accent: "text-violet-500", soft: "from-violet-100 to-cyan-100" },
};

export const SectionIllustration = ({
  type,
  size = "md",
  floating = false,
  className,
}: SectionIllustrationProps) => {
  const item = config[type] || config["hero-learning"];
  const Icon = item.icon;

  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center rounded-[1.35rem] bg-gradient-to-br shadow-sm ring-1 ring-white/50",
        item.soft,
        sizeClasses[size],
        floating && "animate-float",
        className,
      )}
      aria-hidden="true"
    >
      <div className="absolute inset-2 rounded-[1rem] bg-white/55" />
      <Icon className={cn("relative z-10 drop-shadow-sm", item.accent, iconSizes[size])} />
      {size === "lg" && (
        <>
          <PenTool className="absolute bottom-8 left-8 h-8 w-8 text-white/80" />
          <Image className="absolute right-8 top-8 h-8 w-8 text-white/80" />
          <Music className="absolute bottom-10 right-10 h-7 w-7 text-white/75" />
        </>
      )}
    </div>
  );
};
