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
import { Users } from "lucide-react";
import {
  LayoutDashboard,
  FolderKanban,
  CalendarDays,
  Search,

  BarChart3,

  Flame,
  Sparkles,
  FileText,
  ListTree,
  Network,
  Award,
  LampDesk,
  Rocket,
  Zap,
  Bell,
  Settings,
  MoreHorizontal,
  LogOut,
  ChevronDown,
  PanelLeft,
  Sun,
  Moon,
  Monitor,
  KeyRound,
  PenLine,
  Shield,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useLocation, Link } from "wouter";
import { useState, useEffect, createContext, useContext, useCallback } from "react";
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
      { icon: KeyRound, label: "Project Keywords", path: "/project-keywords" },

      { icon: BarChart3, label: "GSC Analyzer", path: "/gsc-analyzer" },

      { icon: Flame, label: "Thin Content", path: "/thin-content" },
    ],
  },
  {
    title: "Content",
    items: [
      { icon: Sparkles, label: "Generate", path: "/generate" },
      { icon: PenLine, label: "Free Writer", path: "/write" },
      { icon: FileText, label: "Articles", path: "/articles" },
      { icon: ListTree, label: "Outlines", path: "/outlines" },
      { icon: Network, label: "Topic Clusters", path: "/clusters" },
      { icon: Award, label: "Grade Content", path: "/grade" },
      { icon: Shield, label: "AI Readiness Audit", path: "/ai-readiness" },
      { icon: Search, label: "Entity Analyzer", path: "/entity-analyzer" },
    ],
  },
  {
    title: "Planning",
    items: [
      { icon: LampDesk, label: "Ideas", path: "/ideas" },
    ],
  },
  {
    title: "Automation",
    items: [
      { icon: Zap, label: "Content Engine", path: "/engine" },
    ],
  },
];

// ---- Main Layout ----
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const utils = trpc.useUtils();
  const { data: currentUser } = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
      window.location.href = "/login";
    },
  });
  const handleLogout = useCallback(() => logoutMutation.mutate(), [logoutMutation]);

  // Theme toggle
  const { theme, setTheme } = useTheme();
  const setThemeMutation = trpc.auth.setTheme.useMutation();
  const handleThemeChange = useCallback((newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme);
    setThemeMutation.mutate({ theme: newTheme });
  }, [setTheme, setThemeMutation]);

  // Load theme from server on first load
  const { data: serverTheme } = trpc.auth.getTheme.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  useEffect(() => {
    if (serverTheme?.theme) {
      setTheme(serverTheme.theme);
    }
  }, [serverTheme]);

  // Active project state persisted in localStorage
  const [activeProjectId, setActiveProjectId] = useState<number | null>(() => {
    const saved = localStorage.getItem("rankpilot-active-project");
    return saved ? parseInt(saved, 10) : null;
  });

  const { data: projectsList = [], isLoading: projectsLoading } = trpc.projects.list.useQuery(undefined);

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



  return (
    <ProjectContext.Provider value={{ activeProject, setActiveProjectId, projects: projectsList, isLoading: projectsLoading }}>
      <div className="flex min-h-screen bg-background">
        {/* SIDEBAR */}
        <aside
          className={`fixed top-0 left-0 bottom-0 z-50 bg-card border-r border-sidebar-border flex flex-col transition-all duration-200 ${sidebarCollapsed ? "w-[68px]" : "w-[205px]"}`}
        >
          {/* Logo */}
          <Link href="/" className={`flex items-center gap-3 px-5 py-6 cursor-pointer hover:opacity-80 transition-opacity no-underline ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center shadow-md shrink-0">
              <Rocket className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && (
              <span className="text-xl font-extrabold tracking-tight text-foreground">RankPilot</span>
            )}
          </Link>

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

          {/* Theme Toggle */}
          <div className={`border-t border-sidebar-border px-3 py-2 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
            {sidebarCollapsed ? (
              <button
                onClick={() => handleThemeChange(theme === "light" ? "dark" : "light")}
                className="h-9 w-9 flex items-center justify-center rounded-xl hover:bg-accent/50 transition-colors"
                title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 text-muted-foreground" /> : <Moon className="w-4 h-4 text-muted-foreground" />}
              </button>
            ) : (
              <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/50">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                    theme === "light" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Light mode"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                    theme === "dark" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Dark mode"
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark</span>
                </button>
                <button
                  onClick={() => handleThemeChange("system")}
                  className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                    theme === "system" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="System preference"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Auto</span>
                </button>
              </div>
            )}
          </div>

          {/* User Footer */}
          <div className="border-t border-sidebar-border p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/50 transition-colors w-full text-left focus:outline-none ${sidebarCollapsed ? "justify-center px-0" : ""}`}>
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-bold bg-gradient-to-br from-primary to-purple-500 text-white">
                      {currentUser?.name?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate leading-none">{currentUser?.name ?? "User"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-1">{currentUser?.role === "admin" ? "Admin" : "Member"}</p>
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
                {currentUser?.role === "admin" && (
                  <DropdownMenuItem onClick={() => window.location.href = "/admin/users"} className="cursor-pointer">
                    <Users className="mr-2 h-4 w-4" />
                    <span>User Management</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
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
        <div className={`flex-1 transition-all duration-200 ${sidebarCollapsed ? "ml-[68px]" : "ml-[205px]"}`}>
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
