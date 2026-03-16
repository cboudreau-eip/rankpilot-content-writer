import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Design1 from "./pages/Design1";
import Design2 from "./pages/Design2";
import Design3 from "./pages/Design3";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/design-1" component={Design1} />
      <Route path="/design-2" component={Design2} />
      <Route path="/design-3" component={Design3} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
