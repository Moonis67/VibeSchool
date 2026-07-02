import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Sparkles, Building2, GraduationCap } from "lucide-react";

const plans = [
  {
    name: "Free",
    description: "Perfect for trying out Vibe School",
    price: "$0",
    period: "forever",
    icon: GraduationCap,
    features: [
      "5 content transformations/month",
      "3 learning styles",
      "Basic time sprints (5, 10 min)",
      "Community support",
    ],
    cta: "Start Free",
    variant: "outline" as const,
    popular: false,
    href: "/pricing/free",
  },
  {
    name: "Pro",
    description: "For serious learners",
    price: "$12",
    period: "/month",
    icon: Sparkles,
    features: [
      "Unlimited transformations",
      "All learning styles & moods",
      "Custom time sprints",
      "Priority AI processing",
      "Progress analytics",
      "Priority support",
    ],
    cta: "Get Pro",
    variant: "hero" as const,
    popular: true,
    href: "/pricing/pro",
  },
  {
    name: "Enterprise",
    description: "For schools & institutions",
    price: "Custom",
    period: "pricing",
    icon: Building2,
    features: [
      "Everything in Pro",
      "Bulk user licensing",
      "Admin analytics dashboard",
      "Custom curriculum integration",
      "White-labeling options",
      "Dedicated account manager",
    ],
    cta: "Contact Sales",
    variant: "outline" as const,
    popular: false,
    href: "/pricing/enterprise",
  },
];

export const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-background relative">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Simple, <span className="text-gradient">Transparent</span> Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            Start free and scale as you grow. No hidden fees, no surprises.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className={`relative ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-primary text-primary-foreground text-sm font-medium shadow-glow z-10">
                  Most Popular
                </div>
              )}
              <Card className={`h-full ${plan.popular ? 'border-2 border-primary shadow-glow' : 'border-border'}`}>
                <CardHeader className="text-center pb-2">
                  <div className={`w-14 h-14 mx-auto rounded-2xl ${plan.popular ? 'bg-gradient-primary' : 'bg-secondary'} flex items-center justify-center mb-4`}>
                    <plan.icon className={`w-7 h-7 ${plan.popular ? 'text-primary-foreground' : 'text-foreground'}`} />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="text-center mb-6">
                    <span className="text-5xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    variant={plan.variant} 
                    className="w-full" 
                    size="lg"
                    asChild
                  >
                    <Link to={plan.href}>{plan.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
