import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Sparkles,
  ShieldCheck,
  Target,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  ArrowRight,
  FileText,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CategoryResult {
  score: number;
  maxScore: number;
  label: string;
  explanation: string;
  improvements: string[];
}

interface GradeResult {
  totalScore: number;
  categories: {
    eeatTrust: CategoryResult;
    accuracy: CategoryResult;
    aioReadiness: CategoryResult;
    readability: CategoryResult;
  };
}

const categoryMeta: Record<string, { icon: typeof ShieldCheck; color: string; bgColor: string }> = {
  eeatTrust: { icon: ShieldCheck, color: "text-blue-600", bgColor: "bg-blue-50" },
  accuracy: { icon: Target, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  aioReadiness: { icon: Bot, color: "text-purple-600", bgColor: "bg-purple-50" },
  readability: { icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-50" },
};

function getGradeBand(score: number, max: number): { band: string; color: string; bgColor: string } {
  const pct = (score / max) * 100;
  if (pct >= 90) return { band: "A", color: "text-emerald-700", bgColor: "bg-emerald-100" };
  if (pct >= 80) return { band: "B", color: "text-blue-700", bgColor: "bg-blue-100" };
  if (pct >= 70) return { band: "C", color: "text-amber-700", bgColor: "bg-amber-100" };
  if (pct >= 60) return { band: "D", color: "text-orange-700", bgColor: "bg-orange-100" };
  return { band: "F", color: "text-red-700", bgColor: "bg-red-100" };
}

function getScoreColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 60) return "text-amber-600";
  return "text-red-600";
}

function getProgressColor(score: number, max: number): string {
  const pct = (score / max) * 100;
  if (pct >= 80) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

export default function GradeContent() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<GradeResult | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

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
    setExpandedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const wordCount = content.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const maxScore = 85;
  const grade = result ? getGradeBand(result.totalScore, maxScore) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <BarChart3 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Grade Content</h1>
          <p className="text-muted-foreground mt-0.5">
            Paste any content to get an AI-powered quality score across E-E-A-T, accuracy, AIO readiness, and readability.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Input */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                Content to Grade
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Paste your article, blog post, or any content here..."
                className="min-h-[400px] text-sm leading-relaxed resize-y"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {wordCount.toLocaleString()} words
                </span>
                <Button
                  onClick={handleGrade}
                  disabled={gradeMutation.isPending || content.trim().length < 50}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
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
              <p className="text-xs text-muted-foreground">
                Scores 4 categories totaling 85 points. The remaining 15% is reserved for technical SEO factors not assessed here.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-3 space-y-4">
          {!result && !gradeMutation.isPending && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Ready to Grade</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Paste your content on the left and click "Grade Content" to receive a detailed quality analysis with actionable improvements.
                </p>
              </CardContent>
            </Card>
          )}

          {gradeMutation.isPending && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <h3 className="text-lg font-semibold mb-1">Analyzing Content</h3>
                <p className="text-sm text-muted-foreground">
                  Evaluating E-E-A-T, accuracy, AIO readiness, and readability...
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Overall Score Card */}
              <Card className="overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Overall Score</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold tracking-tight">{result.totalScore}</span>
                        <span className="text-lg text-muted-foreground">/ {maxScore}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((result.totalScore / maxScore) * 100)}% — {maxScore - result.totalScore} points to improve
                      </p>
                    </div>
                    <div className={`w-20 h-20 rounded-2xl ${grade?.bgColor} flex items-center justify-center`}>
                      <span className={`text-4xl font-black ${grade?.color}`}>{grade?.band}</span>
                    </div>
                  </div>
                  <Progress
                    value={(result.totalScore / maxScore) * 100}
                    className={`mt-4 h-2 ${getProgressColor(result.totalScore, maxScore)}`}
                  />
                </div>
              </Card>

              {/* Category Breakdown */}
              <div className="space-y-3">
                {Object.entries(result.categories).map(([key, cat]) => {
                  const meta = categoryMeta[key];
                  const Icon = meta?.icon || ShieldCheck;
                  const isExpanded = expandedCategories[key];
                  const pct = Math.round((cat.score / cat.maxScore) * 100);

                  return (
                    <Card key={key} className="overflow-hidden">
                      <button
                        onClick={() => toggleCategory(key)}
                        className="w-full text-left p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-lg ${meta?.bgColor || "bg-gray-50"} flex items-center justify-center shrink-0`}>
                          <Icon className={`w-5 h-5 ${meta?.color || "text-gray-600"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm">{cat.label}</span>
                            <div className="flex items-center gap-2">
                              <span className={`text-sm font-bold ${getScoreColor(cat.score, cat.maxScore)}`}>
                                {cat.score}/{cat.maxScore}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {pct}%
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className={`h-1.5 ${getProgressColor(cat.score, cat.maxScore)}`}
                          />
                        </div>
                        <div className="shrink-0 ml-2">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 border-t bg-muted/10">
                          <p className="text-sm text-muted-foreground mt-3 mb-3">
                            {cat.explanation}
                          </p>
                          {cat.improvements.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Lightbulb className="w-3.5 h-3.5" />
                                Suggested Improvements
                              </p>
                              {cat.improvements.map((imp, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-sm p-2.5 rounded-lg bg-background border"
                                >
                                  <ArrowRight className="w-3.5 h-3.5 text-indigo-500 mt-0.5 shrink-0" />
                                  <span>{imp}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              {/* Scoring Note */}
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="py-3 px-4">
                  <p className="text-xs text-muted-foreground">
                    This standalone grader evaluates 85 of 100 possible points. The remaining 15% covers technical SEO factors (page speed, mobile-friendliness, schema markup) that require live page analysis. For project-specific grading with Brand Voice and ICP alignment scoring, use the Grade button on individual articles.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
