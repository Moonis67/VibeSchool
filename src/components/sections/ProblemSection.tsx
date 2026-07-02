import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { AlertTriangle, Clock, Brain, Frown } from "lucide-react";

const problems = [
  {
    icon: Clock,
    title: "Digital Cognitive Overload",
    description: "Students have 8-12 second attention spans. Traditional long-form content doesn't work anymore.",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
  },
  {
    icon: Brain,
    title: "One-Size-Fits-All Failure",
    description: "Existing EdTech personalizes pace, but ignores cognitive state, mood, and preferred learning style.",
    color: "text-accent",
    bgColor: "bg-accent/10",
  },
  {
    icon: Frown,
    title: "Massive Disengagement",
    description: "Static, non-personalized content leads to procrastination, poor retention, and educational dropout.",
    color: "text-primary",
    bgColor: "bg-primary/10",
  },
];

export const ProblemSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="py-24 lg:py-32 bg-background relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-destructive/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/10 text-destructive text-sm font-medium mb-4">
            <AlertTriangle className="w-4 h-4" />
            <span>The Crisis of Cognitive Context</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            The Problem Isn't the Student
          </h2>
          <p className="text-lg text-muted-foreground">
            It's a failure of the delivery mechanism. Traditional education wasn't designed 
            for the digital age learner.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              className="group"
            >
              <div className="h-full p-8 rounded-3xl bg-card border border-border hover:border-destructive/30 transition-all duration-300 hover:shadow-lg">
                <div className={`w-14 h-14 rounded-2xl ${problem.bgColor} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <problem.icon className={`w-7 h-7 ${problem.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3">{problem.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quote */}
        <motion.blockquote
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-2xl lg:text-3xl font-medium text-foreground/80 italic">
            "It's not a failure of the student; it's a failure of the delivery mechanism."
          </p>
        </motion.blockquote>
      </div>
    </section>
  );
};
