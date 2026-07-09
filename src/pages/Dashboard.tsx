import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BookOpen,
  MessageSquare,
  BrainCircuit,
  Video,
  Search,
  Mic,
  Map,
  Share2,
  Headphones,
  Sparkles,
  ArrowRight,
  PlayCircle,
  Loader2,
  GraduationCap,
  NotebookPen,
  Lightbulb,
  Atom,
  Calculator,
  PenTool,
  Bot,
  Rocket,
} from "lucide-react";
import { SUBJECTS_LIST } from "@/data/subjectContent";
import { VibeSessionsCard } from "@/components/dashboard/VibeSessionsCard";
import { StorageLibraryCard } from "@/components/dashboard/StorageLibraryCard";
import { createSession } from "@/lib/sessionsApi";
import { useProfileSummary } from "@/hooks/useProfileSummary";

// Study/AI-themed icons floating in the hero, one at a time, no card or
// container behind them — just the icon and a soft ambient color glow.
const HERO_SHOWCASE_ICONS = [
  { icon: BrainCircuit, color: "text-violet-500", glow: "bg-violet-400" },
  { icon: GraduationCap, color: "text-blue-500", glow: "bg-blue-400" },
  { icon: BookOpen, color: "text-emerald-500", glow: "bg-emerald-400" },
  { icon: NotebookPen, color: "text-amber-500", glow: "bg-amber-400" },
  { icon: Lightbulb, color: "text-yellow-500", glow: "bg-yellow-400" },
  { icon: Atom, color: "text-cyan-500", glow: "bg-cyan-400" },
  { icon: Calculator, color: "text-rose-500", glow: "bg-rose-400" },
  { icon: PenTool, color: "text-indigo-500", glow: "bg-indigo-400" },
  { icon: Bot, color: "text-fuchsia-500", glow: "bg-fuchsia-400" },
  { icon: Rocket, color: "text-orange-500", glow: "bg-orange-400" },
];
const HERO_SHOWCASE_INTERVAL_MS = 2000;

const HeroIconShowcase = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_SHOWCASE_ICONS.length);
    }, HERO_SHOWCASE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  const current = HERO_SHOWCASE_ICONS[index];
  const Icon = current.icon;

  return (
    <motion.div
      animate={{ y: [0, -14, 0] }}
      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      className="relative hidden h-72 items-center justify-center lg:flex"
    >
      <div className={`absolute h-56 w-56 rounded-full opacity-25 blur-3xl transition-colors duration-700 ${current.glow}`} />
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.7, rotate: 8 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="relative"
        >
          <Icon className={`h-40 w-40 ${current.color} drop-shadow-2xl`} strokeWidth={1.5} />
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  // Shared store (same one Profile.tsx writes to) — the "Welcome, X" name
  // here now stays in sync with whatever the user last saved, without its
  // own separate Supabase fetch.
  const { fullName } = useProfileSummary();
  const [isStartingSession, setIsStartingSession] = useState(false);

  const withTransformGuide = (path: string) => {
    if (!path.startsWith("/transform")) return path;
    return `${path}${path.includes("?") ? "&" : "?"}guide=1`;
  };

  const openDestination = (path: string, label: string) => {
    toast.info(`Opening ${label}...`, { duration: 1200 });
    navigate(withTransformGuide(path));
  };

  // "Start Exploring" now creates a real Vibe Session up front (instead of
  // just opening a session-less chat) so it shows up immediately in Vibe
  // Sessions / Recent below, the same as clicking "New" there would.
  const handleStartExploring = async () => {
    if (isStartingSession) return;
    setIsStartingSession(true);
    try {
      const session = await createSession("New Session");
      navigate(`/transform?mode=learn&session=${session.id}&guide=1`);
    } catch {
      toast.error("Could not start a new session. Opening the tutor without one.");
      navigate(withTransformGuide("/transform?mode=learn"));
    } finally {
      setIsStartingSession(false);
    }
  };


  const firstName = fullName ? fullName.split(" ")[0] : "";

  const primaryModes = [
    {
      title: "Talk to Agent",
      description: "Open the AI tutor in Socratic mode for questions, explanations, and follow-ups.",
      cta: "Open tutor",
      path: "/transform?mode=learn&style=socratic",
      icon: MessageSquare,
      color: "blue",
      hover: "hover:border-blue-500",
      bg: "bg-blue-100 text-blue-600",
    },
    {
      title: "Rapid Fire Quiz",
      description: "Jump straight into fast quiz mode and generate practice from any topic.",
      cta: "Start quiz",
      path: "/transform?mode=quiz&quiz=rapid",
      icon: BrainCircuit,
      color: "orange",
      hover: "hover:border-orange-500",
      bg: "bg-orange-100 text-orange-600",
    },
    {
      title: "Visual Learning",
      description: "Open the visualizer to build flowcharts, diagrams, and concept maps.",
      cta: "Create visual",
      path: "/transform?mode=visualize&viz=flowchart",
      icon: Video,
      color: "red",
      hover: "hover:border-red-500",
      bg: "bg-red-100 text-red-600",
    },
  ];

  const powerTools = [
    {
      title: "Classroom",
      description: "Live lecture transcription, detected questions, and auto-notes.",
      path: "/classroom",
      icon: Mic,
      bg: "bg-red-50/60",
      chip: "bg-red-100 text-red-600",
      hover: "hover:border-red-400",
    },
    {
      title: "Visualizer",
      description: "Generate flowcharts and logic diagrams from a topic.",
      path: "/transform?mode=visualize&viz=flowchart",
      icon: Share2,
      bg: "bg-violet-50/60",
      chip: "bg-violet-100 text-violet-600",
      hover: "hover:border-violet-400",
    },
    {
      title: "Pathfinder",
      description: "Create a step-by-step learning roadmap.",
      path: "/transform?mode=plan",
      icon: Map,
      bg: "bg-emerald-50/60",
      chip: "bg-emerald-100 text-emerald-600",
      hover: "hover:border-emerald-400",
    },
    {
      title: "AI Podcast",
      description: "Turn any topic into a spoken audio lesson.",
      path: "/transform?mode=learn&format=podcast",
      icon: Headphones,
      bg: "bg-pink-50/60",
      chip: "bg-pink-100 text-pink-600",
      hover: "hover:border-pink-400",
    },
  ];

  return (
    <div className="min-h-screen bg-background font-sans relative">
      <div className="container mx-auto px-4 py-8 max-w-6xl space-y-10 relative">
        {/* Profile/sign-out already live in the sidebar (bottom) and the top
            header (avatar) — a third copy floating over the dashboard was
            just duplicate chrome, so it's gone from here. */}
        <div className="grid lg:grid-cols-2 gap-8 items-center pt-1 md:pt-3">
          <div className="text-center lg:text-left space-y-5 animate-in fade-in zoom-in-95 duration-500">
            {fullName && (
              <p className="text-indigo-600 dark:text-indigo-400 font-mono tracking-widest text-sm font-bold uppercase">
                Welcome, {fullName}!
              </p>
            )}
            <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">
              What do you want to <span className="text-primary">master</span> today{firstName ? `, ${firstName}` : ""}?
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0">
              Your AI tutor, classroom assistant, subject library, and study planner are one click away.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
              <Button
                size="lg"
                className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-all"
                onClick={handleStartExploring}
                disabled={isStartingSession}
              >
                {isStartingSession ? (
                  <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                ) : (
                  <Search className="mr-2 w-5 h-5" />
                )}
                Start Exploring
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-14 px-8 text-lg rounded-full border-2"
                onClick={() => openDestination("/subjects", "Subjects")}
              >
                <BookOpen className="mr-2 w-5 h-5" /> Browse Subjects
              </Button>
            </div>
          </div>

          <HeroIconShowcase />
        </div>

        {/* Two-column from here down: main content on the left, a sticky
            rail with Sessions/Storage on the right. On mobile it collapses
            to a single column with the rail shown first (order-first) —
            otherwise the personalized content would end up buried at the
            very bottom of a long stacked page. */}
        <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
          <div className="order-2 lg:order-1 min-w-0 space-y-10">
            <div className="grid md:grid-cols-3 gap-5">
              {primaryModes.map((mode) => (
                <button
                  key={mode.title}
                  type="button"
                  onClick={() => openDestination(mode.path, mode.title)}
                  className={`p-6 cursor-pointer hover:shadow-xl transition-all border-2 rounded-xl ${mode.hover} group relative overflow-hidden bg-card text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <mode.icon className="w-24 h-24" />
                  </div>
                  <div className={`h-12 w-12 rounded-2xl ${mode.bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                    <mode.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-bold mb-1.5">{mode.title}</h3>
                  <p className="text-sm text-muted-foreground">{mode.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                    {mode.cta} <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              ))}
            </div>

            <section className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" /> AI Power Tools
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {powerTools.map((tool) => (
                  <button
                    key={tool.title}
                    type="button"
                    onClick={() => openDestination(tool.path, tool.title)}
                    className={`p-6 cursor-pointer hover:shadow-xl transition-all border-2 rounded-xl ${tool.hover} ${tool.bg} group text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className={`p-3 rounded-xl ${tool.chip} group-hover:scale-110 transition-transform`}>
                        <tool.icon className="w-6 h-6" />
                      </div>
                      <h3 className="font-bold text-lg">{tool.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{tool.description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="animate-in slide-in-from-bottom-8 duration-700 delay-200">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-primary" /> Browse Subjects
                </h2>
                <Button variant="ghost" className="gap-2" onClick={() => openDestination("/subjects", "All Subjects")}>
                  View all <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {SUBJECTS_LIST.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => openDestination(`/subject/${sub.id}`, sub.name)}
                    className="cursor-pointer p-4 rounded-xl border transition-all hover:scale-105 hover:-translate-y-1 flex flex-col items-center justify-center text-center gap-3 h-32 bg-card hover:bg-primary/5 hover:border-primary/30 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    <sub.icon className="w-8 h-8 text-primary" />
                    <span className="font-bold text-sm">{sub.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <Card className="p-6 border-2 bg-muted/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" /> Not sure where to start?
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Take a quick tour inside the AI workspace, then choose a topic and mode from there.
                </p>
              </div>
              <Button className="gap-2" onClick={() => openDestination("/transform?mode=learn", "AI Feature Guide")}>
                Open Feature Guide <ArrowRight className="h-4 w-4" />
              </Button>
            </Card>
          </div>

          <div className="order-1 lg:order-2 space-y-5 lg:sticky lg:top-8 animate-in slide-in-from-bottom-4 duration-700">
            <VibeSessionsCard />
            <StorageLibraryCard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
