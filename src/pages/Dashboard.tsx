import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
  User,
  LogOut,
  ArrowRight,
  Settings,
  PlayCircle,
} from "lucide-react";
import { SUBJECTS_LIST } from "@/data/subjectContent";
import { clearSensitiveClientState } from "@/lib/security";
import { VibeSessionsCard } from "@/components/dashboard/VibeSessionsCard";
import { StorageLibraryCard } from "@/components/dashboard/StorageLibraryCard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfileSummary();
  }, []);

  const fetchUserProfileSummary = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Scholar");
      setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
    } catch {
      toast.error("Could not refresh profile details.");
    }
  };

  const withTransformGuide = (path: string) => {
    if (!path.startsWith("/transform")) return path;
    return `${path}${path.includes("?") ? "&" : "?"}guide=1`;
  };

  const openDestination = (path: string, label: string) => {
    toast.info(`Opening ${label}...`, { duration: 1200 });
    navigate(withTransformGuide(path));
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      clearSensitiveClientState();
      toast.success("Signed out successfully.");
      navigate("/");
    } catch {
      toast.error("Failed to sign out.");
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
      <div className="container mx-auto px-4 py-12 max-w-6xl space-y-16 relative">
        <div className="flex flex-col items-end gap-2 mb-6 md:mb-0 md:absolute md:top-6 md:right-4 lg:right-0 z-30 animate-in fade-in duration-300">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 rounded-xl shadow-sm font-semibold px-3 h-8 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </Button>
          </div>

          <button
            type="button"
            onClick={() => openDestination("/profile", "Profile")}
            className="p-3 border-2 border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center gap-3 w-[240px] cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group text-left"
          >
            <div className="w-9 h-9 rounded-full border-2 border-primary/20 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User profile avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground/40" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                View Profile
              </p>
              <h3 className="text-sm font-bold text-foreground truncate pr-1">{fullName || "Scholar"}</h3>
            </div>
            <Settings className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary" />
          </button>
        </div>

        <div className="text-center space-y-6 pt-4 md:pt-10 animate-in fade-in zoom-in-95 duration-500">
          {fullName && (
            <p className="text-indigo-600 dark:text-indigo-400 font-mono tracking-widest text-sm font-bold uppercase">
              Welcome, {fullName}!
            </p>
          )}
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
            What do you want to <span className="text-primary">master</span> today{firstName ? `, ${firstName}` : ""}?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI tutor, classroom assistant, subject library, and study planner are one click away.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-all"
              onClick={() => openDestination("/transform?mode=learn", "AI Tutor")}
            >
              <Search className="mr-2 w-5 h-5" /> Start Exploring
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

        <div className="grid md:grid-cols-3 gap-6">
          {primaryModes.map((mode) => (
            <button
              key={mode.title}
              type="button"
              onClick={() => openDestination(mode.path, mode.title)}
              className={`p-8 cursor-pointer hover:shadow-2xl transition-all border-2 rounded-xl ${mode.hover} group relative overflow-hidden bg-card text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <mode.icon className="w-32 h-32" />
              </div>
              <div className={`h-14 w-14 rounded-2xl ${mode.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <mode.icon className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{mode.title}</h3>
              <p className="text-muted-foreground min-h-[72px]">{mode.description}</p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-primary">
                {mode.cta} <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>

        <section className="grid md:grid-cols-2 gap-6 animate-in slide-in-from-bottom-4 duration-700">
          <VibeSessionsCard />
          <StorageLibraryCard />
        </section>

        <section className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> AI Power Tools
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
    </div>
  );
};

export default Dashboard;
