// Safe placeholder UI data. Each export notes the real table/column that should
// replace it once the corresponding feature exists on the backend.

export interface WeakTopic {
  topic: string;
  confidence: number; // 0-100
  recommendedAction: string;
  mode: "learn" | "quiz" | "visualize";
}

// TODO: replace with real per-topic scoring once quiz results are persisted.
// Closest real signal today: user_session_history.weak_areas (string[], no confidence score yet).
export const MOCK_WEAK_TOPICS: WeakTopic[] = [
  { topic: "Binary Search", confidence: 62, recommendedAction: "Quiz Mode · 10 questions", mode: "quiz" },
  { topic: "Sorting Algorithms", confidence: 48, recommendedAction: "Ask AI Tutor to re-explain", mode: "learn" },
  { topic: "OOP Concepts", confidence: 71, recommendedAction: "Visualize class relationships", mode: "visualize" },
];

export interface StreakInfo {
  days: number;
  label: string;
}

// TODO: replace with a real streak computed from session/activity history once tracked.
export const MOCK_STREAK: StreakInfo = { days: 0, label: "Start a streak today" };

export interface KnowledgeDoc {
  id: string;
  name: string;
  status: "processed" | "processing" | "failed";
  updatedLabel: string;
}

// TODO: replace with a live query against the `documents` table (file_name, processing_status, processed_at).
export const MOCK_KNOWLEDGE_DOCS: KnowledgeDoc[] = [];
