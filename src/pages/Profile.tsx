// src/pages/Profile.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Camera, Save, ArrowLeft, User } from "lucide-react";

const Profile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const allowedAvatarTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/");
        return;
      }

      // FIXED: Changing to .maybeSingle() tolerates uninitialized rows safely
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;

      setFullName(data?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "Scholar");
      setAvatarUrl(data?.avatar_url || user.user_metadata?.avatar_url || null);
    } catch {
      toast.error("Failed to load profile parameters.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      if (!allowedAvatarTypes.has(file.type) || file.size > 5 * 1024 * 1024) {
        throw new Error("Invalid avatar upload.");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired.");

      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // FIXED: Content type overrides protect binary streams against .jfif browser detection errors
      const forcedContentType = (fileExt === 'jfif' || fileExt === 'jpg' || fileExt === 'jpeg') 
        ? 'image/jpeg' 
        : (file.type || 'image/jpeg');

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { 
          upsert: true,
          contentType: forcedContentType
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      // FIXED: Changing to .upsert() initializes the profile database row dynamically if it wasn't there
      const { error: updateError } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id,
          avatar_url: publicUrl 
        });

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Profile photo synchronized!");
    } catch {
      toast.error("File upload failed. Use a JPG, PNG, or WebP image under 5 MB.");
    } finally {
      setUploading(false);
    }
  };

  const saveProfileData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired.");

      // FIXED: Changing to .upsert() creates the profile mapping row if missing
      const { error } = await supabase
        .from("profiles")
        .upsert({ 
          id: user.id,
          full_name: fullName, 
          updated_at: new Date().toISOString() 
        });

      if (error) throw error;
      toast.success("Changes saved successfully!");
      navigate("/dashboard");
    } catch {
      toast.error("Could not save profile changes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <div className="app-container pt-10 pb-12 max-w-md">

        <Button variant="ghost" className="mb-6 gap-2 rounded-xl" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="w-4 h-4" /> Back to Command Center
        </Button>

        <Card className="p-8 rounded-2xl border border-border shadow-md bg-card">
          <h2 className="text-xl font-extrabold mb-6 text-center tracking-tight">Edit Account Profile</h2>
          
          <div className="flex flex-col items-center gap-6">
            {/* AVATAR UPLOAD TRIGGER ZONE */}
            <div className="relative w-28 h-28">
              <div className="w-28 h-28 rounded-full border-4 border-primary/20 overflow-hidden flex items-center justify-center bg-muted">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-12 h-12 text-muted-foreground/30" />
                )}
              </div>
              <Label htmlFor="profile-upload-file" className="absolute bottom-0 right-0 p-2.5 bg-primary text-primary-foreground rounded-full cursor-pointer hover:scale-105 transition-transform shadow-lg border-2 border-background flex items-center justify-center">
                {uploading ? <Loader2 className="animate-spin w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </Label>
              <input id="profile-upload-file" type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
            </div>

            {/* IDENTITY TEXT ZONE */}
            <div className="w-full space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullname-field" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <Input id="fullname-field" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter display name..." className="h-11 bg-background" />
              </div>

              <Button onClick={saveProfileData} disabled={loading || uploading} className="w-full h-11 font-bold gap-2 mt-2">
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                Save and Return
              </Button>
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
};

export default Profile;
