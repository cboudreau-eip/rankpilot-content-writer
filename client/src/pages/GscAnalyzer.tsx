/**
 * GSC Analyzer Page
 * Upload Google Search Console Excel exports and get actionable keyword insights.
 * Click any keyword row to expand and get AI-powered optimization recommendations.
 */
import { useState, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Trash2, TrendingUp, Eye, Zap,
  MousePointerClick, AlertTriangle, BarChart3, Search,
  ExternalLink, RefreshCw, Info, ChevronDown, ChevronRight,
  Globe, Target, Lightbulb, FileText, Link2, Sparkles,
  Copy, ArrowRight, CheckCircle2, AlertCircle, Clock,
  TrendingDown, Minus
} from "lucide-react";
import type { GscQueryRow, GscPageRow, GscCannibalizationGroup } from "../../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityThreshold = "page1" | "high" | "medium" | "all";

interface ThresholdOption {
  value: PriorityThreshold;
  label: string;
  minPos: number;
  maxPos: number;
}

const THRESHOLD_OPTIONS: ThresholdOption[] = [
  { value: "page1", label: "Page 1 (Pos 5–10)", minPos: 5, maxPos: 10 },
  { value: "high", label: "High Only (Pos 11–15)", minPos: 11, maxPos: 15 },
  { value: "medium", label: "Medium+ (Pos 11–20)", minPos: 11, maxPos: 20 },
  { value: "all", label: "All (Pos 11–30)", minPos: 11, maxPos: 30 },
];

type TabId = "near-jump" | "high-impression" | "quick-wins" | "zero-click" | "cannibalization";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const TABS: Tab[] = [
  {
    id: "near-jump",
    label: "Near-Jump",
    icon: TrendingUp,
    description: "Keywords close to ranking higher — small improvements can unlock big traffic gains.",
    color: "text-blue-600",
  },
  {
    id: "high-impression",
    label: "High Impression / Low CTR",
    icon: Eye,
    description: "Keywords getting seen but not clicked — optimize title tags and meta descriptions.",
    color: "text-purple-600",
  },
  {
    id: "quick-wins",
    label: "Quick Wins",
    icon: Zap,
    description: "Visible keywords with almost no clicks — minor content updates can drive immediate results.",
    color: "text-amber-600",
  },
  {
    id: "zero-click",
    label: "Zero-Click Pages",
    icon: MousePointerClick,
    description: "Pages indexed and shown in search but never clicked — review title, meta, and content.",
    color: "text-red-600",
  },
  {
    id: "cannibalization",
    label: "Cannibalization",
    icon: AlertTriangle,
    description: "Multiple queries competing for the same topic — consolidate or differentiate content.",
    color: "text-orange-600",
  },
];

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(1)}%`;
}

function formatPos(pos: number): string {
  return pos.toFixed(1);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatVolume(vol: number): string {
  if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
  if (vol >= 1000) return `${(vol / 1000).toFixed(1)}K`;
  return vol.toString();
}

function positionBadgeColor(pos: number): string {
  if (pos <= 3) return "bg-green-100 text-green-700";
  if (pos <= 10) return "bg-blue-100 text-blue-700";
  if (pos <= 20) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function priorityBadge(level: string): string {
  switch (level) {
    case "high": return "bg-green-100 text-green-700 border-green-200";
    case "medium": return "bg-amber-100 text-amber-700 border-amber-200";
    case "low": return "bg-gray-100 text-gray-600 border-gray-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
}

function effortBadge(effort: string): string {
  switch (effort) {
    case "quick": return "bg-green-50 text-green-700";
    case "moderate": return "bg-amber-50 text-amber-700";
    case "significant": return "bg-red-50 text-red-700";
    default: return "bg-gray-50 text-gray-600";
  }
}

// ─── Expanded Row Analysis Panel ─────────────────────────────────────────────

interface AnalysisData {
  keyword: string;
  pageUrl: string;
  gscMetrics: { clicks: number; impressions: number; ctr: number; position: number };
  keMetrics: { volume: number; cpc: number; competition: number; competitionLabel: string; trend: any[] } | null;
  pageData: { title: string; metaDescription: string; wordCount: number; headingCount: number; fetchError: string | null };
  analysis: any;
}

function ExpandedKeywordPanel({
  row,
  tabLabel,
  onClose,
}: {
  row: GscQueryRow;
  tabLabel: string;
  onClose: () => void;
}) {
  const [url, setUrl] = useState("");
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const gscRouter = trpc.gsc as any;
  const analyzeMutation = gscRouter.analyzeKeyword.useMutation({
    onSuccess: (data: AnalysisData) => {
      setAnalysisData(data);
    },
    onError: (err: Error) => {
      toast.error(`Analysis failed: ${err.message}`);
    },
  });

  function handleAnalyze() {
    if (!url.trim()) {
      toast.error("Please enter a page URL");
      return;
    }
    try {
      new URL(url);
    } catch {
      toast.error("Please enter a valid URL (include https://)");
      return;
    }
    analyzeMutation.mutate({
      keyword: row.query,
      pageUrl: url.trim(),
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
      tab: tabLabel,
    });
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    toast.success(`${label} copied`);
    setTimeout(() => setCopiedSection(null), 2000);
  }

  const a = analysisData?.analysis;
  const ke = analysisData?.keMetrics;
  const pd = analysisData?.pageData;
  const isAnalyzing = analyzeMutation.isPending;

  return (
    <div className="bg-slate-50 border-t border-b border-indigo-100 px-6 py-5 space-y-5">
      {/* URL Input Section */}
      <div className="flex items-start gap-4">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-500" />
            Page URL for "{row.query}"
          </label>
          <p className="text-xs text-muted-foreground">
            Enter the URL of the page ranking for this keyword to get AI-powered optimization recommendations.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/your-page"
              className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !url.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isAnalyzing && (
        <div className="bg-white rounded-xl border border-border p-8 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-foreground">Analyzing page content and generating recommendations...</p>
          <p className="text-xs text-muted-foreground">Fetching page, checking Keywords Everywhere data, and running AI analysis</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisData && !isAnalyzing && (
        <div className="space-y-4">
          {/* KE Metrics + Page Data Summary Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Position</p>
              <p className={`text-lg font-bold ${row.position <= 10 ? "text-blue-600" : row.position <= 20 ? "text-amber-600" : "text-red-600"}`}>
                #{formatPos(row.position)}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">Impressions</p>
              <p className="text-lg font-bold text-foreground">{formatNumber(row.impressions)}</p>
            </div>
            <div className="bg-white rounded-lg border border-border p-3 text-center">
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className={`text-lg font-bold ${row.ctr < 0.02 ? "text-red-600" : row.ctr < 0.05 ? "text-amber-600" : "text-green-600"}`}>
                {formatCtr(row.ctr)}
              </p>
            </div>
            {ke && (
              <>
                <div className="bg-white rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Search Volume</p>
                  <p className="text-lg font-bold text-indigo-600">{formatVolume(ke.volume)}/mo</p>
                </div>
                <div className="bg-white rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">CPC</p>
                  <p className="text-lg font-bold text-foreground">${ke.cpc.toFixed(2)}</p>
                </div>
                <div className="bg-white rounded-lg border border-border p-3 text-center">
                  <p className="text-xs text-muted-foreground">Competition</p>
                  <p className={`text-lg font-bold ${ke.competitionLabel === "Low" ? "text-green-600" : ke.competitionLabel === "Medium" ? "text-amber-600" : "text-red-600"}`}>
                    {ke.competitionLabel}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Page fetch error warning */}
          {pd?.fetchError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">Could not fetch page content</p>
                <p className="text-xs text-amber-600 mt-0.5">{pd.fetchError}. Recommendations are based on keyword and GSC data only.</p>
              </div>
            </div>
          )}

          {/* Performance Assessment */}
          {a?.performanceAssessment && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-500" />
                  Performance Assessment
                </h4>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${priorityBadge(a.performanceAssessment.opportunityLevel)}`}>
                  {a.performanceAssessment.opportunityLevel?.toUpperCase()} OPPORTUNITY
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.performanceAssessment.summary}</p>
              {a.performanceAssessment.estimatedTrafficGain && (
                <p className="text-sm text-indigo-600 font-medium flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4" />
                  {a.performanceAssessment.estimatedTrafficGain}
                </p>
              )}
            </div>
          )}

          {/* Title Tag Recommendation */}
          {a?.titleTagRecommendation && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Title Tag Recommendation
                </h4>
                <button
                  onClick={() => copyToClipboard(a.titleTagRecommendation.suggested, "Title tag")}
                  className="text-xs text-muted-foreground hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  {copiedSection === "Title tag" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">Current</span>
                  <p className="text-sm text-muted-foreground">{a.titleTagRecommendation.current || pd?.title || "N/A"}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">Suggested</span>
                  <p className="text-sm text-foreground font-medium">{a.titleTagRecommendation.suggested}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">{a.titleTagRecommendation.rationale}</p>
              </div>
            </div>
          )}

          {/* Meta Description Recommendation */}
          {a?.metaDescriptionRecommendation && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-500" />
                  Meta Description Recommendation
                </h4>
                <button
                  onClick={() => copyToClipboard(a.metaDescriptionRecommendation.suggested, "Meta description")}
                  className="text-xs text-muted-foreground hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  {copiedSection === "Meta description" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">Current</span>
                  <p className="text-sm text-muted-foreground">{a.metaDescriptionRecommendation.current || pd?.metaDescription || "N/A"}</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">Suggested</span>
                  <p className="text-sm text-foreground font-medium">{a.metaDescriptionRecommendation.suggested}</p>
                </div>
                <p className="text-xs text-muted-foreground italic">{a.metaDescriptionRecommendation.rationale}</p>
              </div>
            </div>
          )}

          {/* Quick Wins */}
          {a?.quickWins?.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Wins
              </h4>
              <div className="space-y-2">
                {a.quickWins.map((win: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-amber-50/50 rounded-lg border border-amber-100">
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{win.action}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> {win.expectedImpact}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${effortBadge(win.timeToImplement)}`}>
                          <Clock className="w-3 h-3 inline mr-0.5" />{win.timeToImplement}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Gaps */}
          {a?.contentGaps?.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Content Gaps
              </h4>
              <div className="space-y-2">
                {a.contentGaps.map((gap: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-red-50/30 rounded-lg border border-red-100">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5 flex-shrink-0 ${gap.importance === "high" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}`}>
                      {gap.importance}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{gap.gap}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{gap.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content Recommendations */}
          {a?.contentRecommendations?.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-500" />
                  Content Recommendations
                </h4>
                <button
                  onClick={() => {
                    const text = a.contentRecommendations.map((r: any, i: number) => `${i + 1}. [${r.priority}] ${r.action}\n   Impact: ${r.impact}\n   Effort: ${r.effort}`).join("\n\n");
                    copyToClipboard(text, "Recommendations");
                  }}
                  className="text-xs text-muted-foreground hover:text-indigo-600 flex items-center gap-1 transition-colors"
                >
                  {copiedSection === "Recommendations" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy All
                </button>
              </div>
              <div className="space-y-2">
                {a.contentRecommendations.map((rec: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border mt-0.5 flex-shrink-0 ${priorityBadge(rec.priority)}`}>
                      {rec.priority}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{rec.action}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{rec.impact}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${effortBadge(rec.effort)}`}>
                          {rec.effort} effort
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Heading Structure */}
          {a?.headingStructureRecommendation && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-500" />
                Heading Structure
              </h4>
              {a.headingStructureRecommendation.suggestedH1 && (
                <div className="flex items-start gap-2">
                  <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-0.5 rounded mt-0.5 flex-shrink-0">H1</span>
                  <p className="text-sm text-foreground font-medium">{a.headingStructureRecommendation.suggestedH1}</p>
                </div>
              )}
              {a.headingStructureRecommendation.issues?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Issues</p>
                  {a.headingStructureRecommendation.issues.map((issue: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Minus className="w-3 h-3 text-red-400 mt-1 flex-shrink-0" />
                      {issue}
                    </p>
                  ))}
                </div>
              )}
              {a.headingStructureRecommendation.missingSections?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Missing Sections</p>
                  {a.headingStructureRecommendation.missingSections.map((section: string, i: number) => (
                    <p key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="w-3 h-3 text-indigo-400 mt-1 flex-shrink-0" />
                      {section}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Internal Linking Suggestions */}
          {a?.internalLinkingSuggestions?.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Link2 className="w-4 h-4 text-blue-500" />
                Internal Linking Suggestions
              </h4>
              <div className="space-y-2">
                {a.internalLinkingSuggestions.map((link: any, i: number) => (
                  <div key={i} className="p-3 bg-blue-50/30 rounded-lg border border-blue-100">
                    <p className="text-sm font-medium text-foreground">{link.suggestion}</p>
                    {link.anchorText && (
                      <p className="text-xs text-blue-600 mt-1">Anchor text: "{link.anchorText}"</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{link.rationale}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity Recommendations */}
          {a?.entityRecommendations && (
            <div className="bg-white rounded-xl border border-border p-5 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-500" />
                Entity Recommendations
              </h4>
              {a.entityRecommendations.primaryEntity && (
                <p className="text-sm text-foreground">
                  <span className="font-medium">Primary Entity:</span> {a.entityRecommendations.primaryEntity}
                </p>
              )}
              {a.entityRecommendations.missingEntities?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs font-medium text-muted-foreground">Missing:</span>
                  {a.entityRecommendations.missingEntities.map((entity: string, i: number) => (
                    <span key={i} className="text-xs bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">
                      {entity}
                    </span>
                  ))}
                </div>
              )}
              {a.entityRecommendations.entityTip && (
                <p className="text-xs text-muted-foreground italic">{a.entityRecommendations.entityTip}</p>
              )}
            </div>
          )}

          {/* Page Info Footer */}
          {pd && !pd.fetchError && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-gray-50 rounded-lg px-4 py-2.5 border border-gray-100">
              <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {pd.wordCount.toLocaleString()} words</span>
              <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {pd.headingCount} headings</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-indigo-500 hover:underline ml-auto">
                <ExternalLink className="w-3 h-3" /> View page
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-card rounded-xl border border-border p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{typeof value === "number" ? formatNumber(value) : value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function QueryTable({ rows, showPage = false, tabLabel = "" }: { rows: (GscQueryRow | GscPageRow)[]; showPage?: boolean; tabLabel?: string }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"impressions" | "clicks" | "ctr" | "position">("impressions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const filtered = rows.filter((r) => {
    const text = showPage ? (r as GscPageRow).page : (r as GscQueryRow).query;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortBy as keyof typeof a] as number;
    const bv = b[sortBy as keyof typeof b] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  function SortHeader({ col, label }: { col: typeof sortBy; label: string }) {
    const active = sortBy === col;
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-muted transition-colors ${active ? "text-indigo-600" : "text-muted-foreground"}`}
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={showPage ? "Filter pages..." : "Filter keywords..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{sorted.length} {showPage ? "pages" : "keywords"}</div>
        {!showPage && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" />
            Click any keyword for AI analysis
          </p>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {showPage ? "Page URL" : "Keyword"}
              </th>
              <SortHeader col="clicks" label="Clicks" />
              <SortHeader col="impressions" label="Impressions" />
              <SortHeader col="ctr" label="CTR" />
              <SortHeader col="position" label="Position" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice(0, 200).map((row, i) => {
              const text = showPage ? (row as GscPageRow).page : (row as GscQueryRow).query;
              const isExpanded = expandedRow === i;
              const isKeywordRow = !showPage;
              return (
                <React.Fragment key={i}>
                  <tr
                    className={`transition-colors ${isKeywordRow ? "cursor-pointer hover:bg-indigo-50/50" : "hover:bg-muted/50"} ${isExpanded ? "bg-indigo-50/70" : ""}`}
                    onClick={() => {
                      if (isKeywordRow) {
                        setExpandedRow(isExpanded ? null : i);
                      }
                    }}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      {showPage ? (
                        <a
                          href={text}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline flex items-center gap-1 truncate"
                          title={text}
                        >
                          <span className="truncate">{text.replace(/^https?:\/\/[^/]+/, "")}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-foreground font-medium flex items-center gap-2">
                          <ChevronRight className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          {text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatNumber(row.clicks)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatNumber(row.impressions)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.ctr < 0.02 ? "bg-red-100 text-red-700" : row.ctr < 0.05 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {formatCtr(row.ctr)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positionBadgeColor(row.position)}`}>
                        #{formatPos(row.position)}
                      </span>
                    </td>
                  </tr>
                  {isExpanded && isKeywordRow && (
                    <tr>
                      <td colSpan={5} className="p-0">
                        <ExpandedKeywordPanel
                          row={row as GscQueryRow}
                          tabLabel={tabLabel}
                          onClose={() => setExpandedRow(null)}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground text-sm">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > 200 && (
        <p className="text-xs text-muted-foreground text-center">Showing top 200 of {sorted.length} results</p>
      )}
    </div>
  );
}

function CannibalizationTable({ groups }: { groups: GscCannibalizationGroup[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  function toggle(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (!groups.length) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No cannibalization issues detected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{groups.length} keyword groups with potential cannibalization</div>
      {groups.map((group, i) => (
        <div key={i} className="border border-border rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-muted/50 transition-colors text-left"
            onClick={() => toggle(i)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {group.queries.length} queries
              </span>
              <span className="font-medium text-foreground">{group.topic}</span>
            </div>
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded.has(i) ? "rotate-90" : ""}`} />
          </button>
          {expanded.has(i) && (
            <div className="border-t border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Query</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Clicks</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Impressions</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">CTR</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.queries.map((q, j) => (
                    <tr key={j} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-2 text-foreground">{q.query}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatNumber(q.clicks)}</td>
                      <td className="px-4 py-2 text-muted-foreground">{formatNumber(q.impressions)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.ctr < 0.02 ? "bg-red-100 text-red-700" : q.ctr < 0.05 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                          {formatCtr(q.ctr)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positionBadgeColor(q.position)}`}>
                          #{formatPos(q.position)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

import React from "react";

export default function GscAnalyzer() {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;
  const [activeTab, setActiveTab] = useState<TabId>("near-jump");
  const [threshold, setThreshold] = useState<PriorityThreshold>("all");
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const thresholdOption = THRESHOLD_OPTIONS.find((t) => t.value === threshold)!;

  // List exports
  const gscList = trpc.gsc as any;
  const { data: exports, refetch: refetchExports } = gscList.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  // Get selected export data
  const { data: exportData, isLoading: isLoadingExport } = gscList.getById.useQuery(
    { id: selectedExportId! },
    { enabled: !!selectedExportId }
  );

  // Get near-jump with custom threshold (re-fetches when threshold changes)
  const { data: nearJumpData, isLoading: isLoadingNearJump } = gscList.getNearJump.useQuery(
    { id: selectedExportId!, minPos: thresholdOption.minPos, maxPos: thresholdOption.maxPos },
    { enabled: !!selectedExportId && activeTab === "near-jump" }
  );

  // Upload mutation
  const uploadMutation = gscList.upload.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Parsed ${data.totalQueries} queries and ${data.totalPages} pages`);
      setSelectedExportId(data.id);
      refetchExports();
      setIsUploading(false);
    },
    onError: (err: Error) => {
      toast.error(`Upload failed: ${err.message}`);
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = gscList.delete.useMutation({
    onSuccess: () => {
      toast.success("Export deleted");
      if (selectedExportId) {
        const remaining = exports?.filter((e: any) => e.id !== selectedExportId);
        setSelectedExportId(remaining?.[0]?.id ?? null);
      }
      refetchExports();
    },
  });

  // Auto-select first export
  if (exports?.length && !selectedExportId) {
    setSelectedExportId(exports[0].id);
  }

  // File upload handler
  const handleFile = useCallback(async (file: File) => {
    if (!activeProjectId) {
      toast.error("Please select a project first");
      return;
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader> | any) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadMutation.mutate({
        projectId: activeProjectId,
        fileName: file.name,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  }, [activeProjectId, uploadMutation]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  // Determine which rows to show for current tab
  function getTabRows(): GscQueryRow[] | GscPageRow[] | GscCannibalizationGroup[] {
    if (!exportData) return [];
    switch (activeTab) {
      case "near-jump": return nearJumpData ?? exportData.nearJumpKeywords ?? [];
      case "high-impression": return exportData.highImpressionLowCtr ?? [];
      case "quick-wins": return exportData.quickWinKeywords ?? [];
      case "zero-click": return exportData.zeroClickPages ?? [];
      case "cannibalization": return exportData.cannibalizationGroups ?? [];
    }
  }

  const tabRows = getTabRows();
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            GSC Analyzer
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Upload your Google Search Console export to uncover keyword opportunities and issues.
          </p>
        </div>
        {exports && exports.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload New Export"}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
      </div>

      {/* Upload Zone (shown when no exports) */}
      {(!exports || exports.length === 0) && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-border hover:border-indigo-400 hover:bg-muted/50"}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-muted-foreground font-medium">Parsing your GSC export...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-lg">Drop your GSC Excel export here</p>
                <p className="text-muted-foreground text-sm mt-1">or click to browse — supports .xlsx files</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5" />
                <span>Export from Google Search Console → Performance → Export → Download Excel</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Selector + Results */}
      {exports && exports.length > 0 && (
        <div className="space-y-5">
          {/* Export Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-muted-foreground">Export:</span>
            {exports.map((exp: any) => (
              <button
                key={exp.id}
                onClick={() => setSelectedExportId(exp.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedExportId === exp.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-card text-secondary-foreground border-border hover:border-indigo-300"}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exp.fileName.replace(/\.xlsx?$/, "")}
                <span className="text-xs opacity-70">{exp.dateRange}</span>
              </button>
            ))}
            {selectedExportId && (
              <button
                onClick={() => {
                  if (confirm("Delete this export?")) {
                    deleteMutation.mutate({ id: selectedExportId });
                  }
                }}
                className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete export"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Loading state */}
          {isLoadingExport && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Data loaded */}
          {exportData && (
            <div className="space-y-5">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Queries" value={exportData.totalQueries} icon={Search} color="bg-blue-100 text-blue-600" />
                <StatCard label="Near-Jump Keywords" value={exportData.nearJumpKeywords?.length ?? 0} icon={TrendingUp} color="bg-indigo-100 text-indigo-600" />
                <StatCard label="High Impr / Low CTR" value={exportData.highImpressionLowCtr?.length ?? 0} icon={Eye} color="bg-purple-100 text-purple-600" />
                <StatCard label="Zero-Click Pages" value={exportData.zeroClickPages?.length ?? 0} icon={MousePointerClick} color="bg-red-100 text-red-600" />
              </div>

              {/* Tabs */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                {/* Tab Header */}
                <div className="border-b border-border overflow-x-auto">
                  <div className="flex min-w-max">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const count = (() => {
                        if (!exportData) return 0;
                        switch (tab.id) {
                          case "near-jump": return exportData.nearJumpKeywords?.length ?? 0;
                          case "high-impression": return exportData.highImpressionLowCtr?.length ?? 0;
                          case "quick-wins": return exportData.quickWinKeywords?.length ?? 0;
                          case "zero-click": return exportData.zeroClickPages?.length ?? 0;
                          case "cannibalization": return exportData.cannibalizationGroups?.length ?? 0;
                        }
                      })();
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-muted-foreground hover:text-secondary-foreground hover:bg-muted/50"}`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? tab.color : ""}`} />
                          {tab.label}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-5 space-y-4">
                  {/* Tab description + threshold filter */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground max-w-xl">
                      <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{currentTab.description}</span>
                    </div>

                    {/* Priority Threshold — only shown for near-jump tab */}
                    {activeTab === "near-jump" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Priority Threshold</span>
                        <div className="relative">
                          <select
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value as PriorityThreshold)}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-card text-secondary-foreground cursor-pointer"
                          >
                            {THRESHOLD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  {activeTab === "cannibalization" ? (
                    <CannibalizationTable groups={tabRows as GscCannibalizationGroup[]} />
                  ) : activeTab === "zero-click" ? (
                    isLoadingNearJump ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <QueryTable rows={tabRows as GscPageRow[]} showPage={true} tabLabel="Zero-Click Pages" />
                    )
                  ) : (
                    isLoadingNearJump && activeTab === "near-jump" ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <QueryTable rows={tabRows as GscQueryRow[]} showPage={false} tabLabel={currentTab.label} />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
