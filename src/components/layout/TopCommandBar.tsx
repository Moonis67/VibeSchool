import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileSummary } from "@/hooks/useProfileSummary";
import { useVibe } from "@/lib/vibeStore";
import { Menu, Search, Sparkles, User } from "lucide-react";

interface TopCommandBarProps {
  onOpenMobileNav: () => void;
}

export const TopCommandBar = ({ onOpenMobileNav }: TopCommandBarProps) => {
  const navigate = useNavigate();
  const { fullName, avatarUrl } = useProfileSummary();
  const { mood, subject, level, timeAvailable } = useVibe();
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;
    navigate(`/transform?mode=learn&topic=${encodeURIComponent(trimmed)}`);
  };

  return (
    <header className="sticky top-0 z-30 h-16 shrink-0 flex items-center gap-3 border-b bg-white px-4 lg:px-6" style={{ borderColor: '#E8E4F5' }}>
      {/* Mobile menu */}
      <Button size="icon" variant="ghost" className="lg:hidden shrink-0" onClick={onOpenMobileNav}>
        <Menu className="w-5 h-5" />
      </Button>

      {/* Center: Search */}
      <form onSubmit={handleSubmit} className="flex-1 max-w-xl mx-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sources or ask VibeSchool…"
            className="pl-9 h-9 rounded-xl bg-[#F8F7FC] border-[#E8E4F5] text-sm focus-visible:ring-2 focus-visible:ring-[#6D35FF]"
          />
        </div>
      </form>

      {/* Right: Vibe chip + Profile */}
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFF] text-[#6D35FF] px-3 py-1.5 text-[11px] font-bold">
          <Sparkles className="w-3 h-3" />
          {level || "University"} · {mood || "Hype"} · {timeAvailable || "15"}m
        </span>
        <button
          type="button"
          onClick={() => navigate("/profile")}
          className="w-9 h-9 rounded-full bg-[#F3EEFF] overflow-hidden flex items-center justify-center border border-[#E8E4F5] hover:border-[#6D35FF] transition-colors"
          title={fullName || "Profile"}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" />
          ) : (
            <User className="w-4 h-4 text-[#6B7280]" />
          )}
        </button>
      </div>
    </header>
  );
};
