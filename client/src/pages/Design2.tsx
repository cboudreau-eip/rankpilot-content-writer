/*
 * Design 2 — Clean Studio
 * Light, airy, Reback/Notion-inspired. Soft card-based layout, colorful icons.
 * Plus Jakarta Sans font, generous whitespace, modern SaaS feel.
 */

import { Link } from "wouter";
import { ArrowLeft, FileText, CheckCircle2, PenLine, Type, LayoutDashboard, FolderKanban, CalendarDays, Search, ShieldCheck, Swords, Crosshair, BarChart3, Lightbulb, Sparkles, ListTree, Award, LampDesk, Rocket, ChevronDown, Bell, Settings, Zap, Check, FilePlus, Plus, MoreHorizontal, Network, Flame } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const chartData = [
  { day: "Mon", value: 3 }, { day: "Tue", value: 5 }, { day: "Wed", value: 4 }, { day: "Thu", value: 7 },
  { day: "Fri", value: 6 }, { day: "Sat", value: 3 }, { day: "Sun", value: 2 },
  { day: "Mon", value: 4 }, { day: "Tue", value: 8 }, { day: "Wed", value: 6 }, { day: "Thu", value: 5 }, { day: "Fri", value: 4 },
];

const V = {
  bg: "#f8f9fc", white: "#ffffff", bgHover: "#f1f3f9", bgActive: "#eef2ff",
  border: "#e5e7eb", borderLight: "#f0f1f5",
  textPrimary: "#111827", textSecondary: "#4b5563", textMuted: "#9ca3af",
  accent: "#6366f1", accentLight: "#eef2ff", accent2: "#8b5cf6",
  green: "#059669", greenBg: "#ecfdf5", amber: "#d97706", amberBg: "#fffbeb",
  blue: "#2563eb", blueBg: "#eff6ff", rose: "#e11d48", roseBg: "#fff1f2",
  cyan: "#0891b2", cyanBg: "#ecfeff", purple: "#7c3aed", purpleBg: "#f5f3ff",
};

const font = "'Plus Jakarta Sans', -apple-system, sans-serif";

export default function Design2() {
  return (
    <div style={{ fontFamily: font, background: V.bg, color: V.textPrimary, fontSize: 15, lineHeight: 1.6, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 270, background: V.white, borderRight: `1px solid ${V.border}`, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100 }}>
        <div style={{ padding: "28px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
            <Rocket size={22} color="#fff" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, color: V.textPrimary }}>RankPilot</span>
        </div>
        <nav style={{ flex: 1, padding: "8px 14px", overflowY: "auto" }}>
          <NavSection title="Main">
            <NavItem icon={<LayoutDashboard size={20} />} active>Dashboard</NavItem>
            <NavItem icon={<FolderKanban size={20} />} badge="1">Projects</NavItem>
            <NavItem icon={<CalendarDays size={20} />}>Calendar</NavItem>
          </NavSection>
          <NavSection title="SEO Tools">
            <NavItem icon={<Search size={20} />}>Keyword Research</NavItem>
            <NavItem icon={<ShieldCheck size={20} />}>Keyword Auditor</NavItem>
            <NavItem icon={<Swords size={20} />}>Competitor Analyzer</NavItem>
            <NavItem icon={<Crosshair size={20} />}>Position Tracker</NavItem>
            <NavItem icon={<BarChart3 size={20} />}>GSC Analyzer</NavItem>
            <NavItem icon={<Lightbulb size={20} />}>Keyword Insights</NavItem>
            <NavItem icon={<Flame size={20} />}>Thin Content</NavItem>
          </NavSection>
          <NavSection title="Content">
            <NavItem icon={<Sparkles size={20} />}>Generate</NavItem>
            <NavItem icon={<FileText size={20} />} badge="15">Articles</NavItem>
            <NavItem icon={<ListTree size={20} />}>Outlines</NavItem>
            <NavItem icon={<Network size={20} />}>Topic Clusters</NavItem>
            <NavItem icon={<Award size={20} />}>Grade Content</NavItem>
          </NavSection>
          <NavSection title="Planning">
            <NavItem icon={<LampDesk size={20} />}>Ideas</NavItem>
          </NavSection>
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${V.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #6366f1, #a78bfa)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>CB</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>C. Boudreau</div>
              <div style={{ fontSize: 12, color: V.textMuted }}>Admin</div>
            </div>
            <MoreHorizontal size={16} color={V.textMuted} />
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 270, flex: 1 }}>
        {/* TOPBAR */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 36px", background: V.white, borderBottom: `1px solid ${V.border}`, position: "sticky", top: 0, zIndex: 50 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <Link href="/">
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: V.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <ArrowLeft size={14} /> All Designs
                </span>
              </Link>
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.5 }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: V.textMuted, marginTop: 2 }}>Welcome back! Here's your content overview.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.bg, border: `1px solid ${V.border}`, borderRadius: 10, padding: "9px 16px", color: V.textMuted, fontSize: 14, minWidth: 200 }}>
              <Search size={16} /> Search anything... <kbd style={{ marginLeft: "auto", background: V.white, border: `1px solid ${V.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>⌘K</kbd>
            </div>
            <IconBtn><Bell size={18} /><span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: V.rose, borderRadius: "50%", border: "2px solid #fff" }} /></IconBtn>
            <IconBtn><Settings size={18} /></IconBtn>
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: V.accent, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
              <Plus size={18} /> New Article
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "28px 36px" }}>
          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 }}>
            <StatCard icon={<FileText size={22} />} iconBg={V.accentLight} iconColor={V.accent} value="15" label="Total Articles" trend="12%" up />
            <StatCard icon={<CheckCircle2 size={22} />} iconBg={V.greenBg} iconColor={V.green} value="8" label="Published" trend="3" up />
            <StatCard icon={<PenLine size={22} />} iconBg={V.amberBg} iconColor={V.amber} value="5" label="In Progress" trend="2" />
            <StatCard icon={<Type size={22} />} iconBg={V.purpleBg} iconColor={V.purple} value="42.3k" label="Total Words" trend="18%" up />
          </div>

          {/* ROW 2: Chart + Clusters + Ideas */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 28 }}>
            <Card title="Content Production" icon={<BarChart3 size={18} />} action="This Month">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={V.accent} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={V.accent} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={V.borderLight} />
                    <XAxis dataKey="day" tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                    <Area type="monotone" dataKey="value" stroke={V.accent} strokeWidth={2.5} fill="url(#colorVal)" name="Articles Created" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Card title="Topic Clusters" icon={<Network size={18} />} action="View All">
                <ClusterItem name="Medicare Cost Management Strategies" articles={7} done={1} color={V.accent} />
                <ClusterItem name="Medicare Tools & Resources for Seniors" articles={3} done={0} color={V.amber} />
              </Card>
              <Card title="Saved Ideas" icon={<Lightbulb size={18} />}>
                <IdeaItem title="Why Your Medicare Part D Claim Might Get Denied" date="Feb 25, 2026" color={V.rose} />
                <IdeaItem title="Which Medications Are Covered by Medicare Part D?" date="Feb 25, 2026" color={V.accent} />
                <IdeaItem title="How Medicare Part D Lowers Prescription Costs" date="Feb 25, 2026" color={V.green} />
              </Card>
            </div>
          </div>

          {/* ROW 3: Articles + Activity */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
            <Card title="Recent Articles" icon={<FileText size={18} />} action="View All">
              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <ArticleRow title="Medicare Advantage vs Medigap: 2026 Cost Comparison" words="4,077 words" time="24m ago" status="Complete" statusColor={V.green} statusBg={V.greenBg} />
                <ArticleRow title="Does Medicare Cover Dentures? Your 2026 Guide" words="Outline" time="24m ago" status="Outline" statusColor={V.blue} statusBg={V.blueBg} />
                <ArticleRow title="Does Medicare Cover Ozempic? Complete Guide" words="3,245 words" time="4h ago" status="Draft" statusColor={V.amber} statusBg={V.amberBg} />
                <ArticleRow title="Medicare FAQs California: Complete Guide" words="2,890 words" time="6h ago" status="Review" statusColor={V.purple} statusBg={V.purpleBg} />
                <ArticleRow title="Medicare Deductibles 2026: How They Work" words="3,102 words" time="7h ago" status="Complete" statusColor={V.green} statusBg={V.greenBg} />
              </div>
            </Card>

            <Card title="Activity Feed" icon={<Zap size={18} />} action="View All">
              <FeedItem icon={<Check size={14} />} bg={V.greenBg} color={V.green} text={<><strong>Medicare Advantage vs Medigap</strong> was marked as complete</>} time="24 minutes ago" />
              <FeedItem icon={<FilePlus size={14} />} bg={V.blueBg} color={V.blue} text={<><strong>Does Medicare Cover Dentures?</strong> outline was created</>} time="24 minutes ago" />
              <FeedItem icon={<Sparkles size={14} />} bg={V.purpleBg} color={V.purple} text={<><strong>Does Medicare Cover Ozempic?</strong> article was generated using AI</>} time="4 hours ago" />
              <FeedItem icon={<PenLine size={14} />} bg={V.amberBg} color={V.amber} text={<><strong>Medicare FAQs California</strong> moved to review stage</>} time="6 hours ago" />
              <FeedItem icon={<FileText size={14} />} bg={V.cyanBg} color={V.cyan} text={<><strong>Medicare Deductibles 2026</strong> was published</>} time="7 hours ago" />
              <FeedItem icon={<Award size={14} />} bg={V.accentLight} color={V.accent} text={<><strong>Medicare Supplement Plans 2026</strong> content grading completed — Score: 87</>} time="2 days ago" />
              <FeedItem icon={<Network size={14} />} bg={V.roseBg} color={V.rose} text={<><strong>Medicare Cost Management</strong> topic cluster created with 7 articles</>} time="3 days ago" />
            </Card>
          </div>
        </div>
      </div>

      {/* DESIGN LABEL */}
      <div style={{ position: "fixed", bottom: 20, right: 20, background: V.accent, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 20, zIndex: 999, letterSpacing: 0.5, boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}>
        DESIGN 2 — CLEAN STUDIO
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function NavSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: V.textMuted, padding: "0 12px", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function NavItem({ icon, children, active, badge }: { icon: React.ReactNode; children: React.ReactNode; active?: boolean; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, color: active ? V.accent : V.textSecondary, background: active ? V.accentLight : "transparent", cursor: "pointer", fontSize: 14, fontWeight: active ? 700 : 500, marginBottom: 2 }}>
      {icon}
      <span style={{ flex: 1 }}>{children}</span>
      {badge && <span style={{ background: V.bg, color: V.textMuted, fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 8 }}>{badge}</span>}
    </div>
  );
}

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${V.border}`, background: V.white, color: V.textSecondary, position: "relative", cursor: "pointer" }}>
      {children}
    </div>
  );
}

function StatCard({ icon, iconBg, iconColor, value, label, trend, up }: { icon: React.ReactNode; iconBg: string; iconColor: string; value: string; label: string; trend: string; up?: boolean }) {
  return (
    <div style={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor }}>{icon}</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: up ? V.green : V.rose, display: "flex", alignItems: "center", gap: 2 }}>
          {up ? "↗" : "↘"} {trend}
        </span>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, color: V.textMuted, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Card({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 14, padding: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: V.textMuted }}>{icon}</span> {title}
        </div>
        {action && <span style={{ fontSize: 13, color: V.accent, fontWeight: 600, cursor: "pointer" }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function ClusterItem({ name, articles, done, color }: { name: string; articles: number; done: number; color: string }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${V.borderLight}` }}>
      <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: V.textMuted, marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={13} /> {articles} articles</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={13} /> {done} done</span>
      </div>
      <div style={{ height: 4, background: V.bg, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(done / articles) * 100}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function IdeaItem({ title, date, color }: { title: string; date: string; color: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: `1px solid ${V.borderLight}` }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}15`, color, flexShrink: 0 }}>
        <Lightbulb size={16} />
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: 12, color: V.textMuted, marginTop: 2 }}>{date}</div>
      </div>
    </div>
  );
}

function ArticleRow({ title, words, time, status, statusColor, statusBg }: { title: string; words: string; time: string; status: string; statusColor: string; statusBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: `1px solid ${V.borderLight}` }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: V.textMuted }}>{words} · {time}</div>
      </div>
      <span style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: statusBg, color: statusColor }}>{status}</span>
    </div>
  );
}

function FeedItem({ icon, bg, color, text, time }: { icon: React.ReactNode; bg: string; color: string; text: React.ReactNode; time: string }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: `1px solid ${V.borderLight}` }}>
      <div style={{ width: 30, height: 30, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: bg, color, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: V.textSecondary, lineHeight: 1.5 }}>{text}</div>
        <div style={{ fontSize: 12, color: V.textMuted, marginTop: 3 }}>{time}</div>
      </div>
    </div>
  );
}
