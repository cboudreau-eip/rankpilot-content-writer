import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useActiveProject } from "@/components/AppLayout";
import {
  Sparkles, FileText, GripVertical, ChevronDown, ChevronRight,
  Plus, Trash2, Loader2, ArrowRight, Settings2, Wand2, ListTree,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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

interface OutlineSection {
  id: string;
  heading: string;
  type: "h2" | "h3";
  points?: string[];
  subSections?: OutlineSection[];
}

export default function GenerateArticle() {
  const [, navigate] = useLocation();

  // Step state: "settings" | "outline" | "generating-article"
  const [step, setStep] = useState<"settings" | "outline" | "generating-article">("settings");

  // Settings
  const [keyword, setKeyword] = useState("");
  const [contentType, setContentType] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [targetWordCount, setTargetWordCount] = useState("2000");
  const [numSections, setNumSections] = useState("7");
  const [numFaqs, setNumFaqs] = useState("4");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Outline state
  const [outlineTitle, setOutlineTitle] = useState("");
  const [sections, setSections] = useState<OutlineSection[]>([]);
  const [outlineId, setOutlineId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;

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
    onError: (err: any) => toast.error(err.message || "Failed to generate outline"),
  });

  const generateArticleMutation = trpc.articles.generate.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        toast.success("Article generated successfully!");
        navigate(`/articles/${data.id}`);
      }
    },
    onError: (err: any) => toast.error(err.message || "Failed to generate article"),
  });

  const handleGenerateOutline = () => {
    if (!keyword.trim()) {
      toast.error("Please enter a target keyword");
      return;
    }
    if (!activeProjectId) {
      toast.error("Please select a project first");
      return;
    }
    generateOutlineMutation.mutate({
      keyword: keyword.trim(),
      contentType,
      tone,
      targetWordCount: parseInt(targetWordCount),
      numSections: parseInt(numSections),
      numFaqs: parseInt(numFaqs),
      additionalInstructions: additionalInstructions || undefined,
      projectId: activeProjectId,
    });
  };

  const handleGenerateArticle = () => {
    if (!outlineId || !activeProjectId) return;
    setStep("generating-article");
    generateArticleMutation.mutate({
      outlineId,
      projectId: activeProjectId,
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
    <div className="max-w-4xl mx-auto space-y-6">
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
        <div className="bg-white rounded-xl border border-border/60 p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold">Target Keyword *</Label>
              <Input
                placeholder="e.g., Medicare Advantage vs Medigap"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="mt-1.5 text-base"
              />
            </div>

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
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleGenerateOutline}
              disabled={generateOutlineMutation.isPending || !keyword.trim()}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 px-6"
              size="lg"
            >
              {generateOutlineMutation.isPending ? (
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
          <div className="bg-white rounded-xl border border-border/60 p-6">
            <Label className="text-sm font-semibold text-muted-foreground">Article Title</Label>
            <Input
              value={outlineTitle}
              onChange={(e) => setOutlineTitle(e.target.value)}
              className="mt-1.5 text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>

          {/* Sections */}
          <div className="bg-white rounded-xl border border-border/60 divide-y divide-border/40">
            {sections.map((section, index) => (
              <div key={section.id} className="group">
                <div className="flex items-center gap-2 p-4 hover:bg-muted/30 transition-colors">
                  <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab flex-shrink-0" />
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex-shrink-0"
                  >
                    {expandedSections.has(section.id) ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                    H2
                  </span>
                  <input
                    value={section.heading}
                    onChange={(e) => updateSectionHeading(section.id, e.target.value)}
                    className="flex-1 font-semibold text-[15px] bg-transparent border-none outline-none focus:ring-0"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    onClick={() => removeSection(section.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {expandedSections.has(section.id) && (
                  <div className="pl-14 pr-4 pb-4 space-y-2">
                    {/* Points */}
                    {section.points && section.points.length > 0 && (
                      <div className="space-y-1">
                        {section.points.map((point, pi) => (
                          <div key={pi} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                            <span>{point}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Sub-sections */}
                    {section.subSections && section.subSections.length > 0 && (
                      <div className="space-y-1 mt-3">
                        {section.subSections.map((sub) => (
                          <div key={sub.id} className="group/sub">
                            <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/30 transition-colors">
                              <span className="text-xs font-mono text-muted-foreground bg-muted rounded px-1.5 py-0.5 flex-shrink-0">
                                H3
                              </span>
                              <input
                                value={sub.heading}
                                onChange={(e) => updateSectionHeading(sub.id, e.target.value)}
                                className="flex-1 text-sm font-medium bg-transparent border-none outline-none focus:ring-0"
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="opacity-0 group-hover/sub:opacity-100 transition-opacity h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => removeSection(sub.id)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                            {sub.points && sub.points.length > 0 && (
                              <div className="pl-10 space-y-1 pb-1">
                                {sub.points.map((point, pi) => (
                                  <div key={pi} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <span className="w-1 h-1 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                                    <span>{point}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Section + Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={addSection} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Section
            </Button>
            <div className="flex items-center gap-3">
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
        <div className="bg-white rounded-xl border border-border/60 p-12 text-center">
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
