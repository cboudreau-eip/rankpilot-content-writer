/*
 * Design 3 — Neo Minimal
 * Bold, high-contrast editorial. Dark sidebar + light content.
 * Space Grotesk + DM Sans, bento grid, teal + violet accents.
 */

import { Link } from "wouter";
import { ArrowLeft, ArrowUp, ArrowDown, FileText, CheckCircle2, PenLine, Type, LayoutDashboard, FolderKanban, CalendarDays, Search, ShieldCheck, Swords, Crosshair, BarChart3, Lightbulb, Sparkles, ListTree, Award, LampDesk, Rocket, Bell, Settings, Network, Plus, Flame } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const chartData = [
  { week: "W1", Articles: 2, Outlines: 4 }, { week: "W2", Articles: 3, Outlines: 5 },
  { week: "W3", Articles: 5, Outlines: 6 }, { week: "W4", Articles: 4, Outlines: 7 },
  { week: "W5", Articles: 6, Outlines: 5 }, { week: "W6", Articles: 3, Outlines: 8 },
  { week: "W7", Articles: 7, Outlines: 6 }, { week: "W8", Articles: 5, Outlines: 7 },
];

const V = {
  sidebarBg: "#18181b", sidebarText: "#a1a1aa", sidebarActive: "#0d9488",
  contentBg: "#fafaf9", white: "#ffffff",
  border: "#e4e4e7", borderDark: "#3f3f46",
  textPrimary: "#18181b", textSecondary: "#52525b", textMuted: "#a1a1aa",
  teal: "#0d9488", tealBg: "rgba(13,148,136,0.08)", tealLight: "#ccfbf1",
  violet: "#7c3aed", violetBg: "rgba(124,58,237,0.08)", violetLight: "#ede9fe",
  green: "#059669", greenBg: "#ecfdf5", amber: "#d97706", amberBg: "#fffbeb",
  blue: "#2563eb", blueBg: "#eff6ff", rose: "#e11d48", roseBg: "#fff1f2",
};

const fontDisplay = "'Space Grotesk', sans-serif";
const fontBody = "'DM Sans', sans-serif";

export default function Design3() {
  return (
    <div style={{ fontFamily: fontBody, background: V.contentBg, color: V.textPrimary, fontSize: 15, lineHeight: 1.6, minHeight: "100vh", display: "flex" }}>
      {/* SIDEBAR */}
      <aside style={{ width: 260, background: V.sidebarBg, display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, zIndex: 100 }}>
        <div style={{ padding: "28px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${V.teal}, #2dd4bf)`, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Rocket size={20} color="#fff" />
          </div>
          <span style={{ fontFamily: fontDisplay, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>RankPilot</span>
        </div>
        <nav style={{ flex: 1, padding: "8px 12px", overflowY: "auto" }}>
          <SideSection title="Overview">
            <SideItem icon={<LayoutDashboard size={20} />} active>Dashboard</SideItem>
            <SideItem icon={<FolderKanban size={20} />} badge="1">Projects</SideItem>
            <SideItem icon={<CalendarDays size={20} />}>Calendar</SideItem>
          </SideSection>
          <SideSection title="SEO">
            <SideItem icon={<Search size={20} />}>Keyword Research</SideItem>
            <SideItem icon={<ShieldCheck size={20} />}>Keyword Auditor</SideItem>
            <SideItem icon={<Swords size={20} />}>Competitor Analyzer</SideItem>
            <SideItem icon={<Crosshair size={20} />}>Position Tracker</SideItem>
            <SideItem icon={<BarChart3 size={20} />}>GSC Analyzer</SideItem>
            <SideItem icon={<Lightbulb size={20} />}>Keyword Insights</SideItem>
            <SideItem icon={<Flame size={20} />}>Thin Content</SideItem>
          </SideSection>
          <SideSection title="Content">
            <SideItem icon={<Sparkles size={20} />}>Generate</SideItem>
            <SideItem icon={<FileText size={20} />} badge="15">Articles</SideItem>
            <SideItem icon={<ListTree size={20} />}>Outlines</SideItem>
            <SideItem icon={<Network size={20} />}>Topic Clusters</SideItem>
            <SideItem icon={<Award size={20} />}>Grade Content</SideItem>
          </SideSection>
          <SideSection title="Planning">
            <SideItem icon={<LampDesk size={20} />}>Ideas</SideItem>
          </SideSection>
        </nav>
        <div style={{ padding: 16, borderTop: `1px solid ${V.borderDark}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${V.teal}, ${V.violet})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14, color: "#fff" }}>CB</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>C. Boudreau</div>
              <div style={{ fontSize: 12, color: V.sidebarText }}>Admin</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{ marginLeft: 260, flex: 1 }}>
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
            <h1 style={{ fontFamily: fontDisplay, fontSize: 28, fontWeight: 700, letterSpacing: -0.5 }}>Dashboard</h1>
            <p style={{ fontSize: 14, color: V.textMuted }}>Medicare FAQ — Project Overview</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: V.contentBg, border: `1px solid ${V.border}`, borderRadius: 10, padding: "9px 16px", color: V.textMuted, fontSize: 14 }}>
              <Search size={16} /> Search... <kbd style={{ marginLeft: 16, background: V.white, border: `1px solid ${V.border}`, borderRadius: 5, padding: "1px 6px", fontSize: 11 }}>⌘K</kbd>
            </div>
            <TopBtn><Bell size={18} /><span style={{ position: "absolute", top: 8, right: 8, width: 8, height: 8, background: V.rose, borderRadius: "50%", border: `2px solid ${V.white}` }} /></TopBtn>
            <TopBtn><Settings size={18} /></TopBtn>
            <button style={{ display: "flex", alignItems: "center", gap: 8, background: V.teal, color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 700, fontFamily: fontDisplay, cursor: "pointer", boxShadow: "0 4px 12px rgba(13,148,136,0.3)" }}>
              <Plus size={18} /> New Article
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div style={{ padding: "28px 36px" }}>
          {/* STATS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 28 }}>
            <NeoStat icon={<FileText size={22} />} iconBg={V.tealBg} iconColor={V.teal} value="15" label="Total Articles" sub="12% this month" up />
            <NeoStat icon={<CheckCircle2 size={22} />} iconBg={V.greenBg} iconColor={V.green} value="8" label="Published" sub="+3 new" up />
            <NeoStat icon={<PenLine size={22} />} iconBg={V.amberBg} iconColor={V.amber} value="5" label="In Progress" sub="-2 from last week" />
            <NeoStat icon={<Type size={22} />} iconBg={V.violetBg} iconColor={V.violet} value="42.3k" label="Total Words" sub="18% growth" up />
          </div>

          {/* ROW 2: Chart + Clusters + Quick Actions */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 28 }}>
            <NeoCard title="Content Production" action="Last 30 days">
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={V.border} />
                    <XAxis dataKey="week" tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: V.textMuted, fontSize: 12 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="Articles" stroke={V.teal} strokeWidth={2.5} dot={{ r: 4, fill: V.teal }} />
                    <Line type="monotone" dataKey="Outlines" stroke={V.violet} strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 4, fill: V.violet }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </NeoCard>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <NeoCard title="Topic Clusters" action="Manage">
                <NeoCluster name="Medicare Cost Management Strategies" articles={7} done={1} color={V.teal} />
                <NeoCluster name="Medicare Tools & Resources for Seniors" articles={3} done={0} color={V.violet} />
              </NeoCard>
              <NeoCard title="Quick Actions">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <QAction icon={<Sparkles size={16} />}>Generate</QAction>
                  <QAction icon={<ListTree size={16} />}>Outline</QAction>
                  <QAction icon={<Search size={16} />}>Research</QAction>
                  <QAction icon={<Network size={16} />}>Cluster</QAction>
                </div>
              </NeoCard>
            </div>
          </div>

          {/* ROW 3: Articles + Rankings */}
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, marginBottom: 28 }}>
            <NeoCard title="Recent Articles" action="View All">
              <NeoArticle num="01" title="Medicare Advantage vs Medigap: 2026 Cost Comparison & Best Fit" meta="4,077 words · 24 minutes ago" status="Complete" statusColor={V.green} statusBg={V.greenBg} />
              <NeoArticle num="02" title="Does Medicare Cover Dentures? Your 2026 Guide" meta="Outline · 24 minutes ago" status="Outline" statusColor={V.blue} statusBg={V.blueBg} />
              <NeoArticle num="03" title="Does Medicare Cover Ozempic? Complete Guide" meta="3,245 words · 4 hours ago" status="Draft" statusColor={V.amber} statusBg={V.amberBg} />
              <NeoArticle num="04" title="Medicare FAQs California: Complete Guide" meta="2,890 words · 6 hours ago" status="Review" statusColor={V.violet} statusBg={V.violetBg} />
              <NeoArticle num="05" title="Medicare Deductibles 2026: How They Work" meta="3,102 words · 7 hours ago" status="Complete" statusColor={V.green} statusBg={V.greenBg} />
              <NeoArticle num="06" title="Medicare Supplement Plans 2026: Coverage Guide" meta="3,540 words · 2 days ago" status="Complete" statusColor={V.green} statusBg={V.greenBg} />
            </NeoCard>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <NeoCard title="Keyword Rankings" action="View All">
                <NeoRank pos={3} keyword="medicare supplement plans 2026" change={4} up />
                <NeoRank pos={7} keyword="medicare deductibles 2026" change={2} up />
                <NeoRank pos={12} keyword="does medicare cover ozempic" change={1} />
                <NeoRank pos={18} keyword="medicare advantage vs medigap" change={6} up />
                <NeoRank pos={24} keyword="medicare part d coverage 2026" change={3} up />
              </NeoCard>
              <NeoCard title="Saved Ideas">
                <NeoIdea title="Why Your Medicare Part D Claim Might Get Denied" date="Feb 25, 2026" />
                <NeoIdea title="Which Medications Are Covered by Medicare Part D?" date="Feb 25, 2026" />
                <NeoIdea title="How Medicare Part D Lowers Prescription Costs" date="Feb 25, 2026" />
              </NeoCard>
            </div>
          </div>
        </div>
      </div>

      {/* DESIGN LABEL */}
      <div style={{ position: "fixed", bottom: 20, right: 20, background: V.teal, color: "#fff", fontSize: 12, fontWeight: 700, padding: "8px 16px", borderRadius: 20, zIndex: 999, letterSpacing: 0.5, fontFamily: fontDisplay, boxShadow: "0 4px 20px rgba(13,148,136,0.4)" }}>
        DESIGN 3 — NEO MINIMAL
      </div>
    </div>
  );
}

/* ---- Sub-components ---- */

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: V.sidebarText, padding: "0 12px", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function SideItem({ icon, children, active, badge }: { icon: React.ReactNode; children: React.ReactNode; active?: boolean; badge?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10, color: active ? "#fff" : V.sidebarText, background: active ? V.teal : "transparent", cursor: "pointer", fontSize: 14, fontWeight: active ? 600 : 500, marginBottom: 2 }}>
      {icon}
      <span style={{ flex: 1 }}>{children}</span>
      {badge && <span style={{ background: V.borderDark, color: V.sidebarText, fontSize: 12, fontWeight: 600, padding: "2px 8px", borderRadius: 8 }}>{badge}</span>}
    </div>
  );
}

function TopBtn({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 10, border: `1px solid ${V.border}`, background: V.white, color: V.textSecondary, position: "relative", cursor: "pointer" }}>
      {children}
    </div>
  );
}

function NeoStat({ icon, iconBg, iconColor, value, label, sub, up }: { icon: React.ReactNode; iconBg: string; iconColor: string; value: string; label: string; sub: string; up?: boolean }) {
  return (
    <div style={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 14, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <div style={{ fontFamily: fontDisplay, fontSize: 34, fontWeight: 700, letterSpacing: -1, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 14, color: V.textMuted, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: up ? V.green : V.rose, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}>
        {up ? "↗" : "↘"} {sub}
      </div>
    </div>
  );
}

function NeoCard({ title, action, children }: { title: string; action?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: V.white, border: `1px solid ${V.border}`, borderRadius: 14, padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ fontFamily: fontDisplay, fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: V.teal }}>✦</span> {title}
        </div>
        {action && <span style={{ fontSize: 13, color: V.textMuted, fontWeight: 600, cursor: "pointer" }}>{action}</span>}
      </div>
      {children}
    </div>
  );
}

function NeoCluster({ name, articles, done, color }: { name: string; articles: number; done: number; color: string }) {
  return (
    <div style={{ padding: "16px 0", borderBottom: `1px solid ${V.border}` }}>
      <div style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 600, marginBottom: 8 }}>{name}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: V.textMuted, marginBottom: 8 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><FileText size={13} /> {articles} articles</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><CheckCircle2 size={13} /> {done} done</span>
      </div>
      <div style={{ height: 4, background: V.contentBg, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${Math.max((done / articles) * 100, 2)}%`, background: color, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function QAction({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", background: V.contentBg, border: `1px solid ${V.border}`, borderRadius: 10, color: V.textSecondary, fontSize: 13, fontWeight: 600, fontFamily: fontDisplay, cursor: "pointer" }}>
      {icon} {children}
    </div>
  );
}

function NeoArticle({ num, title, meta, status, statusColor, statusBg }: { num: string; title: string; meta: string; status: string; statusColor: string; statusBg: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderBottom: `1px solid ${V.border}` }}>
      <span style={{ fontFamily: fontDisplay, fontSize: 16, fontWeight: 700, color: V.textMuted, width: 28 }}>{num}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2, lineHeight: 1.4 }}>{title}</div>
        <div style={{ fontSize: 12, color: V.textMuted }}>{meta}</div>
      </div>
      <span style={{ padding: "4px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: statusBg, color: statusColor, border: `1px solid ${statusColor}20`, whiteSpace: "nowrap" }}>{status}</span>
    </div>
  );
}

function NeoRank({ pos, keyword, change, up }: { pos: number; keyword: string; change: number; up?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: `1px solid ${V.border}` }}>
      <span style={{ fontFamily: fontDisplay, fontSize: 15, fontWeight: 700, color: V.teal, width: 36 }}>#{pos}</span>
      <div style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{keyword}</div>
      <div style={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 3, color: up ? V.green : V.rose }}>
        {up ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {change}
      </div>
    </div>
  );
}

function NeoIdea({ title, date }: { title: string; date: string }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${V.border}` }}>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>{title}</div>
      <div style={{ fontSize: 12, color: V.textMuted, marginTop: 4 }}>{date}</div>
    </div>
  );
}
