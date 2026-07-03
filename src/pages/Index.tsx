import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  ArrowRight,
  Zap,
  Brain,
  Clock,
  Upload,
  WandSparkles,
  SparklesIcon,
  ChevronDown,
  Play,
  BookOpen,
  TrendingUp,
  Users,
  Star,
  Check,
  MousePointerClick,
} from "lucide-react";
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from "framer-motion";


/* ─── constants ──────────────────────────────────────────── */
const heroBackgroundVideo =
  "https://res.cloudinary.com/vlayjihq/video/upload/v1782904803/WhatsApp_Video_2026-07-01_at_3.33.49_PM_xtzvr2.mp4";

const STATS = [
  { value: 12, suffix: "K+", label: "Active Learners" },
  { value: 98, suffix: "%", label: "Satisfaction Rate" },
  { value: 3, suffix: "x", label: "Faster Retention" },
  { value: 500, suffix: "+", label: "Topics Covered" },
];

const MARQUEE_ITEMS = [
  "AI-Powered Learning",
  "Adaptive Content",
  "Smart Flashcards",
  "Mood-Based Study",
  "Time-Aware Lessons",
  "PDF to Knowledge",
  "Style Shifting",
  "Cognitive Matching",
  "Micro-Learning",
  "Deep Dive Mode",
];

const HOW_IT_WORKS = [
  {
    step: "01",
    icon: <Upload className="w-6 h-6" />,
    title: "Upload Your Material",
    desc: "Drop in notes, PDFs, or any study document. Our engine parses everything instantly.",
  },
  {
    step: "02",
    icon: <WandSparkles className="w-6 h-6" />,
    title: "Set Your Vibe",
    desc: "Choose your mood, time limit, and preferred learning style. Feeling tired? Energized? We adapt.",
  },
  {
    step: "03",
    icon: <SparklesIcon className="w-6 h-6" />,
    title: "Learn Transformed Content",
    desc: "Get perfectly tailored study material — flashcards, summaries, stories, or deep dives.",
  },
];

const FEATURES = [
  {
    icon: <Clock className="w-7 h-7" />,
    title: "Time-Adaptive",
    desc: "Have 5 minutes or 50? Content condenses or expands to fit your schedule perfectly.",
    color: "from-blue-500 to-cyan-400",
    bgColor: "bg-blue-500/10",
  },
  {
    icon: <Brain className="w-7 h-7" />,
    title: "Cognitive Matching",
    desc: "Feeling tired? We simplify. Feeling sharp? We go deep. Content adapts to your brain state.",
    color: "from-purple-500 to-pink-400",
    bgColor: "bg-purple-500/10",
  },
  {
    icon: <Zap className="w-7 h-7" />,
    title: "Style Shifting",
    desc: "Learn through analogies, direct facts, or storytelling. You choose how knowledge flows.",
    color: "from-amber-500 to-orange-400",
    bgColor: "bg-amber-500/10",
  },
  {
    icon: <BookOpen className="w-7 h-7" />,
    title: "Multi-Format Output",
    desc: "Get flashcards, summaries, mind-maps, quizzes — all generated from a single upload.",
    color: "from-emerald-500 to-teal-400",
    bgColor: "bg-emerald-500/10",
  },
  {
    icon: <TrendingUp className="w-7 h-7" />,
    title: "Progress Tracking",
    desc: "Visual dashboards show your learning velocity, retention rates, and study streaks.",
    color: "from-rose-500 to-pink-400",
    bgColor: "bg-rose-500/10",
  },
  {
    icon: <MousePointerClick className="w-7 h-7" />,
    title: "One-Click Transform",
    desc: "No complex setup. Upload → Choose vibe → Learn. Three clicks to personalized education.",
    color: "from-indigo-500 to-violet-400",
    bgColor: "bg-indigo-500/10",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "",
    desc: "For casual learners exploring new topics.",
    features: ["3 transforms per day", "Basic study modes", "PDF upload", "Community support"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Pro",
    price: "$12",
    period: "/mo",
    desc: "For serious students who need unlimited power.",
    features: [
      "Unlimited transforms",
      "All study modes",
      "Priority processing",
      "Advanced analytics",
      "Export to Anki",
      "Priority support",
    ],
    cta: "Upgrade to Pro",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    desc: "For schools & organizations needing control.",
    features: [
      "Everything in Pro",
      "Team management",
      "SSO & SAML",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

/* ─── animated counter hook ──────────────────────────────── */
function useCounter(end: number, duration = 2000, startOnView = false) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  useEffect(() => {
    if (startOnView && !inView) return;
    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView, startOnView]);

  return { count, ref };
}

/* ─── reusable section wrapper with reveal ───────────────── */
const SectionReveal = ({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 60 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

/* ─── staggered card wrapper ─────────────────────────────── */
const StaggeredContainer = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ═══════════════════════════════════════════════════════════ */
/*  INDEX PAGE                                                */
/* ═══════════════════════════════════════════════════════════ */

const Index = () => {
  const navigate = useNavigate();

  /* parallax for hero */
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden w-full">
      {/* ──── Navbar ──── */}
      <div className="relative z-50">
        <Navbar />
      </div>

      <main className="flex-1 relative z-10 w-full">
        {/* ═══════════════════════════════════════ */}
        {/*  HERO SECTION                           */}
        {/* ═══════════════════════════════════════ */}
        <section
          ref={heroRef}
          className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
        >
          {/* Video Background with Parallax */}
          <motion.div
            className="absolute inset-0 z-0"
            style={{ y: heroY, scale: heroScale }}
          >
            <video
              className="h-full w-full object-cover"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
            >
              <source src={heroBackgroundVideo} type="video/mp4" />
            </video>
          </motion.div>

          {/* Dark overlay with gradient */}
          <div className="absolute inset-0 z-[1] bg-gradient-to-b from-black/50 via-black/40 to-black/70" />
          <div className="absolute inset-0 z-[1] bg-gradient-to-r from-purple-900/20 via-transparent to-indigo-900/20" />

          {/* Decorative gradient orbs */}
          <div className="absolute top-1/4 left-10 w-[400px] h-[400px] rounded-full bg-primary/15 blur-[120px] pointer-events-none z-[1]" />
          <div className="absolute bottom-1/4 right-10 w-[300px] h-[300px] rounded-full bg-purple-600/15 blur-[100px] pointer-events-none z-[1]" />

          {/* Hero Content */}
          <motion.div
            style={{ opacity: heroOpacity }}
            className="relative z-10 text-center px-6 max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 text-white text-sm font-medium mb-8 backdrop-blur-xl border border-white/15 shadow-2xl"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>The Future of Adaptive Learning</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tighter mb-6 leading-[0.95] text-white"
            >
              Learn at Your{" "}
              <span className="relative inline-block">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400">
                  Frequency
                </span>
                <motion.span
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-violet-400 via-purple-400 to-pink-400 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 1.2, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "left" }}
                />
              </span>
            </motion.h1>

            {/* Sub-headline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.7 }}
              className="text-lg sm:text-xl md:text-2xl text-white/75 mb-12 max-w-2xl mx-auto leading-relaxed font-light"
            >
              Upload your study materials and let AI transform them to match your{" "}
              <span className="text-white font-medium">mood</span>,{" "}
              <span className="text-white font-medium">time</span>, and{" "}
              <span className="text-white font-medium">learning style</span>.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="h-14 px-8 text-lg rounded-full bg-white text-slate-950 shadow-2xl shadow-black/30 hover:bg-white/95 hover:shadow-black/50 hover:scale-105 transition-all duration-300 shimmer font-semibold group"
              >
                Start Transforming
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("preview")?.scrollIntoView({ behavior: "smooth" })
                }
                className="h-14 px-8 text-lg rounded-full border-white/20 bg-white/5 text-white backdrop-blur-xl hover:bg-white/10 hover:border-white/30 transition-all duration-300 group"
              >
                <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Watch Demo
              </Button>
            </motion.div>
          </motion.div>

          {/* Scroll Indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 1 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 scroll-indicator"
          >
            <div className="flex flex-col items-center gap-2 text-white/40">
              <span className="text-xs font-medium tracking-widest uppercase">Scroll</span>
              <ChevronDown className="w-5 h-5" />
            </div>
          </motion.div>
        </section>

        {/* ═══════════════════════════════════════ */}
        {/*  MARQUEE / SOCIAL PROOF TICKER          */}
        {/* ═══════════════════════════════════════ */}
        <div className="py-6 bg-foreground/[0.03] border-y border-border/50 overflow-hidden relative">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="mx-8 text-sm font-medium text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/*  STATS SECTION                          */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal className="py-20 md:py-28 bg-background relative z-10 w-full">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {STATS.map((stat, i) => (
                <StatCard key={i} value={stat.value} suffix={stat.suffix} label={stat.label} />
              ))}
            </div>
          </div>
        </SectionReveal>

        {/* ═══════════════════════════════════════ */}
        {/*  FEATURES GRID                          */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal id="features" className="py-20 md:py-28 bg-gradient-to-b from-background to-secondary/20 relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                <Zap className="w-4 h-4" />
                <span>Powerful Features</span>
              </motion.div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                Everything you need to{" "}
                <span className="text-gradient">learn smarter</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Our AI engine adapts to how you think, feel, and study — so every session is perfectly tailored.
              </p>
            </div>

            {/* Feature Cards */}
            <StaggeredContainer className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((feature, i) => (
                <FeatureCard key={i} {...feature} />
              ))}
            </StaggeredContainer>
          </div>
        </SectionReveal>

        {/* ═══════════════════════════════════════ */}
        {/*  HOW IT WORKS                           */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal id="how-it-works" className="py-20 md:py-28 bg-background relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                <SparklesIcon className="w-4 h-4" />
                <span>Simple Process</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                Three steps to{" "}
                <span className="text-gradient">transformed learning</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Go from raw material to personalized study content in under a minute.
              </p>
            </div>

            {/* Steps */}
            <StaggeredContainer className="grid md:grid-cols-3 gap-8 lg:gap-12 relative">
              {/* Connecting line */}
              <div className="hidden md:block absolute top-24 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              {HOW_IT_WORKS.map((step, i) => (
                <HowItWorksCard key={i} {...step} index={i} />
              ))}
            </StaggeredContainer>
          </div>
        </SectionReveal>

        {/* ═══════════════════════════════════════ */}
        {/*  VIDEO PREVIEW                          */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal id="preview" className="py-20 md:py-28 bg-gradient-to-b from-background to-secondary/10 relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-[0.85fr_1.15fr] gap-12 lg:gap-16 items-center">
              {/* Text */}
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                  <Play className="w-4 h-4" />
                  <span>Quick Preview</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold text-foreground leading-tight tracking-tight">
                  See the magic{" "}
                  <span className="text-gradient">in action</span>
                </h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-lg">
                  Watch how Vibe School transforms a raw PDF into personalized study material
                  — tailored to your energy level, available time, and preferred format.
                </p>
                <Button
                  size="lg"
                  onClick={() => navigate("/dashboard")}
                  className="h-13 px-7 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90 hover:scale-105 transition-all duration-300 shadow-xl shadow-primary/25 shimmer group"
                >
                  Try It Yourself
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </div>

              {/* Video */}
              <div className="relative group">
                {/* Glow behind video */}
                <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

                <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl shadow-black/20 bg-black">
                  <video
                    className="w-full aspect-video object-cover"
                    autoPlay
                    loop
                    muted
                    playsInline
                    preload="auto"
                  >
                    <source src={heroBackgroundVideo} type="video/mp4" />
                  </video>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </SectionReveal>

        {/* ═══════════════════════════════════════ */}
        {/*  PRICING                                */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal id="pricing" className="py-20 md:py-28 bg-background relative z-10 w-full">
          <div className="max-w-7xl mx-auto px-6">
            {/* Section Header */}
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                <Star className="w-4 h-4" />
                <span>Pricing</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
                Simple, transparent{" "}
                <span className="text-gradient">pricing</span>
              </h2>
              <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto">
                Start free. Upgrade when you're ready. No hidden fees, cancel anytime.
              </p>
            </div>

            {/* Pricing Cards */}
            <StaggeredContainer className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto items-start">
              {PRICING.map((plan, i) => (
                <PricingCard key={i} {...plan} navigate={navigate} />
              ))}
            </StaggeredContainer>
          </div>
        </SectionReveal>

        {/* ═══════════════════════════════════════ */}
        {/*  FINAL CTA                              */}
        {/* ═══════════════════════════════════════ */}
        <SectionReveal className="py-20 md:py-28 relative z-10 w-full overflow-hidden">
          <div className="max-w-4xl mx-auto px-6 text-center relative">
            {/* Background Glow */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[100px]" />
            </div>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              <span>Ready to start?</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight leading-tight">
              Transform how you{" "}
              <span className="text-gradient">learn today</span>
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10">
              Join thousands of learners who have already discovered the power of AI-adaptive education.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/dashboard")}
                className="h-14 px-10 text-lg rounded-full bg-gradient-to-r from-primary to-purple-600 text-white shadow-2xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 transition-all duration-300 shimmer font-semibold group"
              >
                Get Started — It's Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <p className="text-muted-foreground/60 text-sm mt-6">
              No credit card required · Free forever plan available
            </p>
          </div>
        </SectionReveal>
      </main>

      {/* ──── Footer ──── */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */
/*  SUB-COMPONENTS                                            */
/* ═══════════════════════════════════════════════════════════ */

/* ── Stat Card ─────────────────────────────────────────── */
const StatCard = ({ value, suffix, label }: { value: number; suffix: string; label: string }) => {
  const { count, ref } = useCounter(value, 2000, true);
  return (
    <motion.div
      variants={cardVariants}
      className="text-center space-y-2"
    >
      <div className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight">
        <span ref={ref}>{count}</span>
        <span className="text-primary">{suffix}</span>
      </div>
      <p className="text-muted-foreground text-sm font-medium">{label}</p>
    </motion.div>
  );
};

/* ── Feature Card ──────────────────────────────────────── */
const FeatureCard = ({
  icon,
  title,
  desc,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  color: string;
  bgColor: string;
}) => (
  <motion.div
    variants={cardVariants}
    className="relative p-8 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-500 group overflow-hidden"
  >
    {/* Hover glow */}
    <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${color} opacity-0 blur-3xl group-hover:opacity-10 transition-opacity duration-700`} />
    
    <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500`}>
      <div className={`bg-gradient-to-br ${color} bg-clip-text`}>
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors duration-300">
      {title}
    </h3>
    <p className="text-muted-foreground leading-relaxed">{desc}</p>
  </motion.div>
);

/* ── How It Works Card ─────────────────────────────────── */
const HowItWorksCard = ({
  step,
  icon,
  title,
  desc,
  index,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  index: number;
}) => (
  <motion.div
    variants={cardVariants}
    className="relative text-center group"
  >
    {/* Step Number */}
    <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-8 shadow-xl shadow-primary/20 group-hover:shadow-primary/40 group-hover:scale-110 transition-all duration-500">
      <div className="text-white">{icon}</div>
      <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-foreground text-background text-xs font-bold flex items-center justify-center shadow-lg">
        {step}
      </div>
    </div>
    <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
    <p className="text-muted-foreground leading-relaxed max-w-sm mx-auto">{desc}</p>
  </motion.div>
);

/* ── Pricing Card ──────────────────────────────────────── */
const PricingCard = ({
  name,
  price,
  period,
  desc,
  features,
  cta,
  popular,
  navigate,
}: {
  name: string;
  price: string;
  period: string;
  desc: string;
  features: string[];
  cta: string;
  popular: boolean;
  navigate: (path: string) => void;
}) => (
  <motion.div
    variants={cardVariants}
    className={`relative p-8 rounded-3xl flex flex-col transition-all duration-500 group ${
      popular
        ? "bg-gradient-to-b from-primary/5 to-purple-600/5 border-2 border-primary shadow-2xl shadow-primary/15 scale-[1.02] lg:scale-105"
        : "bg-card border border-border/50 hover:border-primary/30 hover:shadow-xl"
    }`}
  >
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 rounded-full bg-gradient-to-r from-primary to-purple-600 text-white text-xs font-bold shadow-lg shadow-primary/30 uppercase tracking-wider">
        Most Popular
      </div>
    )}

    <div className="mb-8">
      <h3 className={`text-lg font-bold mb-2 ${popular ? "text-primary" : "text-foreground"}`}>
        {name}
      </h3>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-5xl font-extrabold text-foreground">{price}</span>
        {period && <span className="text-muted-foreground text-lg">{period}</span>}
      </div>
      <p className="text-muted-foreground text-sm">{desc}</p>
    </div>

    {/* Features List */}
    <ul className="space-y-3 mb-8 flex-1">
      {features.map((feature, j) => (
        <li key={j} className="flex items-start gap-3 text-sm">
          <Check className={`w-4 h-4 mt-0.5 shrink-0 ${popular ? "text-primary" : "text-emerald-500"}`} />
          <span className="text-foreground/80">{feature}</span>
        </li>
      ))}
    </ul>

    <Button
      onClick={() => {
        if (name === "Free") navigate("/dashboard");
        else if (name === "Pro") navigate("/pricing/pro");
        else navigate("/pricing/enterprise");
      }}
      className={`w-full h-13 rounded-xl font-semibold transition-all duration-300 ${
        popular
          ? "bg-gradient-to-r from-primary to-purple-600 text-white hover:opacity-90 shadow-lg shadow-primary/25 shimmer"
          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
      }`}
    >
      {cta}
    </Button>
  </motion.div>
);

export default Index;