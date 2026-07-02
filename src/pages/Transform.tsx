import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; 
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import mermaid from "mermaid"; 
import katex from "katex"; 
import "katex/dist/katex.min.css"; 
import { 
  Loader2, Upload, CheckCircle2, BrainCircuit, BookOpen, 
  HelpCircle, ChevronLeft, ChevronRight, ArrowLeft, 
  Send, Sparkles, User, Save, Edit3, Zap, Map, Share2, 
  Calculator, Clock, Smile, FileText, XCircle, Mic, Play, Pause, Square, Headphones, Gauge, Radio, Lightbulb, Check, X, RefreshCw,
  Hourglass, Timer, Palette, Volume2, PlusCircle
} from "lucide-react";

mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });

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
        console.error("KaTeX error:", err);
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

    const delay = setTimeout(async () => {
      try {
        const fixedChart = sanitizeMermaid(chart);
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, fixedChart);

        if (ref.current) {
          ref.current.innerHTML = svg;
        }
      } catch (e) {
        console.error("Mermaid render error:", e);
        console.error("Original chart:", chart);

        if (ref.current) {
          ref.current.innerHTML =
            `<div class="text-red-500 text-xs p-2 bg-red-50 rounded">Diagram Syntax Error</div>`;
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
                correct: parts[5].replace(/^Correct:\s*/i, '').charAt(0).toUpperCase()
            };
        }).filter(Boolean);
        setQuestions(parsed);
    }, [rawData]);

    const handleSelect = (qIdx: number, optId: string) => {
        if (showResults) return;
        setSelectedAnswers(prev => ({ ...prev, [qIdx]: optId }));
    };

    const checkAnswers = () => {
        let correctCount = 0;
        questions.forEach((q, idx) => { if (selectedAnswers[idx] === q.correct) correctCount++; });
        setScore(correctCount);
        setShowResults(true);
        toast.success(`Score: ${correctCount}/${questions.length}`);
    };

    if (questions.length === 0) return null;

    return (
        <div className="space-y-8 max-w-3xl mx-auto">
            {questions.map((q, idx) => (
                <Card key={idx} className="p-6 border-2 shadow-sm relative overflow-hidden">
                    <div className="flex gap-4 mb-4">
                        <span className="text-xl font-bold text-muted-foreground/50">0{idx + 1}</span>
                        <h3 className="text-lg font-bold leading-relaxed">{q.q}</h3>
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
                    <div className="text-center animate-in zoom-in space-y-4">
                        <div><p className="text-2xl font-bold mb-1">Score: <span className="text-indigo-600">{score}</span> / {questions.length}</p></div>
                        <Button size="lg" variant="secondary" onClick={onRetry} className="h-12 px-8"><RefreshCw className="w-4 h-4 mr-2" /> Attempt 5 More</Button>
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

const Transform = () => {
  const navigate = useNavigate(); 
  const [searchParams] = useSearchParams(); 
  const hasAutoStarted = useRef(false); 
  const contentEndRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState<"learn" | "quiz" | "visualize" | "plan">("learn");
  const [learnFormat, setLearnFormat] = useState("lecture"); 
  const [vizFormat, setVizFormat] = useState("flowchart"); 
  const [quizFormat, setQuizFormat] = useState("mcq");
  const [viewStyle, setViewStyle] = useState<"classic" | "modern" | "neo-brutalist">("classic");

  const [isEditingProfile, setIsEditingProfile] = useState(true);
  const [eduLevel, setEduLevel] = useState("university");
  const [grade, setGrade] = useState("10"); 
  const [collegeYear, setCollegeYear] = useState("11"); 
  const [major, setMajor] = useState("Computer Science"); 
  const [goal, setGoal] = useState("concept"); 
  
  const [mood, setMood] = useState("enthusiastic"); 
  const [timeAvailable, setTimeAvailable] = useState("15"); 
  const [learningStyle, setLearningStyle] = useState("visual"); 

  const [userTopic, setUserTopic] = useState(""); 
  const [bottomNewTopic, setBottomNewTopic] = useState("");
  const [materialId, setMaterialId] = useState<string | null>(null); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentStatus, setAgentStatus] = useState("Idle");
  const [historicalData, setHistoricalData] = useState<any | null>(null);
  
  const [contentStream, setContentStream] = useState<any[]>([]);
  const [relatedSuggestions, setRelatedSuggestions] = useState<string[]>([]);
  const [explainInput, setExplainInput] = useState("");
  const [diagramCode, setDiagramCode] = useState("");
  const [roadmapData, setRoadmapData] = useState<any[]>([]);
  const [currentCard, setCurrentCard] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState("1");
  const [currentSentence, setCurrentSentence] = useState("Ready...");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [fullAudioText, setFullAudioText] = useState("");
  const [charOffset, setCharOffset] = useState(0);

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

  const handleSpeak = (text: string, startFromChar = 0) => {
    if (startFromChar === 0) setFullAudioText(text);
    const cleanText = text.substring(startFromChar).replace(/[*#_`]/g, '');
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    u.rate = parseFloat(playbackSpeed); u.pitch = 1.05; 
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
      if (isSpeaking && !isPaused) { window.speechSynthesis.pause(); setIsPaused(true); } 
      else if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); } 
      else if (contentStream.length > 0 && contentStream[contentStream.length-1].type === 'podcast') {
          handleSpeak(contentStream[contentStream.length-1].data, 0);
      }
  };

  const handleStop = () => { window.speechSynthesis.cancel(); setIsSpeaking(false); setIsPaused(false); setCurrentSentence("Ready..."); setCharOffset(0); };
  const changeSpeed = (speed: string) => { setPlaybackSpeed(speed); if (isSpeaking && fullAudioText) { handleSpeak(fullAudioText, charOffset); } };

  useEffect(() => {
    const topic = searchParams.get("topic");
    const mode = searchParams.get("mode") as any;
    if (topic && !hasAutoStarted.current) {
      hasAutoStarted.current = true;
      setUserTopic(topic);
      setIsEditingProfile(false);
      if (mode === 'roadmap') setActiveTab('plan'); else if (mode === 'diagram') setActiveTab('visualize'); else if (mode === 'quiz') setActiveTab('quiz'); else setActiveTab('learn');
      handleGenerate(topic);
    }
  }, [searchParams]);

  useEffect(() => { contentEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [contentStream, diagramCode, roadmapData, relatedSuggestions]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setIsUploading(true); setFile(selectedFile); setMaterialId(null);
    
    try {
      toast.info("Uploading PDF to storage bucket...");
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('educational-materials')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      toast.info("Generating reference records...");
      const { data: materialRow, error: dbError } = await supabase
        .from('materials')
        .insert({ name: selectedFile.name, file_path: filePath })
        .select()
        .single();

      if (dbError) throw dbError;

      setMaterialId(materialRow.id);
      toast.info("Analyzing content and generating context vectors...");

      const { data: procData, error: procError } = await supabase.functions.invoke('process-document', {
        body: { file_path: filePath, material_id: materialRow.id }
      });

      if (procError) throw procError;
      // Edge functions returning HTTP 500 put the error in the response body, not in procError
      if (procData?.error) throw new Error(procData.error);

      toast.success(`Document processed! ${procData?.chunks_stored || ''} chunks indexed for RAG.`);
    } catch (error: any) { 
      toast.error("Ingestion Process Faulted: " + error.message); 
      setFile(null); 
      setMaterialId(null);
    } finally { 
      setIsUploading(false); 
    }
  };

  const handleGenerate = async (topicOverride?: string) => {
    const topic = topicOverride || userTopic;
    if (!topic.trim() && !materialId) { toast.error("Enter a topic or upload a PDF reference!"); return; }
    setIsGenerating(true);
    handleStop();
    setRelatedSuggestions([]); 
    if (contentStream.length === 0 || topicOverride) { setContentStream([]); setDiagramCode(""); setRoadmapData([]); }
    
    const actions = ["Analyzing Prompt...", "Searching Vector Store...", "Structuring Context...", "Synthesizing..."];
    let i = 0; setAgentStatus(actions[0]);
    const interval = setInterval(() => { i=(i+1)%actions.length; setAgentStatus(actions[i]); }, 1500);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('transform-vibe', {
        body: { 
          topic, 
          eduLevel, 
          grade, 
          collegeYear, 
          major, 
          activeTab, 
          material_id: materialId, 
          mood, 
          learningStyle, 
          timeAvailable,
          quizFormat,
          learnFormat,
          vizFormat
        },
        headers: { Authorization: `Bearer ${session?.access_token}` }
      });
      
      if (error) throw error;
      let rawContent = data.content;
      
      const suggestionsMatch = rawContent.match(/### NEXT_STEPS: (.*)/);
      if (suggestionsMatch) {
          setRelatedSuggestions(suggestionsMatch[1].split('|').map((s: string) => s.trim()));
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
           if(quizFormat === 'mcq') setContentStream(prev => [...prev, { type: 'quiz-interactive', data: rawContent, role: 'ai' }]);
           else setContentStream(prev => [...prev, { type: 'quiz-rapid', data: rawContent, role: 'ai' }]);
      } else {
          if (learnFormat === 'podcast') {
             setContentStream(prev => [...prev, { type: 'podcast', data: rawContent, role: 'ai' }]);
             setTimeout(() => handleSpeak(rawContent, 0), 500);
          } else {
             let type = learnFormat === 'flashcards' ? 'cards' : 'text';
             let payload = learnFormat === 'flashcards' ? rawContent.split("---").filter((x:string)=>x.length>10) : rawContent;
             setContentStream(prev => [...prev, { type, data: payload, role: 'ai' }]);
          }
      }
      setIsEditingProfile(false);

      // Log configuration data cleanly up to the user profile table sync definitions
      if (session?.user) {
         await supabase.from('user_session_history').insert({
            user_id: session.user.id,
            last_topic: topic,
            weak_areas: activeTab === 'quiz' ? ['Review Conceptual Edge Scenarios'] : ['General Recall Bounds'],
            suggestions: [`Re-run customized logic checks parameters inside ${topic}`]
         });
      }

    } catch (e: any) { toast.error(e.message); } 
    finally { clearInterval(interval); setIsGenerating(false); }
  };

  const handleBottomTriggerNewTopic = () => {
     if (!bottomNewTopic.trim()) { toast.error("Please enter a new topic topic state parameters."); return; }
     setUserTopic(bottomNewTopic);
     const target = bottomNewTopic;
     setBottomNewTopic("");
     handleGenerate(target);
  };

  const handleExplainMore = async (query?: string) => {
      const q = query || explainInput;
      if (!q.trim()) return;
      setExplainInput(""); setRelatedSuggestions([]); 
      setContentStream(prev => [...prev, { type: 'question', data: q, role: 'user' }]);
      setIsGenerating(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('transform-vibe', {
            body: { 
              topic: q, 
              eduLevel, 
              grade, 
              collegeYear, 
              major, 
              activeTab, 
              material_id: materialId, 
              mood, 
              learningStyle, 
              timeAvailable,
              quizFormat,
              learnFormat,
              vizFormat
            },
            headers: { Authorization: `Bearer ${session?.access_token}` }
        });
        if(error) throw error;
        setContentStream(prev => [...prev, { type: 'text', data: data.content, role: 'ai' }]);
      } catch (e: any) { toast.error(e.message); } 
      finally { setIsGenerating(false); }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden font-sans pb-20 w-full">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full px-6 lg:px-10 py-24 relative z-10 flex flex-col gap-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 w-full">
            <Card className={`p-4 border-2 shadow-sm flex flex-col gap-4 ${isEditingProfile ? 'ring-2 ring-primary/20' : ''}`}>
                <div className="p-4 flex justify-between border-b bg-muted/30">
                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-primary" /><span className="font-bold text-xs uppercase">Profile</span></div>
                    {(activeTab === 'learn' || activeTab === 'quiz') && (
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setIsEditingProfile(!isEditingProfile)}>
                            {isEditingProfile ? <Save className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
                        </Button>
                    )}
                </div>
                <div className="p-4 flex-1 flex flex-col justify-center space-y-3 text-sm">
                   {(activeTab === 'learn' || activeTab === 'quiz') ? (
                       isEditingProfile ? (
                         <>
                            <Select value={eduLevel} onValueChange={setEduLevel}>
                                <SelectTrigger><SelectValue placeholder="Level" /></SelectTrigger>
                                <SelectContent><SelectItem value="school">School</SelectItem><SelectItem value="college">College</SelectItem><SelectItem value="university">University</SelectItem></SelectContent>
                            </Select>
                            {eduLevel === 'university' && <Input value={major} onChange={e => setMajor(e.target.value)} placeholder="Major (e.g. CS)" />}
                            {eduLevel === 'school' && <Select value={grade} onValueChange={setGrade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[...Array(10)].map((_,i)=><SelectItem key={i} value={`${i+1}`}>Grade {i+1}</SelectItem>)}</SelectContent></Select>}
                            {eduLevel === 'college' && <Select value={collegeYear} onValueChange={setCollegeYear}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="11">Grade 11</SelectItem><SelectItem value="12">Grade 12</SelectItem></SelectContent></Select>}
                            <Select value={goal} onValueChange={setGoal}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="concept">Understand Concept</SelectItem><SelectItem value="exam">Exam Prep</SelectItem></SelectContent>
                            </Select>
                         </>
                       ) : (
                         <div className="space-y-1">
                            <div className="font-medium text-lg text-primary">{eduLevel === 'university' ? major : eduLevel === 'college' ? `College (Yr ${collegeYear})` : `Grade ${grade}`}</div>
                            <div className="text-xs text-muted-foreground flex gap-2 capitalize">{goal}</div>
                         </div>
                       )
                   ) : (
                       <div className="flex flex-col items-center justify-center opacity-50 h-full text-center py-6">
                           <User className="w-8 h-8 mb-2" /><p>Profile locked for {activeTab}</p>
                       </div>
                   )}
                </div>
            </Card>

            <Card className="border-2 p-0 flex flex-col h-full">
                <div className="p-4 bg-muted/30 border-b flex items-center gap-2"><Zap className="w-4 h-4 text-primary" /><span className="font-bold text-xs uppercase">Mode & Settings</span></div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="grid grid-cols-4 p-1 bg-muted rounded-lg shrink-0">
                     {[{ id: 'learn', label: 'Learn' }, { id: 'quiz', label: 'Quiz' }, { id: 'visualize', label: 'Visual' }, { id: 'plan', label: 'Plan' }].map((t) => (
                        <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === t.id ? 'bg-white shadow text-primary' : 'text-muted-foreground'}`}>{t.label}</button>
                     ))}
                  </div>
                  <div className="flex-1 space-y-4 pt-2">
                     {activeTab === 'learn' && (
                        <>
                            <div className="grid grid-cols-2 gap-2">
                                <SelectionTile active={learnFormat === 'lecture'} onClick={() => setLearnFormat('lecture')} emoji="🎓" title="Lecture" subtitle="Deep Dive" />
                                <SelectionTile active={learnFormat === 'flashcards'} onClick={() => setLearnFormat('flashcards')} emoji="🗂️" title="Cards" subtitle="Memorize" />
                                <SelectionTile active={learnFormat === 'podcast'} onClick={() => setLearnFormat('podcast')} emoji="🎧" title="Podcast" subtitle="Listen" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <SelectionTile active={learningStyle === 'visual'} onClick={() => setLearningStyle('visual')} emoji="👁️" title="Visual" subtitle="Diagrams" />
                                <SelectionTile active={learningStyle === 'socratic'} onClick={() => setLearningStyle('socratic')} emoji="🤔" title="Socratic" subtitle="Q&A" />
                                <SelectionTile active={learningStyle === 'analogical'} onClick={() => setLearningStyle('analogical')} emoji="🤝" title="Analogy" subtitle="Stories" />
                                <SelectionTile active={learningStyle === 'academic'} onClick={() => setLearningStyle('academic')} emoji="📚" title="Academic" subtitle="Strict" />
                            </div>
                            <div className="flex gap-2">
                                <Select value={timeAvailable} onValueChange={setTimeAvailable}>
                                    <SelectTrigger className="h-8 text-xs flex-1"><Timer className="w-3 h-3 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {[5, 10, 15, 30, 45].map(m => <SelectItem key={m} value={m.toString()}>{m} Mins</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Select value={mood} onValueChange={setMood}>
                                    <SelectTrigger className="h-8 text-xs flex-1"><Smile className="w-3 h-3 mr-2 text-muted-foreground" /><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="enthusiastic">🔥 Hype</SelectItem>
                                        <SelectItem value="strict">🧐 Strict</SelectItem>
                                        <SelectItem value="funny">😂 Funny</SelectItem>
                                        <SelectItem value="professional">💼 Pro</SelectItem>
                                        <SelectItem value="encouraging">🤗 Support</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                     )}
                     {activeTab === 'quiz' && (
                       <div className="grid grid-cols-2 gap-2">
                          <SelectionTile active={quizFormat === 'mcq'} onClick={() => setQuizFormat('mcq')} emoji="❓" title="MCQ" subtitle="Test" />
                          <SelectionTile active={quizFormat === 'rapid'} onClick={() => setQuizFormat('rapid')} emoji="⚡" title="Rapid" subtitle="Fast" />
                       </div>
                     )}
                     {activeTab === 'visualize' && (
                       <div className="grid grid-cols-2 gap-2">
                          <SelectionTile active={vizFormat === 'flowchart'} onClick={() => setVizFormat('flowchart')} emoji="🔀" title="Flow" subtitle="Process" />
                          <SelectionTile active={vizFormat === 'dld'} onClick={() => setVizFormat('dld')} emoji="⚡" title="Circuit" subtitle="DLD" />
                       </div>
                     )}
                     {activeTab === 'plan' && <SelectionTile active={true} onClick={()=>{}} emoji="🗺️" title="Roadmap" subtitle="Path" />}
                  </div>
                </div>
            </Card>
        </div>

        <Card className="border-2 p-0 flex flex-col w-full mb-12 overflow-hidden shadow-sm">
            <div className="p-4 bg-muted/30 border-b flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-bold text-xs uppercase">Topic Source</span>
            </div>
            <div className="p-6 flex flex-col gap-6">
                <div className={`p-6 rounded-xl border-2 border-dashed text-center flex flex-col justify-center items-center cursor-pointer hover:bg-muted/50 transition-all ${isUploading ? 'bg-primary/5' : ''}`}>
                    <Label htmlFor="file" className="cursor-pointer flex flex-col items-center gap-2">
                        {isUploading ? <Loader2 className="animate-spin w-6 h-6 text-primary" /> : <Upload className="w-6 h-6 text-muted-foreground" />}
                        <span className="text-sm font-semibold text-muted-foreground">{file ? file.name : "Upload PDF (Optional)"}</span>
                    </Label>
                    <Input id="file" type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    {materialId && <div className="mt-3 flex items-center gap-2 text-xs bg-green-50 text-green-700 p-2 rounded border border-green-200">
                      <CheckCircle2 className="w-3 h-3" /> Vector Index Active <XCircle className="w-3 h-3 ml-auto cursor-pointer" onClick={() => { setMaterialId(null); setFile(null); }} />
                    </div>}
                </div>
                
                <Textarea 
                    value={userTopic} 
                    onChange={e => setUserTopic(e.target.value)} 
                    placeholder="Or type topic here..." 
                    className="resize-none min-h-[140px] text-lg bg-slate-50/30" 
                />
            </div>
        </Card>

        <div className="flex justify-center w-full">
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
               
               {isGenerating && <span className="absolute top-4 right-4 text-xs text-muted-foreground animate-pulse font-mono tracking-tighter">{agentStatus}...</span>}
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
                        <>
                           <BrainCircuit className="w-32 h-32 stroke-1 text-slate-400 mb-6" />
                           <p className="text-2xl font-medium text-slate-600">Neural Gateway Ready</p>
                        </>
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
                            {block.type === 'podcast' && (
                               <div className="bg-black text-white p-12 rounded-[4rem] shadow-2xl max-w-3xl mx-auto border border-white/10 relative overflow-hidden">
                                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-black to-black z-0" />
                                  <div className="relative z-10 flex flex-col items-center justify-center mb-10 mt-4"><div className={`w-36 h-36 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 blur-[25px] absolute transition-all duration-300 ${isSpeaking && !isPaused ? 'scale-110 opacity-80 animate-pulse' : 'scale-100 opacity-40'}`} /><div className={`w-32 h-32 rounded-full bg-black border-2 border-white/20 flex items-center justify-center relative z-10 shadow-2xl backdrop-blur-md`}><Headphones className={`w-14 h-14 text-white transition-all ${isSpeaking && !isPaused ? 'animate-bounce' : ''}`} /></div></div>
                                  <div className="relative z-10 min-h-[140px] flex items-center justify-center text-center px-6 mb-8"><p className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400 leading-relaxed transition-all">{currentSentence || "Ready to Start..."}</p></div>
                                  <div className="relative z-10 flex items-center justify-center gap-6"><Select value={playbackSpeed} onValueChange={changeSpeed}><SelectTrigger className="h-10 w-[100px] bg-white/10 border-white/20 text-white text-sm rounded-full"><Gauge className="w-4 h-4 mr-2" /> <SelectValue /></SelectTrigger><SelectContent className="bg-black border-white/20 text-white"><SelectItem value="0.5">0.5x</SelectItem><SelectItem value="1">1.0x</SelectItem><SelectItem value="1.5">1.5x</SelectItem></SelectContent></Select><Button size="icon" className="h-16 w-16 rounded-full bg-white text-black hover:bg-gray-200" onClick={togglePlayPause}>{isSpeaking && !isPaused ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}</Button><Button size="icon" variant="ghost" className="h-16 w-16 rounded-full text-white/50 hover:text-white" onClick={handleStop}><Square className="w-6 h-6 fill-current" /></Button></div>
                               </div>
                            )}
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
                                  <SmartRender text={block.data} />
                                </LectureWrapper>
                            )}
                         </div>
                     )}
                  </div>
               ))}
               <div ref={contentEndRef} />
            </div>
        </Card>
        
        {/* INTERACTION AND RUNTIME TRAYS AT THE BOTTOM */}
        {contentStream.length > 0 && (
          <div className="max-w-4xl mx-auto w-full space-y-4 animate-in slide-in-from-bottom-4 duration-500">
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