// Shared visual constants for the Command Center redesign.
// Colors here mirror the HSL CSS vars in src/index.css and should only be used
// where a raw hex is required (e.g. canvas drawing) instead of Tailwind classes.

export const BRAND_COLORS = {
  background: "#FAFAFE",
  backgroundAlt: "#F8F7FC",
  primary: "#6D35FF",
  accent: "#C026D3",
  text: "#111827",
  muted: "#6B7280",
  border: "#E8E4F5",
} as const;

export const RADIUS = {
  sm: "1rem",
  md: "1.25rem",
  lg: "1.5rem",
  xl: "1.75rem",
} as const;

export const SPACING_UNIT = 8;

export const CONTAINER_CLASS = "w-full max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8";

export const CARD_CLASS = "rounded-2xl border border-border bg-card shadow-sm";
