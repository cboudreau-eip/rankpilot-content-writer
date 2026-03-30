import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Sparkles, Target, TrendingUp, Layers, Compass, Activity,
  CheckCircle2, XCircle, AlertTriangle, Cpu, Lightbulb, Wrench, FileText,
  ChevronDown, ChevronUp, ArrowRight, Zap, BarChart3, Search, BookOpen,
  Shield, Eye, Repeat2, LayoutGrid,
} from "lucide-react";
import type {
  EntityAnalysisResult, SemanticAnalysisResult, EntityItem,
} from "@shared/entity-types";

// ---- Helpers ----

function getScoreColor(score: number) {
  if (score >= 70) return { text: "text-emerald-600", bg: "bg-emerald-50", bar: "[&>div]:bg-emerald-500", ring: "ring-emerald-200" };
  if (score >= 40) return { text: "text-amber-600", bg: "bg-amber-50", bar: "[&>div]:bg-amber-500", ring: "ring-amber-200" };
  return { text: "text-red-600", bg: "bg-red-50", bar: "[&>div]:bg-red-500", ring: "ring-red-200" };
}

function getGradeLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 30) return "Needs Work";
  return "Poor";
}

function getGradeBadgeColor(grade: string) {
  const g = grade.toLowerCase();
  if (g.includes("strong") || g === "comprehensive" || g === "high" || g === "no drift")
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (g.includes("moderate") || g === "adequate" || g === "minor drift")
    return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

function getProminenceBadge(p: string) {
  if (p === "High") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (p === "Medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

function getOverlapBadge(severity: string) {
  if (severity === "None") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (severity === "Low") return "bg-blue-50 text-blue-700 border-blue-200";
  if (severity === "Moderate") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-red-50 text-red-700 border-red-200";
}

// ---- Score Card ----

function ScoreCard({ label, score, icon: Icon, description }: { label: string; score: number; icon: typeof Target; description?: string }) {
  const colors = getScoreColor(score);
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center`}>
              <Icon className={`w-4 h-4 ${colors.text}`} />
            </div>
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
          </div>
          <span className={`text-2xl font-bold ${colors.text}`}>{Math.round(score)}</span>
        </div>
        <Progress value={score} className={`h-2 ${colors.bar}`} />
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
      </CardContent>
    </Card>
  );
}

// ---- Entity Table ----

function EntityTable({ entities, primaryEntity }: { entities: EntityItem[]; primaryEntity: string }) {
  const [sortBy, setSortBy] = useState<"prominence" | "name">("prominence");
  const sorted = useMemo(() => {
    const copy = [...entities];
    if (sortBy === "prominence") {
      const order = { High: 0, Medium: 1, Low: 2 };
      copy.sort((a, b) => order[a.prominence] - order[b.prominence]);
    } else {
      copy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return copy;
  }, [entities, sortBy]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-indigo-500" />
            Extracted Entities ({entities.length})
          </CardTitle>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as "prominence" | "name")}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="prominence">By Prominence</SelectItem>
              <SelectItem value="name">By Name</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Entity</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Prominence</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Rationale</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={i} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${e.name === primaryEntity ? "bg-indigo-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium">
                    {e.name}
                    {e.name === primaryEntity && (
                      <Badge variant="outline" className="ml-2 text-[10px] bg-indigo-50 text-indigo-600 border-indigo-200">Primary</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-xs font-normal">{e.type}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${getProminenceBadge(e.prominence)}`}>{e.prominence}</Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-xs">{e.rationale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Salience Structure ----

function SalienceStructure({ data }: { data: EntityAnalysisResult["salienceStructure"] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Dominance Gap */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Activity className="w-4 h-4 text-blue-600" />
            </div>
            <h4 className="font-semibold text-sm">Dominance Gap</h4>
          </div>
          <Badge variant="outline" className={`text-xs mb-3 ${getGradeBadgeColor(data.dominanceGap.grade)}`}>
            {data.dominanceGap.grade}
          </Badge>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.dominanceGap.description}</p>
        </CardContent>
      </Card>

      {/* Early Reinforcement */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
            </div>
            <h4 className="font-semibold text-sm">Early Reinforcement</h4>
          </div>
          <div className="space-y-2 mb-3">
            {[
              { label: "In First Paragraph", value: data.earlyReinforcement.inFirstParagraph },
              { label: "In Heading", value: data.earlyReinforcement.inHeading },
              { label: "Within First 120 Words", value: data.earlyReinforcement.withinFirst120Words },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-xs">
                {item.value ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400" />
                )}
                <span className={item.value ? "text-emerald-700" : "text-red-500"}>{item.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.earlyReinforcement.summary}</p>
        </CardContent>
      </Card>

      {/* Entity Drift */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
              <Compass className="w-4 h-4 text-purple-600" />
            </div>
            <h4 className="font-semibold text-sm">Entity Drift</h4>
          </div>
          <Badge variant="outline" className={`text-xs mb-3 ${getGradeBadgeColor(data.entityDrift.level)}`}>
            {data.entityDrift.level}
          </Badge>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.entityDrift.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Supporting Coverage + GEO ----

function CoverageAndGeo({ coverage, geo }: { coverage: EntityAnalysisResult["supportingCoverage"]; geo: EntityAnalysisResult["geoExtractability"] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Supporting Coverage */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <Layers className="w-4 h-4 text-amber-600" />
              </div>
              <h4 className="font-semibold text-sm">Supporting Coverage</h4>
            </div>
            <Badge variant="outline" className={`text-xs ${getGradeBadgeColor(coverage.grade)}`}>{coverage.grade}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{coverage.evaluation}</p>
          {coverage.relatedSubEntities?.length > 0 && (
            <div className="mb-3">
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Found</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.relatedSubEntities.map((e, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">{e}</Badge>
                ))}
              </div>
            </div>
          )}
          {coverage.missingComponents?.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Missing</p>
              <div className="flex flex-wrap gap-1.5">
                {coverage.missingComponents.map((c, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] bg-red-50 text-red-600 border-red-200">{c}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* GEO / AI Extractability */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Cpu className="w-4 h-4 text-cyan-600" />
              </div>
              <h4 className="font-semibold text-sm">GEO / AI Extractability</h4>
            </div>
            <Badge variant="outline" className={`text-xs ${getGradeBadgeColor(geo.grade)}`}>{geo.grade}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{geo.evaluation}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Concise Definitions", value: geo.hasConcisenDefinitions },
              { label: "Clear Q&A Format", value: geo.hasClearQuestionAnswering },
              { label: "Short Summaries", value: geo.hasShortAnswerSummary },
              { label: "Clean Headings", value: geo.hasCleanHeadings },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs">
                {item.value ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className={item.value ? "text-emerald-700" : "text-red-500"}>{item.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---- Actionable Fixes ----

function ActionableFixes({ fixes }: { fixes: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-500" />
          Actionable Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fixes.map((fix, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{fix}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Advanced Recommendations ----

function AdvancedRecs({ data }: { data: EntityAnalysisResult["advancedRecommendations"] }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Advanced Recommendations
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4">
          <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100">
            <p className="text-xs font-medium text-indigo-600 mb-1 uppercase tracking-wide">Refined Primary Entity</p>
            <p className="text-sm font-semibold">{data.refinedPrimaryEntity}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.refinedEntityRationale}</p>
          </div>
          <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
            <p className="text-xs font-medium text-purple-600 mb-1 uppercase tracking-wide">Suggested Title Rewrite</p>
            <p className="text-sm font-semibold">{data.suggestedTitleRewrite}</p>
          </div>
          {data.missingSupportingEntities?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Missing Supporting Entities</p>
              <div className="flex flex-wrap gap-2">
                {data.missingSupportingEntities.map((e, i) => (
                  <Badge key={i} variant="outline" className="bg-red-50 text-red-600 border-red-200">{e}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ---- Semantic Scores ----

function SemanticScoreCards({ scores }: { scores: SemanticAnalysisResult["scores"] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <ScoreCard label="Relevance" score={scores.relevance} icon={Target} description="Alignment to keyword" />
      <ScoreCard label="Coverage" score={scores.coverage} icon={BookOpen} description="Topic completeness" />
      <ScoreCard label="Uniqueness" score={scores.uniqueness} icon={Sparkles} description="Section distinctness" />
      <ScoreCard label="Overall Semantic" score={scores.overallSemantic} icon={BarChart3} description="Weighted composite" />
    </div>
  );
}

// ---- Relevance Detail ----

function RelevanceDetail({ data }: { data: SemanticAnalysisResult["relevance"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-500" />
          Relevance Breakdown
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[
          { label: "Intro Relevance", score: data.introRelevance },
          { label: "Headings Relevance", score: data.headingsRelevance },
          { label: "Body Relevance", score: data.bodyRelevance },
        ].map((item) => {
          const colors = getScoreColor(item.score);
          return (
            <div key={item.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">{item.label}</span>
                <span className={`text-sm font-bold ${colors.text}`}>{item.score}</span>
              </div>
              <Progress value={item.score} className={`h-1.5 ${colors.bar}`} />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{data.evaluation}</p>
      </CardContent>
    </Card>
  );
}

// ---- Section Breakdown ----

function SectionBreakdown({ sections }: { sections: SemanticAnalysisResult["sections"] }) {
  const [expanded, setExpanded] = useState(false);
  const visibleSections = expanded ? sections : sections.slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <LayoutGrid className="w-4 h-4 text-indigo-500" />
          Section Breakdown ({sections.length} sections)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Section</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-20">Score</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground w-24">Overlap</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Unique Value</th>
              </tr>
            </thead>
            <tbody>
              {visibleSections.map((s, i) => {
                const colors = getScoreColor(s.relevanceScore);
                return (
                  <tr key={i} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{s.heading}</div>
                      <Badge variant="outline" className="text-[10px] mt-1">{s.headingLevel}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${colors.text}`}>{s.relevanceScore}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-[11px] ${getOverlapBadge(s.overlapSeverity)}`}>
                        {s.overlapSeverity}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell max-w-xs">{s.uniqueValue}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {sections.length > 5 && (
          <div className="px-4 py-3 border-t">
            <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)} className="text-xs w-full">
              {expanded ? "Show Less" : `Show All ${sections.length} Sections`}
              {expanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Redundancy Pairs ----

function RedundancyPairs({ data }: { data: SemanticAnalysisResult["redundancy"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Repeat2 className="w-4 h-4 text-orange-500" />
          Redundancy Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{data.overallAssessment}</p>
        {data.redundantPairs?.length > 0 ? (
          <div className="space-y-2">
            {data.redundantPairs.map((pair, i) => (
              <div key={i} className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-sm font-medium">{pair.sectionA}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="text-sm font-medium">{pair.sectionB}</span>
                  <Badge variant="outline" className={`text-[10px] ml-auto ${
                    pair.similarity === "High" ? "bg-red-50 text-red-600 border-red-200" :
                    pair.similarity === "Moderate" ? "bg-amber-50 text-amber-600 border-amber-200" :
                    "bg-blue-50 text-blue-600 border-blue-200"
                  }`}>{pair.similarity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{pair.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-sm text-muted-foreground">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            No significant redundancy detected
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Topic Coverage ----

function TopicCoverage({ data }: { data: SemanticAnalysisResult["coverage"] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-teal-500" />
          Topic Coverage
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">{data.evaluation}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Covered Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {data.coveredTopics?.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200">{t}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-medium text-muted-foreground mb-2 uppercase tracking-wide">Missing Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {data.missingTopics?.length > 0 ? data.missingTopics.map((t, i) => (
                <Badge key={i} variant="outline" className="text-[11px] bg-red-50 text-red-600 border-red-200">{t}</Badge>
              )) : (
                <span className="text-xs text-emerald-600">All expected topics covered</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Semantic Fixes ----

function SemanticFixes({ fixes }: { fixes: string[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className="w-4 h-4 text-orange-500" />
          Semantic Fixes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {fixes.map((fix, i) => (
          <div key={i} className="flex gap-3 items-start p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
            <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
              {i + 1}
            </div>
            <p className="text-sm text-foreground leading-relaxed">{fix}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function EntityAnalyzer() {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;
  const [inputMode, setInputMode] = useState<"text" | "article">("text");
  const [textContent, setTextContent] = useState("");
  const [primaryKeyword, setPrimaryKeyword] = useState("");
  const [selectedArticleId, setSelectedArticleId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"entity" | "semantic">("entity");

  const [entityResult, setEntityResult] = useState<EntityAnalysisResult | null>(null);
  const [semanticResult, setSemanticResult] = useState<SemanticAnalysisResult | null>(null);

  // Fetch articles for the active project
  const articlesQuery = trpc.articles.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const entityMutation = trpc.entity.analyzeContent.useMutation({
    onSuccess: (data) => {
      setEntityResult(data);
      toast.success("Entity analysis complete");
    },
    onError: (err) => toast.error(err.message || "Entity analysis failed"),
  });

  const articleEntityMutation = trpc.entity.analyzeArticle.useMutation({
    onSuccess: (data) => {
      setEntityResult(data);
      toast.success("Entity analysis complete");
    },
    onError: (err) => toast.error(err.message || "Entity analysis failed"),
  });

  const semanticMutation = trpc.entity.analyzeSemantic.useMutation({
    onSuccess: (data) => {
      setSemanticResult(data);
      toast.success("Semantic analysis complete");
    },
    onError: (err) => toast.error(err.message || "Semantic analysis failed"),
  });

  const articleSemanticMutation = trpc.entity.analyzeArticleSemantic.useMutation({
    onSuccess: (data) => {
      setSemanticResult(data);
      toast.success("Semantic analysis complete");
    },
    onError: (err) => toast.error(err.message || "Semantic analysis failed"),
  });

  const isAnalyzing = entityMutation.isPending || articleEntityMutation.isPending;
  const isSemanticAnalyzing = semanticMutation.isPending || articleSemanticMutation.isPending;

  const handleEntityAnalysis = () => {
    setEntityResult(null);
    if (inputMode === "article" && selectedArticleId) {
      articleEntityMutation.mutate({ articleId: Number(selectedArticleId) });
    } else if (inputMode === "text" && textContent.trim().length >= 50) {
      entityMutation.mutate({
        content: textContent.trim(),
        primaryKeyword: primaryKeyword.trim() || undefined,
        projectId: activeProjectId || undefined,
      });
    } else {
      toast.error("Please enter at least 50 characters of content");
    }
  };

  const handleSemanticAnalysis = () => {
    setSemanticResult(null);
    if (inputMode === "article" && selectedArticleId) {
      articleSemanticMutation.mutate({ articleId: Number(selectedArticleId) });
    } else if (inputMode === "text" && textContent.trim().length >= 50) {
      if (!primaryKeyword.trim()) {
        toast.error("A target keyword is required for semantic analysis");
        return;
      }
      semanticMutation.mutate({
        content: textContent.trim(),
        targetKeyword: primaryKeyword.trim(),
        projectId: activeProjectId || undefined,
      });
    } else {
      toast.error("Please enter at least 50 characters of content");
    }
  };

  const wordCount = textContent.trim().split(/\s+/).filter((w) => w.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-md">
          <Search className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entity Analyzer</h1>
          <p className="text-muted-foreground mt-0.5">
            Analyze entity salience, structure, and semantic quality for GEO optimization
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as "text" | "article")} className="w-auto">
              <TabsList className="h-8">
                <TabsTrigger value="text" className="text-xs px-3 h-7">Paste Text</TabsTrigger>
                <TabsTrigger value="article" className="text-xs px-3 h-7">Select Article</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {inputMode === "text" ? (
            <>
              <div>
                <Textarea
                  placeholder="Paste your article content here for entity and salience analysis..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="min-h-[180px] text-sm"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-xs text-muted-foreground">{wordCount} words</span>
                  <span className="text-xs text-muted-foreground">Max ~15,000 characters analyzed</span>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">Primary Keyword (optional)</Label>
                <Input
                  placeholder="e.g., Medicare Advantage"
                  value={primaryKeyword}
                  onChange={(e) => setPrimaryKeyword(e.target.value)}
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used to evaluate entity clarity and as the target for semantic analysis. If blank, the auto-detected primary entity will be used.
                </p>
              </div>
            </>
          ) : (
            <div>
              <Label className="text-sm font-medium mb-1.5 block">Choose an Article</Label>
              <Select value={selectedArticleId} onValueChange={setSelectedArticleId}>
                <SelectTrigger className="max-w-lg">
                  <SelectValue placeholder="Select an article to analyze..." />
                </SelectTrigger>
                <SelectContent>
                  {articlesQuery.data?.map((a: { id: number; title: string | null; keyword: string | null }) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.title || a.keyword || `Article #${a.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!activeProjectId && (
                <p className="text-xs text-amber-600 mt-2">Select a project from the header to see articles.</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleEntityAnalysis}
              disabled={isAnalyzing || isSemanticAnalyzing}
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Entities...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" /> Analyze Entities</>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleSemanticAnalysis}
              disabled={isAnalyzing || isSemanticAnalyzing}
            >
              {isSemanticAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Semantics...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" /> Analyze Semantics</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      {(entityResult || semanticResult) && (
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "entity" | "semantic")}>
          <TabsList>
            <TabsTrigger value="entity" disabled={!entityResult}>
              <Zap className="w-3.5 h-3.5 mr-1.5" /> Entity + Salience
            </TabsTrigger>
            <TabsTrigger value="semantic" disabled={!semanticResult}>
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Semantic Analysis
            </TabsTrigger>
          </TabsList>

          {/* ---- Entity Tab ---- */}
          <TabsContent value="entity" className="space-y-6 mt-4">
            {entityResult && (
              <>
                {/* Primary Entity Banner */}
                <Card className="border-indigo-200 bg-indigo-50/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{entityResult.primaryEntity.name}</h3>
                          <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-600 border-indigo-200">
                            {entityResult.primaryEntity.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{entityResult.primaryEntity.justification}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(entityResult.scores.overallScore).text}`}>
                          {Math.round(entityResult.scores.overallScore)}
                        </div>
                        <p className="text-xs text-muted-foreground">{getGradeLabel(entityResult.scores.overallScore)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <ScoreCard label="Primary Clarity" score={entityResult.scores.primaryEntityClarity} icon={Target} description="Entity dominance" />
                  <ScoreCard label="Entity Focus" score={entityResult.scores.entityFocus} icon={Compass} description="Topic consistency" />
                  <ScoreCard label="Supporting Coverage" score={entityResult.scores.supportingCoverage} icon={Layers} description="Sub-entity depth" />
                  <ScoreCard label="GEO Extractability" score={entityResult.scores.geoExtractability} icon={Cpu} description="AI citation readiness" />
                </div>

                {/* Salience Structure */}
                <div>
                  <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    Salience Structure
                  </h3>
                  <SalienceStructure data={entityResult.salienceStructure} />
                </div>

                {/* Coverage + GEO */}
                <CoverageAndGeo coverage={entityResult.supportingCoverage} geo={entityResult.geoExtractability} />

                {/* Entity Table */}
                <EntityTable entities={entityResult.entities} primaryEntity={entityResult.primaryEntity.name} />

                {/* Actionable Fixes */}
                <ActionableFixes fixes={entityResult.actionableFixes} />

                {/* Advanced Recommendations */}
                <AdvancedRecs data={entityResult.advancedRecommendations} />
              </>
            )}
          </TabsContent>

          {/* ---- Semantic Tab ---- */}
          <TabsContent value="semantic" className="space-y-6 mt-4">
            {semanticResult && (
              <>
                {/* Keyword Banner */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Search className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Target Keyword</p>
                        <h3 className="font-bold text-lg">{semanticResult.targetKeyword}</h3>
                      </div>
                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(semanticResult.scores.overallSemantic).text}`}>
                          {Math.round(semanticResult.scores.overallSemantic)}
                        </div>
                        <p className="text-xs text-muted-foreground">{getGradeLabel(semanticResult.scores.overallSemantic)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Score Cards */}
                <SemanticScoreCards scores={semanticResult.scores} />

                {/* Relevance Detail */}
                <RelevanceDetail data={semanticResult.relevance} />

                {/* Section Breakdown */}
                <SectionBreakdown sections={semanticResult.sections} />

                {/* Redundancy */}
                <RedundancyPairs data={semanticResult.redundancy} />

                {/* Topic Coverage */}
                <TopicCoverage data={semanticResult.coverage} />

                {/* Semantic Fixes */}
                <SemanticFixes fixes={semanticResult.semanticFixes} />
              </>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {!entityResult && !semanticResult && !isAnalyzing && !isSemanticAnalyzing && (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-teal-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Analyze Your Content</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Paste content or select an article, then click "Analyze Entities" to evaluate entity salience, structure, and GEO readiness. Use "Analyze Semantics" for relevance, coverage, and redundancy scoring.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
