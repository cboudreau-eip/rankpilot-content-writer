import { useActiveProject } from "@/components/AppLayout";
import {
  FileText,
  CheckCircle2,
  PenLine,
  BarChart3,
  Network,
  Lightbulb,
  Zap,
  Check,
  FilePlus,
  Sparkles,
  Award,
  Flame,
  Plus,
  Settings,
  Timer,
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

// Mock data — will be replaced with real API data in Phase 3+
const chartData = [
  { day: "Mon", value: 3 }, { day: "Tue", value: 5 }, { day: "Wed", value: 4 }, { day: "Thu", value: 7 },
  { day: "Fri", value: 6 }, { day: "Sat", value: 3 }, { day: "Sun", value: 2 },
  { day: "Mon", value: 4 }, { day: "Tue", value: 8 }, { day: "Wed", value: 6 }, { day: "Thu", value: 5 }, { day: "Fri", value: 4 },
];

const recentArticles = [
  { title: "Medicare Advantage vs Medigap: 2026 Cost Comparison", words: "4,077 words", time: "24m ago", status: "Complete", statusClass: "bg-emerald-50 text-emerald-600" },
  { title: "Does Medicare Cover Dentures? Your 2026 Guide", words: "Outline", time: "24m ago", status: "Outline", statusClass: "bg-blue-50 text-blue-600" },
  { title: "Does Medicare Cover Ozempic? Complete Guide", words: "3,245 words", time: "4h ago", status: "Draft", statusClass: "bg-amber-50 text-amber-600" },
  { title: "Medicare FAQs California: Complete Guide", words: "2,890 words", time: "6h ago", status: "Review", statusClass: "bg-purple-50 text-purple-600" },
  { title: "Medicare Deductibles 2026: How They Work", words: "3,102 words", time: "7h ago", status: "Complete", statusClass: "bg-emerald-50 text-emerald-600" },
];

const activityFeed = [
  { icon: Check, bg: "bg-emerald-50", color: "text-emerald-600", text: "Medicare Advantage vs Medigap was marked as complete", time: "24 minutes ago" },
  { icon: FilePlus, bg: "bg-blue-50", color: "text-blue-600", text: "Does Medicare Cover Dentures? outline was created", time: "24 minutes ago" },
  { icon: Sparkles, bg: "bg-purple-50", color: "text-purple-600", text: "Does Medicare Cover Ozempic? article was generated using AI", time: "4 hours ago" },
  { icon: PenLine, bg: "bg-amber-50", color: "text-amber-600", text: "Medicare FAQs California moved to review stage", time: "6 hours ago" },
  { icon: FileText, bg: "bg-cyan-50", color: "text-cyan-600", text: "Medicare Deductibles 2026 was published", time: "7 hours ago" },
  { icon: Award, bg: "bg-indigo-50", color: "text-indigo-600", text: "Medicare Supplement Plans 2026 content grading completed — Score: 87", time: "2 days ago" },
  { icon: Network, bg: "bg-rose-50", color: "text-rose-600", text: "Medicare Cost Management topic cluster created with 7 articles", time: "3 days ago" },
];

const clusters = [
  { name: "Medicare Cost Management Strategies", articles: 7, done: 1, color: "#6366f1" },
  { name: "Medicare Tools & Resources for Seniors", articles: 3, done: 0, color: "#d97706" },
];

const ideas = [
  { title: "Why Your Medicare Part D Claim Might Get Denied", date: "Feb 25, 2026", color: "text-rose-500 bg-rose-50" },
  { title: "Which Medications Are Covered by Medicare Part D?", date: "Feb 25, 2026", color: "text-indigo-500 bg-indigo-50" },
  { title: "How Medicare Part D Lowers Prescription Costs", date: "Feb 25, 2026", color: "text-emerald-500 bg-emerald-50" },
];

export default function Dashboard() {
  const { activeProject } = useActiveProject();

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeProject
              ? `Overview for ${activeProject.name}`
              : "Welcome back! Here's your content overview."}
          </p>
        </div>
        {activeProject && (
          <div className="flex items-center gap-2">
            <Link href="/project-scheduler">
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors text-sm font-medium text-muted-foreground hover:text-foreground">
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

      {/* Row 2: Chart + Clusters/Ideas */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-7">
        {/* Chart */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              Content Production
            </CardTitle>
            <span className="text-sm text-primary font-semibold cursor-pointer">This Month</span>
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
                  <XAxis dataKey="day" tick={{ fill: "oklch(0.55 0.015 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "oklch(0.55 0.015 260)", fontSize: 12 }} axisLine={false} tickLine={false} />
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

        {/* Clusters + Ideas */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Network className="w-4 h-4 text-muted-foreground" />
                Topic Clusters
              </CardTitle>
              <span className="text-sm text-primary font-semibold cursor-pointer">View All</span>
            </CardHeader>
            <CardContent className="space-y-4">
              {clusters.map((c) => (
                <div key={c.name}>
                  <p className="text-sm font-semibold mb-1.5">{c.name}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {c.articles} articles</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {c.done} done</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(c.done / c.articles) * 100}%`, background: c.color }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-muted-foreground" />
                Saved Ideas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ideas.map((idea) => (
                <div key={idea.title} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${idea.color}`}>
                    <Lightbulb className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-snug">{idea.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{idea.date}</p>
                  </div>
                </div>
              ))}
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
            <span className="text-sm text-primary font-semibold cursor-pointer">View All</span>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {recentArticles.map((a) => (
                <div key={a.title} className="flex items-center justify-between py-3.5">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-sm font-semibold truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{a.words} · {a.time}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap ${a.statusClass}`}>
                    {a.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Activity Feed
            </CardTitle>
            <span className="text-sm text-primary font-semibold cursor-pointer">View All</span>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {activityFeed.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                    <item.icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-1">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


