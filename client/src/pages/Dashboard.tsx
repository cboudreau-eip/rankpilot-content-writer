import { useState, useMemo } from "react";
import { useActiveProject } from "@/components/AppLayout";
import { ProjectKeywordsPanel } from "@/pages/ProjectKeywords";
import { trpc } from "@/lib/trpc";
import {
  FileText,
  CheckCircle2,
  PenLine,
  BarChart3,
  Lightbulb,
  Zap,
  Check,
  FilePlus,
  Sparkles,
  Flame,
  Settings,
  Timer,
  KeyRound,
  LayoutDashboard,
  TrendingUp,
  Target,
  BookOpen,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const statusConfig: Record<string, { label: string; class: string }> = {
  draft: { label: "Draft", class: "bg-amber-50 text-amber-600" },
  review: { label: "Review", class: "bg-purple-50 text-purple-600" },
  complete: { label: "Complete", class: "bg-emerald-50 text-emerald-600" },
  published: { label: "Published", class: "bg-blue-50 text-blue-600" },
};

const activityIcons: Record<string, { icon: typeof Check; bg: string; color: string }> = {
  "article-draft": { icon: FilePlus, bg: "bg-amber-50", color: "text-amber-600" },
  "article-review": { icon: PenLine, bg: "bg-purple-50", color: "text-purple-600" },
  "article-complete": { icon: Check, bg: "bg-emerald-50", color: "text-emerald-600" },
  "article-published": { icon: FileText, bg: "bg-blue-50", color: "text-blue-600" },
  "idea-saved": { icon: Lightbulb, bg: "bg-indigo-50", color: "text-indigo-600" },
  "idea-used": { icon: Sparkles, bg: "bg-purple-50", color: "text-purple-600" },
  "idea-archived": { icon: BookOpen, bg: "bg-gray-50", color: "text-gray-500" },
};

function getActivityConfig(type: string, status: string) {
  const key = `${type}-${status}`;
  return activityIcons[key] || { icon: Zap, bg: "bg-gray-50", color: "text-gray-500" };
}

function getActivityText(type: string, status: string, title: string) {
  if (type === "article") {
    switch (status) {
      case "draft": return `"${title}" article was created as a draft`;
      case "review": return `"${title}" moved to review stage`;
      case "complete": return `"${title}" was marked as complete`;
      case "published": return `"${title}" was published`;
      default: return `"${title}" article was updated`;
    }
  } else {
    switch (status) {
      case "saved": return `"${title}" idea was saved`;
      case "used": return `"${title}" idea was used to generate an article`;
      case "archived": return `"${title}" idea was archived`;
      default: return `"${title}" idea was updated`;
    }
  }
}

function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

type DashboardTab = "overview" | "keywords";

export default function Dashboard() {
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");

  const projectId = activeProject?.id;

  // Real API queries
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: recentArticles, isLoading: articlesLoading } = trpc.dashboard.recentArticles.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: recentIdeas } = trpc.dashboard.recentIdeas.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: articlesOverTime } = trpc.dashboard.articlesOverTime.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );
  const { data: recentActivity } = trpc.dashboard.recentActivity.useQuery(
    { projectId: projectId! },
    { enabled: !!projectId }
  );

  // Transform chart data — fill in missing days for a smooth chart
  const chartData = useMemo(() => {
    if (!articlesOverTime || articlesOverTime.length === 0) {
      // Show empty 30-day range
      const days: { day: string; value: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push({ day: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), value: 0 });
      }
      return days;
    }
    const map = new Map(articlesOverTime.map((r) => [r.date, r.count]));
    const days: { day: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ day: label, value: map.get(key) ?? 0 });
    }
    return days;
  }, [articlesOverTime]);

  const isLoading = statsLoading || articlesLoading;

  const statCards = [
    {
      label: "Total Articles",
      value: stats?.totalArticles ?? 0,
      icon: FileText,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      detail: `${stats?.draftCount ?? 0} drafts · ${stats?.completeCount ?? 0} complete`,
    },
    {
      label: "Keywords Tracked",
      value: stats?.totalKeywords ?? 0,
      icon: Target,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      detail: "Across all keyword lists",
    },
    {
      label: "Saved Ideas",
      value: stats?.savedIdeas ?? 0,
      icon: Lightbulb,
      color: "text-amber-600",
      bg: "bg-amber-50",
      detail: `${stats?.totalIdeas ?? 0} total ideas generated`,
    },
    {
      label: "In Review",
      value: stats?.reviewCount ?? 0,
      icon: PenLine,
      color: "text-purple-600",
      bg: "bg-purple-50",
      detail: `${stats?.publishedCount ?? 0} published`,
    },
  ];

  const ideaColors = [
    "text-rose-500 bg-rose-50",
    "text-indigo-500 bg-indigo-50",
    "text-emerald-500 bg-emerald-50",
    "text-amber-500 bg-amber-50",
    "text-cyan-500 bg-cyan-50",
  ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject
              ? `Overview for ${activeProject.name}`
              : "Welcome back! Select a project to see your content overview."}
          </p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2">
            <Link href="/project-scheduler">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-600 bg-green-600 hover:bg-green-700 transition-colors text-sm font-medium text-white">
                <Timer className="w-4 h-4" />
                <span>Scheduler</span>
              </button>
            </Link>
            <Link href="/project-settings">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground">
                <Settings className="w-4 h-4" />
                <span>Project Settings</span>
              </button>
            </Link>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      {activeProject && (
        <div className="flex items-center gap-1 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab("keywords")}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === "keywords"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            }`}
          >
            <KeyRound className="w-4 h-4" />
            Keywords
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "keywords" && activeProject ? (
        <ProjectKeywordsPanel
          projectId={activeProject.id}
          projectName={activeProject.name}
          embedded
        />
      ) : (
        <>
          {!activeProject ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <LayoutDashboard className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h2 className="text-lg font-semibold text-muted-foreground">No Project Selected</h2>
              <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                Select a project from the sidebar to see your dashboard with real-time stats, recent articles, and activity.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
                {statCards.map((s) => (
                  <Card key={s.label} className="shadow-sm">
                    <CardContent className="pt-5 pb-4 px-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg}`}>
                          <s.icon className={`w-5 h-5 ${s.color}`} />
                        </div>
                        <span className="text-2xl font-extrabold tracking-tight">{s.value}</span>
                      </div>
                      <p className="text-sm font-semibold">{s.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.detail}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Row 2: Chart + Ideas */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-7">
                {/* Chart */}
                <Card className="lg:col-span-3 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      Content Production
                    </CardTitle>
                    <span className="text-xs text-muted-foreground font-medium">Last 30 Days</span>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[260px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                          <defs>
                            <linearGradient id="colorVal2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="oklch(0.55 0.2 270)" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="oklch(0.55 0.2 270)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" />
                          <XAxis
                            dataKey="day"
                            tick={{ fill: "oklch(0.55 0.015 260)", fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
                          />
                          <YAxis
                            tick={{ fill: "oklch(0.55 0.015 260)", fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip
                            contentStyle={{
                              background: "#fff",
                              border: "1px solid oklch(0.9 0.005 260)",
                              borderRadius: 10,
                              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                            }}
                          />
                          <Area type="monotone" dataKey="value" stroke="oklch(0.55 0.2 270)" strokeWidth={2.5} fill="url(#colorVal2)" name="Articles Created" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Saved Ideas */}
                <div className="lg:col-span-2 flex flex-col gap-5">
                  <Card className="shadow-sm flex-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-muted-foreground" />
                        Saved Ideas
                      </CardTitle>
                      <Link href="/ideas">
                        <span className="text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-1">
                          View All <ArrowRight className="w-3 h-3" />
                        </span>
                      </Link>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {!recentIdeas || recentIdeas.length === 0 ? (
                        <div className="text-center py-6">
                          <Lightbulb className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">No saved ideas yet</p>
                          <Link href="/ideas">
                            <Button variant="outline" size="sm" className="mt-3">
                              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                              Generate Ideas
                            </Button>
                          </Link>
                        </div>
                      ) : (
                        recentIdeas.map((idea, i) => (
                          <div key={idea.id} className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${ideaColors[i % ideaColors.length]}`}>
                              <Lightbulb className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold leading-snug truncate">{idea.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {idea.keyword} · {idea.rankingPotential ? `${idea.rankingPotential} potential` : timeAgo(idea.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>

                  {/* Quick Stats Summary */}
                  <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                        Content Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { label: "Drafts", count: stats?.draftCount ?? 0, color: "bg-amber-500" },
                          { label: "In Review", count: stats?.reviewCount ?? 0, color: "bg-purple-500" },
                          { label: "Complete", count: stats?.completeCount ?? 0, color: "bg-emerald-500" },
                          { label: "Published", count: stats?.publishedCount ?? 0, color: "bg-blue-500" },
                        ].map((s) => (
                          <div key={s.label} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${s.color}`} />
                            <span className="text-sm flex-1">{s.label}</span>
                            <span className="text-sm font-bold">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Row 3: Articles + Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
                {/* Recent Articles */}
                <Card className="lg:col-span-3 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      Recent Articles
                    </CardTitle>
                    <Link href="/articles">
                      <span className="text-sm text-primary font-semibold cursor-pointer hover:underline flex items-center gap-1">
                        View All <ArrowRight className="w-3 h-3" />
                      </span>
                    </Link>
                  </CardHeader>
                  <CardContent>
                    {!recentArticles || recentArticles.length === 0 ? (
                      <div className="text-center py-8">
                        <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No articles yet</p>
                        <Link href="/generate">
                          <Button variant="outline" size="sm" className="mt-3">
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            Generate Your First Article
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {recentArticles.map((a) => {
                          const sc = statusConfig[a.status] || statusConfig.draft;
                          return (
                            <Link key={a.id} href={`/articles/${a.id}`}>
                              <div className="flex items-center py-3 gap-3 cursor-pointer hover:bg-accent/30 -mx-2 px-2 rounded-lg transition-colors">
                                <div className="flex-1 min-w-0 mr-4">
                                  <p className="text-sm font-semibold truncate">{a.title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {a.wordCount ? `${a.wordCount.toLocaleString()} words` : "No content"} · {timeAgo(a.updatedAt)}
                                  </p>
                                </div>
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${sc.class}`}>
                                  {sc.label}
                                </span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Activity Feed */}
                <Card className="lg:col-span-2 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Zap className="w-4 h-4 text-muted-foreground" />
                      Activity Feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!recentActivity || recentActivity.length === 0 ? (
                      <div className="text-center py-8">
                        <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No activity yet</p>
                        <p className="text-xs text-muted-foreground/70 mt-1">Activity will appear here as you create articles and ideas.</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-border">
                        {recentActivity.map((item, i) => {
                          const config = getActivityConfig(item.type, item.status);
                          const IconComp = config.icon;
                          return (
                            <div key={`${item.type}-${item.id}-${i}`} className="flex items-start gap-3 py-3">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${config.bg} ${config.color}`}>
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {getActivityText(item.type, item.status, item.title)}
                                </p>
                                <p className="text-[11px] text-muted-foreground/70 mt-1">{timeAgo(item.date)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
