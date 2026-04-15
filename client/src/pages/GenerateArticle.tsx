import { trpc } from "@/lib/trpc";
import { useState, useMemo, useEffect } from "react";
import type { ResearchFindings } from "@shared/research-types";
import { useLocation } from "wouter";
import { useActiveProject } from "@/components/AppLayout";
import {
  Sparkles, FileText, GripVertical, ChevronDown, ChevronRight,
  Plus, Trash2, Loader2, ArrowRight, Settings2, Wand2, ListTree,
  MapPin, Users, Link2, Globe, MessageSquare, Target, Check,
  ChevronUp, X, PlusCircle, BotMessageSquare, LayoutGrid,
  List, ListOrdered, BarChart3, Table2, HelpCircle, Quote, Lightbulb, Zap,
  BookOpen, ThumbsUp, ThumbsDown, Star, AlertCircle, Bookmark, ClipboardList, LayoutTemplate, Palette,
  CheckCircle2, Key, Tag, Search, ExternalLink, GraduationCap, TrendingUp, Building2, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

const CONTENT_TYPES = [
  { value: "blog", label: "Blog Post" },
  { value: "comparison", label: "Comparison" },
  { value: "guide", label: "How-To Guide" },
  { value: "listicle", label: "Listicle" },
  { value: "pillar", label: "Pillar Page" },
  { value: "review", label: "Review" },
  { value: "case-study", label: "Case Study" },
];

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "conversational", label: "Conversational" },
  { value: "authoritative", label: "Authoritative" },
  { value: "friendly", label: "Friendly" },
  { value: "academic", label: "Academic" },
  { value: "persuasive", label: "Persuasive" },
];

const LINK_COUNT_OPTIONS = [
  { value: "3", label: "3 links" },
  { value: "5", label: "5 links (default)" },
  { value: "7", label: "7 links" },
  { value: "10", label: "10 links" },
  { value: "15", label: "15 links" },
];

const AI_INSTRUCTION_PRESETS = [
  { category: "Structure", items: [
    { icon: List, label: "Use bullet points", value: "Use bullet points for key information" },
    { icon: ListOrdered, label: "Use numbered list", value: "Use a numbered step-by-step list" },
    { icon: Table2, label: "Add comparison table", value: "Include an HTML comparison table using <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags. The table must have a header row and at least 3 data rows comparing key attributes." },
    { icon: LayoutGrid, label: "Use bento/card layout", value: "Present information in a card-based or bento grid layout" },
  ]},
  { category: "Content", items: [
    { icon: BarChart3, label: "Add chart/statistics", value: "Include a chart or statistics with data" },
    { icon: Quote, label: "Include expert quotes", value: "Include expert quotes or authoritative citations" },
    { icon: Lightbulb, label: "Add real-world examples", value: "Include real-world examples and case studies" },
    { icon: HelpCircle, label: "Add FAQ format", value: "Format this section as FAQ with questions and answers" },
  ]},
  { category: "Style", items: [
    { icon: Zap, label: "Keep it concise", value: "Keep this section brief and to the point" },
    { icon: FileText, label: "Go in-depth", value: "Provide detailed, in-depth coverage of this topic" },
    { icon: Target, label: "Focus on actionable tips", value: "Focus on actionable, practical tips the reader can apply immediately" },
  ]},
];

const SECTION_TEMPLATES = [
  { category: "Engagement", items: [
    {
      icon: CheckCircle2,
      label: "Pro Tip",
      description: "Highlighted tip with checkmark icon",
      section: {
        heading: "Pro Tip",
        type: "h2" as const,
        points: [
          "One actionable, expert-level tip the reader can apply immediately",
        ],
        aiInstructions: "Write a single, focused pro tip in 2-3 sentences. Be specific and actionable — give the reader something they can do right now. Do NOT use bullet points. Write it as a concise paragraph.",
        backgroundColor: "#ECFDF5",
        templateType: "pro-tip" as const,
      },
    },
    {
      icon: FileText,
      label: "Summary",
      description: "Section summary with key points",
      section: {
        heading: "Summary",
        type: "h2" as const,
        points: [
          "Concise recap of the most important points covered",
          "Key action items or next steps for the reader",
        ],
        aiInstructions: "Write a concise summary of the article or section in 2-3 short paragraphs. Recap the most important points and end with a clear next step or call to action. Include a link to an authoritative resource if relevant.",
        templateType: "summary" as const,
      },
    },
    {
      icon: Star,
      label: "Key Takeaways",
      description: "Summary box of main points",
      section: {
        heading: "Key Takeaways",
        type: "h2" as const,
        points: [
          "Main takeaway point 1",
          "Main takeaway point 2",
          "Main takeaway point 3",
        ],
        aiInstructions: "Format as a highlighted summary box with bullet points. Keep each takeaway to one concise sentence. This should give readers the most important points at a glance.",
        backgroundColor: "#EFF6FF",
      },
    },
    {
      icon: Users,
      label: "Who This Is For / Not For",
      description: "Clarify the target audience",
      section: {
        heading: "Who This Guide Is For",
        type: "h2" as const,
        points: [
          "Ideal reader profile and their situation",
          "What problems or questions they have",
          "Who this guide is NOT for and what to read instead",
        ],
        subSections: [
          {
            heading: "This Guide Is Perfect For You If...",
            type: "h3" as const,
            points: ["Describe the ideal reader scenarios"],
            aiInstructions: "Use bullet points. Be specific about situations, not vague demographics.",
          },
          {
            heading: "This Might Not Be For You If...",
            type: "h3" as const,
            points: ["Describe who should look elsewhere and suggest alternatives"],
            aiInstructions: "Use bullet points. Be honest and helpful — suggest what they should read instead.",
          },
        ],
        aiInstructions: "Be direct and specific. Help readers quickly determine if this content is relevant to them.",
        backgroundColor: "#F5F3FF",
      },
    },
    {
      icon: HelpCircle,
      label: "FAQ Section",
      description: "Common questions and answers",
      section: {
        heading: "Frequently Asked Questions",
        type: "h2" as const,
        points: [
          "Answer the most common questions about this topic",
          "Include questions people actually search for",
          "Keep answers concise but thorough",
        ],
        aiInstructions: "Format as Q&A pairs using <h3> for each question and a paragraph for each answer. Include 5-7 questions. Use questions that people actually search for (long-tail keywords). Keep answers to 2-3 sentences each.",
      },
    },
    {
      icon: LayoutGrid,
      label: "Use Cases",
      description: "Stacked cards for scenarios, groups, or categories",
      section: {
        heading: "Use Cases",
        type: "h2" as const,
        points: [
          "3-5 distinct scenarios, groups, or categories",
          "Each with a bold sub-heading and 1-2 sentence explanation",
        ],
        aiInstructions: "Write a brief intro paragraph (1-2 sentences) that sets context for the use cases below. Then write 3-5 distinct use cases or scenarios. For EACH use case, write a <p> tag containing a <strong> tag with the use case name/title, followed by a closing </p> tag, then a NEW <p> tag with a 1-2 sentence description. Example format: <p><strong>Scenario Name</strong></p><p>Description of this scenario in 1-2 sentences.</p>. Do NOT use bullet points, numbered lists, or <h3> headings. Each use case must be a separate strong+paragraph pair.",
        backgroundColor: "#F8FAFC",
        templateType: "use-cases" as const,
      },
    },
  ]},
  { category: "Content Blocks", items: [
    {
      icon: Shield,
      label: "Coverage Card",
      description: "Styled card with covers/doesn't cover lists and cost callout",
      section: {
        heading: "Coverage Overview",
        type: "h2" as const,
        points: [
          "Brief summary of what this plan/policy/service covers",
          "List of what it covers (green bullets)",
          "List of what it doesn't cover (red bullets)",
          "Cost note or pricing info (optional callout box)",
        ],
        subSections: [
          {
            heading: "What It Covers",
            type: "h3" as const,
            points: ["List specific items that are covered"],
            aiInstructions: "Write 3-6 items as a <ul> list. Each <li> should be a concise phrase (not a full sentence). Be specific \u2014 name actual services, benefits, or features.",
          },
          {
            heading: "What It Doesn't Cover",
            type: "h3" as const,
            points: ["List specific items that are NOT covered"],
            aiInstructions: "Write 3-6 items as a <ul> list. Each <li> should be a concise phrase. Be specific about exclusions.",
          },
        ],
        aiInstructions: "Start with a 1-2 sentence summary paragraph describing the coverage. Then write the two sub-sections (What It Covers / What It Doesn't Cover) as <h3> headings each followed by a <ul> list. End with a single <p> starting with 'Cost:' that summarizes the key cost/pricing info (premiums, deductibles, copays). The cost paragraph is required.",
        backgroundColor: "#F0F9FF",
        templateType: "coverage-card" as const,
      },
    },
    {
      icon: ThumbsUp,
      label: "Pros & Cons",
      description: "Balanced advantages and disadvantages",
      section: {
        heading: "Pros and Cons",
        type: "h2" as const,
        points: [
          "List key advantages",
          "List key disadvantages",
          "Provide balanced assessment",
        ],
        subSections: [
          {
            heading: "Pros",
            type: "h3" as const,
            points: ["Key advantages and benefits"],
            aiInstructions: "Use bullet points with bold lead-ins. Be specific with real benefits, not generic claims.",
          },
          {
            heading: "Cons",
            type: "h3" as const,
            points: ["Key disadvantages and limitations"],
            aiInstructions: "Use bullet points with bold lead-ins. Be honest about real drawbacks.",
          },
        ],
        aiInstructions: "Present a balanced, honest assessment. Don't sugarcoat cons or exaggerate pros.",
      },
    },
    {
      icon: ClipboardList,
      label: "Quick Answer Box",
      description: "Direct answer for featured snippets",
      section: {
        heading: "Quick Answer",
        type: "h2" as const,
        points: [
          "Provide a direct, concise answer to the main question",
          "Include the most essential details",
          "Keep it under 50 words for snippet optimization",
        ],
        aiInstructions: "Write a single, direct paragraph that answers the main question in under 50 words. Optimize for Google featured snippets. No fluff — get straight to the answer.",
        backgroundColor: "#FFFBEB",
      },
    },
    {
      icon: Table2,
      label: "Comparison Table",
      description: "Side-by-side feature comparison",
      section: {
        heading: "Comparison at a Glance",
        type: "h2" as const,
        points: [
          "Compare key features side by side",
          "Include pricing, coverage, and key differences",
          "Highlight the best option for different needs",
        ],
        aiInstructions: "Include an HTML comparison table using <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags. The table must have a header row and at least 4 data rows comparing key attributes. Follow the table with a brief paragraph explaining which option is best for which situation.",
      },
    },
    {
      icon: AlertCircle,
      label: "Common Mistakes to Avoid",
      description: "Pitfalls and how to avoid them",
      section: {
        heading: "Common Mistakes to Avoid",
        type: "h2" as const,
        points: [
          "List the most common mistakes people make",
          "Explain why each mistake is problematic",
          "Provide the correct approach for each",
        ],
        aiInstructions: "Use a numbered list. For each mistake, use a bold title followed by why it's a problem and what to do instead. Include 4-6 mistakes.",
        backgroundColor: "#FFF1F2",
      },
    },
  ]},
  { category: "Authority", items: [
    {
      icon: BookOpen,
      label: "Step-by-Step Guide",
      description: "Numbered walkthrough process",
      section: {
        heading: "Step-by-Step Guide",
        type: "h2" as const,
        points: [
          "Break the process into clear, actionable steps",
          "Include tips or warnings at key steps",
          "Make each step specific and completable",
        ],
        aiInstructions: "Use a numbered list with <h3> for each step. Each step should have a clear action verb as the title and 2-3 sentences of explanation. Include pro tips where relevant.",
      },
    },
    {
      icon: Bookmark,
      label: "What to Look For / Checklist",
      description: "Evaluation criteria or checklist",
      section: {
        heading: "What to Look For",
        type: "h2" as const,
        points: [
          "Key criteria to evaluate",
          "Red flags to watch out for",
          "Must-have vs nice-to-have features",
        ],
        aiInstructions: "Use bullet points with bold lead-ins for each criterion. Group into 'Must-Haves' and 'Nice-to-Haves' if appropriate. Be specific and actionable.",
        backgroundColor: "#F1F5F9",
      },
    },
    {
      icon: Quote,
      label: "Expert Insights",
      description: "Expert opinions and data",
      section: {
        heading: "What Experts Say",
        type: "h2" as const,
        points: [
          "Include expert opinions or industry data",
          "Reference authoritative sources",
          "Provide context for the expert perspective",
        ],
        aiInstructions: "Include expert quotes or cite authoritative sources. Use blockquote formatting for direct quotes. Provide context before each quote explaining who the expert is and why their opinion matters.",
        backgroundColor: "#EEF2FF",
      },
    },
  ]},
];

interface OutlineSection {
  id: string;
  heading: string;
  type: "h2" | "h3";
  points?: string[];
  subSections?: OutlineSection[];
  aiInstructions?: string;
  backgroundColor?: string;
  templateType?: "pro-tip" | "summary" | "use-cases" | "coverage-card";
}

const SECTION_BG_COLORS = [
  { name: "None", value: "", swatch: "bg-card border border-border" },
  { name: "Light Gray", value: "#F3F4F6", swatch: "bg-[#F3F4F6]" },
  { name: "Warm Gray", value: "#F5F5F4", swatch: "bg-[#F5F5F4]" },
  { name: "Slate", value: "#F1F5F9", swatch: "bg-[#F1F5F9]" },
  { name: "Light Blue", value: "#EFF6FF", swatch: "bg-[#EFF6FF]" },
  { name: "Sky", value: "#E0F2FE", swatch: "bg-[#E0F2FE]" },
  { name: "Indigo", value: "#EEF2FF", swatch: "bg-[#EEF2FF]" },
  { name: "Lavender", value: "#F5F3FF", swatch: "bg-[#F5F3FF]" },
  { name: "Mint", value: "#ECFDF5", swatch: "bg-[#ECFDF5]" },
  { name: "Emerald", value: "#D1FAE5", swatch: "bg-[#D1FAE5]" },
  { name: "Cream", value: "#FFFBEB", swatch: "bg-[#FFFBEB]" },
  { name: "Peach", value: "#FFF7ED", swatch: "bg-[#FFF7ED]" },
  { name: "Rose", value: "#FFF1F2", swatch: "bg-[#FFF1F2]" },
];

interface ManualLink {
  url: string;
  anchorText: string;
}

export default function GenerateArticle() {
  const [, navigate] = useLocation();

  // Step state: "settings" | "outline" | "generating-article"
  const [step, setStep] = useState<"settings" | "outline" | "generating-article">("settings");

  // Settings
  const [keyword, setKeyword] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [targetWordCount, setTargetWordCount] = useState("1600");
  const [numSections, setNumSections] = useState("8");
  const [numFaqs, setNumFaqs] = useState("8");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // New fields
  const [targetLocation, setTargetLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetAudienceSource, setTargetAudienceSource] = useState<"icp" | "custom">("icp");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">("html");
  const [manualLinks, setManualLinks] = useState<ManualLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkAnchor, setNewLinkAnchor] = useState("");
  const [selectedSitemapIds, setSelectedSitemapIds] = useState<Set<number>>(new Set());
  const [customSitemapUrls, setCustomSitemapUrls] = useState<string[]>([]);
  const [newCustomSitemapUrl, setNewCustomSitemapUrl] = useState("");
  const [showCustomSitemapInput, setShowCustomSitemapInput] = useState(false);
  const [autoLinkCount, setAutoLinkCount] = useState("5");

  // Secondary keywords (LLM-suggested or manual)
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [keywordInputValue, setKeywordInputValue] = useState("");
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ secondary: string[]; lsi: string[]; longTail: string[] } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);


  // Research state
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [researchFindings, setResearchFindings] = useState<ResearchFindings | null>(null);
  const [showResearchPanel, setShowResearchPanel] = useState(false);
  const [autoGradeEnabled, setAutoGradeEnabled] = useState(false);
  const [targetGrade, setTargetGrade] = useState("A-");
  const [maxGradeIterations, setMaxGradeIterations] = useState(2);

  // Outline state
  const [outlineTitle, setOutlineTitle] = useState("");
  const [sections, setSections] = useState<OutlineSection[]>([]);
  const [outlineId, setOutlineId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;

  // Check for entity analysis outline data passed via sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("entityOutlineData");
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      sessionStorage.removeItem("entityOutlineData");
      if (data.title && data.sections) {
        setOutlineTitle(data.title);
        setSections(data.sections);
        if (data.outlineId) setOutlineId(data.outlineId);
        if (data.keyword) setKeyword(data.keyword);
        setStep("outline");
        // Expand all sections
        const allIds = new Set<string>();
        data.sections.forEach((s: OutlineSection) => {
          allIds.add(s.id);
          s.subSections?.forEach((sub: OutlineSection) => allIds.add(sub.id));
        });
        setExpandedSections(allIds);
        toast.success("Outline loaded from entity analysis!");
      }
    } catch {
      sessionStorage.removeItem("entityOutlineData");
    }
  }, []);

  // Fetch ICP profiles for the active project
  const { data: icpProfiles = [] } = trpc.icpProfiles.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  // Fetch brand voices for the active project
  const { data: brandVoices = [] } = trpc.brandVoices.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  // Brand voice selection state
  const [selectedBrandVoiceId, setSelectedBrandVoiceId] = useState<number | null>(null);
  // ICP targeting toggle
  const [icpEnabled, setIcpEnabled] = useState(true);
  const [selectedIcpId, setSelectedIcpId] = useState<number | null>(null);

  // Fetch sitemaps for the active project
  const { data: projectSitemaps = [] } = trpc.sitemaps.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  // Build the ICP audience string from the active project
  const icpAudienceString = useMemo(() => {
    if (!activeProject) return "";
    const parts: string[] = [];
    if (activeProject.icpPrimaryName) parts.push(activeProject.icpPrimaryName);
    if (activeProject.icpWhoTheyAre) parts.push(activeProject.icpWhoTheyAre);
    return parts.join(" — ");
  }, [activeProject]);

  // Also check ICP profiles for a default
  const defaultIcpProfile = useMemo(() => {
    return icpProfiles.find((p: any) => p.isDefault) || icpProfiles[0];
  }, [icpProfiles]);

  // Selected brand voice (default to the default one or first)
  const selectedBrandVoice = useMemo(() => {
    if (selectedBrandVoiceId) return brandVoices.find((v: any) => v.id === selectedBrandVoiceId);
    return brandVoices.find((v: any) => v.isDefault) || brandVoices[0] || null;
  }, [brandVoices, selectedBrandVoiceId]);

  // Selected ICP profile
  const selectedIcpProfile = useMemo(() => {
    if (!icpEnabled) return null;
    if (selectedIcpId) return icpProfiles.find((p: any) => p.id === selectedIcpId);
    return defaultIcpProfile;
  }, [icpProfiles, selectedIcpId, icpEnabled, defaultIcpProfile]);

  // Parse tone traits from brand voice
  const parseToneTraits = (toneTraits: string | null | undefined) => {
    if (!toneTraits) return { primary: [], supporting: [], standalone: [] };
    const primary: string[] = [];
    const supporting: string[] = [];
    const standalone: string[] = [];
    const parts = toneTraits.split("|");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.startsWith("PRIMARY:")) {
        primary.push(...trimmed.replace("PRIMARY:", "").split(",").map(s => s.trim()).filter(Boolean));
      } else if (trimmed.startsWith("SUPPORTING:")) {
        supporting.push(...trimmed.replace("SUPPORTING:", "").split(",").map(s => s.trim()).filter(Boolean));
      } else {
        standalone.push(...trimmed.split(",").map(s => s.trim()).filter(Boolean));
      }
    }
    return { primary, supporting, standalone };
  };

  // Effective audience: ICP-based or custom override
  const effectiveAudience = useMemo(() => {
    if (targetAudienceSource === "custom") return targetAudience;
    // Use project-level ICP first, then profile-level
    if (icpAudienceString) return icpAudienceString;
    if (defaultIcpProfile) {
      const parts: string[] = [];
      if (defaultIcpProfile.name) parts.push(defaultIcpProfile.name);
      if (defaultIcpProfile.description) parts.push(defaultIcpProfile.description);
      return parts.join(" — ");
    }
    return "";
  }, [targetAudienceSource, targetAudience, icpAudienceString, defaultIcpProfile]);

  // Auto-select all project sitemaps when they load
  useMemo(() => {
    if (projectSitemaps.length > 0 && selectedSitemapIds.size === 0) {
      setSelectedSitemapIds(new Set(projectSitemaps.map((s: any) => s.id)));
    }
  }, [projectSitemaps]);

  // Compute the combined list of sitemap URLs from selected project sitemaps + custom URLs
  const allSitemapUrls = useMemo(() => {
    const urls: string[] = [];
    projectSitemaps.forEach((s: any) => {
      if (selectedSitemapIds.has(s.id)) urls.push(s.url);
    });
    customSitemapUrls.forEach((u) => urls.push(u));
    return urls;
  }, [projectSitemaps, selectedSitemapIds, customSitemapUrls]);

  const toggleSitemapId = (id: number) => {
    setSelectedSitemapIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomSitemapUrl = () => {
    const url = newCustomSitemapUrl.trim();
    if (!url) {
      toast.error("Please enter a sitemap URL");
      return;
    }
    if (customSitemapUrls.includes(url)) {
      toast.error("This URL is already added");
      return;
    }
    setCustomSitemapUrls((prev) => [...prev, url]);
    setNewCustomSitemapUrl("");
    setShowCustomSitemapInput(false);
  };

  const removeCustomSitemapUrl = (index: number) => {
    setCustomSitemapUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualLink = () => {
    if (!newLinkUrl.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    setManualLinks((prev) => [...prev, { url: newLinkUrl.trim(), anchorText: newLinkAnchor.trim() }]);
    setNewLinkUrl("");
    setNewLinkAnchor("");
  };

  const removeManualLink = (index: number) => {
    setManualLinks((prev) => prev.filter((_, i) => i !== index));
  };

  const researchTopicMutation = trpc.outlines.researchTopic.useMutation({
    onSuccess: (data) => {
      if (data) {
        setResearchFindings(data);
        setShowResearchPanel(true);
        toast.success("Research completed! Generating outline with findings...");
        // Now generate outline with research data
        generateOutlineMutation.mutate({
          keyword: keyword.trim(),
          contentType,
          tone,
          targetWordCount: parseInt(targetWordCount),
          numSections: parseInt(numSections),
          numFaqs: parseInt(numFaqs),
          additionalInstructions: additionalInstructions || undefined,
          projectId: activeProjectId!,
          targetLocation: targetLocation.trim() || undefined,
          targetAudience: effectiveAudience || undefined,
          outputFormat,
          manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
          sitemapUrls: allSitemapUrls.length > 0 ? allSitemapUrls : undefined,
          autoLinkCount: parseInt(autoLinkCount),
          brandVoiceId: selectedBrandVoice?.id ?? undefined,
          icpProfileId: selectedIcpProfile?.id ?? undefined,
          secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
          research: data,
        });
      }
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (/overloaded|529|rate.?limit|too many|capacity/i.test(msg)) {
        toast.error("The AI service is currently overloaded. Generating outline without research...");
      } else {
        toast.error(msg || "Research failed, generating outline without research...");
      }
      // Fallback: generate outline without research
      generateOutlineMutation.mutate({
        keyword: keyword.trim(),
        contentType,
        tone,
        targetWordCount: parseInt(targetWordCount),
        numSections: parseInt(numSections),
        numFaqs: parseInt(numFaqs),
        additionalInstructions: additionalInstructions || undefined,
        projectId: activeProjectId!,
        targetLocation: targetLocation.trim() || undefined,
        targetAudience: effectiveAudience || undefined,
        outputFormat,
        manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
        sitemapUrls: allSitemapUrls.length > 0 ? allSitemapUrls : undefined,
        autoLinkCount: parseInt(autoLinkCount),
        brandVoiceId: selectedBrandVoice?.id ?? undefined,
        icpProfileId: selectedIcpProfile?.id ?? undefined,
        secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
      });
    },
  });

  const suggestKeywordsMutation = trpc.outlines.suggestKeywords.useMutation({
    onSuccess: (data) => {
      if (data) {
        // Combine all suggestions into a flat array, deduplicating
        const allSuggestions = [...data.secondary, ...data.lsi, ...data.longTail];
        const existing = new Set(secondaryKeywords.map(k => k.toLowerCase()));
        const newKeywords = allSuggestions.filter(k => !existing.has(k.toLowerCase()));
        setSuggestedKeywords({
          secondary: data.secondary,
          lsi: data.lsi,
          longTail: data.longTail,
        });
        setShowSuggestions(true);
        toast.success(`Found ${allSuggestions.length} keyword suggestions!`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to suggest keywords"),
  });

  const generateOutlineMutation = trpc.outlines.generate.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        setOutlineTitle(data.title);
        setSections(data.sections);
        setOutlineId(data.id);
        setStep("outline");
        // Expand all sections by default
        const allIds = new Set<string>();
        data.sections.forEach((s: OutlineSection) => {
          allIds.add(s.id);
          s.subSections?.forEach((sub: OutlineSection) => allIds.add(sub.id));
        });
        setExpandedSections(allIds);
        toast.success("Outline generated successfully!");
      }
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (/overloaded|529|rate.?limit|too many|capacity/i.test(msg)) {
        toast.error("The AI service is currently overloaded. Please wait a moment and try again.");
      } else {
        toast.error(msg || "Failed to generate outline");
      }
    },
  });

  const updateOutlineMutation = trpc.outlines.update.useMutation();

  const generateArticleMutation = trpc.articles.generate.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        toast.success("Article generated successfully!");
        navigate(`/articles/${data.id}`);
      }
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (/overloaded|529|rate.?limit|too many|capacity/i.test(msg)) {
        toast.error("The AI service is currently overloaded. Please wait a moment and try again.");
      } else {
        toast.error(msg || "Failed to generate article");
      }
    },
  });

  const isResearching = researchTopicMutation.isPending;
  const isGeneratingOutline = generateOutlineMutation.isPending;
  const isProcessing = isResearching || isGeneratingOutline;

  const handleGenerateOutline = () => {
    if (!keyword.trim()) {
      toast.error("Please enter a target keyword");
      return;
    }
    if (!activeProjectId) {
      toast.error("Please select a project first");
      return;
    }

    if (researchEnabled) {
      // Step 1: Research first, then generate outline in onSuccess
      researchTopicMutation.mutate({
        topic: keyword.trim(),
        keyword: keyword.trim(),
        niche: activeProject?.description || undefined,
        projectId: activeProjectId,
      });
    } else {
      // Skip research, generate outline directly
      generateOutlineMutation.mutate({
        keyword: keyword.trim(),
        contentType,
        tone,
        targetWordCount: parseInt(targetWordCount),
        numSections: parseInt(numSections),
        numFaqs: parseInt(numFaqs),
        additionalInstructions: additionalInstructions || undefined,
        projectId: activeProjectId,
        targetLocation: targetLocation.trim() || undefined,
        targetAudience: effectiveAudience || undefined,
        outputFormat,
        manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
        sitemapUrls: allSitemapUrls.length > 0 ? allSitemapUrls : undefined,
        autoLinkCount: allSitemapUrls.length > 0 ? parseInt(autoLinkCount) : undefined,
        brandVoiceId: selectedBrandVoice?.id ?? undefined,
        icpProfileId: selectedIcpProfile?.id ?? undefined,
        secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
      });
    }
  };

  // Helper: find which keywords match a section (heading + points + subSections)
  const getMatchingKeywords = (section: OutlineSection): string[] => {
    const allKeywords = [keyword.trim(), ...secondaryKeywords].filter(Boolean);
    if (allKeywords.length === 0) return [];
    const textParts = [
      section.heading,
      ...(section.points || []),
      ...(section.subSections?.flatMap(sub => [sub.heading, ...(sub.points || [])]) || []),
    ].join(" ").toLowerCase();
    return allKeywords.filter(kw => textParts.includes(kw.toLowerCase()));
  };

  const handleGenerateArticle = async () => {
    if (!outlineId || !activeProjectId) return;
    setStep("generating-article");

    // Save the latest sections (including AI instructions edits) to the database before generating
    try {
      await updateOutlineMutation.mutateAsync({
        id: outlineId,
        title: outlineTitle,
        sections,
      });
    } catch (err: any) {
      toast.error("Failed to save outline changes: " + (err.message || "Unknown error"));
      setStep("outline");
      return;
    }

    generateArticleMutation.mutate({
      outlineId,
      projectId: activeProjectId,
      targetLocation: targetLocation.trim() || undefined,
      targetAudience: effectiveAudience || undefined,
      outputFormat,
      manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
      sitemapUrls: allSitemapUrls.length > 0 ? allSitemapUrls : undefined,
      autoLinkCount: parseInt(autoLinkCount),
      brandVoiceId: selectedBrandVoice?.id ?? undefined,
      icpProfileId: selectedIcpProfile?.id ?? undefined,
      secondaryKeywords: secondaryKeywords.length > 0 ? secondaryKeywords : undefined,
      autoGradeEnabled: autoGradeEnabled || undefined,
      targetGrade: autoGradeEnabled ? targetGrade : undefined,
      maxGradeIterations: autoGradeEnabled ? maxGradeIterations : undefined,
    });
  };

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateSectionHeading = (sectionId: string, newHeading: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) return { ...s, heading: newHeading };
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) =>
              sub.id === sectionId ? { ...sub, heading: newHeading } : sub
            ),
          };
        }
        return s;
      })
    );
  };

  const removeSection = (sectionId: string) => {
    setSections((prev) => {
      // Try removing from top level
      const filtered = prev.filter((s) => s.id !== sectionId);
      if (filtered.length !== prev.length) return filtered;
      // Try removing from sub-sections
      return prev.map((s) => ({
        ...s,
        subSections: s.subSections?.filter((sub) => sub.id !== sectionId),
      }));
    });
  };

  const addSection = () => {
    const newId = `s${Date.now()}`;
    setSections((prev) => [
      ...prev,
      { id: newId, heading: "New Section", type: "h2" as const, points: [], subSections: [] },
    ]);
    setExpandedSections((prev) => { const next = new Set(prev); next.add(newId); return next; });
  };

  const addSectionBelow = (sectionId: string) => {
    const newId = `s${Date.now()}`;
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1) return prev;
      const next = [...prev];
      next.splice(idx + 1, 0, { id: newId, heading: "New Section", type: "h2" as const, points: [], subSections: [] });
      return next;
    });
    setExpandedSections((prev) => { const next = new Set(prev); next.add(newId); return next; });
  };

  const insertTemplate = (template: typeof SECTION_TEMPLATES[0]["items"][0], afterSectionId?: string) => {
    const newId = `s${Date.now()}`;
    const subSections = template.section.subSections?.map((sub, i) => ({
      ...sub,
      id: `${newId}-sub${i}`,
    })) || [];
    const newSection: OutlineSection = {
      id: newId,
      heading: template.section.heading,
      type: template.section.type,
      points: [...template.section.points],
      subSections,
      aiInstructions: template.section.aiInstructions,
      ...(template.section.backgroundColor ? { backgroundColor: template.section.backgroundColor } : {}),
      ...((template.section as any).templateType ? { templateType: (template.section as any).templateType } : {}),
    };
    setSections((prev) => {
      if (afterSectionId) {
        const idx = prev.findIndex((s) => s.id === afterSectionId);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx + 1, 0, newSection);
          return next;
        }
      }
      return [...prev, newSection];
    });
    setExpandedSections((prev) => {
      const next = new Set(prev);
      next.add(newId);
      subSections.forEach((sub) => next.add(sub.id));
      return next;
    });
    toast.success(`"${template.label}" template added`);
  };

  const moveSectionUp = (sectionId: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  };

  const moveSectionDown = (sectionId: string) => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === sectionId);
      if (idx === -1 || idx >= prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  };

  const updatePoint = (sectionId: string, pointIndex: number, newText: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          const newPoints = [...(s.points || [])];
          newPoints[pointIndex] = newText;
          return { ...s, points: newPoints };
        }
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) => {
              if (sub.id === sectionId) {
                const newPoints = [...(sub.points || [])];
                newPoints[pointIndex] = newText;
                return { ...sub, points: newPoints };
              }
              return sub;
            }),
          };
        }
        return s;
      })
    );
  };

  const addPoint = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          return { ...s, points: [...(s.points || []), ""] };
        }
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) =>
              sub.id === sectionId ? { ...sub, points: [...(sub.points || []), ""] } : sub
            ),
          };
        }
        return s;
      })
    );
  };

  const removePoint = (sectionId: string, pointIndex: number) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          return { ...s, points: (s.points || []).filter((_, i) => i !== pointIndex) };
        }
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) =>
              sub.id === sectionId
                ? { ...sub, points: (sub.points || []).filter((_, i) => i !== pointIndex) }
                : sub
            ),
          };
        }
        return s;
      })
    );
  };

  const updateAiInstructions = (sectionId: string, instructions: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) return { ...s, aiInstructions: instructions };
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) =>
              sub.id === sectionId ? { ...sub, aiInstructions: instructions } : sub
            ),
          };
        }
        return s;
      })
    );
  };

  const updateSectionBgColor = (sectionId: string, color: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) return { ...s, backgroundColor: color || undefined };
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) =>
              sub.id === sectionId ? { ...sub, backgroundColor: color || undefined } : sub
            ),
          };
        }
        return s;
      })
    );
  };

  const appendAiPreset = (sectionId: string, presetValue: string) => {
    setSections((prev) =>
      prev.map((s) => {
        if (s.id === sectionId) {
          const existing = (s.aiInstructions || "").trim();
          const newVal = existing ? `${existing}. ${presetValue}` : presetValue;
          return { ...s, aiInstructions: newVal };
        }
        if (s.subSections) {
          return {
            ...s,
            subSections: s.subSections.map((sub) => {
              if (sub.id === sectionId) {
                const existing = (sub.aiInstructions || "").trim();
                const newVal = existing ? `${existing}. ${presetValue}` : presetValue;
                return { ...sub, aiInstructions: newVal };
              }
              return sub;
            }),
          };
        }
        return s;
      })
    );
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Sparkles className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground mb-6">Select or create a project to generate articles.</p>
        <Button onClick={() => navigate("/projects")}>Go to Projects</Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          Generate Article
        </h1>
        <p className="text-muted-foreground mt-2">
          Create SEO-optimized content in two steps: generate an outline, then write the full article.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        {[
          { key: "settings", label: "1. Configure", icon: Settings2 },
          { key: "outline", label: "2. Review Outline", icon: ListTree },
          { key: "generating-article", label: "3. Generate Article", icon: FileText },
        ].map((s, i) => {
          const isActive = s.key === step;
          const isPast = (step === "outline" && i === 0) || (step === "generating-article" && i < 2);
          const Icon = s.icon;
          return (
            <div key={s.key} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isPast || isActive ? "bg-indigo-400" : "bg-border"}`} />}
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                isActive ? "bg-indigo-100 text-indigo-700" : isPast ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
              }`}>
                <Icon className="w-4 h-4" />
                {s.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step 1: Settings */}
      {step === "settings" && (
        <div className="bg-card rounded-xl border border-border/60 p-6 space-y-6">
          <div className="space-y-5">
            {/* Target Keyword */}
            <div>
              <Label className="text-sm font-semibold">Target Keyword *</Label>
              <Input
                placeholder="e.g., Medicare Advantage vs Medigap"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="mt-1.5 text-base"
              />
            </div>

            {/* Content Type + Tone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((ct) => (
                      <SelectItem key={ct.value} value={ct.value}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-semibold">Tone / Style</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Word Count + Sections + FAQs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-semibold">Target Word Count</Label>
                <Input
                  type="number"
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(e.target.value)}
                  className="mt-1.5"
                  min={500}
                  max={10000}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Number of Sections</Label>
                <Input
                  type="number"
                  value={numSections}
                  onChange={(e) => setNumSections(e.target.value)}
                  className="mt-1.5"
                  min={3}
                  max={15}
                />
              </div>
              <div>
                <Label className="text-sm font-semibold">Number of FAQs</Label>
                <Input
                  type="number"
                  value={numFaqs}
                  onChange={(e) => setNumFaqs(e.target.value)}
                  className="mt-1.5"
                  min={0}
                  max={10}
                />
              </div>
            </div>

            {/* Target Location + Output Format */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  Target Location
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <Input
                  placeholder="e.g., Nevada, South Florida, United States"
                  value={targetLocation}
                  onChange={(e) => setTargetLocation(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold">Output Format</Label>
                <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as "html" | "plaintext")}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="plaintext">Plain Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Project + Target Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  Project
                  <span className="text-xs text-muted-foreground font-normal">(Auto-populated)</span>
                </Label>
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-muted/30 text-sm">
                  {activeProject && (
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: activeProject.color }} />
                  )}
                  <span className="truncate">{activeProject?.name ?? "No project selected"}</span>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  Target Audience
                  <span className="text-xs text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <div className="mt-1.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTargetAudienceSource("icp")}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        targetAudienceSource === "icp"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      From ICP
                    </button>
                    <button
                      onClick={() => setTargetAudienceSource("custom")}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        targetAudienceSource === "custom"
                          ? "bg-indigo-100 text-indigo-700"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      Custom
                    </button>
                  </div>
                  {targetAudienceSource === "icp" ? (
                    <div className="px-3 py-2 rounded-md border border-input bg-muted/30 text-sm text-muted-foreground min-h-[38px]">
                      {effectiveAudience || "No ICP configured for this project. Set one in Project Settings or switch to Custom."}
                    </div>
                  ) : (
                    <Input
                      placeholder="e.g., Medicare-eligible seniors in Florida aged 65+"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Additional Instructions */}
            <div>
              <Label className="text-sm font-semibold">Additional Instructions</Label>
              <Textarea
                placeholder="Any specific requirements, angles, or topics to cover..."
                value={additionalInstructions}
                onChange={(e) => setAdditionalInstructions(e.target.value)}
                className="mt-1.5"
                rows={3}
              />
            </div>

            {/* Keywords to Include */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-sm font-semibold">Keywords to Include (optional)</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7"
                  disabled={!keyword.trim() || suggestKeywordsMutation.isPending}
                  onClick={() => {
                    if (!keyword.trim()) {
                      toast.error("Enter a target keyword first");
                      return;
                    }
                    suggestKeywordsMutation.mutate({
                      keyword: keyword.trim(),
                      contentType: contentType || undefined,
                      targetAudience: effectiveAudience || undefined,
                      targetLocation: targetLocation.trim() || undefined,
                      projectId: activeProjectId ?? undefined,
                    });
                  }}
                >
                  {suggestKeywordsMutation.isPending ? (
                    <><Loader2 className="w-3 h-3 animate-spin" />Suggesting...</>
                  ) : (
                    <><Wand2 className="w-3 h-3" />Suggest Keywords</>
                  )}
                </Button>
              </div>

              {/* Manual input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Secondary keywords, LSI terms (comma-separated)"
                  value={keywordInputValue}
                  onChange={(e) => setKeywordInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      const val = keywordInputValue.trim().replace(/,$/g, "");
                      if (val && !secondaryKeywords.includes(val.toLowerCase())) {
                        setSecondaryKeywords(prev => [...prev, val.toLowerCase()]);
                      }
                      setKeywordInputValue("");
                    }
                  }}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => {
                    const vals = keywordInputValue.split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
                    const existing = new Set(secondaryKeywords);
                    const newOnes = vals.filter(v => !existing.has(v));
                    if (newOnes.length > 0) {
                      setSecondaryKeywords(prev => [...prev, ...newOnes]);
                    }
                    setKeywordInputValue("");
                  }}
                  disabled={!keywordInputValue.trim()}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Selected keywords chips */}
              {secondaryKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {secondaryKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => setSecondaryKeywords(prev => prev.filter((_, idx) => idx !== i))}
                        className="hover:text-indigo-900 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {secondaryKeywords.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSecondaryKeywords([])}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-1"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              )}

              {/* LLM Suggestions panel */}
              {showSuggestions && suggestedKeywords && (
                <div className="mt-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      AI Suggestions
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const all = [...suggestedKeywords.secondary, ...suggestedKeywords.lsi, ...suggestedKeywords.longTail];
                          const existing = new Set(secondaryKeywords);
                          const newOnes = all.filter(k => !existing.has(k.toLowerCase())).map(k => k.toLowerCase());
                          setSecondaryKeywords(prev => [...prev, ...newOnes]);
                          setShowSuggestions(false);
                          toast.success(`Added ${newOnes.length} keywords`);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Add All
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSuggestions(false)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>

                  {suggestedKeywords.secondary.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Related Keywords</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedKeywords.secondary.map((kw, i) => {
                          const isAdded = secondaryKeywords.includes(kw.toLowerCase());
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (isAdded) {
                                  setSecondaryKeywords(prev => prev.filter(k => k !== kw.toLowerCase()));
                                } else {
                                  setSecondaryKeywords(prev => [...prev, kw.toLowerCase()]);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                isAdded
                                  ? "bg-indigo-100 text-indigo-700 border-indigo-300 hover:bg-indigo-200"
                                  : "bg-card text-secondary-foreground border-border hover:border-indigo-300 hover:bg-indigo-50"
                              }`}
                            >
                              {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {suggestedKeywords.lsi.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">LSI / Semantic Terms</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedKeywords.lsi.map((kw, i) => {
                          const isAdded = secondaryKeywords.includes(kw.toLowerCase());
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (isAdded) {
                                  setSecondaryKeywords(prev => prev.filter(k => k !== kw.toLowerCase()));
                                } else {
                                  setSecondaryKeywords(prev => [...prev, kw.toLowerCase()]);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                isAdded
                                  ? "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200"
                                  : "bg-card text-secondary-foreground border-border hover:border-emerald-300 hover:bg-emerald-50"
                              }`}
                            >
                              {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {suggestedKeywords.longTail.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Long-Tail Variations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {suggestedKeywords.longTail.map((kw, i) => {
                          const isAdded = secondaryKeywords.includes(kw.toLowerCase());
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (isAdded) {
                                  setSecondaryKeywords(prev => prev.filter(k => k !== kw.toLowerCase()));
                                } else {
                                  setSecondaryKeywords(prev => [...prev, kw.toLowerCase()]);
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors cursor-pointer ${
                                isAdded
                                  ? "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                  : "bg-card text-secondary-foreground border-border hover:border-amber-300 hover:bg-amber-50"
                              }`}
                            >
                              {isAdded ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                              {kw}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Brand Voice Section */}
            <div className="border-t border-border/60 pt-5">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <MessageSquare className="w-4 h-4 text-indigo-500" />
                Brand Voice
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                Select the brand voice to use for content generation.
              </p>

              {brandVoices.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    value={String(selectedBrandVoice?.id ?? "")}
                    onValueChange={(v) => setSelectedBrandVoiceId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a brand voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {brandVoices.map((voice: any) => (
                        <SelectItem key={voice.id} value={String(voice.id)}>
                          {voice.name}{voice.isDefault ? " (Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedBrandVoice && (() => {
                    const traits = parseToneTraits(selectedBrandVoice.toneTraits);
                    const perspectiveMap: Record<string, string> = {
                      first: "First person (I/we)",
                      second: "Second person (you/your)",
                      third: "Third person (they/one)",
                    };
                    return (
                      <div className="bg-indigo-50/60 border border-indigo-200/60 rounded-lg p-4 space-y-2">
                        <div className="flex flex-wrap gap-1.5">
                          {traits.primary.map((t, i) => (
                            <span key={`p-${i}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                              PRIMARY:{t}
                            </span>
                          ))}
                          {traits.supporting.map((t, i) => (
                            <span key={`s-${i}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              SUPPORTING:{t}
                            </span>
                          ))}
                          {traits.standalone.map((t, i) => (
                            <span key={`st-${i}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-muted text-secondary-foreground">
                              {t}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-indigo-600">
                          Perspective: {perspectiveMap[selectedBrandVoice.perspective] || selectedBrandVoice.perspective}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="px-4 py-3 rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                  No brand voices configured for this project. Add one in Project Settings.
                </div>
              )}
            </div>

            {/* ICP Targeting Section */}
            <div className="border-t border-border/60 pt-5">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Target className="w-4 h-4 text-teal-500" />
                  ICP Targeting
                </h3>
                <button
                  onClick={() => setIcpEnabled(!icpEnabled)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    icpEnabled
                      ? "bg-teal-100 text-teal-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {icpEnabled ? (
                    <><Check className="w-3 h-3" /> Enabled</>
                  ) : (
                    "Disabled"
                  )}
                </button>
              </div>

              {icpEnabled && (
                <div className="space-y-3 mt-3">
                  {icpProfiles.length > 1 && (
                    <Select
                      value={String(selectedIcpProfile?.id ?? "")}
                      onValueChange={(v) => setSelectedIcpId(Number(v))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an ICP profile" />
                      </SelectTrigger>
                      <SelectContent>
                        {icpProfiles.map((profile: any) => (
                          <SelectItem key={profile.id} value={String(profile.id)}>
                            {profile.name}{profile.isDefault ? " (Default)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {selectedIcpProfile ? (
                    <div className="bg-teal-50/60 border border-teal-200/60 rounded-lg p-4 space-y-2.5">
                      <p className="font-semibold text-sm text-teal-800">{selectedIcpProfile.name}</p>
                      {selectedIcpProfile.description && (
                        <p className="text-sm text-teal-700/80 leading-relaxed">{selectedIcpProfile.description}</p>
                      )}
                      {selectedIcpProfile.painPoints && selectedIcpProfile.painPoints.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {selectedIcpProfile.painPoints.slice(0, 4).map((pp: string, i: number) => (
                            <span key={i} className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              {pp}
                            </span>
                          ))}
                          {selectedIcpProfile.painPoints.length > 4 && (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              +{selectedIcpProfile.painPoints.length - 4} more
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-teal-600">
                        Content will be tailored to address pain points, goals, and objections
                      </p>
                    </div>
                  ) : (
                    <div className="px-4 py-3 rounded-lg border border-dashed border-border bg-muted/20 text-sm text-muted-foreground">
                      No ICP profiles configured for this project. Add one in Project Settings.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Internal Linking Section */}
            <div className="border-t border-border/60 pt-5">
              <h3 className="text-base font-semibold flex items-center gap-2 mb-1">
                <Link2 className="w-4 h-4 text-indigo-500" />
                Internal Linking
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add internal links to weave into the generated article for better SEO.
              </p>

              {/* Manual Internal Links */}
              <div className="space-y-3 mb-6">
                <Label className="text-sm font-semibold">
                  Manual Internal Links
                  <span className="text-xs text-muted-foreground font-normal ml-1.5">(Optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Manually add specific URLs you want to link to within the article
                </p>

                {/* Existing links */}
                {manualLinks.length > 0 && (
                  <div className="space-y-2">
                    {manualLinks.map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2 text-sm">
                        <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <span className="text-indigo-600 font-medium truncate flex-1">{link.url}</span>
                        {link.anchorText && (
                          <>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-foreground truncate max-w-[200px]">{link.anchorText}</span>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => removeManualLink(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new link row */}
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="URL (e.g., /about-us)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualLink(); } }}
                  />
                  <Input
                    placeholder="Anchor text"
                    value={newLinkAnchor}
                    onChange={(e) => setNewLinkAnchor(e.target.value)}
                    className="flex-1"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManualLink(); } }}
                  />
                  <Button
                    onClick={addManualLink}
                    className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Automatic Internal Linking from Sitemap */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Automatic Internal Linking from Sitemap
                  <span className="text-xs text-muted-foreground font-normal ml-1.5">(Optional)</span>
                </Label>
                <p className="text-xs text-muted-foreground -mt-1">
                  Select one or more sitemaps to automatically insert relevant hyperlinks into your article.
                </p>

                {/* Project Sitemaps */}
                {projectSitemaps.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Project Sitemaps</Label>
                    <div className="space-y-2">
                      {projectSitemaps.map((sitemap: any) => (
                        <label
                          key={sitemap.id}
                          className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                        >
                          <Checkbox
                            checked={selectedSitemapIds.has(sitemap.id)}
                            onCheckedChange={() => toggleSitemapId(sitemap.id)}
                            className="mt-0.5"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{sitemap.url}</p>
                            <p className="text-xs text-muted-foreground">{sitemap.urlCount} URLs</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Custom Sitemap URLs */}
                {customSitemapUrls.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Custom Sitemaps</Label>
                    <div className="space-y-2">
                      {customSitemapUrls.map((url, index) => (
                        <div key={index} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-accent/30">
                          <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-sm truncate flex-1">{url}</p>
                          <button
                            onClick={() => removeCustomSitemapUrl(index)}
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Sitemap URL */}
                {showCustomSitemapInput ? (
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="https://example.com/sitemap.xml"
                      value={newCustomSitemapUrl}
                      onChange={(e) => setNewCustomSitemapUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCustomSitemapUrl()}
                      className="flex-1"
                    />
                    <Button size="sm" variant="outline" onClick={addCustomSitemapUrl}>
                      <Plus className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCustomSitemapInput(false); setNewCustomSitemapUrl(""); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowCustomSitemapInput(true)}
                    className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    Add custom sitemap URL
                  </button>
                )}

                {/* Number of Links */}
                {allSitemapUrls.length > 0 && (
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Number of Links to Insert</Label>
                    <Select value={autoLinkCount} onValueChange={setAutoLinkCount}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LINK_COUNT_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total hyperlinks to insert across all selected sitemaps.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Research toggle */}
          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={researchEnabled}
                onChange={(e) => setResearchEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500"
              />
              <Search className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium text-foreground">Research topic first</span>
              <span className="text-xs text-muted-foreground">(recommended)</span>
            </label>
            <Button
              onClick={handleGenerateOutline}
              disabled={isProcessing || !keyword.trim()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-6"
              size="lg"
            >
              {isResearching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Researching Topic...
                </>
              ) : isGeneratingOutline ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Outline...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Generate Outline
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Review Outline */}
      {step === "outline" && (
        <div className="space-y-4">
          {/* Outline Title */}
          <div className="bg-card rounded-xl border border-border/60 p-6">
            <Label className="text-base font-semibold text-muted-foreground">Article Title</Label>
            <Input
              value={outlineTitle}
              onChange={(e) => setOutlineTitle(e.target.value)}
              className="mt-1.5 text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            />

            {/* Target Keywords Bar */}
            {(keyword.trim() || secondaryKeywords.length > 0) && (
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center gap-2 mb-2.5">
                  <Key className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-foreground">Target Keywords</span>
                  <span className="text-xs text-muted-foreground">({[keyword.trim(), ...secondaryKeywords].filter(Boolean).length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {keyword.trim() && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm">
                      <Target className="w-3.5 h-3.5" />
                      {keyword.trim()}
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 ml-0.5">Primary</span>
                    </span>
                  )}
                  {secondaryKeywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-muted text-secondary-foreground border border-border"
                    >
                      <Tag className="w-3 h-3 text-muted-foreground" />
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Research Findings Panel */}
          {researchFindings && showResearchPanel && (
            <div className="bg-card rounded-xl border border-indigo-200 overflow-hidden">
              <button
                onClick={() => setShowResearchPanel(!showResearchPanel)}
                className="w-full flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm font-semibold text-foreground">Research Findings</span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                    {(researchFindings.statistics?.length || 0) + (researchFindings.authoritativeSources?.length || 0) + (researchFindings.experts?.length || 0) + (researchFindings.commonQuestions?.length || 0)} items
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="px-4 pb-4 space-y-4">
                {/* Statistics */}
                {researchFindings.statistics?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Statistics & Data Points</h4>
                    <div className="space-y-1.5">
                      {researchFindings.statistics.map((stat, i) => (
                        <div key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-indigo-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                          <div>
                            <span className="font-medium text-foreground">{stat.value}</span>
                            <span> — {stat.fact}</span>
                            <span className="text-xs text-muted-foreground"> ({stat.source}{stat.year ? `, ${stat.year}` : ''})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Authoritative Sources */}
                {researchFindings.authoritativeSources?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Authoritative Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      {researchFindings.authoritativeSources.map((source, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          {source.name}
                          <span className="text-emerald-500">({source.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Experts */}
                {researchFindings.experts?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Experts & Thought Leaders</h4>
                    <div className="space-y-1.5">
                      {researchFindings.experts.map((expert, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-foreground">{expert.name}</span>
                          <span className="text-muted-foreground"> — {expert.credentials}</span>
                          {expert.notableQuote && (
                            <p className="text-xs text-muted-foreground italic mt-0.5 ml-4">"{expert.notableQuote}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Common Questions */}
                {researchFindings.commonQuestions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Common Questions (People Also Ask)</h4>
                    <div className="space-y-1">
                      {researchFindings.commonQuestions.map((q, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="text-amber-400">?</span>
                          <span className="text-foreground">{q.question}</span>
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">{q.intent}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Competitor Angles */}
                {researchFindings.competitorAngles?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2">Competitor Angles</h4>
                    <div className="space-y-1.5">
                      {researchFindings.competitorAngles.map((angle, i) => (
                        <div key={i} className="text-sm">
                          <span className="font-medium text-foreground">{angle.angle}</span>
                          <span className="text-muted-foreground"> — {angle.description}</span>
                          {angle.differentiator && (
                            <span className="text-xs text-rose-600 ml-1">→ {angle.differentiator}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Key Takeaways */}
                {researchFindings.keyTakeaways?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Takeaways</h4>
                    <ul className="space-y-1">
                      {researchFindings.keyTakeaways.map((takeaway, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-2">
                          <span className="text-muted-foreground">•</span>
                          {takeaway}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sections */}
          <div className="space-y-3">
            {sections.map((section, index) => (
              <div key={section.id} className="bg-card rounded-xl border border-border/60 overflow-hidden">
                {/* Section Header */}
                <div className="flex items-center gap-2 p-4 bg-muted/20">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex-shrink-0 p-0.5 hover:bg-muted rounded"
                  >
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className="text-xs font-mono font-semibold text-indigo-600 bg-indigo-50 rounded px-2 py-0.5 flex-shrink-0">
                    H2
                  </span>
                  <input
                    value={section.heading}
                    onChange={(e) => updateSectionHeading(section.id, e.target.value)}
                    className="flex-1 font-semibold text-lg bg-transparent border-none outline-none focus:ring-0"
                  />
                  {/* Keyword Match Badges */}
                  {(() => {
                    const matches = getMatchingKeywords(section);
                    if (matches.length === 0) return null;
                    return (
                      <div className="flex items-center gap-1 flex-shrink-0 mr-1">
                        {matches.map((kw, ki) => {
                          const isPrimary = kw.toLowerCase() === keyword.trim().toLowerCase();
                          return (
                            <span
                              key={ki}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                                isPrimary
                                  ? "bg-indigo-500 text-white shadow-sm"
                                  : "bg-emerald-100 text-emerald-700 border border-emerald-200"
                              }`}
                              title={isPrimary ? "Primary keyword found in this section" : "Secondary keyword found in this section"}
                            >
                              {isPrimary ? <Target className="w-3 h-3" /> : <Tag className="w-3 h-3" />}
                              {kw.length > 25 ? kw.substring(0, 25) + "…" : kw}
                            </span>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {/* Reorder + Add Below + Delete */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => moveSectionUp(section.id)}
                      disabled={index === 0}
                      title="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => moveSectionDown(section.id)}
                      disabled={index === sections.length - 1}
                      title="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 gap-1 px-2"
                      onClick={() => addSectionBelow(section.id)}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Below
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 gap-1 px-2"
                        >
                          <LayoutTemplate className="w-3.5 h-3.5" />
                          Template
                          <ChevronDown className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto">
                        {SECTION_TEMPLATES.map((cat, ci) => (
                          <div key={ci}>
                            {ci > 0 && <DropdownMenuSeparator />}
                            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">{cat.category}</DropdownMenuLabel>
                            {cat.items.map((template, ti) => (
                              <DropdownMenuItem
                                key={ti}
                                onClick={() => insertTemplate(template, section.id)}
                                className="flex items-start gap-3 py-2 cursor-pointer"
                              >
                                <template.icon className="w-4 h-4 mt-0.5 text-purple-500 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-sm">{template.label}</div>
                                  <div className="text-xs text-muted-foreground">{template.description}</div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </div>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => removeSection(section.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="px-4 pb-4 pt-2 space-y-3">
                    {/* Editable Points */}
                    <div className="pl-8 space-y-1.5">
                      {(section.points || []).map((point, pi) => (
                        <div key={pi} className="flex items-center gap-2 group/point">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                          <input
                            value={point}
                            onChange={(e) => updatePoint(section.id, pi, e.target.value)}
                            placeholder="Enter a key point..."
                            className="flex-1 text-base text-muted-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover/point:opacity-100 transition-opacity h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removePoint(section.id, pi)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                      <button
                        onClick={() => addPoint(section.id)}
                        className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium mt-1 pl-0.5"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Add point
                      </button>
                    </div>

                    {/* AI Instructions for this section */}
                    <div className="pl-8 mt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BotMessageSquare className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-amber-700">AI Instructions</span>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 rounded-md px-2 py-0.5 transition-colors">
                              <Plus className="w-3 h-3" />
                              Insert Preset
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            {AI_INSTRUCTION_PRESETS.map((group) => (
                              <div key={group.category}>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">{group.category}</DropdownMenuLabel>
                                {group.items.map((preset) => (
                                  <DropdownMenuItem
                                    key={preset.label}
                                    onClick={() => appendAiPreset(section.id, preset.value)}
                                    className="gap-2 cursor-pointer"
                                  >
                                    <preset.icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                    <span className="text-sm">{preset.label}</span>
                                  </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                              </div>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <textarea
                        value={section.aiInstructions || ""}
                        onChange={(e) => updateAiInstructions(section.id, e.target.value)}
                        placeholder="e.g., Include a comparison table, add a chart, use bullet points, focus on statistics..."
                        className="w-full text-sm text-muted-foreground bg-amber-50/50 border border-amber-200/60 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-300 placeholder:text-amber-400/60 resize-none"
                        rows={2}
                      />
                    </div>

                    {/* Background Color Picker */}
                    <div className="pl-8 mt-2">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Palette className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700">Background Color</span>
                        <span className="text-xs text-muted-foreground">(optional)</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {SECTION_BG_COLORS.map((color) => (
                          <button
                            key={color.name}
                            title={color.name}
                            onClick={() => updateSectionBgColor(section.id, color.value)}
                            className={`w-7 h-7 rounded-md transition-all flex items-center justify-center ${
                              color.swatch
                            } ${
                              (section.backgroundColor || "") === color.value
                                ? "ring-2 ring-indigo-500 ring-offset-1 scale-110"
                                : "hover:scale-105 hover:ring-1 hover:ring-gray-300"
                            }`}
                            style={color.value ? { backgroundColor: color.value } : undefined}
                          >
                            {(section.backgroundColor || "") === color.value && (
                              <Check className={`w-3.5 h-3.5 ${color.value ? "text-muted-foreground" : "text-muted-foreground"}`} />
                            )}
                          </button>
                        ))}
                      </div>
                      {section.backgroundColor && (
                        <div className="mt-2 flex items-center gap-2">
                          <div
                            className="h-6 flex-1 rounded-md border border-border"
                            style={{ backgroundColor: section.backgroundColor }}
                          />
                          <span className="text-xs text-muted-foreground font-mono">{section.backgroundColor}</span>
                        </div>
                      )}
                    </div>

                    {/* Sub-sections */}
                    {section.subSections && section.subSections.length > 0 && (
                      <div className="pl-6 space-y-2 mt-3 border-l-2 border-indigo-100">
                        {section.subSections.map((sub) => (
                          <div key={sub.id} className="group/sub">
                            <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                              <span className="text-xs font-mono font-semibold text-purple-600 bg-purple-50 rounded px-2 py-0.5 flex-shrink-0">
                                H3
                              </span>
                              <input
                                value={sub.heading}
                                onChange={(e) => updateSectionHeading(sub.id, e.target.value)}
                                className="flex-1 text-base font-medium bg-transparent border-none outline-none focus:ring-0"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover/sub:opacity-100 transition-opacity h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeSection(sub.id)}
                              >
                                <X className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            {/* Sub-section editable points */}
                            <div className="pl-12 space-y-1.5 pb-2">
                              {(sub.points || []).map((point, pi) => (
                                <div key={pi} className="flex items-center gap-2 group/subpoint">
                                  <span className="w-1 h-1 rounded-full bg-purple-400 flex-shrink-0" />
                                  <input
                                    value={point}
                                    onChange={(e) => updatePoint(sub.id, pi, e.target.value)}
                                    placeholder="Enter a key point..."
                                    className="flex-1 text-sm text-muted-foreground bg-transparent border-none outline-none focus:ring-0 placeholder:text-muted-foreground/40"
                                  />
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="opacity-0 group-hover/subpoint:opacity-100 transition-opacity h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => removePoint(sub.id, pi)}
                                  >
                                    <X className="w-3 h-3" />
                                  </Button>
                                </div>
                              ))}
                              <button
                                onClick={() => addPoint(sub.id)}
                                className="flex items-center gap-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium mt-1 pl-0.5"
                              >
                                <PlusCircle className="w-3 h-3" />
                                Add point
                              </button>
                              {/* AI Instructions for sub-section */}
                              <div className="mt-2">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <BotMessageSquare className="w-3 h-3 text-amber-500" />
                                  <span className="text-xs font-semibold text-amber-700">AI Instructions</span>
                                  <span className="text-xs text-muted-foreground">(optional)</span>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button className="ml-auto flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700 bg-amber-100/70 hover:bg-amber-200/70 rounded-md px-1.5 py-0.5 transition-colors">
                                        <Plus className="w-2.5 h-2.5" />
                                        Preset
                                        <ChevronDown className="w-2.5 h-2.5" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64">
                                      {AI_INSTRUCTION_PRESETS.map((group) => (
                                        <div key={group.category}>
                                          <DropdownMenuLabel className="text-xs text-muted-foreground">{group.category}</DropdownMenuLabel>
                                          {group.items.map((preset) => (
                                            <DropdownMenuItem
                                              key={preset.label}
                                              onClick={() => appendAiPreset(sub.id, preset.value)}
                                              className="gap-2 cursor-pointer"
                                            >
                                              <preset.icon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                              <span className="text-sm">{preset.label}</span>
                                            </DropdownMenuItem>
                                          ))}
                                          <DropdownMenuSeparator />
                                        </div>
                                      ))}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <textarea
                                  value={sub.aiInstructions || ""}
                                  onChange={(e) => updateAiInstructions(sub.id, e.target.value)}
                                  placeholder="e.g., Include a chart, focus on examples..."
                                  className="w-full text-xs text-muted-foreground bg-amber-50/50 border border-amber-200/60 rounded-lg px-2.5 py-1.5 outline-none focus:ring-1 focus:ring-amber-300 focus:border-amber-300 placeholder:text-amber-400/60 resize-none"
                                  rows={2}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Section + Insert Template + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={addSection} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Section
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">
                    <LayoutTemplate className="w-4 h-4" />
                    Insert Template
                    <ChevronDown className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72">
                  {SECTION_TEMPLATES.map((category, ci) => (
                    <div key={ci}>
                      {ci > 0 && <DropdownMenuSeparator />}
                      <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider">
                        {category.category}
                      </DropdownMenuLabel>
                      {category.items.map((template, ti) => (
                        <DropdownMenuItem
                          key={ti}
                          onClick={() => insertTemplate(template)}
                          className="flex items-start gap-3 py-2.5 cursor-pointer"
                        >
                          <template.icon className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{template.label}</span>
                            <span className="text-xs text-muted-foreground">{template.description}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-3">
              {/* Auto-Grade controls */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/60 bg-card">
                <input
                  type="checkbox"
                  id="autoGradeToggle"
                  checked={autoGradeEnabled}
                  onChange={(e) => setAutoGradeEnabled(e.target.checked)}
                  className="w-4 h-4 rounded border-border text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <GraduationCap className="w-4 h-4 text-indigo-500" />
                <label htmlFor="autoGradeToggle" className="text-sm font-medium cursor-pointer select-none">Auto-Grade</label>
                {autoGradeEnabled && (
                  <>
                    <Select value={targetGrade} onValueChange={setTargetGrade}>
                      <SelectTrigger className="h-7 w-16 text-xs border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["A", "A-", "B+", "B", "B-", "C+", "C"].map(g => (
                          <SelectItem key={g} value={g} className="text-xs">{g}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={maxGradeIterations}
                      onChange={(e) => setMaxGradeIterations(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                      className="w-12 h-7 text-xs border border-border/60 rounded px-2 text-center"
                      title="Max iterations"
                    />
                    <span className="text-xs text-muted-foreground">iter</span>
                  </>
                )}
              </div>

              <Button variant="outline" onClick={() => setStep("settings")}>
                Back to Settings
              </Button>
              <Button
                onClick={handleGenerateArticle}
                disabled={generateArticleMutation.isPending}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-6"
                size="lg"
              >
                {generateArticleMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Article...
                  </>
                ) : (
                  <>
                    <ArrowRight className="w-4 h-4" />
                    Generate Article
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Generating Article */}
      {step === "generating-article" && (
        <div className="bg-card rounded-xl border border-border/60 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Generating Your Article</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Our AI is writing a comprehensive article based on your outline. This typically takes 30-60 seconds.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            Writing content for "{outlineTitle}"
          </div>
        </div>
      )}
    </div>
  );
}
