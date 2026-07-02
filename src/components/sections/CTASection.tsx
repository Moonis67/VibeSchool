import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Lightbulb, Target } from "lucide-react";

export const CTASection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="bg-gradient-to-br from-primary/10 via-accent/5 to-primary/10 rounded-[2.5rem] p-12 lg:p-20 border border-primary/20 relative overflow-hidden">
            {/* Floating Icons */}
            <motion.div
              animate={{ y: [0, -10, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
              className="absolute top-8 left-8 w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg opacity-60"
            >
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0], rotate: [0, -5, 0] }}
              transition={{ duration: 5, repeat: Infinity }}
              className="absolute bottom-8 right-8 w-12 h-12 rounded-xl bg-gradient-accent flex items-center justify-center shadow-lg opacity-60"
            >
              <Lightbulb className="w-6 h-6 text-accent-foreground" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3.5, repeat: Infinity }}
              className="absolute top-1/2 right-[10%] w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center opacity-60"
            >
              <Target className="w-5 h-5 text-success" />
            </motion.div>

            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
                Ready to Transform{" "}
                <span className="text-gradient">Your Learning?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-10">
                A future where education adapts to the individual, not the other way around. 
                We're building the cognitive layer for all educational content.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button variant="hero" size="xl" className="group">
                  Start Learning Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
                <Button variant="outline" size="xl">
                  Schedule a Demo
                </Button>
              </div>

              {/* Trust Badge */}
              <p className="mt-8 text-sm text-muted-foreground">
                No credit card required • Free forever plan • Cancel anytime
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
