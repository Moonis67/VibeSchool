import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  ArrowLeft, 
  Users, 
  BarChart3, 
  BookOpen, 
  Palette, 
  UserCheck,
  Check,
  Send
} from "lucide-react";

const features = [
  {
    icon: Check,
    title: "Everything in Pro",
    description: "All Pro features included for every user in your organization.",
  },
  {
    icon: Users,
    title: "Bulk User Licensing",
    description: "Easy onboarding for entire classrooms, departments, or organizations.",
  },
  {
    icon: BarChart3,
    title: "Admin Analytics Dashboard",
    description: "Monitor learning progress across all users with detailed insights.",
  },
  {
    icon: BookOpen,
    title: "Custom Curriculum Integration",
    description: "Integrate your existing curriculum and learning materials seamlessly.",
  },
  {
    icon: Palette,
    title: "White-Labeling Options",
    description: "Brand the platform with your institution's logo and colors.",
  },
  {
    icon: UserCheck,
    title: "Dedicated Account Manager",
    description: "Personal support from a dedicated team member who knows your needs.",
  },
];

const EnterprisePlan = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    users: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // You can add Supabase logic here later to save this to a 'contact_requests' table
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent/20 via-background to-background" />
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

        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <div className="w-20 h-20 mx-auto rounded-2xl bg-secondary flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-foreground" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              Enterprise <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">Plan</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Custom solutions for schools, universities, and organizations.
            </p>
            <div className="mt-6">
              <span className="text-4xl font-bold">Custom Pricing</span>
              <p className="text-muted-foreground mt-2">Tailored to your organization's needs</p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Features */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold mb-6">What's Included</h2>
              <div className="space-y-4">
                {features.map((feature, index) => (
                  <Card key={index} className="p-4 bg-background/60 backdrop-blur-sm">
                    <CardContent className="p-0">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <feature.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 bg-background/60 backdrop-blur-lg border-muted/40">
                <h2 className="text-2xl font-bold mb-2">Contact Sales</h2>
                <p className="text-muted-foreground mb-6">
                  Fill out the form and we'll get back to you within 24 hours.
                </p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="John Smith"
                        value={formData.name}
                        onChange={handleChange}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="john@university.edu"
                        value={formData.email}
                        onChange={handleChange}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="organization">Organization</Label>
                      <Input
                        id="organization"
                        name="organization"
                        placeholder="University / School name"
                        value={formData.organization}
                        onChange={handleChange}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="users">Estimated Users</Label>
                      <Input
                        id="users"
                        name="users"
                        placeholder="e.g., 500"
                        value={formData.users}
                        onChange={handleChange}
                        className="bg-secondary/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Tell us about your needs</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="What are you looking to achieve with Vibe School?"
                      value={formData.message}
                      onChange={handleChange}
                      className="bg-secondary/50 min-h-[120px]"
                    />
                  </div>

                  <Button type="submit" size="lg" className="w-full">
                    <Send className="w-5 h-5 mr-2" />
                    Submit Request
                  </Button>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default EnterprisePlan;
