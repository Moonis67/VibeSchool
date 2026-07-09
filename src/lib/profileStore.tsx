import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrl } from "@/lib/avatar";

// Single shared source of truth for name/avatar, mirroring vibeStore.tsx's
// pattern. Before this, SidebarNav/TopCommandBar/MobileNavigation/Dashboard
// each ran their own independent Supabase fetch on mount — the shell
// components (sidebar/header) mount once and stay mounted across route
// changes, so changing the avatar on the Profile page never reached them
// without a full page reload. Now everyone reads from (and can push updates
// into) this one context instead.

interface ProfileState {
  fullName: string;
  avatarUrl: string | null;
}

interface ProfileContextValue extends ProfileState {
  refreshProfile: () => Promise<void>;
  setProfile: (patch: Partial<ProfileState>) => void;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Scholar");
      setAvatarUrl(resolveAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url, user.id));
    } catch {
      // Silent — shell chrome shouldn't toast on a background profile fetch.
    }
  }, []);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  // Optimistic local update — lets the page that just changed something
  // (e.g. Profile.tsx right after an avatar upload) push the new value in
  // immediately everywhere, without waiting on a network round-trip.
  const setProfile = (patch: Partial<ProfileState>) => {
    if (patch.fullName !== undefined) setFullName(patch.fullName);
    if (patch.avatarUrl !== undefined) setAvatarUrl(patch.avatarUrl);
  };

  return (
    <ProfileContext.Provider value={{ fullName, avatarUrl, refreshProfile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfileSummary = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileSummary must be used within a ProfileProvider");
  return ctx;
};
