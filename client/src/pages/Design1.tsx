/*
 * Design 1 — Command Center
 * Dark, data-dense pro tool. Bloomberg Terminal meets ClickUp.
 * Self-contained with all styles inline.
 */

import { Link } from "wouter";
import { ArrowLeft, ArrowUp, ArrowDown, FileText, CheckCircle2, PenLine, Network, TrendingUp, LayoutDashboard, FolderKanban, CalendarDays, Search, ShieldCheck, Swords, Crosshair, BarChart3, Lightbulb, Sparkles, ListTree, Award, LampDesk, Rocket, ChevronRight, ChevronDown, Bell, Settings, Zap, Check, FilePlus, PieChart, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RPieChart, Pie, Cell } from "recharts";

const barData = [
  { month: "Oct", Articles: 3, Outlines: 5 },
  { month: "Nov", Articles: 5, Outlines: 7 },
  { month: "Dec", Articles: 4, Outlines: 6 },
  { month: "Jan", Articles: 6, Outlines: 8 },
  { month: "Feb", Articles: 8, Outlines: 10 },
  { month: "Mar", Articles: 4, Outlines: 6 },
];

const pieData = [
  { name: "Complete", value: 8, color: "#10b981" },
  { name: "Draft", value: 3, color: "#f59e0b" },
  { name: "Outline", value: 2, color: "#3b82f6" },
  { name: "Review", value: 2, color: "#8b5cf6" },
];

const V = {
  bgPrimary: "#0a0e17",
  bgSecondary: "#111827",
  bgCard: "#151d2e",
  bgCardHover: "#1a2438",
  border: "#1e293b",
  borderLight: "#253249",
  textPrimary: "#f1f5f9",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  blue: "#3b82f6",
  cyan: "#06b6d4",
  green: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  purple: "#8b5cf6",
  blueBg: "rgba(59,130,246,0.12)",
  cyanBg: "rgba(6,182,212,0.12)",
  greenBg: "rgba(16,185,129,0.12)",
  amberBg: "rgba(245,158,11,0.12)",
  roseBg: "rgba(244,63,94,0.12)",
  purpleBg: "rgba(139,92,246,0.12)",
};

const font = "'Inter', -apple-system, sans-serif";

export default function Design1() {
  return (
    <div style={{ fontFamily: font, background: V.bgPrimary, color: V.textPrimary, fontSize: 15, lineHeight: 1.5, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 260, background: V.bgSecondary, borderRight: `1px solid ${V.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100 }}>
        <div style={{ padding: "24px 24px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${V.border}` }}>
          <div style={{ width: 36, height: 36, background: `linear-gradient(135deg, ${V.blue}, ${V.cyan})`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Rocket size={20} color="#fff" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, background: "linear-gradient(135deg, #fff, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>RankPilot</span>
        </div>
        <nav style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
          <NavSection title="Overview">
            <NavItem icon={<LayoutDashboard size={20} />} active>Dashboard</NavItem>
            <NavItem icon={<FolderKanban size={20} />} badge="3">Projects</NavItem>
            <NavItem icon={<CalendarDays size={20} />}>Calendar</NavItem>
          </NavSection>
          <NavSection title="SEO Tools">
            <NavItem icon={<Search size={20} />}>Keyword Research</NavItem>
            <NavItem icon={<ShieldCheck size={20} />}>Keyword Auditor</NavItem>
            <NavItem icon={<Swords size={20} />}>Competitor Analyzer</NavItem>
            <NavItem icon={<Crosshair size={20} />}>Position Tracker</NavItem>
            <NavItem icon={<BarChart3 size={20} />}>GSC Analyzer</NavItem>
            <NavItem icon={<Lightbulb size={20} />}>Keyword Insights</NavItem>
          </NavSection>
          <NavSection title="Content">
            <NavItem icon={<Sparkles size={20} />}>Generate</NavItem>
            <NavItem icon={<FileText size={20} />}>Articles</NavItem>
            <NavItem icon={<ListTree size={20} />}>Outlines</NavItem>
            <NavItem icon={<Network size={20} />}>Topic Clusters</NavItem>
            <NavItem icon={<Award size={20} />}>Grade Content</NavItem>
          </NavSection>
          <NavSection title="Planning">
            <NavItem icon={<LampDesk size={20} />}>Ideas</NavItem>
          </NavSection>
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${V.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, cursor: "pointer" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${V.purple}, ${V.blue})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>CB</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>C. Boudreau</div>
              <div style={{ fontSize: 12, color: V.textMuted }}>Admin</div>
            </div>
            <ChevronRight size={16} color={V.textMuted} />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 260, flex: 1 }}>
        {/* TOPBAR */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", borderBottom: `1px solid ${V.border}`, background: V.bgSecondary, position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link href="/">
              <span style={{ display: "flex", alignItems: "center", gap: 6, color: V.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                <ArrowLeft size={14} /> All Designs
              </span>
            </Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>Dashboard</h1>
            <span style={{ fontSize: 13, color: V.textMuted }}>/ Medicare FAQ</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 14px", color: V.textMuted, fontSize: 14, minWidth: 220 }}>
              <Search size={16} /> Search... <kbd style={{ marginLeft: "auto", background: V.bgSecondary, border: `1px solid ${V.borderLight}`, borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>⌘K</kbd>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 8, padding: "8px 14px", color: V.textPrimary, fontSize: 14, fontWeight: 500 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: V.green }} />
              Medicare FAQ
              <ChevronDown size={14} color={V.textMuted} />
            </div>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: `1px solid ${V.border}`, background: V.bgCard, color: V.textSecondary, position: "relative" }}>
              <Bell size={18} />
              <span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: V.rose, borderRadius: "50%", border: `2px solid ${V.bgSecondary}` }} />
            </div>
            <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: `1px solid ${V.border}`, background: V.bgCard, color: V.textSecondary }}>
              <Settings size={18} />
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "28px 32px" }}>
          {/* STATS ROW */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }}>
            <StatCard icon={<FileText size={20} />} iconBg={V.blueBg} iconColor={V.blue} value="15" label="Total Articles" trend="+12%" up />
            <StatCard icon={<CheckCircle2 size={20} />} iconBg={V.greenBg} iconColor={V.green} value="8" label="Published" trend="+3" up />
            <StatCard icon={<PenLine size={20} />} iconBg={V.amberBg} iconColor={V.amber} value="5" label="In Progress" trend="-2" />
            <StatCard icon={<Network size={20} />} iconBg={V.cyanBg} iconColor={V.cyan} value="2" label="Topic Clusters" />
            <StatCard icon={<TrendingUp size={20} />} iconBg={V.purpleBg} iconColor={V.purple} value="42.3k" label="Total Words" trend="+18%" up />
          </div>

          {/* ROW 2: Chart + Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="Content Production" icon={<Activity size={18} />} action="Last 6 months">
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={V.border} />
                    <XAxis dataKey="month" tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 8, color: V.textPrimary }} />
                    <Legend wrapperStyle={{ color: V.textSecondary, fontSize: 12 }} />
                    <Bar dataKey="Articles" fill="rgba(59,130,246,0.7)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Outlines" fill="rgba(6,182,212,0.5)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Recent Activity" icon={<Zap size={18} />} action="View All">
              <ActivityItem icon={<Check size={16} />} bg={V.greenBg} color={V.green} text={<><strong>Medicare Advantage vs Medigap</strong> marked as complete</>} time="24 minutes ago" />
              <ActivityItem icon={<FilePlus size={16} />} bg={V.blueBg} color={V.blue} text={<><strong>Does Medicare Cover Dentures?</strong> outline created</>} time="24 minutes ago" />
              <ActivityItem icon={<Sparkles size={16} />} bg={V.purpleBg} color={V.purple} text={<><strong>Does Medicare Cover Ozempic?</strong> article generated</>} time="4 hours ago" />
              <ActivityItem icon={<PenLine size={16} />} bg={V.amberBg} color={V.amber} text={<><strong>Medicare FAQs California</strong> article in review</>} time="6 hours ago" />
              <ActivityItem icon={<FileText size={16} />} bg={V.cyanBg} color={V.cyan} text={<><strong>Medicare Deductibles 2026</strong> published</>} time="7 hours ago" />
            </Card>
          </div>

          {/* ROW 3: Table + Clusters */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginBottom: 24 }}>
            <Card title="Recent Articles" icon={<FileText size={18} />} action="View All Articles">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {["Article", "Status", "Words", "Updated"].map(h => (
                      <th key={h} style={{ textAlign: "left", fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8, color: V.textMuted, padding: "10px 12px", borderBottom: `1px solid ${V.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <TableRow title="Medicare Advantage vs Medigap: 2026 Cost Comparison" status="complete" words="4,077" time="24m ago" />
                  <TableRow title="Does Medicare Cover Dentures? Your 2026 Guide" status="outline" words="—" time="24m ago" />
                  <TableRow title="Does Medicare Cover Ozempic? Complete Guide" status="draft" words="3,245" time="4h ago" />
                  <TableRow title="Medicare FAQs California: Complete Guide" status="review" words="2,890" time="6h ago" />
                  <TableRow title="Medicare Deductibles 2026: How They Work" status="complete" words="3,102" time="7h ago" />
                  <TableRow title="Medicare Supplement Plans 2026: Coverage Guide" status="complete" words="3,540" time="2d ago" />
                </tbody>
              </table>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Card title="Topic Clusters" icon={<Network size={18} />} action="Manage" style={{ flex: 1 }}>
                <ClusterCard name="Medicare Cost Management Strategies" articles={7} complete={1} coverage={14} color={V.blue} />
                <ClusterCard name="Medicare Tools and Resources for Seniors" articles={3} complete={0} coverage={0} color={V.amber} />
              </Card>
              <Card title="Quick Actions" icon={<Zap size={18} />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <QuickBtn icon={<Sparkles size={18} />}>Generate Article</QuickBtn>
                  <QuickBtn icon={<ListTree size={18} />}>New Outline</QuickBtn>
                  <QuickBtn icon={<Search size={18} />}>Keyword Research</QuickBtn>
                  <QuickBtn icon={<Network size={18} />}>New Cluster</QuickBtn>
                </div>
              </Card>
            </div>
          </div>

          {/* ROW 4: Rankings + Ideas + Donut */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
            <Card title="Top Rankings" icon={<Crosshair size={18} />} action="View All">
              <RankItem pos={3} keyword="medicare supplement plans 2026" change={4} up posColor={V.green} />
              <RankItem pos={7} keyword="medicare deductibles 2026" change={2} up posColor={V.blue} />
              <RankItem pos={12} keyword="does medicare cover ozempic" change={1} posColor={V.amber} />
              <RankItem pos={18} keyword="medicare advantage vs medigap" change={6} up posColor={V.textSecondary} />
            </Card>

            <Card title="Saved Ideas" icon={<Lightbulb size={18} />} action="View All">
              <ActivityItem icon={<Lightbulb size={16} />} bg={V.blueBg} color={V.blue} text={<strong>Why Your Medicare Part D Claim Might Get Denied</strong>} time="Feb 25, 2026" />
              <ActivityItem icon={<Lightbulb size={16} />} bg={V.cyanBg} color={V.cyan} text={<strong>Which Medications Are Covered by Medicare Part D?</strong>} time="Feb 25, 2026" />
              <ActivityItem icon={<Lightbulb size={16} />} bg={V.purpleBg} color={V.purple} text={<strong>How Medicare Part D Lowers Prescription Costs</strong>} time="Feb 25, 2026" />
            </Card>

            <Card title="Content Status" icon={<PieChart size={18} />}>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RPieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 8, color: V.textPrimary }} />
                    <Legend wrapperStyle={{ fontSize: 12, color: V.textSecondary }} />
                  </RPieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* DESIGN LABEL */}
      <div style={{ position: "fixed", bottom: 20, right: 20, background: V.blue, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 20, zIndex: 999, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(59,130,246,0.4)" }}>
        DESIGN 1 — COMMAND CENTER
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: V.textMuted, padding: "0 12px", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, children, active, badge }: { icon: React.ReactNode; children: React.ReactNode; active?: boolean; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, color: active ? V.blue : V.textSecondary, background: active ? V.blueBg : "transparent", cursor: "pointer", fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
      {icon}
      <span>{children}</span>
      {badge && <span style={{ marginLeft: "auto", background: V.rose, color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 10 }}>{badge}</span>}
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label, trend, up }: { icon: React.ReactNode; iconBg: string; iconColor: string; value: string; label: string; trend?: string; up?: boolean }) {
  return (
    <div style={{ background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 10, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor }}>{icon}</div>
        {trend && <span style={{ fontSize: 12, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: up ? V.greenBg : V.roseBg, color: up ? V.green : V.rose }}>{trend}</span>}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 13, color: V.textMuted, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Card({ title, icon, action, children, style: s }: { title: string; icon: React.ReactNode; action?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: V.bgCard, border: `1px solid ${V.border}`, borderRadius: 10, padding: 24, ...s }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: V.textMuted }}>{icon}</span> {title}
        </div>
        {action && <span style={{ fontSize: 13, color: V.blue, fontWeight: 600, cursor: "pointer" }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function ActivityItem({ icon, bg, color, text, time }: { icon: React.ReactNode; bg: string; color: string; text: React.ReactNode; time: string }) {
  return (
    <div style={{ display: "flex", gap: 14, padding: "14px 0", borderBottom: `1px solid ${V.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, color: V.textSecondary, lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 12, color: V.textMuted, marginTop: 4 }}>{time}</div>
      </div>
    </div>
  );
}

function TableRow({ title, status, words, time }: { title: string; status: string; words: string; time: string }) {
  const statusColors: Record<string, { bg: string; color: string }> = {
    complete: { bg: V.greenBg, color: V.green },
    draft: { bg: V.amberBg, color: V.amber },
    outline: { bg: V.blueBg, color: V.blue },
    review: { bg: V.purpleBg, color: V.purple },
  };
  const sc = statusColors[status];
  return (
    <tr>
      <td style={{ padding: 12, fontSize: 14, borderBottom: `1px solid ${V.border}`, fontWeight: 600 }}>{title}</td>
      <td style={{ padding: 12, fontSize: 14, borderBottom: `1px solid ${V.border}` }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 6, fontSize: 12, fontWeight: 600, background: sc.bg, color: sc.color }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor" }} />
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </td>
      <td style={{ padding: 12, fontSize: 14, borderBottom: `1px solid ${V.border}`, color: V.textSecondary }}>{words}</td>
      <td style={{ padding: 12, fontSize: 14, borderBottom: `1px solid ${V.border}`, color: V.textMuted }}>{time}</td>
    </tr>
  );
}

function ClusterCard({ name, articles, complete, coverage, color }: { name: string; articles: number; complete: number; coverage: number; color: string }) {
  return (
    <div style={{ background: V.bgSecondary, border: `1px solid ${V.border}`, borderRadius: 8, padding: 16, marginBottom: 12, cursor: "pointer" }}>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12, color: V.textMuted }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={12} /> {articles} articles</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={12} /> {complete} complete</span>
        <span>{coverage}% coverage</span>
      </div>
      <div style={{ height: 4, background: V.border, borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${coverage}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function QuickBtn({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: V.bgSecondary, border: `1px solid ${V.border}`, borderRadius: 8, color: V.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
      {icon} {children}
    </div>
  );
}

function RankItem({ pos, keyword, change, up, posColor }: { pos: number; keyword: string; change: number; up?: boolean; posColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${V.border}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, background: V.bgSecondary, border: `1px solid ${V.border}`, color: posColor }}>{pos}</div>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{keyword}</div>
      <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, color: up ? V.green : V.rose }}>
        {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {change}
      </div>
    </div>
  );
}
