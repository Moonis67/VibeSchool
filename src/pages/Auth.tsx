import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Sparkles, Mail, Lock, Loader2, ArrowRight, ArrowLeft,
  Eye, EyeOff, BrainCircuit, Mic, LayoutGrid, CheckCircle2, KeyRound,
} from "lucide-react";
import vibeschoolLogo from "@/assets/vibeschool-logo-full.png";

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error || "");

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
  </svg>
);

const FEATURES = [
  { icon: BrainCircuit, title: "RAG-grounded AI Professor", desc: "Answers pulled from your own notes and PDFs, not generic web knowledge." },
  { icon: Mic, title: "Live Classroom mode", desc: "Real-time lecture transcription with instant, hands-free Q&A." },
  { icon: LayoutGrid, title: "A full Knowledge Library", desc: "Curated video lessons, core concepts, and practice questions, ready to go." },
];

type View = "auth" | "forgot" | "forgot-sent" | "recovery";

const Auth = () => {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("auth");
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && view !== "recovery") navigate("/dashboard");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setView("recovery");
        return;
      }
      if (session && view !== "recovery") navigate("/dashboard");
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleOAuthSignIn = async (provider: "google") => {
    setIsOAuthLoading(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw error;
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || `Failed to sign in with ${provider}`);
      setIsOAuthLoading(null);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLogin && password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created! Check your inbox to confirm your email.");
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error);
      if (message.includes("Invalid login credentials")) {
        toast.error("Incorrect email or password.");
      } else if (message.includes("User already registered")) {
        toast.error("This email is already taken. Try signing in instead.");
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) throw error;
      setView("forgot-sent");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Couldn't send the reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Password updated. Welcome back!");
      navigate("/dashboard");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Couldn't update your password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Branding panel */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] relative flex-col justify-between overflow-hidden p-12 text-white bg-gradient-to-br from-[hsl(258,100%,61%)] to-[hsl(288,75%,47%)]">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />

        <Link to="/" className="relative z-10">
          <img src={vibeschoolLogo} alt="VibeSchool" className="h-8 w-auto brightness-0 invert" />
        </Link>

        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
              Learn anything,<br />on your vibe.
            </h1>
            <p className="text-white/80 text-base max-w-sm leading-relaxed">
              An AI professor grounded in your own material — lectures, flashcards, and quizzes shaped to your mood, level, and time.
            </p>
          </div>

          <div className="space-y-5">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{f.title}</p>
                  <p className="text-white/70 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/60 text-xs">
          Trusted by 12K+ learners &middot; 98% satisfaction rate
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        <div className="lg:hidden absolute top-0 left-0 right-0 flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <img src={vibeschoolLogo} alt="VibeSchool" className="h-6 w-auto" />
        </div>

        <div className="w-full max-w-sm">
          {view === "recovery" ? (
            <Card className="p-8 border-muted/50 shadow-2xl rounded-2xl">
              <div className="text-center space-y-2 mb-6">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <KeyRound className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
                <p className="text-muted-foreground text-sm">Choose a new password for your account.</p>
              </div>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    className="pl-9 pr-9 h-11 rounded-xl"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Update password
                </Button>
              </form>
            </Card>
          ) : view === "forgot" || view === "forgot-sent" ? (
            <Card className="p-8 border-muted/50 shadow-2xl rounded-2xl">
              {view === "forgot-sent" ? (
                <div className="text-center space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 rounded-2xl bg-primary/10">
                      <CheckCircle2 className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight">Check your inbox</h1>
                  <p className="text-muted-foreground text-sm">
                    We sent a password reset link to <span className="font-medium text-foreground">{email}</span>.
                  </p>
                  <Button
                    variant="ghost"
                    className="mt-2 gap-2 rounded-xl"
                    onClick={() => { setView("auth"); setIsLogin(true); }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to sign in
                  </Button>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2 mb-6">
                    <div className="flex justify-center mb-4">
                      <div className="p-3 rounded-2xl bg-primary/10">
                        <KeyRound className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
                    <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link.</p>
                  </div>
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="name@example.com"
                        className="pl-9 h-11 rounded-xl"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <Button type="submit" className="w-full h-11 rounded-xl text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                      Send reset link
                    </Button>
                    <button
                      type="button"
                      onClick={() => setView("auth")}
                      className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to sign in
                    </button>
                  </form>
                </>
              )}
            </Card>
          ) : (
            <>
              <div className="text-center space-y-2 mb-6">
                <div className="flex justify-center mb-4 lg:hidden">
                  <div className="p-3 rounded-2xl bg-primary/10">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {isLogin ? "Welcome back" : "Create your account"}
                </h1>
                <p className="text-muted-foreground">
                  {isLogin ? "Sign in to pick up where you left off" : "Start learning at your own vibe, in minutes"}
                </p>
              </div>

              <Card className="p-8 border-muted/50 shadow-2xl rounded-2xl bg-card/80 backdrop-blur-md">
                <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-secondary">
                  <button
                    type="button"
                    onClick={() => setIsLogin(true)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-all ${isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsLogin(false)}
                    className={`h-9 rounded-lg text-sm font-semibold transition-all ${!isLogin ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Sign Up
                  </button>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      className="pl-9 bg-background/50 h-11 rounded-xl"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="pl-9 pr-9 bg-background/50 h-11 rounded-xl"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {isLogin && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setView("forgot")}
                          className="text-xs font-medium text-primary hover:text-primary/80 hover:underline transition-all"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  {!isLogin && (
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm password"
                        className="pl-9 bg-background/50 h-11 rounded-xl"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  <Button type="submit" className="w-full h-11 rounded-xl text-base shadow-lg shadow-primary/20" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    {isLogin ? "Sign In" : "Create Account"}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-muted" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  type="button"
                  disabled={isLoading || !!isOAuthLoading}
                  onClick={() => handleOAuthSignIn("google")}
                  className="w-full border-muted/50 hover:bg-muted/20 h-11 rounded-xl text-sm flex items-center justify-center gap-2"
                >
                  {isOAuthLoading === "google" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <GoogleIcon className="h-4 w-4" />
                  )}
                  Continue with Google
                </Button>

                {!isLogin && (
                  <p className="mt-5 text-center text-xs text-muted-foreground leading-relaxed">
                    By signing up, you agree to our{" "}
                    <Link to="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>
                    {" "}and{" "}
                    <Link to="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>.
                  </p>
                )}
              </Card>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="font-semibold text-primary hover:text-primary/80 hover:underline transition-all"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Auth;
