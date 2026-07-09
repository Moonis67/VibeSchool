import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Mirrors the profile fetch already used in Dashboard.tsx / Profile.tsx so the
// new shell components (sidebar, mobile drawer, top bar) can show the same
// name/avatar without duplicating the Supabase query inline everywhere.
export const useProfileSummary = () => {
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Scholar");
        setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
      } catch {
        // Silent — shell chrome shouldn't toast on a background profile fetch.
      }
    };

    fetchSummary();
    return () => { cancelled = true; };
  }, []);

  return { fullName, avatarUrl };
};
