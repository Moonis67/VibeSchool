import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, GraduationCap, ArrowLeft, Sparkles } from "lucide-react";

const features = [
  {
    title: "5 Content Transformations",
    description: "Transform up to 5 pieces of content per month into personalized learning modules.",
  },
  {
    title: "3 Learning Styles",
    description: "Choose from Analogies, Examples, or Step-by-Step explanations.",
  },
  {
    title: "Basic Time Sprints",
    description: "Optimize content for 5 or 10 minute learning sessions.",
  },
  {
    title: "Community Support",
    description: "Access our community forums for help and tips from fellow learners.",
  },
];

const FreePlan = () => {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background" />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

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
            <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <GraduationCap className="w-10 h-10 text-foreground" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Free <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Perfect for trying out Vibe School and experiencing personalized learning.
            </p>
            <div className="mt-6">
              <span className="text-6xl font-bold">$0</span>
              <span className="text-muted-foreground text-xl ml-2">forever</span>
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
              <Card key={index} className="p-6 bg-background/60 backdrop-blur-lg border-muted/40">
                <CardContent className="p-0">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-primary" />
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
            <Card className="p-8 bg-background/60 backdrop-blur-lg border-muted/40">
              <h2 className="text-2xl font-bold mb-4">Ready to Start Learning?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Sign up now and get instant access to 5 free content transformations every month.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/auth">
                  <Button size="lg" className="w-full sm:w-auto shadow-lg shadow-primary/20">
                    <Sparkles className="w-5 h-5 mr-2" />
                    Create Free Account
                  </Button>
                </Link>
                <Link to="/#pricing">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Compare Plans
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </main>
  );
};

export default FreePlan;