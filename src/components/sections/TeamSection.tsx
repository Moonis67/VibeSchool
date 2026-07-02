import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Linkedin, Twitter, Github } from "lucide-react";

const team = [
  {
    name: "Moonis Ahmed",
    role: "Lead AI/System Architect",
    bio: "Designing the RAG pipeline and AI infrastructure that powers Vibe School's intelligent content transformation.",
    avatar: "MA",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    name: "Hammad Ghaffar",
    role: "Product & Frontend Lead",
    bio: "Crafting the user experience and interface that makes adaptive learning intuitive and engaging.",
    avatar: "HG",
    gradient: "from-orange-500 to-rose-500",
  },
  {
    name: "Adnan Sandh",
    role: "Business & Strategy",
    bio: "Driving the vision, partnerships, and go-to-market strategy to bring Vibe School to students everywhere.",
    avatar: "AS",
    gradient: "from-emerald-500 to-teal-500",
  },
];

export const TeamSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="team" className="py-24 lg:py-32 bg-secondary/30 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8" ref={ref}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
            Meet Our <span className="text-gradient">Focused</span> Team
          </h2>
          <p className="text-lg text-muted-foreground">
            A student-led project building the future of personalized education.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {team.map((member, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: index * 0.15 }}
            >
              <Card variant="elevated" className="h-full text-center group">
                <CardContent className="p-8">
                  {/* Avatar */}
                  <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${member.gradient} flex items-center justify-center mb-6 text-2xl font-bold text-primary-foreground shadow-lg group-hover:scale-110 transition-transform`}>
                    {member.avatar}
                  </div>

                  <h3 className="text-xl font-bold mb-1">{member.name}</h3>
                  <p className="text-primary font-medium mb-4">{member.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                    {member.bio}
                  </p>

                  {/* Social Links */}
                  <div className="flex justify-center gap-4">
                    <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Linkedin className="w-5 h-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Twitter className="w-5 h-5" />
                    </a>
                    <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                      <Github className="w-5 h-5" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
