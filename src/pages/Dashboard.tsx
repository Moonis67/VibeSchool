import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/layout/Navbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  BookOpen, MessageSquare, BrainCircuit, Video, Search,
  Mic, Map, Share2, Headphones, Sparkles, User, LogOut
} from "lucide-react";
// Import the shared list so icons/colors match
import { SUBJECTS_LIST } from "@/data/subjectContent"; 

const Dashboard = () => {
  const navigate = useNavigate();

  // --- MINIMAL STATE TO DISPLAY PROFILE ---
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchUserProfileSummary();
  }, []);

  const fetchUserProfileSummary = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // FIXED: .maybeSingle() prevents HTTP 406 if a user row is completely missing
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Scholar");
      setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
    } catch (err: any) {
      console.error("Dashboard identity sync fault:", err.message);
    }
  };

  // --- SIGN OUT ENGINE ---
  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("Signed out successfully.");
      navigate("/"); 
    } catch (err: any) {
      toast.error("Failed to sign out: " + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans relative">
      <Navbar />
      
      <div className="container mx-auto px-4 py-24 max-w-6xl space-y-16 relative">
        
        {/* --- TOP RIGHT PROFILE & DEPLOYMENT DECK --- */}
        <div className="flex flex-col items-end gap-2 mb-6 md:mb-0 md:absolute md:top-6 md:right-4 lg:right-0 z-30 animate-in fade-in duration-300">
          
          {/* Sign Out Button on top */}
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleSignOut}
            className="text-destructive hover:bg-destructive/10 border-destructive/20 gap-2 rounded-xl shadow-sm font-semibold px-3 h-8 text-xs"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </Button>

          {/* Profile summary option cleanly below it */}
          <Card 
            onClick={() => navigate('/profile')} 
            className="p-3 border-2 border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-black/40 backdrop-blur-md rounded-2xl shadow-sm flex items-center gap-3 w-[240px] cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 rounded-full border-2 border-primary/20 bg-slate-100 dark:bg-slate-900 overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="User Profile Avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="w-4 h-4 text-muted-foreground/40" />
              )}
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                View Profile
              </p>
              <h3 className="text-sm font-bold text-foreground truncate pr-1">
                {fullName || "Scholar"}
              </h3>
            </div>
          </Card>

        </div>

        {/* HERO HEADER - PERSONALIZED */}
        <div className="text-center space-y-6 pt-4 md:pt-10 animate-in fade-in zoom-in-95 duration-500">
          {fullName && (
            <p className="text-indigo-600 dark:text-indigo-400 font-mono tracking-widest text-sm font-bold uppercase animate-pulse">
              Welcome, {fullName}!
            </p>
          )}
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
            What do you want to <span className="text-primary">master</span> today{fullName ? `, ${fullName.split(" ")[0]}` : ""}?
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your AI Tutor with access to the entire world's curriculum.
          </p>
          <Button 
            size="lg" 
            className="h-14 px-8 text-lg rounded-full shadow-xl hover:scale-105 transition-all"
            onClick={() => navigate('/transform')}
          >
             <Search className="mr-2 w-5 h-5" /> Start Exploring
          </Button>
        </div>

        {/* MAIN MODES (Top 3 Tiles) */}
        <div className="grid md:grid-cols-3 gap-6">
          
          <Card 
            onClick={() => navigate('/transform?mode=chat')}
            className="p-8 cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-blue-500 group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <MessageSquare className="w-32 h-32" />
            </div>
            <div className="h-14 w-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 text-blue-600 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Talk to Agent</h3>
            <p className="text-muted-foreground">Chat with an expert persona. Ask deep questions and get instant answers.</p>
          </Card>

          <Card 
            onClick={() => navigate('/transform?mode=quiz')}
            className="p-8 cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-orange-500 group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <BrainCircuit className="w-32 h-32" />
            </div>
            <div className="h-14 w-14 rounded-2xl bg-orange-100 flex items-center justify-center mb-4 text-orange-600 group-hover:scale-110 transition-transform">
              <BrainCircuit className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Rapid Fire Quiz</h3>
            <p className="text-muted-foreground">Gamified MCQs and Flashcards generated instantly from any topic.</p>
          </Card>

          <Card 
            onClick={() => navigate('/transform?mode=video')}
            className="p-8 cursor-pointer hover:shadow-2xl transition-all border-2 hover:border-red-500 group relative overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Video className="w-32 h-32" />
            </div>
            <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center mb-4 text-red-600 group-hover:scale-110 transition-transform">
              <Video className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Visual Learning</h3>
            <p className="text-muted-foreground">Curated YouTube videos and AI diagrams for visual learners.</p>
          </Card>
        </div>

        {/* --- AI POWER TOOLS --- */}
        <div className="animate-in slide-in-from-bottom-6 duration-700 delay-100">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
               <Sparkles className="w-6 h-6 text-primary" /> AI Power Tools
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* 1. Classroom Mode */}
                <Card 
                    onClick={() => navigate('/classroom')}
                    className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-red-400 bg-red-50/30 group"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-xl bg-red-100 text-red-600 group-hover:scale-110 transition-transform">
                            <Mic className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Classroom</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Live lecture transcription & auto-notes.</p>
                </Card>

                {/* 2. Visualizer */}
                <Card 
                    onClick={() => navigate('/transform?mode=diagram')}
                    className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-purple-400 bg-purple-50/30 group"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-xl bg-purple-100 text-purple-600 group-hover:scale-110 transition-transform">
                            <Share2 className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Visualizer</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Generate flowcharts & logic circuits.</p>
                </Card>

                {/* 3. Roadmap */}
                <Card 
                    onClick={() => navigate('/transform?mode=roadmap')}
                    className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-emerald-400 bg-emerald-50/30 group"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-xl bg-emerald-100 text-emerald-600 group-hover:scale-110 transition-transform">
                            <Map className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">Pathfinder</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Step-by-step learning roadmaps.</p>
                </Card>

                {/* 4. Podcast */}
                <Card 
                    onClick={() => navigate('/transform?mode=learn')}
                    className="p-6 cursor-pointer hover:shadow-xl transition-all border-2 hover:border-pink-400 bg-pink-50/30 group"
                >
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 rounded-xl bg-pink-100 text-pink-600 group-hover:scale-110 transition-transform">
                            <Headphones className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-lg">AI Podcast</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">Turn any topic into an audio show.</p>
                </Card>

            </div>
        </div>

        {/* SUBJECT EXPLORER */}
        <div className="animate-in slide-in-from-bottom-8 duration-700 delay-200">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" /> Browse Subjects
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {SUBJECTS_LIST.map((sub) => (
              <div 
                key={sub.id}
                onClick={() => navigate(`/subject/${sub.id}`)}
                className={`
                  cursor-pointer p-4 rounded-xl border transition-all hover:scale-105 hover:-translate-y-1
                  flex flex-col items-center justify-center text-center gap-3 h-32
                  ${sub.bg} hover:shadow-lg
                `}
              >
                <sub.icon className={`w-8 h-8 ${sub.color}`} />
                <span className="font-bold text-sm">{sub.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;