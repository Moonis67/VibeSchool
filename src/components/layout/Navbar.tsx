import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { clearSensitiveClientState } from "@/lib/security";
import vibeschoolLogo from "@/assets/vibeschool-logo-full.png";

export const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    // Check current user
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));

    // Listen for changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    clearSensitiveClientState();
    navigate("/auth");
  };

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Pricing", href: "#pricing" },
  ];

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-background/70 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/5"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center group">
            <img
              src={vibeschoolLogo}
              alt="VibeSchool"
              className={`h-8 w-auto transition-all duration-300 ${
                scrolled ? "" : "brightness-0 invert"
              }`}
            />
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:bg-white/10 ${
                  scrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                }`}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link to="/transform">
                  <Button
                    variant="ghost"
                    className={`hidden md:inline-flex rounded-full text-sm font-medium ${
                      scrolled ? "text-foreground/70 hover:text-foreground" : "text-white/70 hover:text-white"
                    }`}
                  >
                    Workspace
                  </Button>
                </Link>
                <Button
                  size="sm"
                  onClick={handleSignOut}
                  className="rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white hover:bg-white/20 transition-all"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button
                  size="sm"
                  className="rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-lg shadow-black/10 hover:shadow-black/20 hover:scale-105 transition-all duration-300 font-semibold px-5"
                >
                  <User className="w-4 h-4 mr-1.5" />
                  Sign In
                </Button>
              </Link>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-xl transition-colors ${
                scrolled ? "text-foreground" : "text-white"
              }`}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-x-0 top-[72px] z-40 md:hidden bg-background/95 backdrop-blur-2xl border-b border-border p-6 space-y-2 shadow-2xl"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-foreground font-medium hover:bg-secondary transition-colors"
              >
                {link.label}
              </a>
            ))}
            {user && (
              <Link
                to="/transform"
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-foreground font-medium hover:bg-secondary transition-colors"
              >
                Workspace
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
