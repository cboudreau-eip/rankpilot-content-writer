import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  RefreshCw,
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FolderOpen,
  Link2,
  Flame,
  FileText,
  Heading1,
  ChevronDown,
  ChevronUp,
  Filter,
  Clock,
  CalendarClock,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";

interface PageAnalysis {
  url: string;
  wordCount: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  lastModified: string | null;
  isDated: boolean;
  issues: string[];
  recommendations: string[];
}

interface AnalysisResult {
  totalPages: number;
  pagesWithIssues: number;
  datedPages: number;
  avgWordCount: number;
  pages: PageAnalysis[];
}

type InputMode = "project" | "manual";
type FilterMode = "all" | "issues" | "clean" | "dated";

export default function ThinContent() {
  const { activeProject, projects } = useActiveProject();
  const [inputMode, setInputMode] = useState<InputMode>("project");
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [wordThreshold, setWordThreshold] = useState(300);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());

  // Project-based selection
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedSitemapId, setSelectedSitemapId] = useState<string>("");

  // Fetch sitemaps for selected project
  const { data: projectSitemaps = [] } = trpc.sitemaps.list.useQuery(
    { projectId: parseInt(selectedProjectId) },
    { enabled: !!selectedProjectId && inputMode === "project" }
  );

  const analyzeMutation = trpc.thinContent.analyze.useMutation({
    onSuccess: (data) => {
      setResults(data);
      toast.success(`Analyzed ${data.totalPages} pages`);
    },
    onError: (error) => {
      toast.error(error.message || "Analysis failed");
    },
  });

  // Auto-select active project
  useEffect(() => {
    if (activeProject && inputMode === "project") {
      setSelectedProjectId(String(activeProject.id));
    }
  }, [activeProject, inputMode]);

  // When sitemap is selected, update URL
  useEffect(() => {
    if (selectedSitemapId && inputMode === "project") {
      const sitemap = projectSitemaps.find((s) => String(s.id) === selectedSitemapId);
      if (sitemap) {
        setSitemapUrl(sitemap.url);
      }
    }
  }, [selectedSitemapId, projectSitemaps, inputMode]);

  // Reset sitemap when project changes
  useEffect(() => {
    setSelectedSitemapId("");
    if (inputMode === "project") {
      setSitemapUrl("");
    }
  }, [selectedProjectId, inputMode]);

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
    setSitemapUrl("");
    setSelectedProjectId(activeProject ? String(activeProject.id) : "");
    setSelectedSitemapId("");
    setResults(null);
  };

  const handleAnalyze = () => {
    if (!sitemapUrl.trim()) {
      toast.error("Please enter or select a sitemap URL");
      return;
    }
    try {
      new URL(sitemapUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }
    setResults(null);
    setExpandedPages(new Set());
    analyzeMutation.mutate({ sitemapUrl: sitemapUrl.trim(), wordThreshold });
  };

  const handleRefresh = () => {
    setResults(null);
    setSitemapUrl("");
    setWordThreshold(300);
    setSelectedSitemapId("");
    setExpandedPages(new Set());
    setFilterMode("all");
  };

  const toggleExpand = (index: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // Filtered pages
  const filteredPages = useMemo(() => {
    if (!results) return [];
    switch (filterMode) {
      case "issues":
        return results.pages.filter((p) => p.issues.length > 0);
      case "clean":
        return results.pages.filter((p) => p.issues.length === 0);
      case "dated":
        return results.pages.filter((p) => p.isDated);
      default:
        return results.pages;
    }
  }, [results, filterMode]);

  const healthScore = results
    ? Math.round(((results.totalPages - results.pagesWithIssues) / Math.max(results.totalPages, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Flame className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thin Content Analyzer</h1>
            <p className="text-sm text-muted-foreground">
              Scan your sitemap to identify pages with thin content and SEO issues
            </p>
          </div>
        </div>
      </div>

      {/* Input Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Search className="w-5 h-5 text-primary" />
            Sitemap Analysis
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
            <button
              onClick={() => handleModeChange("project")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === "project"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              From Project
            </button>
            <button
              onClick={() => handleModeChange("manual")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                inputMode === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Link2 className="w-4 h-4" />
              Manual URL
            </button>
          </div>

          {/* Project Selection Mode */}
          {inputMode === "project" && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Select Project</Label>
                <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.length === 0 ? (
                      <div className="py-3 px-2 text-sm text-muted-foreground text-center">
                        No projects found
                      </div>
                    ) : (
                      projects.map((project) => (
                        <SelectItem key={project.id} value={String(project.id)}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color || "#6366f1" }}
                            />
                            <span>{project.name}</span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedProjectId && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Select Sitemap</Label>
                  {projectSitemaps.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
                      <AlertTriangle className="w-4 h-4 inline mr-2" />
                      This project has no sitemaps. Add a sitemap in Project Settings or use Manual URL mode.
                    </div>
                  ) : (
                    <Select value={selectedSitemapId} onValueChange={setSelectedSitemapId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a sitemap to analyze" />
                      </SelectTrigger>
                      <SelectContent>
                        {projectSitemaps.map((sitemap) => (
                          <SelectItem key={sitemap.id} value={String(sitemap.id)}>
                            <div className="flex items-center gap-2">
                              <span className="truncate max-w-[300px]">{sitemap.url}</span>
                              <Badge variant="secondary" className="text-xs">
                                {sitemap.urlCount} URLs
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              {selectedSitemapId && sitemapUrl && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-sm">
                  <span className="text-muted-foreground">Selected: </span>
                  <span className="text-primary font-medium break-all">{sitemapUrl}</span>
                </div>
              )}
            </div>
          )}

          {/* Manual URL Mode */}
          {inputMode === "manual" && (
            <div>
              <Label className="text-sm font-medium mb-2 block">Sitemap URL</Label>
              <Input
                type="url"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
              />
            </div>
          )}

          {/* Word Threshold */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Word Count Threshold</Label>
            <Input
              type="number"
              min={50}
              max={5000}
              value={wordThreshold}
              onChange={(e) => setWordThreshold(parseInt(e.target.value) || 300)}
              className="max-w-[200px]"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pages with fewer words than this threshold will be flagged as thin content
            </p>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={analyzeMutation.isPending || !sitemapUrl.trim()}
            className="w-full gap-2"
          >
            {analyzeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing pages... This may take a moment
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Analyze Sitemap
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-3xl font-bold">{results.totalPages}</p>
                <p className="text-sm text-muted-foreground mt-1">Total Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-red-500">{results.pagesWithIssues}</p>
                <p className="text-sm text-muted-foreground mt-1">Pages with Issues</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
                  <CalendarClock className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-3xl font-bold text-amber-600">{results.datedPages}</p>
                <p className="text-sm text-muted-foreground mt-1">Dated Pages</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Heading1 className="w-5 h-5 text-primary" />
                </div>
                <p className="text-3xl font-bold text-primary">{results.avgWordCount}</p>
                <p className="text-sm text-muted-foreground mt-1">Avg Word Count</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                </div>
                <p className="text-3xl font-bold text-emerald-600">{healthScore}%</p>
                <p className="text-sm text-muted-foreground mt-1">Health Score</p>
                <Progress value={healthScore} className="mt-2 h-1.5" />
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Detailed Analysis</CardTitle>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <Select value={filterMode} onValueChange={(v) => setFilterMode(v as FilterMode)}>
                  <SelectTrigger className="w-[160px] h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages ({results.pages.length})</SelectItem>
                    <SelectItem value="issues">
                      Issues Only ({results.pages.filter((p) => p.issues.length > 0).length})
                    </SelectItem>
                    <SelectItem value="dated">
                      Dated Content ({results.pages.filter((p) => p.isDated).length})
                    </SelectItem>
                    <SelectItem value="clean">
                      Clean ({results.pages.filter((p) => p.issues.length === 0).length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredPages.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-emerald-400" />
                  <p className="font-medium">No pages match this filter</p>
                </div>
              ) : (
                filteredPages.map((page, index) => {
                  const isExpanded = expandedPages.has(index);
                  const hasIssues = page.issues.length > 0;

                  return (
                    <div
                      key={index}
                      className={`rounded-xl border p-4 transition-colors ${
                        hasIssues
                          ? "border-red-100 bg-red-50/30"
                          : "border-emerald-100 bg-emerald-50/30"
                      }`}
                    >
                      {/* URL Row */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <a
                            href={page.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-primary hover:underline flex items-center gap-1 break-all"
                          >
                            {page.url}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                          {/* Metric Badges */}
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                page.wordCount < wordThreshold
                                  ? "bg-red-100 text-red-700"
                                  : "bg-muted"
                              }`}
                            >
                              {page.wordCount} words
                            </Badge>
                            <Badge
                              variant="secondary"
                              className={`text-xs ${
                                page.h1Count === 0 || page.h1Count > 1
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-muted"
                              }`}
                            >
                              H1: {page.h1Count}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              H2: {page.h2Count}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              H3: {page.h3Count}
                            </Badge>
                            {page.lastModified && (
                              <Badge
                                variant="secondary"
                                className={`text-xs gap-1 ${page.isDated ? "bg-amber-100 text-amber-700" : "bg-muted"}`}
                              >
                                <Clock className="w-3 h-3" />
                                {new Date(page.lastModified).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge
                            className={`${
                              hasIssues
                                ? "bg-red-500 hover:bg-red-500 text-white"
                                : "bg-emerald-500 hover:bg-emerald-500 text-white"
                            }`}
                          >
                            {hasIssues
                              ? `${page.issues.length} Issue${page.issues.length > 1 ? "s" : ""}`
                              : "No Issues"}
                          </Badge>
                          {hasIssues && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => toggleExpand(index)}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Issues & Recommendations */}
                      {hasIssues && isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/50 space-y-3">
                          <div>
                            <div className="flex items-center gap-2 text-red-600 mb-2">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-sm font-medium">Issues Found</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-sm text-foreground/80 pl-1">
                              {page.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                          {page.recommendations.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-amber-600 mb-2">
                                Recommendations
                              </p>
                              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground pl-1">
                                {page.recommendations.map((rec, i) => (
                                  <li key={i}>{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Clean page inline message */}
                      {!hasIssues && (
                        <div className="flex items-center gap-2 text-emerald-600 mt-2">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">No issues found</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
