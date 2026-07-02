import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Sparkles, Target, Lightbulb, CheckCircle2 } from "lucide-react";

const features = [
  {
    icon: Target,
    title: "Dynamic Transformation",
    description: "Transforms content to match your current attention span and preferred learning style.",
  },
  {
    icon: Lightbulb,
    title: "Maximum Retention",
    description: "Optimizes for engagement through personalized, micro-learning modules.",
  },
  {
    icon: CheckCircle2,
    title: "Academic Accuracy",
    description: "Adapts content without compromising the core educational material.",
  },
];

export const SolutionSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-background to-secondary/30 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              <span>The Solution</span>
            </div>
            
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Transformation,{" "}
              <span className="text-gradient">Not Summarization</span>
            </h2>
            
            <p className="text-lg text-muted-foreground mb-8">
              Vibe School is an AI-powered platform that acts as an intelligent mediator 
              between static educational material and the individual student.
            </p>

            <div className="space-y-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={isInView ? { opacity: 1, x: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.15 }}
                  className="flex gap-4"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
                    <feature.icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-1">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Visual */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative bg-card rounded-3xl p-8 shadow-xl border border-border">
              {/* Mock Interface */}
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-destructive" />
                    <div className="w-3 h-3 rounded-full bg-accent" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <div className="text-sm text-muted-foreground">Vibe Check Engine</div>
                </div>

                {/* Vibe Options */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-secondary/50 border-2 border-primary">
                    <div className="text-sm font-medium mb-1">🎯 Time</div>
                    <div className="text-2xl font-bold text-primary">10 min</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border-2 border-transparent">
                    <div className="text-sm font-medium mb-1">🧠 Mood</div>
                    <div className="text-2xl font-bold">Focused</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border-2 border-transparent">
                    <div className="text-sm font-medium mb-1">📚 Style</div>
                    <div className="text-2xl font-bold">Analogies</div>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/50 border-2 border-transparent">
                    <div className="text-sm font-medium mb-1">🎭 Tone</div>
                    <div className="text-2xl font-bold">Technical</div>
                  </div>
                </div>

                {/* Output Preview */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20">
                  <div className="text-sm text-muted-foreground mb-2">Generated Output</div>
                  <div className="text-sm leading-relaxed">
                    "Think of Machine Learning like teaching a child to recognize cats. 
                    You show them hundreds of cat photos, and eventually, they learn the pattern..."
                  </div>
                </div>

                {/* Generate Button */}
                <a href="/transform">
                  <motion.div
                    animate={{ scale: [1, 1.02, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-full py-4 rounded-xl bg-gradient-primary text-center text-primary-foreground font-semibold shadow-glow cursor-pointer hover:shadow-lg transition-shadow"
                  >
                    ✨ Transform My Content
                  </motion.div>
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
