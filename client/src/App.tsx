import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function AppRoutes() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/projects" component={Projects} />
        <Route path="/articles" component={Articles} />
        <Route path="/articles/:id" component={ArticleEditor} />
        <Route path="/generate" component={GenerateArticle} />
        <Route path="/calendar">{() => <ComingSoon title="Calendar" description="Plan and schedule your content pipeline with a visual calendar." />}</Route>
        <Route path="/keywords">{() => <ComingSoon title="Keyword Research" description="Discover high-value keywords and search opportunities for your content." />}</Route>
        <Route path="/audit">{() => <ComingSoon title="Keyword Auditor" description="Audit your existing keywords for performance and optimization opportunities." />}</Route>
        <Route path="/competitor-analyzer">{() => <ComingSoon title="Competitor Analyzer" description="Analyze competitor content strategies and find gaps to exploit." />}</Route>
        <Route path="/kpt">{() => <ComingSoon title="Position Tracker" description="Track your keyword rankings and monitor position changes over time." />}</Route>
        <Route path="/gsc-analyzer">{() => <ComingSoon title="GSC Analyzer" description="Deep analysis of your Google Search Console data for actionable insights." />}</Route>
        <Route path="/seo-intelligence">{() => <ComingSoon title="Keyword Insights" description="AI-powered keyword clustering and strategic intelligence." />}</Route>
        <Route path="/thin-content">{() => <ComingSoon title="Thin Content" description="Identify and improve underperforming pages on your site." />}</Route>
        <Route path="/outlines">{() => <ComingSoon title="Outlines" description="Create and manage structured article outlines before writing." />}</Route>
        <Route path="/clusters">{() => <ComingSoon title="Topic Clusters" description="Organize your content into strategic topic clusters for better SEO." />}</Route>
        <Route path="/grade">{() => <ComingSoon title="Grade Content" description="AI-powered content grading for E-E-A-T, accuracy, and readability." />}</Route>
        <Route path="/ideas">{() => <ComingSoon title="Ideas" description="Capture and organize content ideas for future articles." />}</Route>
        <Route path="/settings" component={ProjectSettings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppRoutes />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
