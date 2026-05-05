import { useState, useMemo, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Lightbulb, Search, Loader2, Target, TrendingUp, Users, BarChart3,
  FolderPlus, FileText, Sparkles, Pencil, Check, X, Plus, Trash2,
  PenTool, Archive, RotateCcw, ListFilter, ChevronDown,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useActiveProject } from "@/components/AppLayout";
import { useLocation } from "wouter";

// ---- Types ----

interface ArticleIdea {
  title: string;
  keyword: string;
  searchIntent: string;
  wordCountRange: string;
  contentAngles: string[];
  targetAudience: string;
  rankingPotential: string;
  description: string;
}

interface EditingIdea extends ArticleIdea {
  newAngle?: string;
}

// ---- Content Types ----

const CONTENT_TYPES = [
  { id: "how-to", label: "How-to Guides", description: "Instructional, step-by-step" },
  { id: "listicles", label: "Listicles", description: "\"Top 10...\", \"5 Ways to...\"" },
  { id: "faqs", label: "FAQs", description: "Question-and-answer format" },
  { id: "informative", label: "Informative", description: "General educational content" },
  { id: "local", label: "Local Guides", description: "Geo-targeted, location-specific" },
  { id: "service", label: "Service Pages", description: "Business/offering descriptions" },
  { id: "problem-solution", label: "Problem-Solution", description: "Pain point addressing" },
];

// ---- Helper Functions ----

function getIntentColor(intent: string) {
  switch (intent?.toLowerCase()) {
    case "informational": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    case "transactional": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "local": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
    case "navigational": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    default: return "bg-muted text-muted-foreground";
  }
}

function getPotentialColor(potential: string) {
  switch (potential?.toLowerCase()) {
    case "high": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "low": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
    default: return "bg-muted text-muted-foreground";
  }
}

// ---- Main Component ----

export default function Ideas() {
  const { activeProject, projects } = useActiveProject();
  const [, navigate] = useLocation();

  // Keyword picker state
  const [keywordPickerOpen, setKeywordPickerOpen] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState("");

  // Fetch project keywords for the picker
  const projectKeywordsQuery = trpc.entity.getProjectKeywords.useQuery(
    { projectId: activeProject?.id ?? 0 },
    { enabled: !!activeProject }
  );

  const filteredProjectKeywords = useMemo(() => {
    const keywords = projectKeywordsQuery.data?.keywords || [];
    if (!keywordFilter.trim()) return keywords;
    const lower = keywordFilter.toLowerCase();
    return keywords.filter((kw: any) => kw.keyword.toLowerCase().includes(lower));
  }, [projectKeywordsQuery.data, keywordFilter]);

  // Generator state
  const [seedKeyword, setSeedKeyword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedIdeas, setGeneratedIdeas] = useState<ArticleIdea[]>([]);
  const [selectedContentTypes, setSelectedContentTypes] = useState<string[]>([]);
  const [ideaCount, setIdeaCount] = useState(9);
  const [customInstructions, setCustomInstructions] = useState("");

  // Editing state
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingIdea, setEditingIdea] = useState<EditingIdea | null>(null);

  // Save dialog state
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [selectedIdeaForSave, setSelectedIdeaForSave] = useState<ArticleIdea | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  // Tab state: "generate" or "saved"
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");

  // Saved ideas query
  const savedIdeasQuery = trpc.ideas.list.useQuery(
    { projectId: activeProject?.id ?? 0 },
    { enabled: !!activeProject && activeTab === "saved" }
  );

  // Mutations
  const generateMutation = trpc.ideas.generate.useMutation();
  const saveMutation = trpc.ideas.save.useMutation();
  const deleteMutation = trpc.ideas.delete.useMutation();
  const updateMutation = trpc.ideas.update.useMutation();

  // ---- Handlers ----

  const handleGenerate = async () => {
    if (!seedKeyword.trim()) {
      toast.error("Please enter a seed keyword");
      return;
    }

    setIsGenerating(true);
    setGeneratedIdeas([]);

    try {
      const result = await generateMutation.mutateAsync({
        seedKeyword: seedKeyword.trim(),
        contentTypes: selectedContentTypes.length > 0 ? selectedContentTypes : undefined,
        count: ideaCount,
        customInstructions: customInstructions.trim() || undefined,
      });
      setGeneratedIdeas(result.ideas || []);
      toast.success(`Generated ${result.ideas?.length || 0} article ideas!`);
    } catch (error: any) {
      toast.error(error.message || "Failed to generate ideas. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContentTypeToggle = (typeId: string) => {
    setSelectedContentTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  const handleAddToProject = (idea: ArticleIdea) => {
    if (projects.length === 0) {
      toast.error("Please create a project first");
      return;
    }
    setSelectedIdeaForSave(idea);
    setSelectedProjectId(activeProject?.id?.toString() || "");
    setSaveDialogOpen(true);
  };

  const handleSaveIdea = async () => {
    if (!selectedIdeaForSave || !selectedProjectId) {
      toast.error("Please select a project");
      return;
    }

    setIsSaving(true);
    try {
      await saveMutation.mutateAsync({
        title: selectedIdeaForSave.title,
        keyword: selectedIdeaForSave.keyword,
        searchIntent: selectedIdeaForSave.searchIntent,
        wordCountRange: selectedIdeaForSave.wordCountRange,
        contentAngles: selectedIdeaForSave.contentAngles,
        targetAudience: selectedIdeaForSave.targetAudience,
        rankingPotential: selectedIdeaForSave.rankingPotential,
        description: selectedIdeaForSave.description,
        contentTypes: selectedContentTypes.join(", "),
        projectId: parseInt(selectedProjectId),
      });
      const projectName = projects.find(p => p.id === parseInt(selectedProjectId))?.name;
      toast.success(`Idea saved to "${projectName}"!`);
      setSaveDialogOpen(false);
      setSelectedIdeaForSave(null);
      savedIdeasQuery.refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to save idea");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUseIdea = (idea: ArticleIdea) => {
    // Store idea data and navigate to article generation
    localStorage.setItem("selectedIdea", JSON.stringify({
      keyword: idea.keyword,
      title: idea.title,
      targetAudience: idea.targetAudience,
      contentAngles: idea.contentAngles,
    }));
    navigate("/generate");
  };

  const handleDeleteSavedIdea = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      toast.success("Idea deleted");
      savedIdeasQuery.refetch();
    } catch {
      toast.error("Failed to delete idea");
    }
  };

  const handleArchiveIdea = async (id: number) => {
    try {
      await updateMutation.mutateAsync({ id, status: "archived" });
      toast.success("Idea archived");
      savedIdeasQuery.refetch();
    } catch {
      toast.error("Failed to archive idea");
    }
  };

  // Editing handlers
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditingIdea({ ...generatedIdeas[index], newAngle: "" });
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingIdea(null);
  };

  const handleSaveEdit = () => {
    if (editingIndex === null || !editingIdea) return;
    const updatedIdeas = [...generatedIdeas];
    const { newAngle, ...ideaWithoutNewAngle } = editingIdea;
    updatedIdeas[editingIndex] = ideaWithoutNewAngle;
    setGeneratedIdeas(updatedIdeas);
    setEditingIndex(null);
    setEditingIdea(null);
    toast.success("Idea updated!");
  };

  const updateEditingField = (field: keyof ArticleIdea, value: string | string[]) => {
    if (!editingIdea) return;
    setEditingIdea({ ...editingIdea, [field]: value });
  };

  const handleAddAngle = () => {
    if (!editingIdea || !editingIdea.newAngle?.trim()) return;
    const newAngles = [...editingIdea.contentAngles, editingIdea.newAngle.trim()];
    setEditingIdea({ ...editingIdea, contentAngles: newAngles, newAngle: "" });
  };

  const handleRemoveAngle = (angleIndex: number) => {
    if (!editingIdea) return;
    const newAngles = editingIdea.contentAngles.filter((_, i) => i !== angleIndex);
    setEditingIdea({ ...editingIdea, contentAngles: newAngles });
  };

  return (
    <div className="max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate AI-powered article ideas from a seed keyword
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("generate")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "generate"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Sparkles className="w-4 h-4 inline mr-1.5" />
          Generate
        </button>
        <button
          onClick={() => setActiveTab("saved")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "saved"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <FolderPlus className="w-4 h-4 inline mr-1.5" />
          Saved Ideas
          {savedIdeasQuery.data && savedIdeasQuery.data.length > 0 && (
            <Badge variant="secondary" className="ml-2 text-xs">{savedIdeasQuery.data.length}</Badge>
          )}
        </button>
      </div>

      {/* Generate Tab */}
      {activeTab === "generate" && (
        <div className="space-y-6">
          {/* Generator Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Generate Ideas
              </CardTitle>
              <CardDescription>
                Enter a seed keyword to discover related article topics and content opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {/* Seed Keyword + Generate Button */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Label htmlFor="seedKeyword" className="text-sm mb-1.5 block">Seed Keyword</Label>
                    <div className="flex gap-2">
                      <Input
                        id="seedKeyword"
                        value={seedKeyword}
                        onChange={(e) => setSeedKeyword(e.target.value)}
                        placeholder="e.g., medicare advantage plans, digital marketing tips"
                        onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                        className="flex-1"
                      />
                      {activeProject && (projectKeywordsQuery.data?.keywords?.length ?? 0) > 0 && (
                        <Popover open={keywordPickerOpen} onOpenChange={setKeywordPickerOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="shrink-0" title="Pick from saved keywords">
                              <ListFilter className="w-4 h-4 mr-1.5" />
                              Saved Keywords
                              <ChevronDown className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[320px] p-0" align="end">
                            <div className="p-3 border-b">
                              <Input
                                placeholder="Filter keywords..."
                                value={keywordFilter}
                                onChange={(e) => setKeywordFilter(e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="max-h-[280px] overflow-y-auto">
                              {filteredProjectKeywords.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                  {keywordFilter ? "No matching keywords" : "No saved keywords"}
                                </div>
                              ) : (
                                filteredProjectKeywords.map((kw: any) => (
                                  <button
                                    key={kw.id}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center justify-between gap-2"
                                    onClick={() => {
                                      setSeedKeyword(kw.keyword);
                                      setKeywordPickerOpen(false);
                                      setKeywordFilter("");
                                    }}
                                  >
                                    <span className="truncate font-medium">{kw.keyword}</span>
                                    {kw.volume && (
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {kw.volume >= 1000 ? `${(kw.volume / 1000).toFixed(1)}K` : kw.volume}/mo
                                      </span>
                                    )}
                                  </button>
                                ))
                              )}
                            </div>
                            <div className="p-2 border-t text-xs text-muted-foreground text-center">
                              {projectKeywordsQuery.data?.keywords?.length} keywords in {activeProject.name}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !seedKeyword.trim()}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-4 w-4" />
                          Generate Ideas
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Quantity Selector */}
                <div>
                  <Label className="text-sm mb-1.5 block">Number of Ideas</Label>
                  <Select value={ideaCount.toString()} onValueChange={(v) => setIdeaCount(parseInt(v))}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 ideas</SelectItem>
                      <SelectItem value="5">5 ideas</SelectItem>
                      <SelectItem value="7">7 ideas</SelectItem>
                      <SelectItem value="9">9 ideas (default)</SelectItem>
                      <SelectItem value="12">12 ideas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Content Types */}
                <div>
                  <Label className="text-sm mb-2 block flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    Content Types (Optional)
                  </Label>
                  <p className="text-xs text-muted-foreground mb-3">
                    Select specific content formats to focus the AI on those types of articles
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {CONTENT_TYPES.map((type) => (
                      <div
                        key={type.id}
                        className="flex items-start space-x-2.5 p-2.5 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleContentTypeToggle(type.id)}
                      >
                        <Checkbox
                          id={type.id}
                          checked={selectedContentTypes.includes(type.id)}
                          onCheckedChange={() => handleContentTypeToggle(type.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <label htmlFor={type.id} className="text-sm font-medium leading-none cursor-pointer">
                            {type.label}
                          </label>
                          <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedContentTypes.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {selectedContentTypes.length} type{selectedContentTypes.length !== 1 ? "s" : ""} selected
                      </Badge>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedContentTypes([])} className="h-6 text-xs">
                        Clear All
                      </Button>
                    </div>
                  )}
                </div>

                {/* Custom Instructions */}
                <div>
                  <Label className="text-sm mb-1.5 block flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    Custom AI Instructions (Optional)
                  </Label>
                  <Textarea
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder={"Add any specific instructions to guide the AI. Examples:\n• Keep titles under 60 characters\n• Focus on beginner-friendly topics\n• Target small business owners in Texas\n• Avoid competitor brand mentions\n• Include comparison/vs content ideas"}
                    className="min-h-[100px] text-sm"
                    maxLength={1000}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Provide context about your business, target audience, or title preferences.
                    <span className="ml-2 text-muted-foreground/60">({customInstructions.length}/1000)</span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {isGenerating && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-semibold mb-1">Analyzing Your Keyword</h3>
                  <p className="text-sm text-muted-foreground">Discovering trending topics and content opportunities...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated Ideas Grid */}
          {generatedIdeas.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Generated Ideas ({generatedIdeas.length})
                </h2>
                <Badge variant="secondary" className="text-xs">
                  Based on: "{seedKeyword}"
                </Badge>
              </div>

              <div className="grid gap-4">
                {generatedIdeas.map((idea, index) => {
                  const isEditing = editingIndex === index;
                  const displayIdea = isEditing && editingIdea ? editingIdea : idea;

                  return (
                    <IdeaCard
                      key={index}
                      idea={displayIdea}
                      isEditing={isEditing}
                      editingIdea={editingIdea}
                      onStartEdit={() => handleStartEdit(index)}
                      onCancelEdit={handleCancelEdit}
                      onSaveEdit={handleSaveEdit}
                      onUpdateField={updateEditingField}
                      onAddAngle={handleAddAngle}
                      onRemoveAngle={handleRemoveAngle}
                      onSetEditingIdea={setEditingIdea}
                      onAddToProject={() => handleAddToProject(idea)}
                      onUseIdea={() => handleUseIdea(idea)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isGenerating && generatedIdeas.length === 0 && (
            <Card className="text-center py-12">
              <CardContent>
                <Lightbulb className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No ideas generated yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Enter a seed keyword above and click Generate to discover article opportunities.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Saved Ideas Tab */}
      {activeTab === "saved" && (
        <div className="space-y-4">
          {!activeProject ? (
            <Card className="text-center py-12">
              <CardContent>
                <FolderPlus className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No project selected</h3>
                <p className="text-sm text-muted-foreground">
                  Select a project from the sidebar to view saved ideas.
                </p>
              </CardContent>
            </Card>
          ) : savedIdeasQuery.isLoading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : !savedIdeasQuery.data || savedIdeasQuery.data.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Lightbulb className="w-14 h-14 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved ideas</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate ideas and save them to this project to see them here.
                </p>
                <Button variant="outline" onClick={() => setActiveTab("generate")}>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Ideas
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {savedIdeasQuery.data.map((idea) => (
                <Card key={idea.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-base">{idea.title}</CardTitle>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {idea.searchIntent && (
                            <Badge className={`text-xs ${getIntentColor(idea.searchIntent)}`}>
                              <Target className="w-3 h-3 mr-1" />
                              {idea.searchIntent}
                            </Badge>
                          )}
                          {idea.rankingPotential && (
                            <Badge className={`text-xs ${getPotentialColor(idea.rankingPotential)}`}>
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {idea.rankingPotential} Potential
                            </Badge>
                          )}
                          {idea.wordCountRange && (
                            <Badge variant="outline" className="text-xs">
                              <BarChart3 className="w-3 h-3 mr-1" />
                              {idea.wordCountRange} words
                            </Badge>
                          )}
                          {idea.status === "archived" && (
                            <Badge variant="secondary" className="text-xs">
                              <Archive className="w-3 h-3 mr-1" />
                              Archived
                            </Badge>
                          )}
                          {idea.status === "used" && (
                            <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              <Check className="w-3 h-3 mr-1" />
                              Used
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleUseIdea({
                              title: idea.title,
                              keyword: idea.keyword,
                              searchIntent: idea.searchIntent || "",
                              wordCountRange: idea.wordCountRange || "",
                              contentAngles: idea.contentAngles || [],
                              targetAudience: idea.targetAudience || "",
                              rankingPotential: idea.rankingPotential || "",
                              description: idea.description || "",
                            })} className="h-8">
                              <PenTool className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Use this idea</TooltipContent>
                        </Tooltip>
                        {idea.status !== "archived" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => handleArchiveIdea(idea.id)} className="h-8">
                                <Archive className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Archive</TooltipContent>
                          </Tooltip>
                        )}
                        {idea.status === "archived" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline" onClick={async () => {
                                await updateMutation.mutateAsync({ id: idea.id, status: "saved" });
                                toast.success("Idea restored");
                                savedIdeasQuery.refetch();
                              }} className="h-8">
                                <RotateCcw className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Restore</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => handleDeleteSavedIdea(idea.id)} className="h-8 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Search className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-primary font-medium">{idea.keyword}</span>
                      </div>
                      {idea.targetAudience && (
                        <div className="flex items-start gap-2 text-sm">
                          <Users className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                          <span className="text-muted-foreground">{idea.targetAudience}</span>
                        </div>
                      )}
                      {idea.description && (
                        <p className="text-sm text-muted-foreground">{idea.description}</p>
                      )}
                      {idea.contentAngles && idea.contentAngles.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {idea.contentAngles.map((angle, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{angle}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Save to Project Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Idea to Project</DialogTitle>
            <DialogDescription>
              Select a project to save: <strong>{selectedIdeaForSave?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Project</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                      {project.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveIdea} disabled={!selectedProjectId || isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Save Idea
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Idea Card Component ----

interface IdeaCardProps {
  idea: ArticleIdea | EditingIdea;
  isEditing: boolean;
  editingIdea: EditingIdea | null;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onUpdateField: (field: keyof ArticleIdea, value: string | string[]) => void;
  onAddAngle: () => void;
  onRemoveAngle: (index: number) => void;
  onSetEditingIdea: (idea: EditingIdea) => void;
  onAddToProject: () => void;
  onUseIdea: () => void;
}

function IdeaCard({
  idea, isEditing, editingIdea,
  onStartEdit, onCancelEdit, onSaveEdit, onUpdateField,
  onAddAngle, onRemoveAngle, onSetEditingIdea,
  onAddToProject, onUseIdea,
}: IdeaCardProps) {
  return (
    <Card className={`hover:shadow-md transition-shadow ${isEditing ? "ring-2 ring-primary" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input
                  value={editingIdea?.title || ""}
                  onChange={(e) => onUpdateField("title", e.target.value)}
                  className="text-base font-semibold"
                  placeholder="Article title..."
                />
              </div>
            ) : (
              <CardTitle className="text-base">{idea.title}</CardTitle>
            )}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {isEditing ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Intent:</Label>
                    <Select value={editingIdea?.searchIntent || ""} onValueChange={(v) => onUpdateField("searchIntent", v)}>
                      <SelectTrigger className="w-[130px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="informational">Informational</SelectItem>
                        <SelectItem value="transactional">Transactional</SelectItem>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="navigational">Navigational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Potential:</Label>
                    <Select value={editingIdea?.rankingPotential || ""} onValueChange={(v) => onUpdateField("rankingPotential", v)}>
                      <SelectTrigger className="w-[110px] h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-xs text-muted-foreground">Words:</Label>
                    <Input
                      value={editingIdea?.wordCountRange || ""}
                      onChange={(e) => onUpdateField("wordCountRange", e.target.value)}
                      className="w-[110px] h-7 text-xs"
                      placeholder="e.g., 1500-2000"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Badge className={`text-xs ${getIntentColor(idea.searchIntent)}`}>
                    <Target className="w-3 h-3 mr-1" />
                    {idea.searchIntent}
                  </Badge>
                  <Badge className={`text-xs ${getPotentialColor(idea.rankingPotential)}`}>
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {idea.rankingPotential} Potential
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <BarChart3 className="w-3 h-3 mr-1" />
                    {idea.wordCountRange} words
                  </Badge>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 ml-3">
            {isEditing ? (
              <>
                <Button onClick={onSaveEdit} size="sm" className="h-8 bg-green-600 hover:bg-green-700">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
                <Button onClick={onCancelEdit} size="sm" variant="outline" className="h-8">
                  <X className="w-3.5 h-3.5 mr-1" />
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button onClick={onStartEdit} size="sm" variant="outline" className="h-8">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit</TooltipContent>
                </Tooltip>
                <Button onClick={onAddToProject} size="sm" variant="outline" className="h-8">
                  <FolderPlus className="w-3.5 h-3.5 mr-1" />
                  Save
                </Button>
                <Button onClick={onUseIdea} size="sm" className="h-8">
                  <PenTool className="w-3.5 h-3.5 mr-1" />
                  Use
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {/* Primary Keyword */}
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5" />
              Primary Keyword
            </h4>
            {isEditing ? (
              <Input
                value={editingIdea?.keyword || ""}
                onChange={(e) => onUpdateField("keyword", e.target.value)}
                className="text-primary font-medium text-sm"
                placeholder="Target keyword..."
              />
            ) : (
              <p className="text-sm text-primary font-medium">{idea.keyword}</p>
            )}
          </div>

          {/* Target Audience */}
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Target Audience
            </h4>
            {isEditing ? (
              <Textarea
                value={editingIdea?.targetAudience || ""}
                onChange={(e) => onUpdateField("targetAudience", e.target.value)}
                className="text-sm"
                placeholder="Who is this content for..."
                rows={2}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{idea.targetAudience}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <h4 className="text-sm font-medium mb-1">Description</h4>
            {isEditing ? (
              <Textarea
                value={editingIdea?.description || ""}
                onChange={(e) => onUpdateField("description", e.target.value)}
                className="text-sm"
                placeholder="Article description..."
                rows={3}
              />
            ) : (
              <p className="text-sm text-muted-foreground">{idea.description}</p>
            )}
          </div>

          {/* Content Angles */}
          <div>
            <h4 className="text-sm font-medium mb-1.5">Content Angles</h4>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {editingIdea?.contentAngles.map((angle, angleIndex) => (
                    <Badge key={angleIndex} variant="secondary" className="text-xs pr-1 flex items-center gap-1">
                      {angle}
                      <button
                        onClick={() => onRemoveAngle(angleIndex)}
                        className="ml-0.5 p-0.5 hover:bg-muted-foreground/20 rounded"
                        type="button"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={editingIdea?.newAngle || ""}
                    onChange={(e) => onSetEditingIdea({ ...editingIdea!, newAngle: e.target.value })}
                    placeholder="Add new content angle..."
                    className="flex-1 text-sm"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAddAngle(); } }}
                  />
                  <Button type="button" onClick={onAddAngle} size="sm" variant="outline" disabled={!editingIdea?.newAngle?.trim()}>
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            ) : (
              idea.contentAngles && idea.contentAngles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {idea.contentAngles.map((angle, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{angle}</Badge>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
