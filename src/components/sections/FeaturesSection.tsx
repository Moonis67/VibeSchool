import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Brain, Palette, Lightbulb, Shield, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Clock,
    title: "Time-Adaptive Sprints",
    description: "Converts material into 5, 10, or 30-minute micro-sprints based on your available time.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Brain,
    title: "Cognitive Mood Matching",
    description: "Switches delivery tone from 'Strictly Technical' to 'Humorous' or 'Analogy-Heavy'.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Palette,
    title: "Multi-Format Output",
    description: "Generates 'Rapid-Fire Quiz', 'Simplified Analogy', or 'Structured Summary' on demand.",
    gradient: "from-orange-500 to-rose-500",
  },
  {
    icon: Lightbulb,
    title: "Personalized Context",
    description: "Considers your current mood, energy level, and preferred examples for better engagement.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Shield,
    title: "RAG-Verified Accuracy",
    description: "Retrieval-Augmented Generation ensures all content is grounded in source material.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: BarChart3,
    title: "Adaptive Feedback Loops",
    description: "Learns from your performance to continuously optimize content delivery.",
    gradient: "from-pink-500 to-rose-500",
  },
];

export const FeaturesSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="features" className="py-24 lg:py-32 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            The <span className="text-gradient">Vibe Check</span> Engine
          </h2>
          <p className="text-lg text-muted-foreground">
            Traditional EdTech personalizes <strong>what</strong> you learn. 
            Vibe School personalizes <strong>how</strong> you learn.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card variant="feature" className="h-full group cursor-pointer">
                <CardContent className="p-8">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                    <feature.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
