import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Sparkles } from "lucide-react";

const sections = [
  {
    title: "Using VibeSchool",
    body: [
      "VibeSchool provides AI-powered tools that help learners transform educational materials into summaries, flashcards, quizzes, study plans, classroom support, and other learning formats.",
      "You may use the service only for lawful, educational, personal, school, or organizational purposes and only in accordance with these Terms.",
    ],
  },
  {
    title: "Accounts and security",
    body: [
      "You are responsible for maintaining access to your account and for all activity that occurs under it.",
      "You agree to provide accurate account information and to notify us if you believe your account has been accessed without permission.",
      "We may suspend or restrict access if we believe an account is being used in a way that creates risk, violates these Terms, or harms VibeSchool or other users.",
    ],
  },
  {
    title: "Your content",
    body: [
      "You keep ownership of the documents, prompts, notes, and other materials you upload or submit to VibeSchool.",
      "You grant us permission to host, store, process, transmit, display, and transform your content as needed to provide, maintain, secure, and improve the service.",
      "You are responsible for making sure you have the rights and permissions needed to upload or submit content to VibeSchool.",
    ],
  },
  {
    title: "AI outputs",
    body: [
      "AI-generated outputs may be inaccurate, incomplete, outdated, or unsuitable for your specific situation. You should review outputs before relying on them.",
      "VibeSchool is a learning support tool. It is not a substitute for professional, legal, medical, financial, academic, or safety advice.",
      "You are responsible for how you use generated outputs, including whether you submit, publish, or share them.",
    ],
  },
  {
    title: "Acceptable use",
    body: [
      "You may not use VibeSchool to break the law, infringe intellectual property rights, upload malware, abuse authentication systems, attempt unauthorized access, scrape or overload the service, harass others, or generate harmful content.",
      "You may not upload highly sensitive personal information, regulated data, secrets, passwords, private keys, or confidential material unless you have authorization and accept the processing required to provide the service.",
    ],
  },
  {
    title: "Third-party services",
    body: [
      "VibeSchool relies on third-party services such as Supabase, Google OAuth, Groq, hosting providers, and other infrastructure providers.",
      "Your use of those services may also be governed by their terms and policies. We are not responsible for third-party services that we do not control.",
    ],
  },
  {
    title: "Plans, payments, and changes",
    body: [
      "Some VibeSchool features may be free, paid, usage-limited, or offered as part of a trial. Pricing, limits, and feature availability may change over time.",
      "If paid plans are offered, subscription terms, renewals, cancellations, refunds, and billing details will be shown at checkout or in the relevant plan page.",
    ],
  },
  {
    title: "Service changes and availability",
    body: [
      "We may update, add, remove, limit, suspend, or discontinue features at any time. We try to keep the service reliable, but we do not guarantee uninterrupted or error-free access.",
    ],
  },
  {
    title: "Disclaimers",
    body: [
      "VibeSchool is provided on an as-is and as-available basis. To the fullest extent allowed by law, we disclaim warranties of merchantability, fitness for a particular purpose, non-infringement, accuracy, availability, and reliability.",
    ],
  },
  {
    title: "Limitation of liability",
    body: [
      "To the fullest extent allowed by law, VibeSchool and its team will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for loss of profits, data, goodwill, or business opportunities.",
    ],
  },
  {
    title: "Termination",
    body: [
      "You may stop using VibeSchool at any time. We may suspend or terminate access if you violate these Terms, create risk for the service, or use the product in a harmful or unlawful way.",
    ],
  },
  {
    title: "Changes to these Terms",
    body: [
      "We may update these Terms as VibeSchool changes. When we make material changes, we will update the date on this page and take reasonable steps to notify users when required.",
    ],
  },
];

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      <main>
        <section className="relative overflow-hidden bg-foreground text-background pt-32 pb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-purple-600/10 to-transparent" />
          <div className="relative max-w-4xl mx-auto px-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-background/10 px-4 py-2 text-sm font-medium text-background/80 mb-6">
              <Sparkles className="h-4 w-4 text-primary" />
              Legal
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5">
              Terms of Service
            </h1>
            <p className="text-lg text-background/70 leading-relaxed max-w-2xl">
              These Terms explain the rules for using VibeSchool and the responsibilities that
              apply when you access our adaptive learning tools.
            </p>
            <p className="text-sm text-background/50 mt-6">Last updated: July 7, 2026</p>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6 space-y-10">
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground leading-relaxed">
              This page is a practical product template and is not legal advice. Have a qualified
              professional review it before relying on it for compliance or commercial launch.
            </div>

            {sections.map((section) => (
              <section key={section.title} className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight">{section.title}</h2>
                <div className="space-y-3 text-muted-foreground leading-relaxed">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}

            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms, contact the VibeSchool team at{" "}
                <a className="text-primary hover:underline" href="mailto:support@vibeschool.app">
                  support@vibeschool.app
                </a>
                .
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <Link to="/privacy" className="text-primary font-semibold hover:underline">
                Read the Privacy Policy
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TermsOfService;
