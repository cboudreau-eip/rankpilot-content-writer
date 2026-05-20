import { useState, useMemo, useCallback } from "react";
import { useActiveProject } from "@/components/AppLayout";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import {
  ListTree,
  Plus,
  Search,
  Filter,
  Copy,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  Loader2,
  MoreHorizontal,
  ArrowRight,
  Sparkles,
  Wand2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
  Target,
  Lightbulb,
  Layout,
  BookOpen,
  Zap,
  TrendingUp,
  Users,
  Check,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type OutlinesTab = "library" | "builder" | "improve";

const statusConfig: Record<string, { label: string; icon: typeof Clock; class: string; bg: string }> = {
  draft: { label: "Draft", icon: Clock, class: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
  approved: { label: "Approved", icon: CheckCircle2, class: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200" },
  generating: { label: "Generating", icon: Loader2, class: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
  complete: { label: "Complete", icon: FileText, class: "text-indigo-600", bg: "bg-indigo-50 border-indigo-200" },
};

const categoryConfig: Record<string, { label: string; icon: typeof Target; color: string }> = {
  missing_section: { label: "Missing Section", icon: Plus, color: "text-red-600 bg-red-50" },
  heading_improvement: { label: "Heading", icon: Layout, color: "text-blue-600 bg-blue-50" },
  content_gap: { label: "Content Gap", icon: BookOpen, color: "text-amber-600 bg-amber-50" },
  structure: { label: "Structure", icon: ListTree, color: "text-purple-600 bg-purple-50" },
  seo: { label: "SEO", icon: TrendingUp, color: "text-green-600 bg-green-50" },
  entity: { label: "Entity", icon: Target, color: "text-indigo-600 bg-indigo-50" },
  user_intent: { label: "User Intent", icon: Users, color: "text-teal-600 bg-teal-50" },
};

function timeAgo(date: Date | string) {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Outlines() {
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState<OutlinesTab>("library");

  if (!activeProject) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <ListTree className="w-12 h-12 text-muted-foreground/40 mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Project Selected</h2>
        <p className="text-muted-foreground mb-6">Select a project to manage outlines.</p>
        <Link href="/projects">
          <Button>Go to Projects</Button>
        </Link>
      </div>
    );
  }

  const tabs: { id: OutlinesTab; label: string; icon: typeof ListTree }[] = [
    { id: "library", label: "Library", icon: ListTree },
    { id: "builder", label: "Create New", icon: Plus },
    { id: "improve", label: "Improve Outline", icon: Wand2 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Outlines</h1>
          <p className="text-muted-foreground mt-1">Create, manage, and improve content outlines for {activeProject.name}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "library" && <OutlineLibrary projectId={activeProject.id} />}
      {activeTab === "builder" && <OutlineBuilder projectId={activeProject.id} />}
      {activeTab === "improve" && <ImproveOutline projectId={activeProject.id} />}
    </div>
  );
}

// ============================================================
// LIBRARY TAB
// ============================================================

function OutlineLibrary({ projectId }: { projectId: number }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: outlines, isLoading } = trpc.outlines.list.useQuery({ projectId });
  const utils = trpc.useUtils();

  const deleteMutation = trpc.outlines.delete.useMutation({
    onSuccess: () => {
      utils.outlines.list.invalidate({ projectId });
      toast.success("Outline deleted");
    },
  });

  const duplicateMutation = trpc.outlines.duplicate.useMutation({
    onSuccess: () => {
      utils.outlines.list.invalidate({ projectId });
      toast.success("Outline duplicated");
    },
  });

  const updateStatusMutation = trpc.outlines.update.useMutation({
    onSuccess: () => {
      utils.outlines.list.invalidate({ projectId });
      toast.success("Status updated");
    },
  });

  const filteredOutlines = useMemo(() => {
    if (!outlines) return [];
    return outlines.filter((o) => {
      const matchesSearch = !search || o.title.toLowerCase().includes(search.toLowerCase()) || (o.keyword && o.keyword.toLowerCase().includes(search.toLowerCase()));
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [outlines, search, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search outlines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="generating">Generating</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredOutlines.length} outline{filteredOutlines.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Empty State */}
      {filteredOutlines.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListTree className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {outlines && outlines.length > 0 ? "No matching outlines" : "No outlines yet"}
          </h3>
          <p className="text-muted-foreground mb-4 max-w-md">
            {outlines && outlines.length > 0
              ? "Try adjusting your search or filter criteria."
              : "Create your first outline to start planning content structure."}
          </p>
        </div>
      )}

      {/* Outline List */}
      <div className="space-y-2">
        {filteredOutlines.map((outline) => {
          const config = statusConfig[outline.status] || statusConfig.draft;
          const StatusIcon = config.icon;
          const sectionCount = outline.sections?.length ?? 0;

          return (
            <Card key={outline.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status badge */}
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${config.bg} ${config.class}`}>
                    <StatusIcon className={`w-3.5 h-3.5 ${outline.status === "generating" ? "animate-spin" : ""}`} />
                    {config.label}
                  </div>

                  {/* Title and meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">{outline.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {outline.keyword && (
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          {outline.keyword}
                        </span>
                      )}
                      <span>{sectionCount} section{sectionCount !== 1 ? "s" : ""}</span>
                      <span>{timeAgo(outline.updatedAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Link href={`/generate?outlineId=${outline.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                        <ArrowRight className="w-3.5 h-3.5" />
                        Generate
                      </Button>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => duplicateMutation.mutate({ id: outline.id })}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: outline.id, status: "draft" })} disabled={outline.status === "draft"}>
                          <Clock className="w-4 h-4 mr-2" />
                          Set Draft
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: outline.id, status: "approved" })} disabled={outline.status === "approved"}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Set Approved
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatusMutation.mutate({ id: outline.id, status: "complete" })} disabled={outline.status === "complete"}>
                          <FileText className="w-4 h-4 mr-2" />
                          Set Complete
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => { if (confirm("Delete this outline?")) deleteMutation.mutate({ id: outline.id }); }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// BUILDER TAB
// ============================================================

interface BuilderSection {
  id: string;
  heading: string;
  type: "h2" | "h3";
  points: string[];
  subSections: BuilderSection[];
  aiInstructions?: string;
}

function OutlineBuilder({ projectId }: { projectId: number }) {
  const [title, setTitle] = useState("");
  const [keyword, setKeyword] = useState("");
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [numSections, setNumSections] = useState("8");
  const [targetWordCount, setTargetWordCount] = useState("1600");

  const utils = trpc.useUtils();
  const createMutation = trpc.outlines.create.useMutation({
    onSuccess: () => {
      utils.outlines.list.invalidate({ projectId });
      toast.success("Outline saved to library!");
      setTitle("");
      setKeyword("");
      setSections([]);
    },
  });

  const generateMutation = trpc.outlines.generate.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        setTitle(data.title || keyword);
        setSections(
          (data.sections || []).map((s: any, i: number) => ({
            id: s.id || `s${Date.now()}_${i}`,
            heading: s.heading,
            type: s.type || "h2",
            points: s.points || [],
            subSections: (s.subSections || []).map((sub: any, j: number) => ({
              id: sub.id || `ss${Date.now()}_${i}_${j}`,
              heading: sub.heading,
              type: "h3" as const,
              points: sub.points || [],
              subSections: [],
            })),
          }))
        );
        const allIds = new Set<string>();
        (data.sections || []).forEach((s: any, i: number) => allIds.add(s.id || `s${Date.now()}_${i}`));
        setExpandedSections(allIds);
        toast.success("Outline generated!");
      }
      setGenerating(false);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate outline");
      setGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!keyword.trim()) {
      toast.error("Enter a keyword to generate an outline");
      return;
    }
    setGenerating(true);
    generateMutation.mutate({
      keyword: keyword.trim(),
      projectId,
      numSections: parseInt(numSections) || 8,
      targetWordCount: parseInt(targetWordCount) || 1600,
    });
  };

  const handleSave = () => {
    if (!title.trim()) {
      toast.error("Enter a title for the outline");
      return;
    }
    if (sections.length === 0) {
      toast.error("Add at least one section");
      return;
    }
    setSaving(true);
    createMutation.mutate({
      title: title.trim(),
      keyword: keyword.trim() || undefined,
      sections: sections as any[],
      settings: { targetWordCount: parseInt(targetWordCount) || 1600, numSections: sections.length },
      projectId,
    }, { onSettled: () => setSaving(false) });
  };

  const addSection = () => {
    const id = `s${Date.now()}`;
    setSections((prev) => [...prev, { id, heading: "New Section", type: "h2", points: [], subSections: [] }]);
    setExpandedSections((prev) => { const next = new Set(prev); next.add(id); return next; });
  };

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<BuilderSection>) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const moveSection = (id: string, direction: "up" | "down") => {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx === -1) return prev;
      if (direction === "up" && idx === 0) return prev;
      if (direction === "down" && idx === prev.length - 1) return prev;
      const next = [...prev];
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
      return next;
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

  const addPoint = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, points: [...s.points, ""] } : s
      )
    );
  };

  const updatePoint = (sectionId: string, pointIdx: number, value: string) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? { ...s, points: s.points.map((p, i) => (i === pointIdx ? value : p)) }
          : s
      )
    );
  };

  const removePoint = (sectionId: string, pointIdx: number) => {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId ? { ...s, points: s.points.filter((_, i) => i !== pointIdx) } : s
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Generation Controls */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Target Keyword</label>
              <Input
                placeholder="e.g., best medicare supplement plans 2026"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="w-32">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Sections</label>
              <Input type="number" value={numSections} onChange={(e) => setNumSections(e.target.value)} min={3} max={20} />
            </div>
            <div className="w-36">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Word Target</label>
              <Input type="number" value={targetWordCount} onChange={(e) => setTargetWordCount(e.target.value)} min={500} max={10000} step={100} />
            </div>
            <Button onClick={handleGenerate} disabled={generating || !keyword.trim()} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? "Generating..." : "Generate with AI"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Outline Editor */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex-1 mr-4">
              <Input
                placeholder="Outline title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-lg font-semibold border-none shadow-none px-0 focus-visible:ring-0 placeholder:text-muted-foreground/50"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Section
              </Button>
              <Button onClick={handleSave} disabled={saving || sections.length === 0} className="gap-1.5 bg-indigo-600 hover:bg-indigo-700" size="sm">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save to Library
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {sections.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-border rounded-lg">
              <ListTree className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground mb-2">No sections yet</p>
              <p className="text-sm text-muted-foreground/70 mb-4">Generate with AI or add sections manually</p>
              <Button variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add First Section
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {sections.map((section, idx) => (
                <div key={section.id} className="border border-border rounded-lg overflow-hidden">
                  {/* Section Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <GripVertical className="w-4 h-4 text-muted-foreground/50 cursor-grab" />
                    <button onClick={() => toggleSection(section.id)} className="p-0.5">
                      {expandedSections.has(section.id) ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>
                    <Badge variant="outline" className="text-xs font-mono">H2</Badge>
                    <input
                      value={section.heading}
                      onChange={(e) => updateSection(section.id, { heading: e.target.value })}
                      className="flex-1 bg-transparent border-none text-sm font-medium focus:outline-none"
                      placeholder="Section heading..."
                    />
                    <div className="flex items-center gap-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(section.id, "up")} disabled={idx === 0}>
                        <ChevronDown className="w-3.5 h-3.5 rotate-180" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveSection(section.id, "down")} disabled={idx === sections.length - 1}>
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeSection(section.id)}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Section Content (expanded) */}
                  {expandedSections.has(section.id) && (
                    <div className="px-4 py-3 space-y-2 border-t border-border/50">
                      {/* Key Points */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Key Points</label>
                        {section.points.map((point, pi) => (
                          <div key={pi} className="flex items-center gap-2">
                            <span className="text-muted-foreground text-xs w-4">•</span>
                            <input
                              value={point}
                              onChange={(e) => updatePoint(section.id, pi, e.target.value)}
                              className="flex-1 text-sm bg-transparent border-none focus:outline-none"
                              placeholder="Key point..."
                            />
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500" onClick={() => removePoint(section.id, pi)}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ))}
                        <button onClick={() => addPoint(section.id)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-1">
                          <Plus className="w-3 h-3" />
                          Add point
                        </button>
                      </div>

                      {/* Sub-sections */}
                      {section.subSections.length > 0 && (
                        <div className="ml-4 space-y-1.5 border-l-2 border-indigo-100 pl-3">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sub-sections</label>
                          {section.subSections.map((sub) => (
                            <div key={sub.id} className="text-sm text-foreground/80">
                              <span className="font-medium">{sub.heading}</span>
                              {sub.points.length > 0 && (
                                <ul className="ml-4 mt-0.5 space-y-0.5">
                                  {sub.points.map((p, pi) => (
                                    <li key={pi} className="text-xs text-muted-foreground">• {p}</li>
                                  ))}
                                </ul>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// IMPROVE OUTLINE TAB
// ============================================================

interface Suggestion {
  id: string;
  category: string;
  priority: "high" | "medium" | "low";
  description: string;
  action: string;
  targetSectionIndex: number;
  newSection?: any;
}

function ImproveOutline({ projectId }: { projectId: number }) {
  const [rawOutline, setRawOutline] = useState("");
  const [keyword, setKeyword] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<{
    parsedSections: any[];
    overallScore: number;
    summary: string;
    suggestions: Suggestion[];
  } | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());
  const [applying, setApplying] = useState(false);
  const [improvedSections, setImprovedSections] = useState<any[] | null>(null);
  const [saving, setSaving] = useState(false);

  const utils = trpc.useUtils();

  const improveMutation = trpc.outlines.improveOutline.useMutation({
    onSuccess: (data: any) => {
      setResults(data);
      setSelectedSuggestions(new Set());
      setImprovedSections(null);
      setAnalyzing(false);
      toast.success("Analysis complete!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze outline");
      setAnalyzing(false);
    },
  });

  const applyMutation = trpc.outlines.applyImprovements.useMutation({
    onSuccess: (data: any) => {
      setImprovedSections(data.sections);
      setApplying(false);
      toast.success("Improvements applied!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply improvements");
      setApplying(false);
    },
  });

  const saveMutation = trpc.outlines.create.useMutation({
    onSuccess: () => {
      utils.outlines.list.invalidate({ projectId });
      toast.success("Improved outline saved to library!");
    },
  });

  const handleAnalyze = () => {
    if (!rawOutline.trim() || rawOutline.trim().length < 10) {
      toast.error("Paste an outline with at least 10 characters");
      return;
    }
    setAnalyzing(true);
    improveMutation.mutate({
      rawOutline: rawOutline.trim(),
      keyword: keyword.trim() || undefined,
      projectId,
      focusAreas: focusAreas.length > 0 ? focusAreas : undefined,
    });
  };

  const toggleSuggestion = (id: string) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (results) {
      setSelectedSuggestions(new Set(results.suggestions.map((s) => s.id)));
    }
  };

  const deselectAll = () => setSelectedSuggestions(new Set());

  const handleApply = () => {
    if (!results || selectedSuggestions.size === 0) return;
    setApplying(true);
    const selected = results.suggestions.filter((s) => selectedSuggestions.has(s.id));
    applyMutation.mutate({
      sections: results.parsedSections,
      suggestions: selected,
      keyword: keyword.trim() || undefined,
      projectId,
    });
  };

  const handleSaveImproved = () => {
    if (!improvedSections) return;
    setSaving(true);
    const outlineTitle = keyword ? `Improved: ${keyword}` : "Improved Outline";
    saveMutation.mutate({
      title: outlineTitle,
      keyword: keyword.trim() || undefined,
      sections: improvedSections.map((s: any, i: number) => ({
        ...s,
        id: s.id || `s${Date.now()}_${i}`,
      })),
      projectId,
    }, { onSettled: () => setSaving(false) });
  };

  const focusOptions = [
    { id: "seo", label: "SEO Structure" },
    { id: "entities", label: "Entity Coverage" },
    { id: "user_intent", label: "User Intent" },
    { id: "content_gaps", label: "Content Gaps" },
    { id: "headings", label: "Heading Quality" },
    { id: "depth", label: "Topic Depth" },
  ];

  const toggleFocus = (id: string) => {
    setFocusAreas((prev) => (prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Paste Your Outline</label>
            <Textarea
              placeholder="Paste any outline here — bullet points, numbered headings, or any format. The AI will parse, analyze, and suggest improvements..."
              value={rawOutline}
              onChange={(e) => setRawOutline(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Target Keyword (optional)</label>
              <Input
                placeholder="e.g., medicare supplement plans"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <Button onClick={handleAnalyze} disabled={analyzing || rawOutline.trim().length < 10} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
              {analyzing ? "Analyzing..." : "Analyze & Improve"}
            </Button>
          </div>

          {/* Focus Areas */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">Focus Areas (optional)</label>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => toggleFocus(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    focusAreas.includes(opt.id)
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-white border-border text-muted-foreground hover:border-indigo-200 hover:text-indigo-600"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Score & Summary */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative w-20 h-20 shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="3"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={results.overallScore >= 70 ? "#22c55e" : results.overallScore >= 40 ? "#f59e0b" : "#ef4444"}
                      strokeWidth="3"
                      strokeDasharray={`${results.overallScore}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold">{results.overallScore}</span>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-foreground mb-1">Outline Assessment</h3>
                  <p className="text-sm text-muted-foreground">{results.summary}</p>
                </div>

                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{results.parsedSections.length} sections detected</div>
                  <div className="text-sm text-muted-foreground">{results.suggestions.length} improvements found</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Suggested Improvements</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs">Select All</Button>
                  <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs">Deselect All</Button>
                  <Button
                    onClick={handleApply}
                    disabled={applying || selectedSuggestions.size === 0}
                    size="sm"
                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Apply Selected ({selectedSuggestions.size})
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {results.suggestions.map((suggestion) => {
                  const catConfig = categoryConfig[suggestion.category] || categoryConfig.content_gap;
                  const CatIcon = catConfig.icon;
                  const isSelected = selectedSuggestions.has(suggestion.id);

                  return (
                    <div
                      key={suggestion.id}
                      onClick={() => toggleSuggestion(suggestion.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isSelected ? "border-indigo-300 bg-indigo-50/50" : "border-border hover:border-indigo-200 hover:bg-muted/30"
                      }`}
                    >
                      {/* Checkbox */}
                      <div className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-indigo-600 border-indigo-600" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>

                      {/* Category badge */}
                      <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium shrink-0 ${catConfig.color}`}>
                        <CatIcon className="w-3 h-3" />
                        {catConfig.label}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground">{suggestion.description}</p>
                        {suggestion.action && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Action: {suggestion.action}</p>
                        )}
                      </div>

                      {/* Priority */}
                      <Badge
                        variant="outline"
                        className={`shrink-0 text-xs ${
                          suggestion.priority === "high"
                            ? "border-red-200 text-red-600 bg-red-50"
                            : suggestion.priority === "medium"
                            ? "border-amber-200 text-amber-600 bg-amber-50"
                            : "border-gray-200 text-gray-500 bg-gray-50"
                        }`}
                      >
                        {suggestion.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Improved Outline Preview */}
          {improvedSections && (
            <Card className="border-emerald-200 bg-emerald-50/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    Improved Outline
                  </CardTitle>
                  <Button onClick={handleSaveImproved} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" size="sm">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save to Library
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {improvedSections.map((section: any, idx: number) => (
                    <div key={section.id || idx} className="border border-emerald-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">H2</Badge>
                        <span className="font-medium text-sm">{section.heading}</span>
                      </div>
                      {section.points && section.points.length > 0 && (
                        <ul className="ml-8 mt-1.5 space-y-0.5">
                          {section.points.map((p: string, pi: number) => (
                            <li key={pi} className="text-xs text-muted-foreground">• {p}</li>
                          ))}
                        </ul>
                      )}
                      {section.subSections && section.subSections.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1.5 border-l-2 border-emerald-100 pl-3">
                          {section.subSections.map((sub: any, si: number) => (
                            <div key={si}>
                              <span className="text-xs font-medium text-foreground/80">{sub.heading}</span>
                              {sub.points && sub.points.length > 0 && (
                                <ul className="ml-4 mt-0.5 space-y-0.5">
                                  {sub.points.map((p: string, pi: number) => (
                                    <li key={pi} className="text-xs text-muted-foreground">• {p}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
