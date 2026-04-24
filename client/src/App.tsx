import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, Redirect } from "wouter";
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
import ProjectScheduler from "./pages/ProjectScheduler";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import KeywordResearch from "./pages/KeywordResearch";
import ProjectKeywords from "./pages/ProjectKeywords";
import ChangePassword from "./pages/ChangePassword";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";

/** Auth guard — redirects to /login if not authenticated */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  // Force change password on first login
  if (user.mustChangePassword && location !== "/change-password") {
    return <Redirect to="/change-password" />;
  }

  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Switch>
            {/* Public routes — no auth required */}
            <Route path="/login" component={Login} />
            <Route path="/change-password">
              {() => (
                <AuthGuard>
                  <ChangePassword />
                </AuthGuard>
              )}
            </Route>

            {/* Protected routes — auth required */}
            <Route>
              {() => (
                <AuthGuard>
                  <AppLayout>
                    <Switch>
                      <Route path="/" component={Dashboard} />
                      <Route path="/projects" component={Projects} />
                      <Route path="/articles" component={Articles} />
                      <Route path="/articles/:id" component={ArticleEditor} />
                      <Route path="/generate" component={GenerateArticle} />
                      <Route path="/project-settings" component={ProjectSettings} />
                      <Route path="/project-scheduler" component={ProjectScheduler} />
                      <Route path="/settings" component={GeneralSettings} />
                      <Route path="/admin/users" component={AdminUsers} />
                      <Route path="/calendar">{() => <ComingSoon title="Calendar" description="Plan and schedule your content pipeline with a visual calendar." />}</Route>
                      <Route path="/keywords" component={KeywordResearch} />
                      <Route path="/project-keywords" component={ProjectKeywords} />
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
              )}
            </Route>
          </Switch>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
