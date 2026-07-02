import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Upload, Database, Cpu, Sparkles, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Content Ingestion",
    description: "Upload any educational material - PDFs, videos, articles. Our system processes and understands the content.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    number: "02",
    icon: Database,
    title: "Vectorization & RAG",
    description: "Content is transformed into searchable vectors. RAG ensures accuracy by grounding all outputs in source material.",
    color: "from-violet-500 to-purple-500",
  },
  {
    number: "03",
    icon: Cpu,
    title: "Personalization Engine",
    description: "Your 'vibe check' - time, mood, and learning style preferences are captured and processed.",
    color: "from-orange-500 to-rose-500",
  },
  {
    number: "04",
    icon: Sparkles,
    title: "Dynamic Transformation",
    description: "AI generates your personalized learning module, perfectly adapted to how you learn best.",
    color: "from-emerald-500 to-teal-500",
  },
];

export const HowItWorksSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-secondary/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-50" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--muted-foreground) / 0.1) 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            How Vibe School <span className="text-gradient">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Our RAG-Driven Pipeline ensures both personalization and academic accuracy.
          </p>
        </motion.div>

        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: index * 0.15 }}
                className="relative"
              >
                <div className="bg-card rounded-3xl p-8 shadow-lg border border-border h-full relative z-10">
                  {/* Step Number */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg">
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-6 shadow-lg`}>
                    <step.icon className="w-8 h-8 text-primary-foreground" />
                  </div>

                  <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-4 z-20 w-8 h-8 rounded-full bg-background border border-border items-center justify-center">
                    <ArrowRight className="w-4 h-4 text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        {/* RAG Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 p-8 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20"
        >
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Database className="w-8 h-8 text-primary-foreground" />
            </div>
            <div>
              <h3 className="text-xl font-bold mb-2">RAG Integrity Layer</h3>
              <p className="text-muted-foreground">
                RAG (Retrieval-Augmented Generation) ensures the AI retrieves facts directly from the Vector Database 
                (your source material) before generating personalized output. This strictly grounds the content, 
                ensuring academic integrity and avoiding "hallucinations."
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
