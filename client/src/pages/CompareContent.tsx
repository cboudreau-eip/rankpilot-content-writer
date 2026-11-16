import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  Swords,
  Sparkles,
  Link2,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ListTree,
  Trophy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface CategoryScore {
  score: number;
  maxScore: number;
  label: string;
}
interface ScoredArticle {
  label: string;
  isYours: boolean;
  url: string | null;
  title: string;
  wordCount: number;
  grade: { totalScore: number; gradeBand: string; categories: Record<string, CategoryScore> } | null;
}

const MAX_TOTAL = 85;
const CATEGORY_ORDER = ["eeatTrust", "accuracy", "aioReadiness", "readability"];

function bandColor(band: string | undefined) {
  const b = (band || "").charAt(0);
  if (b === "A") return "text-emerald-600";
  if (b === "B") return "text-blue-600";
  if (b === "C") return "text-amber-600";
  return "text-red-600";
}

function priorityClass(p: string) {
  if (p === "high") return "bg-red-100 text-red-700 border-red-200";
  if (p === "medium") return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function CompareContent() {
  const [yourUrl, setYourUrl] = useState("");
  const [yourText, setYourText] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [competitors, setCompetitors] = useState(["", "", ""]);
  const [keyword, setKeyword] = useState("");

  const compareMutation = trpc.grading.compare.useMutation({
    onError: (err) => toast.error(err.message || "Comparison failed"),
    onSuccess: (data) => {
      if (data.failedCompetitors.length > 0) {
        toast.warning(`${data.failedCompetitors.length} competitor URL${data.failedCompetitors.length > 1 ? "s" : ""} couldn't be read and ${data.failedCompetitors.length > 1 ? "were" : "was"} skipped`);
      } else {
        toast.success("Comparison complete");
      }
    },
  });
  const result = compareMutation.data;

  const filledCompetitors = competitors.map((c) => c.trim()).filter(Boolean);
  const hasYours = pasteMode ? yourText.trim().length >= 50 : yourUrl.trim().length > 0;
  const canRun = hasYours && filledCompetitors.length >= 1 && !compareMutation.isPending;

  const run = () => {
    if (!canRun) return;
    compareMutation.mutate({
      ...(pasteMode ? { yourContent: yourText.trim() } : { yourUrl: yourUrl.trim() }),
      competitorUrls: filledCompetitors,
      keyword: keyword.trim() || undefined,
    });
  };

  const copyOutline = () => {
    if (!result || result.analysis.outline.sections.length === 0) return;
    const o = result.analysis.outline;
    const lines = [`# ${o.title}`, ""];
    for (const sec of o.sections as any[]) {
      lines.push(`${"#".repeat(sec.level === 3 ? 3 : 2)} ${sec.heading}`);
      for (const kp of sec.keyPoints || []) lines.push(`- ${kp}`);
      lines.push("");
    }
    const text = lines.join("\n").trim();
    if (!navigator.clipboard?.writeText) {
      toast.error("Copy isn't available in this browser context");
      return;
    }
    navigator.clipboard.writeText(text).then(
      () => toast.success("Outline copied"),
      () => toast.error("Couldn't copy to the clipboard")
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
          <Swords className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Content</h1>
          <p className="text-muted-foreground mt-0.5">
            Grade your article against up to 3 competitors, find the gaps, and get an outline to outrank them
          </p>
        </div>
      </div>

      {/* Inputs */}
      <Card>
        <CardContent className="pt-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Your article</label>
              <button
                className="text-xs text-blue-600 hover:text-blue-800 underline"
                onClick={() => setPasteMode((m) => !m)}
                type="button"
              >
                {pasteMode ? "Use a URL instead" : "Paste text instead"}
              </button>
            </div>
            {pasteMode ? (
              <Textarea
                aria-label="Your article text"
                placeholder="Paste your article text here..."
                className="min-h-[160px] text-sm"
                value={yourText}
                onChange={(e) => setYourText(e.target.value)}
              />
            ) : (
              <div className="relative">
                <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  aria-label="Your article URL"
                  placeholder="https://your-site.com/your-article"
                  className="pl-9"
                  value={yourUrl}
                  onChange={(e) => setYourUrl(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Competitor articles (1 to 3)</label>
            {competitors.map((c, i) => (
              <div className="relative" key={i}>
                <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  aria-label={`Competitor URL ${i + 1}`}
                  placeholder={i === 0 ? "https://competitor.com/ranking-article (required)" : "https://competitor.com/another-article (optional)"}
                  className="pl-9"
                  value={c}
                  onChange={(e) => setCompetitors((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))}
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Target keyword <span className="text-muted-foreground font-normal">(optional, sharpens the analysis)</span></label>
            <Input aria-label="Target keyword" placeholder="e.g. medicare supplement plans" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
          </div>

          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              {compareMutation.isPending
                ? "Fetching and grading every article, then comparing them. This usually takes 30 to 90 seconds."
                : "Pages built with JavaScript or sites that block bots may not be readable."}
            </p>
            <Button
              onClick={run}
              disabled={!canRun}
              className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shrink-0"
            >
              {compareMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Comparing...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" />Compare</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <>
          {result.failedCompetitors.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 space-y-1">
              <div className="flex items-center gap-2 font-medium"><AlertTriangle className="w-4 h-4" />Skipped competitors</div>
              {result.failedCompetitors.map((f) => (
                <div key={f.url} className="text-xs break-all">{f.url}: {f.error}</div>
              ))}
            </div>
          )}

          {/* Scores */}
          <div className={`grid grid-cols-1 gap-4 ${result.articles.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2"} ${result.articles.length === 4 ? "xl:grid-cols-4" : ""}`}>
            {(result.articles as ScoredArticle[]).map((a) => (
              <Card key={a.label} className={a.isYours ? "border-primary/50 ring-1 ring-primary/20" : ""}>
                <CardContent className="pt-5 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={a.isYours ? "default" : "secondary"}>{a.label}</Badge>
                    <span className="text-xs text-muted-foreground">{a.wordCount.toLocaleString()} words</span>
                  </div>
                  <div className="text-sm font-medium line-clamp-2" title={a.title}>{a.title}</div>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline block truncate">
                      {a.url}
                    </a>
                  )}
                  {a.grade ? (
                    <>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">{a.grade.totalScore}</span>
                        <span className="text-sm text-muted-foreground">/ {MAX_TOTAL}</span>
                        <span className={`ml-auto text-xl font-bold ${bandColor(a.grade.gradeBand)}`}>{a.grade.gradeBand}</span>
                      </div>
                      <div className="space-y-2 pt-1">
                        {CATEGORY_ORDER.filter((k) => a.grade!.categories?.[k]).map((k) => {
                          const c = a.grade!.categories[k];
                          return (
                            <div key={k} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-muted-foreground">{c.label}</span>
                                <span className="font-medium">{c.score}/{c.maxScore}</span>
                              </div>
                              <Progress value={(c.score / c.maxScore) * 100} className="h-1.5" />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">Grading unavailable for this article.</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Trophy className="w-4 h-4 text-muted-foreground" />Summary</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed">{result.analysis.summary}</CardContent>
          </Card>

          {/* Commonalities + advantages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-muted-foreground" />What everyone covers</CardTitle>
                <p className="text-xs text-muted-foreground">Table stakes: your article needs these to compete.</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5 text-sm">
                  {result.analysis.commonalities.map((c, i) => (
                    <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />{c}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-600" />Where you're ahead</CardTitle>
                <p className="text-xs text-muted-foreground">Keep and build on these.</p>
              </CardHeader>
              <CardContent>
                {result.analysis.yourAdvantages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clear advantages identified.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm">
                    {result.analysis.yourAdvantages.map((c, i) => (
                      <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />{c}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Gaps */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-600" />Competitors have it, you don't</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(result.analysis.competitorsHaveYouLack as any[]).length === 0 && <p className="text-sm text-muted-foreground">No gaps found.</p>}
                {(result.analysis.competitorsHaveYouLack as any[]).map((g, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{g.topic}</div>
                    {g.coveredBy && <div className="text-xs text-muted-foreground">Covered by: {g.coveredBy}</div>}
                    {g.why && <div className="text-muted-foreground mt-0.5">{g.why}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2"><Lightbulb className="w-4 h-4 text-blue-600" />Nobody covers it (your opening)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {(result.analysis.opportunitiesNobodyCovers as any[]).length === 0 && <p className="text-sm text-muted-foreground">No open gaps found.</p>}
                {(result.analysis.opportunitiesNobodyCovers as any[]).map((g, i) => (
                  <div key={i} className="text-sm">
                    <div className="font-medium">{g.topic}</div>
                    {g.why && <div className="text-muted-foreground mt-0.5">{g.why}</div>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Feedback */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-muted-foreground" />Feedback to outrank them</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(result.analysis.feedback as any[]).map((f, i) => (
                <div key={i} className="text-sm space-y-1 border-b last:border-b-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={priorityClass(String(f.priority))}>{String(f.priority || "").toUpperCase()}</Badge>
                    <span className="font-medium">{f.area}</span>
                  </div>
                  <div className="text-muted-foreground">{f.issue}</div>
                  <div><span className="font-medium">Fix: </span>{f.fix}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Outline */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><ListTree className="w-4 h-4 text-muted-foreground" />Recommended outline</CardTitle>
                <Button variant="outline" size="sm" onClick={copyOutline} disabled={result.analysis.outline.sections.length === 0}><Copy className="w-3.5 h-3.5 mr-1.5" />Copy outline</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-lg font-semibold">{result.analysis.outline.title}</div>
                {result.analysis.outline.targetWordCount && (
                  <div className="text-xs text-muted-foreground">Target length: about {result.analysis.outline.targetWordCount.toLocaleString()} words</div>
                )}
              </div>
              {result.analysis.outline.sections.length === 0 && (
                <p className="text-sm text-muted-foreground">The outline couldn't be generated this time. Run the comparison again to retry.</p>
              )}
              {(result.analysis.outline.sections as any[]).map((sec, i) => (
                <div key={i} className={`text-sm ${sec.level === 3 ? "ml-5" : ""}`}>
                  <div className={sec.level === 3 ? "font-medium" : "font-semibold"}>{sec.level === 3 ? "H3" : "H2"} · {sec.heading}</div>
                  <ul className="list-disc ml-5 mt-1 space-y-0.5 text-muted-foreground">
                    {(sec.keyPoints || []).map((kp: string, j: number) => <li key={j}>{kp}</li>)}
                  </ul>
                  {sec.note && <div className="text-xs text-blue-700 mt-1">{sec.note}</div>}
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
