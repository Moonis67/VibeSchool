import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SUBJECTS_LIST, SUBJECT_CONTENT, type SubjectQuestion, type SubjectTopic, type SubjectVideo } from "@/data/subjectContent";
import ReactPlayer from 'react-player';
import { SubjectCard } from "@/components/library/SubjectCard";
import {
  FileText, HelpCircle, Wand2, ArrowLeft,
  Play, ListVideo, BrainCircuit, ChevronDown, ChevronUp, BookOpen
} from "lucide-react";

const getYoutubeId = (url: string) => {
  const watchMatch = url.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = url.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = url.match(/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  return "";
};

const Subject = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const subjectData = id ? SUBJECT_CONTENT[id as string] : null;
  const subjectName = SUBJECTS_LIST.find(s => s.id === id)?.name || "Subject";

  const [activeVideo, setActiveVideo] = useState(subjectData?.videos?.[0] || null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null); 

  useEffect(() => {
    if (subjectData?.videos && subjectData.videos.length > 0) {
        setActiveVideo(subjectData.videos[0]);
    }
    setExpandedTopic(null);
  }, [id, subjectData]);

  const handleViewSolution = (questionText: string) => {
    const solutionPrompt = `Explain the solution and the concept behind this question: "${questionText}"`;
    navigate(`/transform?mode=learn&topic=${encodeURIComponent(solutionPrompt)}`);
  };

  if (!id) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans w-full overflow-x-hidden">
        <main className="flex-1 w-full app-container py-8 lg:py-10">
          <Button variant="ghost" className="mb-6 gap-2 rounded-xl" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4" /> Back to Command Center
          </Button>

          <div className="mb-8">
            <p className="text-primary font-bold uppercase tracking-widest text-xs mb-2">Knowledge Library</p>
            <h1 className="text-3xl font-extrabold tracking-tight">Choose a subject to explore</h1>
            <p className="text-muted-foreground mt-2 text-base max-w-2xl">
              Open videos, core concepts, practice questions, and AI help for the subject you want to study.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SUBJECTS_LIST.map((sub) => {
              const data = SUBJECT_CONTENT[sub.id];
              return (
                <SubjectCard
                  key={sub.id}
                  id={sub.id}
                  name={sub.name}
                  icon={sub.icon}
                  description={data?.description || ""}
                  docsCount={data?.videos?.length}
                  nextTopic={data?.topics?.[0]?.title}
                />
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  if (!subjectData) {
    return (
      <div className="min-h-screen bg-background flex flex-col font-sans w-full overflow-x-hidden">
        <main className="flex-1 w-full app-container py-8 lg:py-10 flex flex-col items-center justify-center text-center gap-4">
          <h1 className="text-2xl font-extrabold tracking-tight">Subject not found</h1>
          <p className="text-muted-foreground max-w-md">
            We couldn't find a subject matching "{id}". Pick one from the Knowledge Library instead.
          </p>
          <Button className="gap-2 rounded-xl" onClick={() => navigate('/subjects')}>
            <ArrowLeft className="w-4 h-4" /> Back to Subjects
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans w-full overflow-x-hidden">
      
      {/* Mobile Back Button */}
      <div className="lg:hidden p-4">
         <Button variant="ghost" onClick={() => navigate('/subjects')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Subjects
         </Button>
      </div>

      <div className="flex-1 w-full px-6 py-8 lg:py-12 flex gap-8">
        
        {/* --- LEFT SUB-SIDEBAR: Functioning Subject List --- */}
        <aside className="w-64 hidden lg:block border-r pr-6 pt-4 sticky top-20 h-[calc(100vh-100px)] flex-shrink-0">
          <div className="flex items-center gap-2 mb-6 text-muted-foreground hover:text-primary cursor-pointer transition-colors" onClick={() => navigate('/subjects')}>
            <ArrowLeft className="w-4 h-4" /> All Subjects
          </div>
          <h3 className="font-bold text-lg mb-4 px-2 text-primary uppercase tracking-wider text-xs">Explore Subjects</h3>
          <ScrollArea className="h-full">
            <div className="space-y-1">
              {SUBJECTS_LIST.map((sub) => (
                <Button
                  key={sub.id}
                  variant={id === sub.id ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 rounded-xl ${id === sub.id ? 'bg-primary/10 text-primary font-bold' : 'text-muted-foreground'}`}
                  onClick={() => navigate(`/subject/${sub.id}`)}
                >
                  <sub.icon className="w-4 h-4" /> {sub.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* --- MAIN CONTENT AREA --- */}
        <main className="flex-1 flex flex-col gap-8 pb-20 min-w-0 w-full">
          
          <div className="animate-in fade-in slide-in-from-bottom-3 duration-500">
            <h1 className="text-4xl font-extrabold tracking-tight">{subjectData.title}</h1>
            <p className="text-muted-foreground mt-2 text-lg">{subjectData.description}</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 w-full">
            
            <div className="lg:col-span-2 space-y-6">
              
              {/* VIDEO PLAYER */}
              <div className="space-y-3">
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl border-4 border-slate-100 dark:border-slate-800">
                    {activeVideo && (
                      <ReactPlayer
                          src={activeVideo.url}
                          width="100%"
                          height="100%"
                          controls={true}
                          playing={false}
                      />
                    )}
                  </div>
                  <div className="flex justify-between items-start px-1">
                    <div>
                        <h2 className="text-2xl font-bold">{activeVideo?.title}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">{activeVideo?.channel}</Badge>
                            <span>• {activeVideo?.views}</span>
                        </div>
                    </div>
                  </div>
              </div>

              {/* VIDEO PLAYLIST */}
              <Card className="p-6 border shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                    <ListVideo className="w-5 h-5 text-blue-500"/> Recommended Videos
                </h3>
                <div className="grid gap-3">
                    {subjectData.videos.map((vid: SubjectVideo, idx: number) => (
                        <div 
                            key={idx} 
                            onClick={() => setActiveVideo(vid)}
                            className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${activeVideo?.url === vid.url ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}
                        >
                            <div className="relative w-32 h-20 bg-slate-200 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                                <img
                                    src={`https://img.youtube.com/vi/${getYoutubeId(vid.url)}/mqdefault.jpg`}
                                    alt="thumbnail"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                    <Play className="w-8 h-8 text-white fill-white"/>
                                </div>
                            </div>
                            <div className="flex-1">
                                <h4 className={`font-semibold text-sm line-clamp-2 ${activeVideo?.url === vid.url ? 'text-blue-700' : ''}`}>{vid.title}</h4>
                                <p className="text-xs text-muted-foreground mt-1">{vid.channel}</p>
                            </div>
                        </div>
                    ))}
                </div>
              </Card>

              {/* CORE CONCEPTS */}
              <Card className="p-6 border shadow-sm">
                <h3 className="font-bold mb-4 flex items-center gap-2 text-lg">
                    <FileText className="w-5 h-5 text-indigo-500"/> Core Concepts
                </h3>
                <div className="space-y-3">
                    {subjectData.topics.map((topic: SubjectTopic, idx: number) => {
                        const isExpanded = expandedTopic === idx;
                        return (
                            <div 
                                key={idx}
                                className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'bg-indigo-50/50 border-indigo-200 shadow-md' : 'hover:border-indigo-200 bg-white dark:bg-slate-900'}`}
                            >
                                <div 
                                    className="p-4 flex justify-between items-center cursor-pointer"
                                    onClick={() => setExpandedTopic(isExpanded ? null : idx)}
                                >
                                    <div>
                                        <h4 className={`font-bold text-base transition-colors ${isExpanded ? 'text-indigo-700' : ''}`}>{topic.title}</h4>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{topic.content}</p>
                                    </div>
                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-indigo-500"/> : <ChevronDown className="w-5 h-5 text-muted-foreground"/>}
                                </div>
                                
                                {isExpanded && (
                                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
                                        <hr className="border-indigo-100 mb-3"/>
                                        <p className="text-sm text-foreground/80 mb-4 leading-relaxed">{topic.content}</p>
                                        <Button 
                                            size="sm" 
                                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                            onClick={() => navigate(`/transform?mode=learn&topic=${encodeURIComponent(topic.title)}`)}
                                        >
                                            <Wand2 className="w-4 h-4 mr-2" /> Ask AI Tutor to Explain
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
              </Card>
            </div>

            <div className="space-y-6">
              {/* PRACTICE AREA */}
              <Card className="p-6 border-2 h-fit bg-slate-50/50 dark:bg-slate-900/50">
                <div className="mb-6">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <HelpCircle className="w-5 h-5 text-green-600" /> Practice Area
                    </h2>
                </div>

                <div className="space-y-4">
                    {subjectData.topics.flatMap((t: SubjectTopic) => t.questions).slice(0, 5).map((qObj: SubjectQuestion, i: number) => (
                        <div key={i} className="group bg-white dark:bg-black border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
                            <div className="flex gap-3 items-start mb-4">
                                <span className="font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded text-xs h-fit mt-0.5">Q{i+1}</span> 
                                <span className="text-sm font-medium leading-snug text-foreground/90">{qObj.q}</span>
                            </div>
                            <Button 
                                size="sm"
                                variant="secondary" 
                                className="w-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-indigo-600 hover:text-white transition-colors"
                                onClick={() => handleViewSolution(qObj.q)}
                            >
                                <BookOpen className="w-3 h-3 mr-2" /> View Detailed Solution
                            </Button>
                        </div>
                    ))}
                </div>
              </Card>

              {/* AI PROFESSOR */}
              <Card className="p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl relative overflow-hidden border-0">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <h3 className="font-bold text-xl mb-2 relative z-10 flex items-center gap-2">
                    <BrainCircuit className="w-6 h-6" /> AI Professor
                </h3>
                <p className="text-sm text-indigo-100 mb-6 relative z-10 leading-relaxed">
                  Have a specific question? I can explain any concept or help you solve complex problems.
                </p>
                <Button 
                    variant="secondary" 
                    className="w-full font-bold shadow-md"
                    onClick={() => navigate(`/transform?mode=chat&topic=${subjectName}`)}
                >
                    <Wand2 className="w-4 h-4 mr-2" /> Start AI Session
                </Button>
              </Card>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Subject;
