import { useActiveProject } from "@/components/AppLayout";
import { SchedulerTab } from "./ContentScheduler";
import { Timer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function ProjectScheduler() {
  const { activeProject } = useActiveProject();

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Dashboard</span>
            </button>
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Timer className="w-5 h-5 text-indigo-500" />
          <h1 className="text-2xl font-extrabold tracking-tight">Content Scheduler</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {activeProject
            ? `Automated article generation for ${activeProject.name}`
            : "Select a project to manage scheduled content jobs."}
        </p>
      </div>

      {activeProject ? (
        <SchedulerTab projectId={activeProject.id} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Timer className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Project Selected</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Select a project from the sidebar to view and manage its scheduled content jobs.
          </p>
        </div>
      )}
    </div>
  );
}
