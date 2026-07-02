import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Zap, Brain, Clock, BarChart3, Headphones } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Unlimited Transformations",
    description: "Transform as much content as you need with no monthly limits.",
  },
  {
    icon: Brain,
    title: "All Learning Styles & Moods",
    description: "Access every learning style, mood, and tone option for maximum personalization.",
  },
  {
    icon: Clock,
    title: "Custom Time Sprints",
    description: "Set any duration from 5 to 60+ minutes to match your schedule perfectly.",
  },
  {
    icon: Sparkles,
    title: "Priority AI Processing",
    description: "Your transformations are processed first with our most advanced AI models.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description: "Track your learning patterns, retention rates, and improvement over time.",
  },
  {
    icon: Headphones,
    title: "Priority Support",
    description: "Get fast, dedicated support from our learning specialists.",
  },
];

const ProPlan = () => {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/20 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <Link
          to="/#pricing"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Back to Pricing
        </Link>

        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="inline-block px-4 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4 border border-primary/20">
              Most Popular
            </div>
            <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Pro <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              For serious learners who want unlimited access to personalized content.
            </p>
            <div className="mt-6">
              <span className="text-6xl font-bold">$12</span>
              <span className="text-muted-foreground text-xl ml-2">/month</span>
            </div>
          </motion.div>

          {/* Features Grid */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid sm:grid-cols-2 gap-6 mb-12"
          >
            {features.map((feature, index) => (
              <Card key={index} className="p-6 bg-background/60 backdrop-blur-lg border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
                      <p className="text-muted-foreground">{feature.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <Card className="p-8 bg-gradient-to-br from-background via-background to-primary/5 border-primary/30">
              <h2 className="text-2xl font-bold mb-4">Unlock Your Full Learning Potential</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Join thousands of learners who've transformed their study habits with Pro.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/25">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Get Pro Now
                  </Button>
                </Link>
                <Link to="/#pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto bg-background/50 backdrop-blur-sm">
                    Compare Plans
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                Cancel anytime. No questions asked.
              </p>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default ProPlan;