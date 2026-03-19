import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Sparkles,
  ShieldCheck,
  Target,
  Bot,
  BookOpen,
  Lightbulb,
  FileText,
  BarChart3,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  CircleDot,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CategoryResult {
  score: number;
  maxScore: number;
  weight?: string;
  label: string;
  analysis?: string;
  explanation?: string;
  improvements: string[];
}

interface GradeResult {
  totalScore: number;
  gradeBand?: string;
  categories: Record<string, CategoryResult>;
  keyStrengths?: string[];
  keyWeaknesses?: string[];
  penalties?: string[];
  prioritizedActions?: string[];
}

const categoryMeta: Record<string, { icon: typeof ShieldCheck; color: string; barColor: string; bgColor: string }> = {
  eeatTrust: { icon: ShieldCheck, color: "text-blue-600", barColor: "[&>div]:bg-blue-500", bgColor: "bg-blue-50" },
  accuracy: { icon: Target, color: "text-emerald-600", barColor: "[&>div]:bg-emerald-500", bgColor: "bg-emerald-50" },
  aioReadiness: { icon: Bot, color: "text-purple-600", barColor: "[&>div]:bg-purple-500", bgColor: "bg-purple-50" },
  readability: { icon: BookOpen, color: "text-amber-600", barColor: "[&>div]:bg-amber-500", bgColor: "bg-amber-50" },
};

const categoryDefaults: Record<string, { label: string; maxScore: number; weight: string }> = {
  eeatTrust: { label: "E-E-A-T Trust Package", maxScore: 30, weight: "35%" },
  accuracy: { label: "Accuracy", maxScore: 25, weight: "29%" },
  aioReadiness: { label: "AIO Answer Readiness", maxScore: 20, weight: "24%" },
  readability: { label: "Readability & UX", maxScore: 10, weight: "12%" },
};

function getGradeBandInfo(band: string): { color: string; bgColor: string; ringColor: string } {
  if (band.startsWith("A")) return { color: "text-emerald-600", bgColor: "bg-emerald-50", ringColor: "ring-emerald-200" };
  if (band.startsWith("B")) return { color: "text-blue-600", bgColor: "bg-blue-50", ringColor: "ring-blue-200" };
  if (band.startsWith("C")) return { color: "text-amber-600", bgColor: "bg-amber-50", ringColor: "ring-amber-200" };
  if (band.startsWith("D")) return { color: "text-orange-600", bgColor: "bg-orange-50", ringColor: "ring-orange-200" };
  return { color: "text-red-600", bgColor: "bg-red-50", ringColor: "ring-red-200" };
}

function getScoreBarColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export default function GradeContent() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [enabledCategories, setEnabledCategories] = useState<Record<string, boolean>>({
    eeatTrust: true,
    accuracy: true,
    aioReadiness: true,
    readability: true,
  });

  const gradeMutation = trpc.grading.gradeContent.useMutation({
    onSuccess: (data) => {
      setResult(data as GradeResult);
      toast.success("Content graded successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grade content");
    },
  });

  const handleGrade = () => {
    if (content.trim().length < 50) {
      toast.error("Please enter at least 50 characters of content to grade");
      return;
    }
    gradeMutation.mutate({ content: content.trim() });
  };

  const toggleCategory = (key: string) => {
    setEnabledCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const charCount = content.length;
  const maxScore = 85;

  // Compute grade band from result
  const gradeBand = result?.gradeBand || (() => {
    if (!result) return "—";
    const pct = (result.totalScore / maxScore) * 100;
    if (pct >= 93) return "A";
    if (pct >= 90) return "A-";
    if (pct >= 87) return "B+";
    if (pct >= 83) return "B";
    if (pct >= 80) return "B-";
    if (pct >= 77) return "C+";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    return "F";
  })();

  const gradeInfo = result ? getGradeBandInfo(gradeBand) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Grader</h1>
          <p className="text-muted-foreground mt-0.5">
            Analyze any content for GEO and AI search readiness
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input + Grading Sections */}
        <div className="space-y-5">
          {/* Paste Your Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Paste Your Content
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your article, blog post, or any content here..."
                className="min-h-[300px] text-sm leading-relaxed resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {wordCount.toLocaleString()} words &nbsp;&middot;&nbsp; {charCount.toLocaleString()} characters
                </span>
                <Button
                  onClick={handleGrade}
                  disabled={gradeMutation.isPending || content.trim().length < 50}
                  className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
                >
                  {gradeMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Grading...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Grade Content
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Grading Sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                Grading Sections
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Select which categories to include in the grade calculation. Disabled sections won't affect the final score.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(categoryDefaults).map(([key, def]) => {
                  const meta = categoryMeta[key];
                  const Icon = meta.icon;
                  const enabled = enabledCategories[key];
                  return (
                    <button
                      key={key}
                      onClick={() => toggleCategory(key)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        enabled
                          ? "border-border bg-background shadow-sm"
                          : "border-dashed border-muted-foreground/20 bg-muted/30 opacity-60"
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                        enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}>
                        {enabled && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium">{def.label}</p>
                        <p className="text-xs text-muted-foreground">{def.maxScore} pts max</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Note: 15% of GEO scoring accounts for technical factors not assessed here.</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="space-y-5">
          {!result && !gradeMutation.isPending && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Ready to Grade</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Paste your content on the left and click "Grade Content" to receive a detailed quality analysis.
                </p>
              </CardContent>
            </Card>
          )}

          {gradeMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-24 text-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-1">Analyzing Content</h3>
                <p className="text-sm text-muted-foreground">
                  Evaluating E-E-A-T, accuracy, AIO readiness, and readability...
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <div className="space-y-5">
              {/* GEO Content Grade Header */}
              <Card className="overflow-hidden">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    GEO Content Grade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-8 py-4 px-6 bg-muted/30 rounded-xl">
                    {/* Total Score Circle */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Total Score</p>
                      <div className={`w-20 h-20 rounded-full ${gradeInfo?.bgColor} ring-4 ${gradeInfo?.ringColor} flex items-center justify-center`}>
                        <span className={`text-3xl font-black ${gradeInfo?.color}`}>{result.totalScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">out of {maxScore}</p>
                    </div>
                    {/* Grade Band */}
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1.5 font-medium">Grade Band</p>
                      <div className="w-20 h-20 rounded-full bg-background ring-4 ring-border flex items-center justify-center">
                        <span className="text-3xl font-black text-foreground">{gradeBand}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5">&nbsp;</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Category Cards — all expanded */}
              {Object.entries(result.categories).map(([key, cat]) => {
                const meta = categoryMeta[key];
                const defaults = categoryDefaults[key];
                const Icon = meta?.icon || ShieldCheck;
                const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
                const weight = cat.weight || defaults?.weight || "";
                const analysis = cat.analysis || cat.explanation || "";

                return (
                  <Card key={key} className="overflow-hidden">
                    <div className="p-5">
                      {/* Category Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-base">{cat.label}</span>
                          {weight && (
                            <span className="text-sm text-muted-foreground">({weight})</span>
                          )}
                        </div>
                        <span className={`text-base font-bold ${
                          pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {cat.score}/{cat.maxScore}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <Progress
                        value={pct}
                        className={`h-2.5 mb-4 ${getScoreBarColor(cat.score, cat.maxScore)}`}
                      />

                      {/* Analysis */}
                      {analysis && (
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                          {analysis}
                        </p>
                      )}

                      {/* Improvements */}
                      {cat.improvements?.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-orange-600 mb-2.5">Improvements:</p>
                          <div className="space-y-2">
                            {cat.improvements.map((imp, i) => (
                              <div key={i} className="flex items-start gap-2.5 text-sm">
                                <CircleDot className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                                <span className="text-muted-foreground">{imp}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}

              {/* Key Strengths & Weaknesses */}
              {(result.keyStrengths?.length || result.keyWeaknesses?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {result.keyStrengths && result.keyStrengths.length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="font-bold text-sm mb-3">Key Strengths</h4>
                        <div className="space-y-2">
                          {result.keyStrengths.map((s, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {result.keyWeaknesses && result.keyWeaknesses.length > 0 && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="font-bold text-sm mb-3">Key Weaknesses</h4>
                        <div className="space-y-2">
                          {result.keyWeaknesses.map((w, i) => (
                            <div key={i} className="flex items-start gap-2 text-sm">
                              <XCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                              <span>{w}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : null}

              {/* Penalties */}
              {result.penalties && result.penalties.length > 0 && (
                <Card className="border-amber-200 bg-amber-50/30">
                  <CardContent className="p-5">
                    <h4 className="font-bold text-sm text-red-600 mb-3">Penalties Applied</h4>
                    <div className="space-y-2">
                      {result.penalties.map((p, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Prioritized Corrective Actions */}
              {result.prioritizedActions && result.prioritizedActions.length > 0 && (
                <Card className="border-indigo-200 bg-indigo-50/30">
                  <CardContent className="p-5">
                    <h4 className="font-bold text-sm text-indigo-700 mb-3">Prioritized Corrective Actions</h4>
                    <div className="space-y-2.5">
                      {result.prioritizedActions.map((action, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm">
                          <div className="w-6 h-6 rounded-md bg-indigo-100 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-indigo-700">{i + 1}</span>
                          </div>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Scoring Note */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">
                    This standalone grader evaluates 85 of 100 possible points. The remaining 15% covers technical SEO factors (page speed, mobile-friendliness, schema markup) that require live page analysis. For project-specific grading with Brand Voice and ICP alignment scoring, use the Grade button on individual articles.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
