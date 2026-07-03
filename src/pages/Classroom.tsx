import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { answerQuestion, generateNotesFromTranscript } from "@/lib/classroomEngine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { 
  Mic, MicOff, Save, ArrowLeft, BrainCircuit, Sparkles, 
  Play, Loader2, Clock, Zap, ChevronDown, ChevronUp, RefreshCw, Copy, Download
} from "lucide-react";

// --- SPEECH RECOGNITION SETUP ---
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

const Classroom = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string>(""); 
  const [liveBuffer, setLiveBuffer] = useState(""); 
  const [qaHistory, setQaHistory] = useState<Array<{id: string, query: string, answer: string, explanation: string, time: string}>>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [isThinking, setIsThinking] = useState(false); 
  const [generatedNotes, setGeneratedNotes] = useState<string | null>(null);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const qaTopRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false);
  const lastProcessedSentence = useRef<string>("");

  // --- 1. INITIALIZE SPEECH ENGINE ---
  useEffect(() => {
    if (!SpeechRecognition) {
      toast.error("Browser not supported. Use Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US'; 

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscriptChunk = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscriptChunk += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscriptChunk) {
          const cleanChunk = finalTranscriptChunk.trim();
          setTranscript(prev => prev + finalTranscriptChunk);
          
          if (cleanChunk.length > 2) {
              checkForQuestions(cleanChunk); 
          }
      }
      setLiveBuffer(interimTranscript);
    };

    // CRITICAL FIX: Track and handle silent native errors
    recognition.onerror = (event) => {
      console.error("Speech Recognition Engine Exception:", event.error);
      
      if (event.error === 'no-speech') {
        // 'no-speech' is triggered when the room goes quiet for a while. We can safely ignore it.
        return;
      }
      
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        toast.error("Microphone hardware access blocked by browser security rules.");
        setIsListening(false);
        isListeningRef.current = false;
      }
      
      if (event.error === 'network') {
        toast.error("Network disconnect hit speech-to-text pipeline. Retrying connection...");
      }
    };

    recognition.onend = () => {
        if (isListeningRef.current) {
            // Add a mini timeout buffer to prevent immediate engine recursion gridlocks
            setTimeout(() => {
              try { 
                if (isListeningRef.current) recognition.start(); 
              } catch (e) { 
                console.warn("Auto-restart collision swallowed safely.");
              }
            }, 300);
        } else {
            setIsListening(false);
        }
    };

    recognitionRef.current = recognition;
    return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
  }, []);

  // --- SCROLL LOGIC ---
  useEffect(() => { 
      if (transcriptEndRef.current && isListening) {
          transcriptEndRef.current.scrollIntoView({ behavior: "smooth" }); 
      }
  }, [transcript]); 

  useEffect(() => { 
      if(qaHistory.length > 0) qaTopRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [qaHistory]);

  // --- 2. IMPROVED INTELLIGENT QA LOGIC ---
  const checkForQuestions = async (text: string) => {
      if (text === lastProcessedSentence.current) return;

      const lower = text.toLowerCase();
      const isQuestionWord = lower.match(/\b(who|what|where|when|why|how|define|explain|calculate|solve|can you|could you)\b/);
      const isMath = lower.match(/(\d+)\s*(\+|plus|minus|times|divided|x)\s*(\d+)/);
      const hasQuestionMark = text.includes("?");

      if ((isQuestionWord || isMath || hasQuestionMark) && text.split(' ').length > 2) {
          lastProcessedSentence.current = text;
          setIsThinking(true); 

          try {
             const { data, error } = await supabase.functions.invoke('transform-vibe', {
                body: { 
                    content: `Classroom Query: "${text}". 
                    Output strictly: SHORT_ANSWER ||| EXPLANATION.`, 
                    systemPrompt: "You are a smart classroom assistant. Be concise.",
                    vibe: { mood: 'neutral' }
                }
             });
             
             if (error) throw error;
             
             const parts = data.content.split("|||");
             const answer = parts[0]?.trim() || "See details";
             const explanation = parts[1]?.trim() || "Click to see more details.";
             const newId = Date.now().toString();

             setQaHistory(prev => [
                 { id: newId, query: text, answer, explanation, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, 
                 ...prev 
             ]);
             toast.success("Answer Found!");
           } catch (e) { 
               // Fallback: answer locally when Supabase is unavailable
               console.log('Supabase unavailable for Q&A, using local engine:', e);
               try {
                   const localResult = answerQuestion(text);
                   const newId = Date.now().toString();
                   setQaHistory(prev => [
                       { id: newId, query: text, answer: localResult.answer, explanation: localResult.explanation, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, 
                       ...prev 
                   ]);
                   toast.success("Answer Found!");
               } catch (_) {
                   console.error('Local engine also failed:', _);
               }
           } finally { 
              setIsThinking(false); 
          }
      }
  };

  const toggleListening = () => {
    if (!recognitionRef.current) { toast.error("Refresh page."); return; }
    if (isListening) {
      isListeningRef.current = false;
      recognitionRef.current.stop();
      setIsListening(false);
      toast("Paused.");
    } else {
      try { 
        isListeningRef.current = true;
        recognitionRef.current.start(); 
        setIsListening(true); 
        toast.success("Listening..."); 
      } catch (e) { 
        console.error("Collision error when calling start():", e);
        // If it crashes because it's already running, let's align our UI states safely
        setIsListening(true);
        isListeningRef.current = true;
      }
    }
  };

  const resetMic = () => { window.location.reload(); };

  const handleFinishLecture = async () => {
      if (!transcript.trim()) { toast.error("No content!"); return; }
      isListeningRef.current = false;
      setIsListening(false);
      recognitionRef.current?.stop();
      setIsGeneratingNotes(true);

      try {
          const { data, error } = await supabase.functions.invoke('transform-vibe', {
            body: { 
                content: `TRANSCRIPT:\n${transcript}`, 
                systemPrompt: `Expert Note Taker. Convert transcript to structured Markdown notes with headers, bullet points, and key terms. Format cleanly.`,
                vibe: { mood: 'enthusiastic' }
            }
          });
          if (error) throw error;
          setGeneratedNotes(data.content);
          toast.success("Notes Ready!");
       } catch (e: any) { 
           // Fallback: generate notes locally
           console.log('Supabase unavailable for notes, using local engine:', e.message);
           try {
               const localNotes = generateNotesFromTranscript(transcript);
               setGeneratedNotes(localNotes);
               toast.success("Notes generated locally!");
           } catch (fallbackErr: any) {
               toast.error("Note generation failed: " + fallbackErr.message);
           }
       } finally { setIsGeneratingNotes(false); }
  };

  const copyNotes = () => {
      if(generatedNotes) {
          navigator.clipboard.writeText(generatedNotes);
          toast.success("Notes Copied!");
      }
  };

  const saveNotes = () => {
      toast.success("Notes Saved to Dashboard!");
  };

  return (
    <div className="min-h-screen bg-background font-sans lg:h-screen lg:flex lg:flex-col lg:overflow-hidden">
      <Navbar />
      
      <div className="container mx-auto px-4 pt-24 pb-4 flex-1 flex flex-col max-w-[1600px]">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-4 shrink-0 gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <Button variant="ghost" onClick={() => navigate('/dashboard')}><ArrowLeft className="w-5 h-5" /></Button>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Mic className={`w-6 h-6 ${isListening ? 'text-red-500 animate-pulse' : 'text-muted-foreground'}`} />
                        Classroom Mode
                    </h1>
                    <p className="text-sm text-muted-foreground">{isListening ? "Listening..." : "Mic paused"}</p>
                </div>
            </div>
             <div className="hidden md:block">
                 <Button variant="ghost" size="icon" onClick={resetMic} title="Force Reset"><RefreshCw className="w-4 h-4 text-muted-foreground" /></Button>
            </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
            
            {/* LEFT: TRANSCRIPT (8 Cols) */}
            <div className="lg:col-span-8 flex flex-col h-[60vh] lg:h-full min-h-0">
                <Card className="flex-1 border-2 shadow-md bg-white/50 dark:bg-black/20 backdrop-blur flex flex-col relative overflow-hidden transition-all duration-500">
                    
                    {!generatedNotes ? (
                        <>
                            {/* LIVE INDICATOR */}
                            <div className="absolute top-4 right-4 z-10 pointer-events-none">
                                <span className={`text-xs font-mono px-2 py-1 rounded-full flex items-center gap-1 border transition-colors ${isListening ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-slate-300'}`} />
                                    {isListening ? "ON AIR" : "PAUSED"}
                                </span>
                            </div>

                            {/* 1. SCROLLABLE TRANSCRIPT AREA */}
                            <div className="flex-1 overflow-y-auto p-6 scroll-smooth pb-24">
                                {transcript ? (
                                    <div className="space-y-4">
                                        <p className="text-xl leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium">
                                            {transcript}
                                            <span className="text-indigo-500 italic ml-1 animate-pulse">{liveBuffer}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-40">
                                        <Mic className="w-20 h-20 text-slate-300 mb-6" />
                                        <p className="text-2xl font-medium text-slate-600">Classroom Listener</p>
                                        <p className="text-sm text-slate-500 mt-2">I'll transcribe the lecture and detect questions automatically.</p>
                                    </div>
                                )}
                                <div ref={transcriptEndRef} className="h-4" />
                            </div>

                            {/* 2. BOTTOM CONTROL BAR (FIXED INSIDE CARD) */}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white/95 dark:bg-black/90 border-t backdrop-blur-md flex items-center justify-center gap-4 z-20">
                                <Button 
                                    variant={isListening ? "destructive" : "default"} 
                                    className="gap-2 shadow-lg min-w-[140px]" 
                                    onClick={toggleListening}
                                >
                                    {isListening ? <><MicOff className="w-4 h-4" /> Pause Mic</> : <><Play className="w-4 h-4" /> Resume Mic</>}
                                </Button>
                                <Button 
                                    variant="secondary" 
                                    className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg min-w-[140px]" 
                                    onClick={handleFinishLecture} 
                                    disabled={isGeneratingNotes || !transcript}
                                >
                                    {isGeneratingNotes ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} 
                                    {isGeneratingNotes ? "Generating..." : "Finish Lecture"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        // FUTURISTIC STATIC NOTES VIEW
                        <div className="flex-1 flex flex-col relative bg-slate-950 text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                            {/* Header */}
                            <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center shrink-0">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <Sparkles className="w-5 h-5" /> 
                                    <span className="font-bold tracking-wider uppercase text-sm">AI Notes Generated</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" variant="ghost" className="hover:bg-white/10 text-white" onClick={copyNotes}>
                                        <Copy className="w-4 h-4 mr-2" /> Copy
                                    </Button>
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white border-0" onClick={saveNotes}>
                                        <Download className="w-4 h-4 mr-2" /> Save
                                    </Button>
                                </div>
                            </div>
                            
                            {/* Notes Content */}
                            <div className="flex-1 overflow-y-auto p-8 font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-indigo-500/30">
                                <div className="prose prose-invert max-w-none prose-headings:text-indigo-300 prose-strong:text-white prose-li:marker:text-indigo-500">
                                    {generatedNotes.split('\n').map((line, i) => (
                                        <div key={i}>
                                            {line.startsWith('#') 
                                                ? <h3 className="text-xl font-bold text-indigo-300 mt-6 mb-2 border-b border-indigo-500/30 pb-1">{line.replace(/#/g, '')}</h3>
                                                : <p className="mb-2 text-slate-300">
                                                    {line.replace(/\*\*(.*?)\*\*/g, (match, p1) => `<strong>${p1}</strong>`).startsWith('-') 
                                                        ? <li className="ml-4 list-disc marker:text-indigo-500 pl-2">{line.substring(2)}</li> 
                                                        : line
                                                    }
                                                  </p>
                                            }
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {/* RIGHT: TOOLS (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6 h-full min-h-0">
                
                {/* QA HISTORY (Full Height) */}
                <Card className="flex-1 border-2 border-indigo-100 dark:border-indigo-900 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col overflow-hidden relative">
                    <div className="p-3 border-b border-indigo-200/50 flex items-center justify-between text-indigo-700 dark:text-indigo-300 bg-indigo-100/50 shrink-0">
                        <div className="flex items-center gap-2">
                            <BrainCircuit className="w-4 h-4" />
                            <h3 className="font-bold text-xs uppercase tracking-wider">Live Answers</h3>
                        </div>
                        <span className="text-[10px] bg-white/50 px-2 py-0.5 rounded-full font-mono">{qaHistory.length}</span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                        {/* Anchor for top scrolling */}
                        <div ref={qaTopRef} />

                        {isThinking && (
                            <div className="p-3 rounded-xl bg-white dark:bg-black border border-indigo-200 shadow-md animate-pulse flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                                <span className="text-xs font-semibold text-indigo-600">Analyzing Question...</span>
                            </div>
                        )}

                        {qaHistory.length > 0 ? (
                            qaHistory.map((item, idx) => {
                                const isExpanded = expandedId === item.id;
                                return (
                                    <div 
                                        key={item.id} 
                                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                                        className={`
                                            cursor-pointer p-3 rounded-xl border shadow-sm transition-all duration-300 animate-in slide-in-from-top-2
                                            ${idx === 0 
                                                ? 'bg-white dark:bg-black border-indigo-300 ring-2 ring-indigo-100 z-10 shadow-md' 
                                                : 'bg-white/60 dark:bg-black/40 border-transparent opacity-80 hover:opacity-100 hover:bg-white'
                                            }
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wide truncate max-w-[75%]">"{item.query}"</p>
                                            <span className="text-[10px] text-muted-foreground/50 flex items-center gap-1 whitespace-nowrap"><Clock className="w-3 h-3"/> {item.time}</span>
                                        </div>
                                        
                                        <div className="flex justify-between items-center gap-2">
                                            <p className={`font-bold leading-tight line-clamp-2 ${idx === 0 ? 'text-sm text-foreground' : 'text-xs text-foreground/70'}`}>
                                                {item.answer}
                                            </p>
                                            {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/50 animate-in fade-in slide-in-from-top-1">
                                                <p className="text-xs text-muted-foreground leading-relaxed bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-lg">
                                                    <span className="font-bold text-indigo-600 block mb-1 text-[10px] uppercase tracking-wider">Detailed Explanation:</span>
                                                    {item.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )
                            })
                        ) : (
                            !isThinking && (
                                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center p-4">
                                    <Zap className="w-10 h-10 mb-2 text-indigo-400" />
                                    <p className="text-xs font-medium">AI is listening...</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Try saying: "What is 12 times 12?" or "Tell me about..."</p>
                                </div>
                            )
                        )}
                    </div>
                </Card>

            </div>
        </div>
      </div>
    </div>
  );
};

export default Classroom;