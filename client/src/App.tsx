import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Articles from "./pages/Articles";
import ArticleEditor from "./pages/ArticleEditor";
import GenerateArticle from "./pages/GenerateArticle";
import ComingSoon from "./pages/ComingSoon";
import ProjectSettings from "./pages/ProjectSettings";
import GeneralSettings from "./pages/GeneralSettings";
import ThinContent from "./pages/ThinContent";
import GradeContent from "./pages/GradeContent";
import EntityAnalyzer from "./pages/EntityAnalyzer";
import GscAnalyzer from "./pages/GscAnalyzer";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import AdminUsers from "./pages/AdminUsers";

/** Auth guard: redirects to /login if not authenticated */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const { data: user, isLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      navigate("/login");
    }
  }, [isLoading, user, navigate]);

  useEffect(() => {
    if (!isLoading && user && user.mustChangePassword && location !== "/change-password") {
      navigate("/change-password");
    }
  }, [isLoading, user, location, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGuard>
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/articles" component={Articles} />
        <Route path="/articles/:id" component={ArticleEditor} />
        <Route path="/generate" component={GenerateArticle} />
        <Route path="/project-settings" component={ProjectSettings} />
        <Route path="/settings" component={GeneralSettings} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/calendar">{() => <ComingSoon title="Calendar" description="Plan and schedule your content pipeline with a visual calendar." />}</Route>
        <Route path="/keywords">{() => <ComingSoon title="Keyword Research" description="Discover high-value keywords and search opportunities for your content." />}</Route>
        <Route path="/audit">{() => <ComingSoon title="Keyword Auditor" description="Audit your existing keywords for performance and optimization opportunities." />}</Route>
        <Route path="/competitor-analyzer">{() => <ComingSoon title="Competitor Analyzer" description="Analyze competitor content strategies and find gaps to exploit." />}</Route>
        <Route path="/kpt">{() => <ComingSoon title="Position Tracker" description="Track your keyword rankings and monitor position changes over time." />}</Route>
        <Route path="/gsc-analyzer" component={GscAnalyzer} />
        <Route path="/seo-intelligence">{() => <ComingSoon title="Keyword Insights" description="AI-powered keyword clustering and strategic intelligence." />}</Route>
        <Route path="/thin-content" component={ThinContent} />
        <Route path="/outlines">{() => <ComingSoon title="Outlines" description="Create and manage structured article outlines before writing." />}</Route>
        <Route path="/clusters">{() => <ComingSoon title="Topic Clusters" description="Organize your content into strategic topic clusters for better SEO." />}</Route>
        <Route path="/grade" component={GradeContent} />
        <Route path="/entity-analyzer" component={EntityAnalyzer} />
        <Route path="/ideas">{() => <ComingSoon title="Ideas" description="Capture and organize content ideas for future articles." />}</Route>
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
    </AuthGuard>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Public routes — no auth guard */}
            <Route path="/login" component={Login} />
            <Route path="/change-password" component={ChangePassword} />
            {/* All other routes require authentication */}
            <Route component={AppRoutes} />
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
