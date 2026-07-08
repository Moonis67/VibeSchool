import { Link } from "react-router-dom";
import { Sparkles, Twitter, Linkedin, Github, Mail, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";

const footerLinks = {
  product: [
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "Preview", href: "#preview" },
    { label: "Pricing", href: "#pricing" },
  ],
  resources: [
    { label: "Documentation", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Changelog", href: "#" },
    { label: "Help Center", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Mail, href: "#", label: "Email" },
];

export const Footer = () => {
  return (
    <footer className="relative bg-foreground text-background overflow-hidden">
      {/* Subtle gradient decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[100px] bg-primary/10 rounded-full blur-[80px]" />

      <div className="max-w-7xl mx-auto px-6 pt-20 pb-12 relative z-10">
        {/* Top Row: Brand + Newsletter */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Brand */}
          <div className="max-w-md">
            <Link to="/" className="flex items-center gap-2.5 mb-6 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-pink-500 flex items-center justify-center shadow-lg group-hover:shadow-primary/30 transition-shadow">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-extrabold">
                Vibe<span className="text-primary">School</span>
              </span>
            </Link>
            <p className="text-background/60 leading-relaxed mb-8">
              AI-powered learning that adapts to your mood, time, and style.
              Education reimagined for the modern learner.
            </p>
            <div className="flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className="w-10 h-10 rounded-xl bg-background/8 flex items-center justify-center text-background/50 hover:bg-primary hover:text-white transition-all duration-300 hover:scale-110"
                >
                  <social.icon className="w-4.5 h-4.5" />
                </a>
              ))}
            </div>
          </div>

          {/* Newsletter Signup */}
          <div className="lg:text-right lg:flex lg:flex-col lg:items-end lg:justify-center">
            <h4 className="text-lg font-bold mb-3">Stay in the loop</h4>
            <p className="text-background/60 mb-5 max-w-sm">
              Get product updates, tips, and early access to new features.
            </p>
            <div className="flex gap-2 max-w-sm w-full">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-12 px-4 rounded-xl bg-background/10 border border-background/15 text-background placeholder:text-background/40 focus:outline-none focus:border-primary/50 transition-colors text-sm"
              />
              <button className="h-12 px-5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors shrink-0">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid sm:grid-cols-3 gap-8 mb-16">
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-background/40 mb-5">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-background/40 mb-5">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link, index) => (
                <li key={index}>
                  <a
                    href={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm uppercase tracking-wider text-background/40 mb-5">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link, index) => (
                <li key={index}>
                  <Link
                    to={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm flex items-center gap-1 group"
                  >
                    {link.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-background/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-background/40 text-sm">
              © {new Date().getFullYear()} Vibe School. All rights reserved.
            </p>
            <p className="text-background/40 text-sm flex items-center gap-1.5">
              Made with <span className="text-primary">💜</span> by the Vibe School Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
