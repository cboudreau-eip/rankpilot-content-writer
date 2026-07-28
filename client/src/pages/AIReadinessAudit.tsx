import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Download, FileText, ChevronDown, ChevronUp, ExternalLink, Shield, AlertTriangle, Info, XCircle, Zap, ArrowRight, Code2, Layers, Link2, Lightbulb, PenTool, BookOpen, Globe, List, HelpCircle, FileCode } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

// Score color helpers
function scoreColor(score: number): string {
  if (score >= 70) return "#10b981";
  if (score >= 40) return "#f59e0b";
  return "#ef4444";
}

function scoreBg(score: number): string {
  if (score >= 70) return "bg-emerald-50 border-emerald-200";
  if (score >= 40) return "bg-amber-50 border-amber-200";
  return "bg-red-50 border-red-200";
}

function gradeColor(grade: string): string {
  if (grade.startsWith("A")) return "text-emerald-600";
  if (grade.startsWith("B")) return "text-blue-600";
  if (grade.startsWith("C")) return "text-amber-600";
  if (grade.startsWith("D")) return "text-orange-600";
  return "text-red-600";
}

function gradeBg(grade: string): string {
  if (grade.startsWith("A")) return "bg-emerald-50 border-emerald-200";
  if (grade.startsWith("B")) return "bg-blue-50 border-blue-200";
  if (grade.startsWith("C")) return "bg-amber-50 border-amber-200";
  if (grade.startsWith("D")) return "bg-orange-50 border-orange-200";
  return "bg-red-50 border-red-200";
}

function severityIcon(severity: string) {
  switch (severity) {
    case "critical": return <XCircle className="w-4 h-4 text-red-500" />;
    case "high": return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    case "medium": return <Info className="w-4 h-4 text-amber-500" />;
    case "low": return <Info className="w-4 h-4 text-blue-500" />;
    default: return <Info className="w-4 h-4 text-gray-500" />;
  }
}

function severityBadgeClass(severity: string): string {
  switch (severity) {
    case "critical": return "bg-red-100 text-red-700 border-red-200";
    case "high": return "bg-orange-100 text-orange-700 border-orange-200";
    case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
    case "low": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function categoryIcon(category: string) {
  switch (category) {
    case "schema": return <Code2 className="w-3 h-3" />;
    case "structure": return <Layers className="w-3 h-3" />;
    case "links": return <Link2 className="w-3 h-3" />;
    default: return null;
  }
}

// Progress bar component
function ScoreBar({ score, height = "h-2" }: { score: number; height?: string }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full ${height} overflow-hidden`}>
      <div
        className={`${height} rounded-full transition-all duration-500`}
        style={{ width: `${score}%`, backgroundColor: scoreColor(score) }}
      />
    </div>
  );
}

// Idea type icon helper
function ideaTypeIcon(type: string) {
  switch (type) {
    case "new-article": return <PenTool className="w-4 h-4" />;
    case "page-expansion": return <BookOpen className="w-4 h-4" />;
    case "restructure": return <Layers className="w-4 h-4" />;
    case "faq-page": return <HelpCircle className="w-4 h-4" />;
    case "hub-page": return <Globe className="w-4 h-4" />;
    case "glossary": return <List className="w-4 h-4" />;
    case "how-to-guide": return <FileCode className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

function ideaTypeLabel(type: string): string {
  switch (type) {
    case "new-article": return "New Article";
    case "page-expansion": return "Page Expansion";
    case "restructure": return "Restructure";
    case "faq-page": return "FAQ Page";
    case "hub-page": return "Hub Page";
    case "glossary": return "Glossary";
    case "how-to-guide": return "How-to Guide";
    default: return type;
  }
}

function priorityBadgeClass(priority: string): string {
  switch (priority) {
    case "high": return "bg-red-100 text-red-700 border-red-200";
    case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
    case "low": return "bg-blue-100 text-blue-700 border-blue-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function AIReadinessAudit() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<any>(null);
  const [ideas, setIdeas] = useState<any[] | null>(null);
  const [ideaSummary, setIdeaSummary] = useState("");
  const [, navigate] = useLocation();
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({
    schema: false,
    contentStructure: true,
    internalLinks: false,
  });
  const analyzeMutation = trpc.aiReadiness.analyze.useMutation({
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error) => {
      toast.error("Analysis Failed", { description: error.message });
    },
  });

  const outlineMutation = trpc.aiReadiness.generateOutline.useMutation({
    onSuccess: () => {
      toast.success("Outline Generated", { description: "Your improved outline has been created and saved." });
    },
    onError: (error) => {
      toast.error("Outline Generation Failed", { description: error.message });
    },
  });

  const ideasMutation = trpc.aiReadiness.generateIdeas.useMutation({
    onSuccess: (data) => {
      setIdeas(data.ideas);
      setIdeaSummary(data.summary);
      toast.success("Content Ideas Generated", { description: `${data.ideas.length} ideas to improve your page.` });
    },
    onError: (error) => {
      toast.error("Idea Generation Failed", { description: error.message });
    },
  });

  const exportMutation = trpc.aiReadiness.exportPdf.useMutation({
    onSuccess: (data) => {
      // Open HTML in a new window for printing as PDF
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(data.html);
        win.document.close();
        setTimeout(() => win.print(), 500);
      }
    },
    onError: (error) => {
      toast.error("Export Failed", { description: error.message });
    },
  });

  const handleAnalyze = () => {
    if (!url.trim()) {
      toast.error("URL Required", { description: "Please enter a URL to analyze." });
      return;
    }
    setResult(null);
    setIdeas(null);
    setIdeaSummary("");
    analyzeMutation.mutate({ url: url.trim() });
  };

  const handleGenerateIdeas = () => {
    if (!result) return;
    ideasMutation.mutate({ auditResult: result });
  };

  const handleUseIdea = (idea: any) => {
    // Store idea data and navigate to article generation
    localStorage.setItem("selectedIdea", JSON.stringify({
      keyword: idea.keyword,
      title: idea.title,
      targetAudience: "",
      contentAngles: idea.suggestedLinks || [],
    }));
    navigate("/generate");
  };

  const handleGenerateOutline = () => {
    if (!result) return;
    outlineMutation.mutate({ auditResult: result });
  };

  const handleExportPdf = () => {
    if (!result) return;
    exportMutation.mutate({ auditResult: result });
  };

  const togglePillar = (key: string) => {
    setExpandedPillars((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-blue-800 text-white py-8 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-7 h-7 text-emerald-400" />
            <h1 className="text-2xl font-bold">AI Readiness Audit</h1>
          </div>
          <p className="text-slate-300 text-sm">
            Check if your page is structurally findable, extractable, and citable by AI systems
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* URL Input */}
        <Card className="mb-6 shadow-sm">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.example.com/page-to-audit"
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                />
              </div>
              <Button
                onClick={handleAnalyze}
                disabled={analyzeMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Run Audit
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Analyzes schema markup, content structure, and internal linking to determine how AI-ready your page is.
            </p>
          </CardContent>
        </Card>

        {/* Loading State */}
        {analyzeMutation.isPending && (
          <Card className="mb-6">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700">Analyzing page...</p>
              <p className="text-sm text-gray-500 mt-1">Fetching HTML, running analyzers, and scoring with AI</p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Action Buttons */}
            <div className="flex justify-end gap-3 flex-wrap">
              <Button
                onClick={handleGenerateIdeas}
                disabled={ideasMutation.isPending}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {ideasMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="w-4 h-4 mr-2" />
                )}
                Generate Content Ideas
              </Button>
              <Button
                onClick={handleGenerateOutline}
                disabled={outlineMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {outlineMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 mr-2" />
                )}
                Generate Improved Outline
              </Button>
              <Button
                variant="outline"
                onClick={handleExportPdf}
                disabled={exportMutation.isPending}
              >
                {exportMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export PDF
              </Button>
            </div>

            {/* Overall Score Card */}
            <Card className="shadow-sm overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-6">
                  {/* Grade Badge */}
                  <div className={`flex-shrink-0 w-20 h-20 rounded-xl border-2 flex flex-col items-center justify-center ${gradeBg(result.letterGrade)}`}>
                    <span className={`text-3xl font-bold ${gradeColor(result.letterGrade)}`}>
                      {result.letterGrade}
                    </span>
                    <span className="text-xs text-gray-500">{result.overallScore}/100</span>
                  </div>

                  {/* Page Info */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-lg font-semibold text-gray-900 truncate flex items-center gap-2">
                      {result.pageTitle || "Untitled Page"}
                      <a href={result.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-gray-400 hover:text-blue-500" />
                      </a>
                    </h2>
                    <p className="text-sm text-gray-500 truncate mb-4">{result.url}</p>

                    {/* Three Pillar Scores */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className={`rounded-lg border p-3 ${scoreBg(result.pillars.schema.score)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Code2 className="w-4 h-4 text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Schema Markup</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: scoreColor(result.pillars.schema.score) }}>
                          {result.pillars.schema.score}
                        </div>
                        <ScoreBar score={result.pillars.schema.score} />
                      </div>

                      <div className={`rounded-lg border p-3 ${scoreBg(result.pillars.contentStructure.score)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Layers className="w-4 h-4 text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Content Structure</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: scoreColor(result.pillars.contentStructure.score) }}>
                          {result.pillars.contentStructure.score}
                        </div>
                        <ScoreBar score={result.pillars.contentStructure.score} />
                      </div>

                      <div className={`rounded-lg border p-3 ${scoreBg(result.pillars.internalLinks.score)}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <Link2 className="w-4 h-4 text-gray-600" />
                          <span className="text-xs font-medium text-gray-600">Internal Links</span>
                        </div>
                        <div className="text-2xl font-bold" style={{ color: scoreColor(result.pillars.internalLinks.score) }}>
                          {result.pillars.internalLinks.score}
                        </div>
                        <ScoreBar score={result.pillars.internalLinks.score} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Citability */}
            {result.aiCitability && (
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span className="font-semibold text-sm">AI Citability Score: {result.aiCitability.score}/100</span>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.aiCitability.summary}</p>
                </CardContent>
              </Card>
            )}

            {/* Quick Wins */}
            {result.quickWins?.length > 0 && (
              <Card className="shadow-sm border-l-4 border-l-emerald-500">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-emerald-500" />
                    <h3 className="font-semibold text-base">Quick Wins</h3>
                  </div>
                  <div className="space-y-2">
                    {result.quickWins.map((win: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <ArrowRight className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{win}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Key Findings */}
            {result.topFindings?.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Key Findings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {result.topFindings.map((finding: any, i: number) => (
                    <div
                      key={i}
                      className="border rounded-lg p-4 bg-white"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {severityIcon(finding.severity)}
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 ${severityBadgeClass(finding.severity)}`}>
                          {finding.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] px-2 py-0 bg-gray-50 text-gray-600 flex items-center gap-1">
                          {categoryIcon(finding.category)}
                          {finding.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-800 mb-2">{finding.finding}</p>
                      <p className="text-xs text-emerald-700">
                        <span className="font-semibold">Fix:</span> {finding.recommendation}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Schema Markup Pillar Detail */}
            <Card className="shadow-sm">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => togglePillar("schema")}
              >
                <div className="flex items-center gap-3">
                  <Code2 className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold">Schema Markup</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: scoreColor(result.pillars.schema.score) }}>
                    {result.pillars.schema.score}
                  </span>
                  <span className="text-sm text-gray-400">/100</span>
                  <div className="w-24">
                    <ScoreBar score={result.pillars.schema.score} />
                  </div>
                  {expandedPillars.schema ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              {expandedPillars.schema && (
                <CardContent className="pt-0 px-5 pb-5 border-t">
                  {/* Schema types found/missing */}
                  <div className="mt-4 space-y-2">
                    {result.pillars.schema.details?.map((detail: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className={detail.present ? "text-emerald-500" : "text-red-400"}>
                          {detail.present ? "✓" : "✗"}
                        </span>
                        <span className="font-medium">{detail.type}</span>
                        <span className="text-gray-500">— {detail.note}</span>
                      </div>
                    ))}
                  </div>
                  {/* Suggestions */}
                  {result.pillars.schema.suggestions?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                      {result.pillars.schema.suggestions.map((s: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 mb-1">• {s}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Content Structure Pillar Detail */}
            <Card className="shadow-sm">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => togglePillar("contentStructure")}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold">Content Structure</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: scoreColor(result.pillars.contentStructure.score) }}>
                    {result.pillars.contentStructure.score}
                  </span>
                  <span className="text-sm text-gray-400">/100</span>
                  <div className="w-24">
                    <ScoreBar score={result.pillars.contentStructure.score} />
                  </div>
                  {expandedPillars.contentStructure ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              {expandedPillars.contentStructure && (
                <CardContent className="pt-0 px-5 pb-5 border-t">
                  {/* Summary */}
                  {result.pillars.contentStructure.analysis?.summary && (
                    <p className="text-sm text-gray-700 mt-4 leading-relaxed">
                      {result.pillars.contentStructure.analysis.summary}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.contentStructure.raw?.estimatedWordCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">Words</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.contentStructure.raw?.totalHeadings || 0}
                      </div>
                      <div className="text-xs text-gray-500">Headings</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.contentStructure.raw?.paragraphCount || 0}
                      </div>
                      <div className="text-xs text-gray-500">Paragraphs</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.contentStructure.raw?.avgParagraphLength || 0}w
                      </div>
                      <div className="text-xs text-gray-500">Avg ¶ Length</div>
                    </div>
                  </div>

                  {/* Semantic HTML Elements */}
                  {result.pillars.contentStructure.raw?.semanticElements && (
                    <div className="mt-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Semantic HTML Elements</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(result.pillars.contentStructure.raw.semanticElements).map(([key, val]: [string, any]) => (
                          <Badge key={key} variant="outline" className={`text-xs ${val > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500"}`}>
                            {val > 0 ? "✓" : "○"} {key.charAt(0).toUpperCase() + key.slice(1)} {val}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Breakdown */}
                  {result.pillars.contentStructure.analysis && (
                    <div className="mt-6 space-y-4">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Detailed Breakdown</h4>

                      {/* Heading Hierarchy */}
                      {result.pillars.contentStructure.analysis.headingHierarchy && (
                        <SubScoreSection
                          title="Heading Hierarchy"
                          score={result.pillars.contentStructure.analysis.headingHierarchy.score}
                          assessment={result.pillars.contentStructure.analysis.headingHierarchy.assessment}
                          issues={result.pillars.contentStructure.analysis.headingHierarchy.issues}
                        />
                      )}

                      {/* Content Segmentation */}
                      {result.pillars.contentStructure.analysis.contentSegmentation && (
                        <SubScoreSection
                          title="Content Segmentation"
                          score={result.pillars.contentStructure.analysis.contentSegmentation.score}
                          assessment={result.pillars.contentStructure.analysis.contentSegmentation.assessment}
                          issues={result.pillars.contentStructure.analysis.contentSegmentation.issues}
                        />
                      )}

                      {/* AI Extractability */}
                      {result.pillars.contentStructure.analysis.aiExtractability && (
                        <SubScoreSection
                          title="AI Extractability"
                          score={result.pillars.contentStructure.analysis.aiExtractability.score}
                          assessment={result.pillars.contentStructure.analysis.aiExtractability.assessment}
                          issues={result.pillars.contentStructure.analysis.aiExtractability.issues}
                        />
                      )}

                      {/* Semantic Clarity */}
                      {result.pillars.contentStructure.analysis.semanticClarity && (
                        <SubScoreSection
                          title="Semantic Clarity"
                          score={result.pillars.contentStructure.analysis.semanticClarity.score}
                          assessment={result.pillars.contentStructure.analysis.semanticClarity.assessment}
                          issues={result.pillars.contentStructure.analysis.semanticClarity.issues}
                        />
                      )}
                    </div>
                  )}

                  {/* Heading Outline */}
                  {result.pillars.contentStructure.raw?.headingHierarchy?.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Heading Outline</h4>
                      <div className="bg-gray-50 border rounded-lg p-4 max-h-64 overflow-y-auto">
                        {result.pillars.contentStructure.raw.headingHierarchy.slice(0, 30).map((h: any, i: number) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 py-0.5"
                            style={{ paddingLeft: `${(h.level - 1) * 16}px` }}
                          >
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-slate-100 text-slate-600 font-mono">
                              H{h.level}
                            </Badge>
                            <span className="text-sm text-gray-700">{h.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Internal Links Pillar Detail */}
            <Card className="shadow-sm">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => togglePillar("internalLinks")}
              >
                <div className="flex items-center gap-3">
                  <Link2 className="w-5 h-5 text-gray-600" />
                  <span className="font-semibold">Internal Links</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold" style={{ color: scoreColor(result.pillars.internalLinks.score) }}>
                    {result.pillars.internalLinks.score}
                  </span>
                  <span className="text-sm text-gray-400">/100</span>
                  <div className="w-24">
                    <ScoreBar score={result.pillars.internalLinks.score} />
                  </div>
                  {expandedPillars.internalLinks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
              {expandedPillars.internalLinks && (
                <CardContent className="pt-0 px-5 pb-5 border-t">
                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.internalLinks.internalLinks || 0}
                      </div>
                      <div className="text-xs text-gray-500">Internal</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.internalLinks.externalLinks || 0}
                      </div>
                      <div className="text-xs text-gray-500">External</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.internalLinks.descriptiveAnchors || 0}
                      </div>
                      <div className="text-xs text-gray-500">Descriptive</div>
                    </div>
                    <div className="bg-gray-50 border rounded-lg p-3 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {result.pillars.internalLinks.genericAnchors || 0}
                      </div>
                      <div className="text-xs text-gray-500">Generic</div>
                    </div>
                  </div>

                  {/* Unique targets */}
                  {result.pillars.internalLinks.uniqueTargets > 0 && (
                    <p className="text-sm text-gray-600 mt-3">
                      <span className="font-medium">{result.pillars.internalLinks.uniqueTargets}</span> unique internal link targets •{" "}
                      <span className="font-medium">{result.pillars.internalLinks.linkDensity?.toFixed(1)}</span> links per 1000 words
                    </p>
                  )}

                  {/* Suggestions */}
                  {result.pillars.internalLinks.suggestions?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Recommendations</h4>
                      {result.pillars.internalLinks.suggestions.map((s: string, i: number) => (
                        <p key={i} className="text-sm text-gray-600 mb-1">• {s}</p>
                      ))}
                    </div>
                  )}

                  {/* Sample anchors */}
                  {result.pillars.internalLinks.sampleAnchors?.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold mb-2">Sample Internal Links</h4>
                      <div className="bg-gray-50 border rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                        {result.pillars.internalLinks.sampleAnchors.slice(0, 15).map((anchor: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={anchor.isGeneric ? "text-red-500" : "text-emerald-500"}>
                              {anchor.isGeneric ? "✗" : "✓"}
                            </span>
                            <span className="font-medium text-gray-700 truncate max-w-[200px]">{anchor.text}</span>
                            <span className="text-gray-400 truncate">→ {anchor.href}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Content Ideas Section */}
            {ideas && ideas.length > 0 && (
              <Card className="shadow-sm border-l-4 border-l-amber-500">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-amber-500" />
                    Content Ideas to Improve This Page
                  </CardTitle>
                  {ideaSummary && (
                    <p className="text-sm text-gray-600 mt-1">{ideaSummary}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {ideas.map((idea: any, i: number) => (
                      <div key={i} className="border rounded-lg p-4 hover:border-amber-300 hover:bg-amber-50/30 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-amber-600">{ideaTypeIcon(idea.type)}</span>
                              <h4 className="font-semibold text-gray-900 text-sm">{idea.title}</h4>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {ideaTypeLabel(idea.type)}
                              </Badge>
                              <Badge variant="outline" className={`text-xs ${priorityBadgeClass(idea.priority)}`}>
                                {idea.priority} priority
                              </Badge>
                              {idea.keyword && (
                                <Badge variant="secondary" className="text-xs">
                                  🎯 {idea.keyword}
                                </Badge>
                              )}
                              {idea.wordCountRange && (
                                <span className="text-xs text-gray-500">{idea.wordCountRange} words</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{idea.description}</p>
                            <div className="flex items-start gap-1 text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1">
                              <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span><strong>Addresses:</strong> {idea.rationale}</span>
                            </div>
                            {idea.suggestedLinks?.length > 0 && (
                              <div className="mt-2 text-xs text-gray-500">
                                <span className="font-medium">Link opportunities:</span>{" "}
                                {idea.suggestedLinks.join("; ")}
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0 text-xs border-amber-300 text-amber-700 hover:bg-amber-50"
                            onClick={() => handleUseIdea(idea)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" />
                            Generate
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Outline Result */}
            {outlineMutation.data && (
              <Card className="shadow-sm border-l-4 border-l-blue-500">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-500" />
                    Generated Outline
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{outlineMutation.data.outline?.title}</h4>
                      {outlineMutation.data.outline?.metaDescription && (
                        <p className="text-sm text-gray-500 mt-1">{outlineMutation.data.outline.metaDescription}</p>
                      )}
                    </div>
                    {outlineMutation.data.outline?.sections?.map((section: any, i: number) => (
                      <div key={i} className="border-l-2 border-gray-200 pl-3">
                        <p className="text-sm font-medium text-gray-700">
                          {section.heading || `[${section.type}]`}
                        </p>
                        {section.keyPoints?.map((point: string, j: number) => (
                          <p key={j} className="text-xs text-gray-500 ml-2">• {point}</p>
                        ))}
                      </div>
                    ))}
                    {outlineMutation.data.outline?.auditIssuesAddressed?.length > 0 && (
                      <div className="mt-4 pt-3 border-t">
                        <h5 className="text-xs font-semibold text-gray-500 uppercase mb-1">Audit Issues Addressed</h5>
                        {outlineMutation.data.outline.auditIssuesAddressed.map((issue: string, i: number) => (
                          <p key={i} className="text-xs text-emerald-600">✓ {issue}</p>
                        ))}
                      </div>
                    )}
                    {outlineMutation.data.savedOutline && (
                      <p className="text-xs text-blue-600 mt-2">
                        ✓ Saved to your outlines (ID: {outlineMutation.data.savedOutline.id})
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-score section component
function SubScoreSection({ title, score, assessment, issues }: {
  title: string;
  score: number;
  assessment: string;
  issues?: string[];
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="font-semibold text-sm">{title}</h5>
        <span className="text-sm font-bold" style={{ color: scoreColor(score) }}>
          {score}/100
        </span>
      </div>
      <p className="text-sm text-gray-600 mb-2">{assessment}</p>
      {issues && issues.length > 0 && (
        <div className="space-y-1">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
              <AlertTriangle className="w-3 h-3 text-amber-400 mt-0.5 flex-shrink-0" />
              <span>{issue}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
