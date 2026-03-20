import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useActiveProject } from "@/components/AppLayout";
import {
  Sparkles, FileText, GripVertical, ChevronDown, ChevronRight,
  Plus, Trash2, Loader2, ArrowRight, Settings2, Wand2, ListTree,
  MapPin, Users, Link2, Globe,
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

const LINK_COUNT_OPTIONS = [
  { value: "3", label: "3 links" },
  { value: "5", label: "5 links (default)" },
  { value: "7", label: "7 links" },
  { value: "10", label: "10 links" },
  { value: "15", label: "15 links" },
];

interface OutlineSection {
  id: string;
  heading: string;
  type: "h2" | "h3";
  points?: string[];
  subSections?: OutlineSection[];
}

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
  const [targetWordCount, setTargetWordCount] = useState("2000");
  const [numSections, setNumSections] = useState("7");
  const [numFaqs, setNumFaqs] = useState("4");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // New fields
  const [targetLocation, setTargetLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [targetAudienceSource, setTargetAudienceSource] = useState<"icp" | "custom">("icp");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">("html");
  const [manualLinks, setManualLinks] = useState<ManualLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkAnchor, setNewLinkAnchor] = useState("");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [autoLinkCount, setAutoLinkCount] = useState("5");

  // Outline state
  const [outlineTitle, setOutlineTitle] = useState("");
  const [sections, setSections] = useState<OutlineSection[]>([]);
  const [outlineId, setOutlineId] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;

  // Fetch ICP profiles for the active project
  const { data: icpProfiles = [] } = trpc.icpProfiles.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

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

  // Auto-populate sitemap URL from project sitemaps
  useMemo(() => {
    if (projectSitemaps.length > 0 && !sitemapUrl) {
      setSitemapUrl(projectSitemaps[0].url);
    }
  }, [projectSitemaps]);

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
      targetLocation: targetLocation.trim() || undefined,
      targetAudience: effectiveAudience || undefined,
      outputFormat,
      manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
      sitemapUrl: sitemapUrl.trim() || undefined,
      autoLinkCount: sitemapUrl.trim() ? parseInt(autoLinkCount) : undefined,
    });
  };

  const handleGenerateArticle = () => {
    if (!outlineId || !activeProjectId) return;
    setStep("generating-article");
    generateArticleMutation.mutate({
      outlineId,
      projectId: activeProjectId,
      targetLocation: targetLocation.trim() || undefined,
      targetAudience: effectiveAudience || undefined,
      outputFormat,
      manualLinks: manualLinks.length > 0 ? manualLinks : undefined,
      sitemapUrl: sitemapUrl.trim() || undefined,
      autoLinkCount: sitemapUrl.trim() ? parseInt(autoLinkCount) : undefined,
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
        <div className="bg-white rounded-xl border border-border/60 p-6 space-y-6">
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

            {/* Divider */}
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
                  Provide a sitemap URL to automatically insert hyperlinks into your article. The AI will parse it and insert relevant hyperlinks into the article content.
                </p>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground">Sitemap URL</Label>
                  <Input
                    placeholder="https://example.com/sitemap.xml"
                    value={sitemapUrl}
                    onChange={(e) => setSitemapUrl(e.target.value)}
                    className="mt-1"
                  />
                  {projectSitemaps.length > 0 && sitemapUrl !== projectSitemaps[0]?.url && (
                    <button
                      onClick={() => setSitemapUrl(projectSitemaps[0].url)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                    >
                      Use project sitemap: {projectSitemaps[0].url}
                    </button>
                  )}
                </div>

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
                    Choose how many hyperlinks from the sitemap should be automatically inserted into the article content.
                  </p>
                </div>
              </div>
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
            <Label className="text-base font-semibold text-muted-foreground">Article Title</Label>
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
                    className="flex-1 font-semibold text-lg bg-transparent border-none outline-none focus:ring-0"
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
                          <div key={pi} className="flex items-start gap-2 text-base text-muted-foreground">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 flex-shrink-0" />
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
                                className="flex-1 text-base font-medium bg-transparent border-none outline-none focus:ring-0"
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
                                  <div key={pi} className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <span className="w-1 h-1 rounded-full bg-purple-400 mt-2 flex-shrink-0" />
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
