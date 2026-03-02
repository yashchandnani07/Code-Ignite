import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Brain, Mic, Paperclip, Monitor, GitCompare, CloudUpload,
  LayoutDashboard, ShoppingCart, User, Layers, Gamepad2, KanbanSquare,
  Shield, Lock, Server, Play, ArrowRight, Github, Heart,
  MessageSquare, BotMessageSquare, Sparkles, ExternalLink
} from "lucide-react";
import GradientBlinds from "@/components/GradientBlinds";

interface LandingPageProps {
  onGetStarted: () => void;
}

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const navLinks = [
  { num: "01", label: "Workflow", href: "#how-it-works" },
  { num: "02", label: "Arsenal", href: "#features" },
  { num: "03", label: "Gallery", href: "#showcase" },
  { num: "04", label: "Privacy", href: "#privacy" },
];

const steps = [
  { number: "01", title: "Describe", description: "Type your logic or speak it. Our neural engine deciphers intent into clean system design." },
  { number: "02", title: "Visualize", description: "Watch a real-time stream of code manifest into a sandboxed live preview instantly." },
  { number: "03", title: "Deploy", description: "One click. Zero config. Your app lives on the edge via Netlify, Gist, or Instant Preview." },
];

const features = [
  { icon: Brain, number: "01", title: "Multi-Provider AI", description: "Use Google Gemini, OpenRouter, Claude, or GPT-4 with your own API key. One interface, every model." },
  { icon: Mic, number: "02", title: "Voice Input", description: "Describe complex designs using purely spoken language. Talk to it like a teammate." },
  { icon: Paperclip, number: "03", title: "File Attachments", description: "Upload images or PDFs; the AI reads and recreates them as code. From sketch to ship." },
  { icon: Monitor, number: "04", title: "Live Preview", description: "Sandboxed iframe preview updates in real time as code is generated. See every keystroke land." },
  { icon: GitCompare, number: "05", title: "Visual Diff Viewer", description: "See exactly what the AI changed, character by character. Accept or reject any edit with confidence." },
  { icon: CloudUpload, number: "06", title: "One-Click Deploy", description: "Publish live to Netlify, GitHub Gist, or open in New Tab. Zero config, instant gratification." },
];

const showcaseExamples = [
  { icon: LayoutDashboard, title: "Dashboards & Admin Panels" },
  { icon: ShoppingCart, title: "E-Commerce Stores" },
  { icon: User, title: "Portfolios & Resumes" },
  { icon: Layers, title: "SaaS Landing Pages" },
  { icon: Gamepad2, title: "Browser Games" },
  { icon: KanbanSquare, title: "Kanban Boards & Productivity Apps" },
];

const privacyPoints = [
  { icon: Lock, text: "API keys stored only in your browser — never on our servers" },
  { icon: Shield, text: "Generated code runs in a sandboxed, isolated environment" },
  { icon: Server, text: "Direct API calls — nothing passes through us" },
];

const socialProofItems = ["Google Gemini", "OpenRouter", "Claude", "GPT-4", "Netlify", "GitHub Gist"];

const codeLines = [
  { num: 1, content: '<div class="app">', color: "text-foreground" },
  { num: 2, content: '  <h1>My Dashboard</h1>', color: "text-primary" },
  { num: 3, content: '  <div class="grid">', color: "text-foreground" },
  { num: 4, content: '    <Card title="Revenue" />', color: "text-primary" },
  { num: 5, content: '    <Card title="Users" />', color: "text-primary" },
  { num: 6, content: '  </div>', color: "text-foreground" },
  { num: 7, content: '</div>', color: "text-foreground" },
];

const rotatingWords = ["great?", "fast?", "real?"];

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */

const Navbar = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        height: scrolled ? 64 : 80,
        background: scrolled ? "rgba(8, 8, 8, 0.45)" : "rgba(8, 8, 8, 0.01)",
        backdropFilter: scrolled ? "blur(12px) saturate(200%)" : "blur(0px)",
        WebkitBackdropFilter: scrolled ? "blur(12px) saturate(200%)" : "blur(0px)",
        borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(255, 255, 255, 0)",
        boxShadow: scrolled ? "0 8px 32px rgba(0, 0, 0, 0.4)" : "none",
        transition: "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)",
      }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center"
    >
      <div className="w-full max-w-[1400px] mx-auto px-5 md:px-10 flex justify-between items-center">
        <a href="#" className="flex items-center gap-2 font-sans font-black tracking-tight text-foreground text-xl no-underline" style={{ letterSpacing: "-0.02em" }}>
          <span className="text-primary">⌘</span>
          Code Ignite
        </a>

        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="no-underline flex items-center gap-1.5 text-[0.85rem] font-medium uppercase tracking-widest text-foreground/60 hover:text-foreground transition-colors" style={{ letterSpacing: "0.1em" }}>
              <span className="font-mono text-[0.7rem] text-primary opacity-80">{link.num}</span>
              {link.label}
            </a>
          ))}
        </div>

        <button
          onClick={onGetStarted}
          className="px-5 py-2.5 border border-foreground/10 text-foreground text-[0.8rem] font-semibold uppercase tracking-wide no-underline hover:bg-foreground hover:text-background hover:border-foreground transition-all cursor-pointer"
          style={{ letterSpacing: "0.05em" }}
        >
          Start Building
        </button>
      </div>
    </motion.nav>
  );
};

/* ═══════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════ */

const Hero = ({ onGetStarted }: { onGetStarted: () => void }) => (
  <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
    {/* GradientBlinds background */}
    <div className="absolute inset-0">
      <GradientBlinds
        gradientColors={['#1a1a0a', '#3d5a00', '#b8e600']}
        angle={20}
        noise={0.5}
        blindCount={16}
        blindMinWidth={60}
        spotlightRadius={0.5}
        spotlightSoftness={1}
        spotlightOpacity={1}
        mouseDampening={0.15}
        distortAmount={0}
        shineDirection="left"
        mixBlendMode="normal"
      />
    </div>
    <div className="absolute inset-0 bg-background/20 pointer-events-none" />
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(240_6%_4%)_70%)] pointer-events-none" />

    <div className="relative z-10 container mx-auto px-6 text-center max-w-5xl [&_button]:pointer-events-auto [&_a]:pointer-events-auto pointer-events-none">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: "easeOut" }}>
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-card/50 mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-cursor-blink" />
          <span className="text-sm text-muted-foreground font-mono">AI-Powered Web Builder</span>
        </div>

        <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl tracking-tight mb-4 leading-[0.95] font-normal">
          Turn Words into<br />
          <span className="text-gradient-hero">Web Apps</span><br />
          <span className="text-2xl md:text-3xl lg:text-4xl text-muted-foreground font-sans font-light tracking-normal">— Instantly</span>
        </h1>

        <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed font-sans">
          Describe what you want to build. Code Ignite writes the code, shows a live preview, and deploys it — all in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button onClick={onGetStarted} className="inline-flex items-center justify-center h-14 px-10 text-base font-semibold bg-primary text-primary-foreground rounded-lg shadow-[0_0_30px_hsl(78_90%_60%/0.3)] hover:brightness-110 hover:shadow-[0_0_40px_hsl(78_90%_60%/0.5)] transition-all duration-300">
            Start Building Free <ArrowRight className="ml-2 w-5 h-5" />
          </button>
          <button className="inline-flex items-center justify-center h-14 px-10 text-base font-semibold border border-foreground/30 text-foreground rounded-lg hover:border-primary hover:text-primary transition-all duration-300">
            <Play className="mr-2 w-5 h-5" /> Watch Demo
          </button>
        </div>
      </motion.div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   BROWSER MOCKUP
   ═══════════════════════════════════════════════════ */

const BrowserMockup = () => (
  <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="w-full max-w-4xl mx-auto mt-16">
    <div className="bg-card rounded-t-lg border border-border border-b-0 px-4 py-3 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-destructive/60" />
        <div className="w-3 h-3 rounded-full bg-primary/40" />
        <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />
      </div>
      <div className="flex-1 mx-4">
        <div className="bg-muted rounded-md px-3 py-1 text-xs font-mono text-muted-foreground text-center max-w-xs mx-auto">localhost:3000</div>
      </div>
    </div>

    <div className="bg-card/50 border border-border rounded-b-lg overflow-hidden">
      <div className="grid md:grid-cols-2 divide-x divide-border">
        <div className="p-6">
          <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">Input</p>
          <div className="space-y-1">
            {codeLines.map((line, i) => (
              <motion.div key={line.num} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.1 }} className="flex gap-3 font-mono text-sm">
                <span className="text-muted-foreground/40 select-none w-4 text-right">{line.num}</span>
                <span className={line.color}>{line.content}</span>
              </motion.div>
            ))}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }} className="flex gap-3 font-mono text-sm">
              <span className="text-muted-foreground/40 select-none w-4 text-right">8</span>
              <span className="w-2 h-5 bg-primary animate-cursor-blink" />
            </motion.div>
          </div>
        </div>

        <div className="p-6">
          <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-wider">Preview</p>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }} className="space-y-3">
            <div className="h-5 w-32 bg-foreground/10 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-md p-4 space-y-2">
                <div className="h-3 w-16 bg-primary/30 rounded" />
                <div className="h-6 w-20 bg-foreground/10 rounded" />
              </div>
              <div className="bg-muted rounded-md p-4 space-y-2">
                <div className="h-3 w-12 bg-primary/30 rounded" />
                <div className="h-6 w-16 bg-foreground/10 rounded" />
              </div>
            </div>
            <div className="h-20 bg-muted rounded-md" />
          </motion.div>
        </div>
      </div>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════
   SOCIAL PROOF
   ═══════════════════════════════════════════════════ */

const SocialProof = () => {
  const doubled = [...socialProofItems, ...socialProofItems];
  return (
    <section className="border-y border-border overflow-hidden py-4">
      <div className="flex animate-marquee whitespace-nowrap">
        {doubled.map((name, i) => (
          <span key={i} className="flex items-center">
            <span className="font-mono text-sm text-muted-foreground px-1 py-0.5 rounded bg-muted/50 mx-2">{name}</span>
            <span className="text-border mx-1">/</span>
          </span>
        ))}
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════════════ */

const HowItWorks = () => (
  <section id="how-it-works" className="py-24 md:py-32">
    <div className="container mx-auto px-6 max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-6">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary">01 // Workflow</span>
      </motion.div>

      <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }} className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-20 leading-[1.05]">
        How your ideas<br /><span className="italic text-muted-foreground">become reality.</span>
      </motion.h2>

      <div className="grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
        {steps.map((step, i) => (
          <motion.div key={step.number} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }} className="relative">
            <span className="block font-mono text-[8rem] md:text-[7rem] lg:text-[9rem] font-bold leading-none text-foreground/[0.12] select-none -mb-16 md:-mb-14" aria-hidden="true">{step.number}</span>
            <h3 className="font-serif text-2xl md:text-3xl text-primary font-bold mb-4 relative z-10">{step.title}</h3>
            <p className="text-muted-foreground text-base font-sans leading-relaxed relative z-10 max-w-sm">{step.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   FEATURES (ARSENAL)
   ═══════════════════════════════════════════════════ */

const Features = () => (
  <section id="features" className="py-24 md:py-32 overflow-hidden">
    <div className="container mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-20 md:mb-28">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary block mb-6">02 // Arsenal</span>
        <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-6 leading-[1.05]">
          Your creative<br /><span className="italic text-muted-foreground">arsenal.</span>
        </h2>
        <p className="text-muted-foreground font-sans text-lg md:text-xl max-w-xl leading-relaxed">
          Six tools. One flow. Every feature designed to keep you in the zone — from first idea to live deploy.
        </p>
      </motion.div>

      <div className="max-w-5xl mx-auto space-y-0">
        {features.map((feature, i) => {
          const isEven = i % 2 === 0;
          return (
            <motion.div key={feature.title} initial={{ opacity: 0, x: isEven ? -40 : 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }} className="group">
              <div className={`flex flex-col md:flex-row items-start gap-6 md:gap-12 py-12 md:py-16 border-t border-border ${isEven ? "" : "md:flex-row-reverse md:text-right"}`}>
                <div className={`shrink-0 flex items-center gap-5 ${isEven ? "" : "md:flex-row-reverse"}`}>
                  <span className="font-mono text-6xl md:text-8xl font-bold text-primary/10 group-hover:text-primary/25 transition-colors duration-500 select-none leading-none">{feature.number}</span>
                  <div className="w-14 h-14 rounded-full border border-border flex items-center justify-center group-hover:border-primary/50 group-hover:shadow-[0_0_24px_hsl(78_90%_60%/0.12)] transition-all duration-500">
                    <feature.icon className="w-6 h-6 text-primary/70 group-hover:text-primary transition-colors duration-500" />
                  </div>
                </div>
                <div className="flex-1 max-w-lg">
                  <h3 className="text-2xl md:text-3xl font-serif mb-3 group-hover:text-primary transition-colors duration-500">{feature.title}</h3>
                  <p className="text-muted-foreground text-base md:text-lg font-sans leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
        <div className="border-t border-border" />
      </div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="mt-16 text-center">
        <span className="font-mono text-xs tracking-[0.3em] uppercase text-muted-foreground/50">— end of arsenal —</span>
      </motion.div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   TELEGRAM INTEGRATION
   ═══════════════════════════════════════════════════ */

const TelegramIntegration = () => (
  <section className="py-24 md:py-32 overflow-hidden bg-background">
    <div className="container mx-auto px-6 max-w-6xl">
      <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

        {/* Left: Typography & Storytelling */}
        <div className="flex-1 lg:max-w-lg relative z-10 w-full">
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
            <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary block mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" /> 02.5 // Telegram Bot
            </span>
            <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl tracking-tight mb-6 leading-[1.05]">
              Speak it into<br /><span className="italic text-muted-foreground">existence.</span>
            </h2>
            <p className="text-muted-foreground font-sans text-lg md:text-xl leading-relaxed mb-8">
              Send a voice note while commuting. The neural engine parses your intent, builds the architecture, and the bot replies with a live, hosted URL.
            </p>
            <p className="text-base text-muted-foreground/80 font-mono border-l-2 border-[#2AABEE]/30 pl-4 py-1">
              Zero friction. Pure creation.
            </p>
          </motion.div>
        </div>

        {/* Right: Premium Chat UI Mockup */}
        <div className="flex-1 w-full relative">
          <div className="absolute inset-0 bg-[#2AABEE]/5 blur-[100px] rounded-full pointer-events-none" />

          <motion.div
            initial={{ opacity: 0, y: 30, rotateX: 10 }}
            whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ perspective: 1000 }}
            className="relative bg-card/40 border border-border/50 rounded-2xl p-4 md:p-6 shadow-2xl backdrop-blur-sm max-w-lg mx-auto"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/50 pb-4 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#2AABEE]/10 flex items-center justify-center border border-[#2AABEE]/20">
                <BotMessageSquare className="w-5 h-5 text-[#2AABEE]" />
              </div>
              <div>
                <h4 className="font-sans font-medium text-sm text-foreground">Code Ignite Bot</h4>
                <p className="text-xs text-[#2AABEE] font-mono">online</p>
              </div>
            </div>

            {/* Chat Flow */}
            <div className="space-y-6 font-sans">

              {/* User Voice Note */}
              <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="flex justify-end">
                <div className="bg-[#2AABEE] text-white rounded-2xl rounded-tr-sm p-3 md:p-4 max-w-[85%] shadow-lg shadow-[#2AABEE]/20 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Play className="w-4 h-4 text-white fill-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1 relative">
                      {/* Fake waveform */}
                      {[0.4, 0.8, 0.5, 1, 0.3, 0.7, 0.9, 0.4, 0.6, 0.8, 0.5, 0.3].map((val, i) => (
                        <div key={i} className="w-1 bg-white/60 rounded-full" style={{ height: `${val * 12 + 4}px` }} />
                      ))}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/70 font-mono self-end ml-2">0:14</span>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.8 }} className="flex justify-start">
                <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5 ml-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> Transcribing and building...
                </span>
              </motion.div>

              {/* Bot Response Pill */}
              <motion.div initial={{ opacity: 0, x: -20, scale: 0.95 }} whileInView={{ opacity: 1, x: 0, scale: 1 }} viewport={{ once: true }} transition={{ delay: 1.4 }} className="flex justify-start">
                <div className="bg-muted/50 border border-border rounded-2xl rounded-tl-sm p-4 max-w-[90%] shadow-xl backdrop-blur-md">
                  <p className="text-sm text-foreground mb-3 font-medium">Your application is ready! 🚀</p>

                  {/* Embedded App Link Card */}
                  <div className="bg-black/40 border border-border/50 rounded-xl p-3 flex gap-4 items-center mb-2 hover:bg-black/60 transition-colors cursor-pointer group">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0 group-hover:border-primary/40 transition-colors">
                      <LayoutDashboard className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium text-foreground truncate">Dark Theme Dashboard</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">https://code-ignite.app/p/a7b9x</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <span className="text-[10px] text-muted-foreground font-mono block text-right mt-2">Just now</span>
                </div>
              </motion.div>

            </div>
          </motion.div>
        </div>

      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   SHOWCASE
   ═══════════════════════════════════════════════════ */

const Showcase = () => (
  <section id="showcase" className="py-24 md:py-32 bg-card/30">
    <div className="container mx-auto px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary block mb-6">03 // Gallery</span>
        <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-4 leading-[1.05]">
          What you can<br /><span className="italic text-muted-foreground">build.</span>
        </h2>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {showcaseExamples.map((example, i) => (
          <motion.div key={example.title} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} className="group border border-border rounded-lg p-6 hover:translate-y-[-4px] hover:shadow-[0_12px_40px_-12px_hsl(78_90%_60%/0.15)] transition-all duration-300 cursor-default bg-background">
            <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center mx-auto mb-4 group-hover:border-primary/40 transition-colors">
              <example.icon className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-mono text-xs text-primary mb-1 text-center uppercase tracking-wider">Build</p>
            <h3 className="text-sm font-sans font-medium text-center">{example.title}</h3>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   PRIVACY
   ═══════════════════════════════════════════════════ */

const Privacy = () => (
  <section id="privacy" className="py-20 md:py-28 relative">
    <div className="absolute inset-0 crosshatch opacity-20" />
    <div className="container mx-auto px-6 max-w-5xl relative z-10">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12">
        <span className="font-mono text-sm uppercase tracking-[0.2em] text-primary block mb-6">04 // Privacy</span>
        <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl tracking-tight mb-4 leading-[1.05]">
          Your code. Your keys.<br /><span className="italic text-muted-foreground">Your data.</span>
        </h2>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="flex flex-col md:flex-row items-stretch divide-y md:divide-y-0 md:divide-x divide-border border border-border rounded-lg overflow-hidden">
        {privacyPoints.map((point, i) => (
          <div key={i} className="flex-1 flex items-center gap-4 p-6 bg-card/30">
            <point.icon className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground font-sans leading-relaxed">{point.text}</p>
          </div>
        ))}
      </motion.div>
    </div>
  </section>
);

/* ═══════════════════════════════════════════════════
   FINAL CTA
   ═══════════════════════════════════════════════════ */

const FinalCTA = ({ onGetStarted }: { onGetStarted: () => void }) => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setWordIndex((prev) => (prev + 1) % rotatingWords.length), 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(240_6%_4%)_70%)]" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
          <h2 className="font-serif text-4xl md:text-6xl lg:text-7xl mb-4">
            Ready to build something{" "}
            <span className="text-primary inline-flex items-center">
              <motion.span key={rotatingWords[wordIndex]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                {rotatingWords[wordIndex]}
              </motion.span>
              <span className="w-[3px] h-[1em] bg-primary ml-1 animate-cursor-blink inline-block" />
            </span>
          </h2>
          <p className="text-muted-foreground text-lg mb-10 font-sans">Bring your API key and start creating in under a minute.</p>
          <button onClick={onGetStarted} className="inline-flex items-center justify-center text-lg px-12 h-16 font-semibold bg-primary text-primary-foreground rounded-lg shadow-[0_0_30px_hsl(78_90%_60%/0.3)] hover:brightness-110 hover:shadow-[0_0_40px_hsl(78_90%_60%/0.5)] transition-all duration-300">
            Launch Code Ignite <ArrowRight className="ml-2 w-5 h-5" />
          </button>
        </motion.div>
      </div>
    </section>
  );
};

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */

const Footer = () => (
  <footer className="border-t border-primary/30 py-6">
    <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <a href="https://github.com/yashchandnani07" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm font-mono">
        <Github className="w-4 h-4" /> GitHub
      </a>
      <p className="text-sm text-muted-foreground font-sans flex items-center gap-1">
        Made with <Heart className="w-3.5 h-3.5 text-primary fill-primary" /> by{" "}
        <a
          href="https://github.com/yashchandnani07"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-primary transition-colors"
        >
          Yash Chandnani
        </a>
      </p>
    </div>
  </footer>
);

/* ═══════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════ */

const LandingPage = ({ onGetStarted }: LandingPageProps) => (
  <div className="landing-theme min-h-screen">
    <Navbar onGetStarted={onGetStarted} />
    <Hero onGetStarted={onGetStarted} />
    <div className="container mx-auto px-6 max-w-5xl -mt-8">
      <BrowserMockup />
    </div>
    <SocialProof />
    <HowItWorks />
    <Features />
    <TelegramIntegration />
    <Showcase />
    <Privacy />
    <FinalCTA onGetStarted={onGetStarted} />
    <Footer />
  </div>
);

export default LandingPage;
