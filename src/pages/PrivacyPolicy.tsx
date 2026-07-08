import { Link } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { Sparkles } from "lucide-react";

const sections = [
  {
    title: "Information we collect",
    body: [
      "Account information: when you sign in, we may receive your name, email address, profile picture, authentication identifiers, and basic account metadata from Google or Supabase Auth.",
      "Learning content: we collect the topics, prompts, preferences, uploaded study files, extracted document text, generated flashcards, quizzes, summaries, and other learning outputs you create in VibeSchool.",
      "Profile and usage information: we may store your learning level, study goals, selected mood, available study time, preferred formats, progress, weak areas, and app activity needed to personalize the product.",
      "Technical information: we may collect device, browser, log, error, and security data needed to operate, debug, protect, and improve the service.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use your information to create and secure your account, provide the learning workspace, process uploaded materials, generate personalized study content, maintain your profile, and improve the reliability and quality of VibeSchool.",
      "We may use learning activity to personalize recommendations, adapt explanations to your selected study mode, troubleshoot issues, prevent abuse, and communicate important service updates.",
    ],
  },
  {
    title: "AI processing",
    body: [
      "VibeSchool uses AI services to transform educational content into explanations, quizzes, study plans, flashcards, diagrams, scripts, and other learning formats.",
      "When you ask the app to transform content, relevant prompts, selected preferences, document excerpts, and context may be sent to AI infrastructure providers, including Groq, so they can generate the requested output.",
      "Do not upload confidential, sensitive, regulated, or highly personal information unless you are comfortable with it being processed for the learning features you request.",
    ],
  },
  {
    title: "Service providers",
    body: [
      "We use Supabase for authentication, database, storage, serverless functions, and related backend infrastructure.",
      "We use Google OAuth when you choose to sign in with Google.",
      "We use Groq and other infrastructure providers as needed to operate AI-powered features, hosting, security, analytics, and product delivery.",
      "These providers process information only as needed to provide their services to us and are subject to their own security and privacy commitments.",
    ],
  },
  {
    title: "How we share information",
    body: [
      "We do not sell your personal information.",
      "We may share information with service providers that help us operate VibeSchool, comply with law, enforce our terms, protect rights and safety, or complete a business transfer such as a merger, acquisition, or reorganization.",
    ],
  },
  {
    title: "Data retention",
    body: [
      "We keep account, profile, uploaded material, extracted text, and learning history for as long as needed to provide the service, comply with legal obligations, resolve disputes, prevent abuse, and improve the product.",
      "You may request deletion of your account or data by contacting us. Some information may remain in backups, security logs, or records we are required to retain for a limited period.",
    ],
  },
  {
    title: "Your choices",
    body: [
      "You can choose not to provide optional profile details or learning preferences, although some personalization features may work less effectively.",
      "You can disconnect Google access from your Google Account settings.",
      "You can request access, correction, export, or deletion of your personal information by contacting us.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational safeguards designed to protect your information. No internet service can guarantee perfect security, so you should use a strong account password and avoid uploading sensitive information that is not needed for learning.",
    ],
  },
  {
    title: "Children",
    body: [
      "VibeSchool is intended for students and learners who are old enough to use online services under applicable law. If you are under the age required in your location, use VibeSchool only with permission from a parent, guardian, school, or authorized adult.",
    ],
  },
  {
    title: "Changes to this policy",
    body: [
      "We may update this Privacy Policy as the product changes. When we make material changes, we will update the date on this page and take reasonable steps to notify users when required.",
    ],
  },
];

const PrivacyPolicy = () => {
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
              Privacy Policy
            </h1>
            <p className="text-lg text-background/70 leading-relaxed max-w-2xl">
              This policy explains how VibeSchool collects, uses, stores, and shares information
              when you use our adaptive learning app.
            </p>
            <p className="text-sm text-background/50 mt-6">Last updated: July 7, 2026</p>
          </div>
        </section>

        <section className="py-16 md:py-20">
          <div className="max-w-4xl mx-auto px-6 space-y-10">
            <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground leading-relaxed">
              This page is provided for transparency and product trust. It is not legal advice;
              you should have a qualified professional review it before relying on it for compliance.
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
                For privacy questions or data requests, contact the VibeSchool team at{" "}
                <a className="text-primary hover:underline" href="mailto:support@vibeschool.app">
                  support@vibeschool.app
                </a>
                .
              </p>
            </section>

            <div className="pt-6 border-t border-border">
              <Link to="/terms" className="text-primary font-semibold hover:underline">
                Read the Terms of Service
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
