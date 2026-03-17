import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Search,
  ShieldCheck,
  Swords,
  Crosshair,
  BarChart3,
  Lightbulb,
  Flame,
  Sparkles,
  FileText,
  ListTree,
  Network,
  Award,
  LampDesk,
  Rocket,
  Bell,
  Settings,
  Plus,
  MoreHorizontal,
  LogOut,
  ChevronDown,
  PanelLeft,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { useState, useEffect, createContext, useContext } from "react";
import type { Project } from "../../../drizzle/schema";

// ---- Active Project Context ----
interface ProjectContextType {
  activeProject: Project | null;
  setActiveProjectId: (id: number | null) => void;
  projects: Project[];
  isLoading: boolean;
}

const ProjectContext = createContext<ProjectContextType>({
  activeProject: null,
  setActiveProjectId: () => {},
  projects: [],
  isLoading: true,
});

export function useActiveProject() {
  return useContext(ProjectContext);
}

// ---- Nav Config ----
const navSections = [
  {
    title: "Main",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/" },
      { icon: FolderKanban, label: "Projects", path: "/projects" },
      { icon: CalendarDays, label: "Calendar", path: "/calendar" },
    ],
  },
  {
    title: "SEO Tools",
    items: [
      { icon: Search, label: "Keyword Research", path: "/keywords" },
      { icon: ShieldCheck, label: "Keyword Auditor", path: "/audit" },
      { icon: Swords, label: "Competitor Analyzer", path: "/competitor-analyzer" },
      { icon: Crosshair, label: "Position Tracker", path: "/kpt" },
      { icon: BarChart3, label: "GSC Analyzer", path: "/gsc-analyzer" },
      { icon: Lightbulb, label: "Keyword Insights", path: "/seo-intelligence" },
      { icon: Flame, label: "Thin Content", path: "/thin-content" },
    ],
  },
  {
    title: "Content",
    items: [
      { icon: Sparkles, label: "Generate", path: "/generate" },
      { icon: FileText, label: "Articles", path: "/articles" },
      { icon: ListTree, label: "Outlines", path: "/outlines" },
      { icon: Network, label: "Topic Clusters", path: "/clusters" },
      { icon: Award, label: "Grade Content", path: "/grade" },
    ],
  },
  {
    title: "Planning",
    items: [
      { icon: LampDesk, label: "Ideas", path: "/ideas" },
    ],
  },
];

// ---- Main Layout ----
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Active project state persisted in localStorage
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem("rankpilot-active-project");
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: projectsList = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(
    undefined,
    { enabled: !!user }
  );

  // Auto-select first project if none selected
  useEffect(() => {
    if (!activeProjectId && projectsList.length > 0) {
      setActiveProjectId(projectsList[0].id);
    }
  }, [projectsList, activeProjectId]);

  // Persist active project
  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem("rankpilot-active-project", activeProjectId.toString());
    } else {
      localStorage.removeItem("rankpilot-active-project");
    }
  }, [activeProjectId]);

  const activeProject = projectsList.find(p => p.id === activeProjectId) ?? null;

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-lg">
            <Rocket className="w-8 h-8 text-white" />
          </div>
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-center">RankPilot</h1>
            <p className="text-base text-muted-foreground text-center max-w-sm">
              Sign in to access your SEO content toolkit.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all text-base font-bold"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProjectId, projects: projectsList, isLoading: projectsLoading }}>
      <div className="flex min-h-screen bg-background">
        {/* SIDEBAR */}
        <aside
          className={`fixed top-0 left-0 bottom-0 z-50 bg-card border-r border-sidebar-border flex flex-col transition-all duration-200 ${sidebarCollapsed ? "w-[68px]" : "w-[270px]"}`}
        >
          {/* Logo */}
          <div className={`flex items-center gap-3 px-5 py-6 ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md shrink-0">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-xl font-extrabold tracking-tight text-foreground">RankPilot</span>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 pb-4">
            {navSections.map((section) => (
              <NavSection key={section.title} title={section.title} collapsed={sidebarCollapsed}>
                {section.items.map((item) => (
                  <NavItem
                    key={item.path}
                    icon={item.icon}
                    label={item.label}
                    path={item.path}
                    collapsed={sidebarCollapsed}
                  />
                ))}
              </NavSection>
            ))}
          </nav>

          {/* User Footer */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-500 text-white">
                      {user?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-none">{user?.name || "User"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{user?.role === "admin" ? "Admin" : "Member"}</p>
                    </div>
                  )}
                  {!sidebarCollapsed && <MoreHorizontal className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => window.location.href = "/settings"} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => { /* logout handled by useAuth */ }}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* MAIN CONTENT */}
        <div className={`flex-1 transition-all duration-200 ${sidebarCollapsed ? "ml-[68px]" : "ml-[270px]"}`}>
          {/* TOP BAR */}
          <header className="sticky top-0 z-40 flex items-center justify-between px-8 py-4 bg-card/80 backdrop-blur-md border-b border-border">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-9 w-9 flex items-center justify-center hover:bg-accent rounded-lg transition-colors"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>

              {/* Project Selector */}
              {projectsList.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-accent/50 transition-colors text-sm font-semibold focus:outline-none">
                      {activeProject && (
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: activeProject.color }} />
                      )}
                      <span className="truncate max-w-[180px]">{activeProject?.name ?? "Select Project"}</span>
                      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {projectsList.map((p) => (
                      <DropdownMenuItem
                        key={p.id}
                        onClick={() => setActiveProjectId(p.id)}
                        className="cursor-pointer"
                      >
                        <span className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ background: p.color }} />
                        <span className="truncate">{p.name}</span>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = "/projects"} className="cursor-pointer">
                      <FolderKanban className="mr-2 h-4 w-4" />
                      <span>Manage Projects</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-4 py-2 text-muted-foreground text-sm min-w-[200px]">
                <Search className="w-4 h-4" />
                <span>Search anything...</span>
                <kbd className="ml-auto bg-card border border-border rounded px-1.5 py-0.5 text-[11px] font-mono">⌘K</kbd>
              </div>

              {/* Notifications */}
              <button className="relative h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
                <Bell className="w-[18px] h-[18px] text-muted-foreground" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full border-2 border-card" />
              </button>

              {/* Settings */}
              <Link href="/settings">
                <button className="h-10 w-10 flex items-center justify-center rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
                  <Settings className="w-[18px] h-[18px] text-muted-foreground" />
                </button>
              </Link>

              {/* New Article */}
              <Button className="gap-2 rounded-xl font-bold shadow-md px-5">
                <Plus className="w-[18px] h-[18px]" />
                New Article
              </Button>
            </div>
          </header>

          {/* PAGE CONTENT */}
          <main className="p-8">
            {children}
          </main>
        </div>
      </div>
    </ProjectContext.Provider>
  );
}

// ---- Sub-components ----

function NavSection({ title, collapsed, children }: { title: string; collapsed: boolean; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      {!collapsed && (
        <div className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground px-3 mb-2">
          {title}
        </div>
      )}
      <div className="flex flex-col gap-0.5">
        {children}
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, path, collapsed }: { icon: React.ComponentType<{ className?: string }>; label: string; path: string; collapsed: boolean }) {
  const [location] = useLocation();
  const isActive = location === path || (path !== "/" && location.startsWith(path));

  return (
    <Link href={path}>
      <div
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
          isActive
            ? "bg-accent text-accent-foreground font-bold"
            : "text-sidebar-foreground hover:bg-accent/50"
        } ${collapsed ? "justify-center px-0" : ""}`}
        title={collapsed ? label : undefined}
      >
        <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-primary" : ""}`} />
        {!collapsed && <span>{label}</span>}
      </div>
    </Link>
  );
}
