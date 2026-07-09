import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Lightweight, additive personalization store. It is intentionally separate from
// Transform.tsx's internal generation state (eduLevel/mood/timeAvailable/etc.) —
// Transform seeds its local state from this on mount and pushes changes back,
// but its generation pipeline never reads from here directly.

export interface VibeState {
  subject: string;
  level: string;
  mood: string;
  timeAvailable: string;
  mode: "learn" | "quiz" | "visualize" | "plan";
}

const DEFAULT_VIBE: VibeState = {
  subject: "Computer Science",
  level: "university",
  mood: "enthusiastic",
  timeAvailable: "15",
  mode: "learn",
};

const STORAGE_KEY = "vibeschool.vibe";

interface VibeContextValue extends VibeState {
  setVibe: (patch: Partial<VibeState>) => void;
}

const VibeContext = createContext<VibeContextValue | null>(null);

const readStoredVibe = (): VibeState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIBE;
    return { ...DEFAULT_VIBE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VIBE;
  }
};

export const VibeProvider = ({ children }: { children: ReactNode }) => {
  const [vibe, setVibeState] = useState<VibeState>(readStoredVibe);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vibe));
    } catch {
      // ignore storage failures (private browsing, quota, etc.)
    }
  }, [vibe]);

  const setVibe = (patch: Partial<VibeState>) => {
    setVibeState((prev) => ({ ...prev, ...patch }));
  };

  return <VibeContext.Provider value={{ ...vibe, setVibe }}>{children}</VibeContext.Provider>;
};

export const useVibe = () => {
  const ctx = useContext(VibeContext);
  if (!ctx) throw new Error("useVibe must be used within a VibeProvider");
  return ctx;
};
