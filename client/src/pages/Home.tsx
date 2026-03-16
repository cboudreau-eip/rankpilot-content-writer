/*
 * DESIGN: Dark showcase selector — "Design Switcher"
 * Dark charcoal background, bright preview cards with glow effects
 * Space Grotesk for headings, DM Sans for body
 * Three-column card grid, each card links to a full dashboard
 */

import { Link } from "wouter";
import { motion } from "framer-motion";
import { Rocket, Moon, Sun, Minimize2, ArrowRight, Sparkles } from "lucide-react";

const designs = [
  {
    id: 1,
    slug: "/design-1",
    name: "Command Center",
    number: "01",
    description: "Dark, data-dense pro tool. Bloomberg Terminal meets ClickUp. Everything visible, powerful, no wasted space.",
    tags: ["Dark Mode", "Data-Dense", "5-Column Stats", "Pro Tool"],
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    borderGlow: "hover:shadow-[0_0_40px_rgba(59,130,246,0.15)]",
    accentColor: "text-blue-400",
    accentBg: "bg-blue-500/10",
    icon: Moon,
    features: [
      "Dark navy palette with blue/cyan accents",
      "5-column stat row for maximum data density",
      "Bar chart + donut chart analytics",
      "Full article table with status badges",
      "Keyword rankings & quick actions panel",
    ],
  },
  {
    id: 2,
    slug: "/design-2",
    name: "Clean Studio",
    number: "02",
    description: "Light, airy, Reback/Notion-inspired. Soft card-based layout, colorful icons, generous whitespace, modern SaaS feel.",
    tags: ["Light Mode", "Card-Based", "Notion-Style", "Airy"],
    gradient: "from-indigo-500/20 via-purple-500/10 to-transparent",
    borderGlow: "hover:shadow-[0_0_40px_rgba(99,102,241,0.15)]",
    accentColor: "text-indigo-400",
    accentBg: "bg-indigo-500/10",
    icon: Sun,
    features: [
      "Light background with indigo/purple accents",
      "Plus Jakarta Sans font for warmth",
      "Large colorful stat cards with trends",
      "Smooth line chart with gradient fill",
      "Activity feed with color-coded timeline",
    ],
  },
  {
    id: 3,
    slug: "/design-3",
    name: "Neo Minimal",
    number: "03",
    description: "Bold, high-contrast editorial feel. Dark sidebar + light content. Bento grid layout, premium design tool energy.",
    tags: ["High Contrast", "Bento Grid", "Editorial", "Premium"],
    gradient: "from-teal-500/20 via-emerald-500/10 to-transparent",
    borderGlow: "hover:shadow-[0_0_40px_rgba(13,148,136,0.15)]",
    accentColor: "text-teal-400",
    accentBg: "bg-teal-500/10",
    icon: Minimize2,
    features: [
      "Dark sidebar + light content split",
      "Space Grotesk + DM Sans font pairing",
      "Asymmetric bento grid layout",
      "Teal + violet accent palette",
      "Numbered rows, bordered status chips",
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border/50">
        <div className="container flex items-center justify-between py-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              RankPilot
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <span>Dashboard Design Concepts</span>
          </div>
        </div>
      </header>

      {/* HERO */}
      <motion.section
        className="container pt-20 pb-16 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border/60 bg-card/50 text-sm text-muted-foreground mb-8">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          3 Design Concepts Ready
        </div>
        <h1
          className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Choose Your
          <br />
          <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Dashboard Design
          </span>
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          Three distinctly different UI approaches for RankPilot. Each design is fully interactive
          with live charts, icons, and real data. Click any card to explore.
        </p>
      </motion.section>

      {/* DESIGN CARDS */}
      <motion.section
        className="container pb-24"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {designs.map((design) => {
            const Icon = design.icon;
            return (
              <motion.div key={design.id} variants={itemVariants}>
                <Link href={design.slug}>
                  <div
                    className={`group relative rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-border ${design.borderGlow} cursor-pointer`}
                  >
                    {/* Gradient overlay */}
                    <div
                      className={`absolute inset-0 bg-gradient-to-b ${design.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}
                    />

                    <div className="relative p-8">
                      {/* Number + Icon */}
                      <div className="flex items-center justify-between mb-6">
                        <span
                          className="text-6xl font-bold tracking-tighter text-border/80"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {design.number}
                        </span>
                        <div className={`w-12 h-12 rounded-xl ${design.accentBg} flex items-center justify-center`}>
                          <Icon className={`w-6 h-6 ${design.accentColor}`} />
                        </div>
                      </div>

                      {/* Title */}
                      <h2
                        className="text-2xl font-bold tracking-tight mb-3"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {design.name}
                      </h2>

                      {/* Description */}
                      <p className="text-muted-foreground text-[15px] leading-relaxed mb-6">
                        {design.description}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-8">
                        {design.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 rounded-full text-xs font-semibold border border-border/60 text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Features */}
                      <ul className="space-y-2.5 mb-8">
                        {design.features.map((feature, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${design.accentColor.replace("text-", "bg-")}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <div
                        className={`flex items-center gap-2 ${design.accentColor} font-semibold text-sm group-hover:gap-3 transition-all duration-300`}
                      >
                        Explore Design
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      {/* FOOTER */}
      <footer className="border-t border-border/50 py-8">
        <div className="container text-center text-sm text-muted-foreground">
          RankPilot Dashboard Design Concepts &mdash; Built for evaluation and comparison
        </div>
      </footer>
    </div>
  );
}
