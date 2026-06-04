import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Download,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  FileText,
  Zap,
  ListOrdered,
  Sparkles,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ArrowRight,
  Settings2,
  History,
  Pencil,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Inbox,
  Eye,
  BookOpen,
  Hash,
  Link2,
  Target,
  Tags,
  RotateCcw,
  Send,
  Calendar,
  Activity,
  ExternalLink,
  RefreshCw,
  Timer,
  X,
} from "lucide-react";

// ============================================================
// HELPERS
// ============================================================

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getEtOffset(): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const etHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })
  );
  return (utcHour - etHour + 24) % 24;
}

function etHourToUtc(etHour: number): number {
  return (etHour + getEtOffset()) % 24;
}

function utcHourToEt(utcHour: number): number {
  return (utcHour - getEtOffset() + 24) % 24;
}

function formatEtHour(etHour: number): string {
  const period = etHour < 12 ? "AM" : "PM";
  const h = etHour % 12 === 0 ? 12 : etHour % 12;
  return `${h}:00 ${period} ET`;
}

const ET_HOURS = Array.from({ length: 24 }, (_, i) => i);

function formatNextRun(date: Date | string | null): string {
  if (!date) return "Not scheduled";
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  if (diff < 0) return "Overdue";
  if (diff < 3600000) return `In ${Math.round(diff / 60000)} min`;
  if (diff < 86400000) return `In ${Math.round(diff / 3600000)} hours`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });
}

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

type PipelineStatus = "pending" | "generating_outline" | "generating_article" | "pending_approval" | "approved" | "sent_to_scheduler" | "rejected" | "failed";

const statusConfig: Record<PipelineStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Processing", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Clock className="w-3.5 h-3.5" /> },
  generating_outline: { label: "Generating Brief", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  generating_article: { label: "Generating", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  pending_approval: { label: "Awaiting Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Eye className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  sent_to_scheduler: { label: "Sent to Scheduler", color: "bg-purple-100 text-purple-700 border-purple-200", icon: <Calendar className="w-3.5 h-3.5" /> },
  rejected: { label: "Rejected", color: "bg-red-100 text-red-700 border-red-200", icon: <XCircle className="w-3.5 h-3.5" /> },
  failed: { label: "Failed", color: "bg-red-100 text-red-700 border-red-200", icon: <AlertCircle className="w-3.5 h-3.5" /> },
};

function StatusBadge({ status }: { status: PipelineStatus }) {
  const config = statusConfig[status] || statusConfig.pending;
  return (
    <Badge variant="outline" className={`${config.color} gap-1.5 font-medium`}>
      {config.icon}
      {config.label}
    </Badge>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ContentEngine() {
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState("intake");

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No Project Selected</h3>
          <p className="text-muted-foreground text-sm mt-1">Select a project from the sidebar to use the Content Engine.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Engine</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your automated content pipeline — from ideas to published drafts.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 max-w-2xl">
          <TabsTrigger value="intake" className="gap-1.5">
            <Download className="w-4 h-4" />
            Intake
          </TabsTrigger>
          <TabsTrigger value="review" className="gap-1.5">
            <Eye className="w-4 h-4" />
            Review
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <ListOrdered className="w-4 h-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="schedule" className="gap-1.5">
            <Timer className="w-4 h-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="output" className="gap-1.5">
            <FileText className="w-4 h-4" />
            Output
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intake" className="mt-6">
          <IntakeTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="review" className="mt-6">
          <ReviewTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="queue" className="mt-6">
          <QueueTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="schedule" className="mt-6">
          <ScheduleTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="output" className="mt-6">
          <OutputTab projectId={activeProject.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// INTAKE TAB — S3 Polling + Pipeline Settings
// ============================================================

function IntakeTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.pipeline.getSettings.useQuery({ projectId });
  const { data: jobs } = trpc.pipeline.getJobs.useQuery({ projectId });

  const [bucketUrl, setBucketUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [initialized, setInitialized] = useState(false);

  if (settings && !initialized) {
    setBucketUrl(settings.bucketUrl || "marketing-manus-scraper");
    setEnabled(settings.enabled === 1);
    setInitialized(true);
  }

  const saveMutation = trpc.pipeline.saveSettings.useMutation({
    onSuccess: () => {
      toast.success("Pipeline settings saved.");
      utils.pipeline.getSettings.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const pollMutation = trpc.pipeline.runPoll.useMutation({
    onSuccess: (result) => {
      toast.success(`Poll complete: ${result.ingested} ingested, ${result.skipped} skipped, ${result.errors} errors`);
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getBriefs.invalidate();
    },
    onError: (err: any) => toast.error(`Poll failed: ${err.message}`),
  });

  const recentJobs = jobs?.slice(0, 5) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Poll Now */}
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-600" />
            Ingest New Content
          </CardTitle>
          <CardDescription>
            Fetch new files from your S3 bucket and generate AI briefs for each article idea found.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={() => pollMutation.mutate({ projectId })}
            disabled={pollMutation.isPending}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {pollMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Polling & Generating Briefs...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Run Poll Now
              </>
            )}
          </Button>
          {pollMutation.data && (
            <p className="text-sm text-muted-foreground mt-3">
              Last poll: {pollMutation.data.ingested} ingested, {pollMutation.data.skipped} already processed, {pollMutation.data.errors} errors (of {pollMutation.data.total} total files)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Recent Intake Activity */}
      {recentJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              Recent Intake
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-medium text-sm truncate">{job.title || job.filename}</span>
                    {job.sourceUrl && (
                      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={job.status} />
                    <span className="text-xs text-muted-foreground">{formatDate(job.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* How it Works */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-sm">How the Content Engine Works</h4>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1.5 list-decimal list-inside">
                <li><strong>Intake:</strong> Poll your S3 bucket for new article ideas (this tab)</li>
                <li><strong>Review:</strong> AI generates briefs — you approve, edit, or reject them</li>
                <li><strong>Queue:</strong> Approved keywords enter the ordered queue</li>
                <li><strong>Schedule:</strong> Jobs run on your configured schedule, picking from the queue</li>
                <li><strong>Output:</strong> Generated articles are pushed to your CMS as drafts</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* S3 Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Source Configuration</CardTitle>
          <CardDescription>Configure the S3 bucket source for content ideas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bucketUrl">S3 Bucket Name</Label>
            <Input
              id="bucketUrl"
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              placeholder="marketing-manus-scraper"
            />
            <p className="text-xs text-muted-foreground">
              The name of the S3 bucket to poll. Files are read from the <code className="bg-muted px-1 rounded">incoming/</code> prefix.
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Pipeline Enabled</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Enable or disable the content pipeline</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <Button
            onClick={() => {
              saveMutation.mutate({
                projectId,
                bucketUrl: bucketUrl || undefined,
                enabled: enabled ? 1 : 0,
              });
            }}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// REVIEW TAB — Brief Review with Approve/Reject/Edit
// ============================================================

function ReviewTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: briefs, isLoading } = trpc.pipeline.getBriefs.useQuery({ projectId, status: "pending_review" });
  const { data: scheduledJobs } = trpc.pipeline.getScheduledJobs.useQuery({ projectId });
  const [editingBriefId, setEditingBriefId] = useState<number | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveBriefId, setApproveBriefId] = useState<number | null>(null);
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [selectedBriefs, setSelectedBriefs] = useState<Set<number>>(new Set());
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string>("");

  const approveMutation = trpc.pipeline.approveBrief.useMutation({
    onSuccess: () => {
      toast.success("Brief approved and sent to keyword queue.");
      setApproveDialogOpen(false);
      setApproveBriefId(null);
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkApproveMutation = trpc.pipeline.bulkApproveBriefs.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.approved} brief${result.approved !== 1 ? "s" : ""} approved.`);
      setBulkApproveDialogOpen(false);
      setSelectedBriefs(new Set());
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = trpc.pipeline.rejectBrief.useMutation({
    onSuccess: () => {
      toast.success("Brief rejected.");
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkDeleteMutation = trpc.pipeline.bulkDeleteJobs.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.deleted} brief${result.deleted !== 1 ? "s" : ""} deleted.`);
      setBulkDeleteDialogOpen(false);
      setSelectedBriefs(new Set());
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const regenerateMutation = trpc.pipeline.regenerateBrief.useMutation({
    onSuccess: () => {
      toast.success("Brief is being regenerated...");
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleBriefSelection = (briefId: number) => {
    setSelectedBriefs(prev => {
      const next = new Set(prev);
      if (next.has(briefId)) next.delete(briefId);
      else next.add(briefId);
      return next;
    });
  };

  const selectAll = () => {
    if (!briefs) return;
    if (selectedBriefs.size === briefs.length) {
      setSelectedBriefs(new Set());
    } else {
      setSelectedBriefs(new Set(briefs.map((b: any) => b.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const queueModeJobs = scheduledJobs?.filter((j: any) => j.keywordSource === "queue") || [];
  const hasPendingBriefs = briefs && briefs.length > 0;

  return (
    <div className="space-y-6">
      {hasPendingBriefs ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">{briefs!.length} brief{briefs!.length !== 1 ? "s" : ""} awaiting review</p>
              {selectedBriefs.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {selectedBriefs.size} selected
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                {selectedBriefs.size === briefs!.length ? "Deselect All" : "Select All"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Delete All
              </Button>
              {selectedBriefs.size > 0 && (
                <Button
                  size="sm"
                  onClick={() => setBulkApproveDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1.5" />
                  Approve {selectedBriefs.size} Briefs
                </Button>
              )}
            </div>
          </div>

          {briefs!.map((brief: any) => (
            <BriefCard
              key={brief.id}
              brief={brief}
              isSelected={selectedBriefs.has(brief.id)}
              isEditing={editingBriefId === brief.id}
              onToggleSelect={() => toggleBriefSelection(brief.id)}
              onEdit={() => setEditingBriefId(editingBriefId === brief.id ? null : brief.id)}
              onApprove={() => {
                setApproveBriefId(brief.id);
                setApproveDialogOpen(true);
              }}
              onReject={() => rejectMutation.mutate({ briefId: brief.id })}
              onRegenerate={() => regenerateMutation.mutate({ jobId: brief.pipelineJobId, projectId })}
              projectId={projectId}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No Briefs to Review</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              Run a poll from the Intake tab to ingest content from your S3 bucket. The AI will generate briefs for each article.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approve Dialog (single) */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Approve Brief
            </DialogTitle>
            <DialogDescription>
              Choose which Scheduled Job to send this keyword to.
            </DialogDescription>
          </DialogHeader>

          {queueModeJobs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No Scheduled Jobs with "Keyword Queue" source found.</p>
              <p className="text-xs mt-1">Create one in the Schedule tab first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Send to Scheduled Job</Label>
                <Select value={selectedScheduledJobId} onValueChange={setSelectedScheduledJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scheduled job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {queueModeJobs.map((sj: any) => (
                      <SelectItem key={sj.id} value={String(sj.id)}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{sj.name}</span>
                          <Badge variant="secondary" className="text-xs ml-1">{sj.frequency}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (approveBriefId && selectedScheduledJobId) {
                  approveMutation.mutate({
                    briefId: approveBriefId,
                    scheduledJobId: parseInt(selectedScheduledJobId),
                  });
                }
              }}
              disabled={!selectedScheduledJobId || approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Approve & Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Delete All Briefs
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all {briefs?.length ?? 0} briefs awaiting review and their associated pipeline jobs. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!briefs) return;
                const jobIds = briefs.map((b: any) => b.pipelineJobId);
                bulkDeleteMutation.mutate({ jobIds });
              }}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete All Briefs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Approve Dialog */}
      <Dialog open={bulkApproveDialogOpen} onOpenChange={setBulkApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Approve {selectedBriefs.size} Briefs
            </DialogTitle>
            <DialogDescription>
              All selected briefs will be approved and their keywords sent to the chosen Scheduled Job.
            </DialogDescription>
          </DialogHeader>

          {queueModeJobs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No Scheduled Jobs with "Keyword Queue" source found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Send to Scheduled Job</Label>
                <Select value={selectedScheduledJobId} onValueChange={setSelectedScheduledJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a scheduled job..." />
                  </SelectTrigger>
                  <SelectContent>
                    {queueModeJobs.map((sj: any) => (
                      <SelectItem key={sj.id} value={String(sj.id)}>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{sj.name}</span>
                          <Badge variant="secondary" className="text-xs ml-1">{sj.frequency}</Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkApproveDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedScheduledJobId) {
                  bulkApproveMutation.mutate({
                    briefIds: Array.from(selectedBriefs),
                    scheduledJobId: parseInt(selectedScheduledJobId),
                  });
                }
              }}
              disabled={!selectedScheduledJobId || bulkApproveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {bulkApproveMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// BRIEF CARD — Editable brief with approve/reject/edit actions
// ============================================================

function BriefCard({
  brief,
  isSelected,
  isEditing,
  onToggleSelect,
  onEdit,
  onApprove,
  onReject,
  onRegenerate,
  projectId,
}: {
  brief: any;
  isSelected: boolean;
  isEditing: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  projectId: number;
}) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(brief.title);
  const [primaryKeyword, setPrimaryKeyword] = useState(brief.primaryKeyword);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>(brief.secondaryKeywords || []);
  const [description, setDescription] = useState(brief.description);
  const [suggestedLinkCount, setSuggestedLinkCount] = useState(brief.suggestedLinkCount);
  const [suggestedWordCount, setSuggestedWordCount] = useState(brief.suggestedWordCount);
  const [newKeyword, setNewKeyword] = useState("");

  const updateMutation = trpc.pipeline.updateBrief.useMutation({
    onSuccess: () => {
      toast.success("Brief updated.");
      utils.pipeline.getBriefs.invalidate();
      onEdit();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const saveEdits = () => {
    updateMutation.mutate({
      briefId: brief.id,
      title,
      primaryKeyword,
      secondaryKeywords,
      description,
      suggestedLinkCount,
      suggestedWordCount,
    });
  };

  const addSecondaryKeyword = () => {
    if (newKeyword.trim() && !secondaryKeywords.includes(newKeyword.trim())) {
      setSecondaryKeywords([...secondaryKeywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeSecondaryKeyword = (kw: string) => {
    setSecondaryKeywords(secondaryKeywords.filter((k: string) => k !== kw));
  };

  return (
    <Card className={`transition-all ${isSelected ? "ring-2 ring-green-300 border-green-200" : ""} ${isEditing ? "shadow-lg" : "hover:shadow-md"}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">AI-Generated Brief</span>
              {brief.editedFields && brief.editedFields.length > 0 && (
                <Badge variant="secondary" className="text-xs">Edited</Badge>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Target className="w-3.5 h-3.5" />
                    Title
                  </Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <Hash className="w-3.5 h-3.5" />
                      Primary Keyword
                    </Label>
                    <Input value={primaryKeyword} onChange={(e) => setPrimaryKeyword(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Link2 className="w-3.5 h-3.5" />
                        Links
                      </Label>
                      <Input
                        type="number"
                        value={suggestedLinkCount}
                        onChange={(e) => setSuggestedLinkCount(parseInt(e.target.value) || 0)}
                        min={0}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5" />
                        Words
                      </Label>
                      <Input
                        type="number"
                        value={suggestedWordCount}
                        onChange={(e) => setSuggestedWordCount(parseInt(e.target.value) || 0)}
                        min={100}
                        step={100}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Tags className="w-3.5 h-3.5" />
                    Secondary Keywords
                  </Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {secondaryKeywords.map((kw: string) => (
                      <Badge key={kw} variant="secondary" className="gap-1 pr-1">
                        {kw}
                        <button onClick={() => removeSecondaryKeyword(kw)} className="ml-1 hover:text-red-600 transition-colors">
                          <XCircle className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Add keyword..."
                      className="flex-1"
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSecondaryKeyword(); } }}
                    />
                    <Button variant="outline" size="sm" onClick={addSecondaryKeyword}>Add</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <FileText className="w-3.5 h-3.5" />
                    Description / Main Idea
                  </Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={saveEdits} disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                    Save Changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={onEdit}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h4 className="font-semibold text-base">{brief.title}</h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-sm"><span className="text-muted-foreground">Keyword:</span> <span className="font-medium">{brief.primaryKeyword}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-sm"><span className="text-muted-foreground">Links:</span> <span className="font-medium">{brief.suggestedLinkCount}</span></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="text-sm"><span className="text-muted-foreground">Words:</span> <span className="font-medium">{brief.suggestedWordCount?.toLocaleString()}</span></span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Tags className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Secondary Keywords</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(brief.secondaryKeywords || []).map((kw: string) => (
                      <Badge key={kw} variant="secondary" className="text-xs">{kw}</Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Description</span>
                  </div>
                  <p className="text-sm text-foreground/80 leading-relaxed">{brief.description}</p>
                </div>

                <p className="text-xs text-muted-foreground">
                  Generated: {formatDate(brief.createdAt)}
                </p>
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button size="sm" onClick={onApprove} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={onRegenerate}>
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Regenerate
              </Button>
              <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={onReject}>
                <XCircle className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// QUEUE TAB — Shows all keyword queues across jobs with drag-and-drop
// ============================================================

function QueueTab({ projectId }: { projectId: number }) {
  const { data: jobs, isLoading } = trpc.scheduler.listJobs.useQuery({ projectId });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const queueJobs = jobs?.filter((j) => j.keywordSource === "queue") ?? [];

  if (queueJobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <ListOrdered className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No Keyword Queues</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
            Create a scheduled job with "Keyword Queue" source in the Schedule tab to start managing your queue.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {queueJobs.map((job) => (
        <div key={job.id}>
          <div className="flex items-center gap-2 mb-4">
            <ListOrdered className="w-4 h-4 text-indigo-500" />
            <h3 className="font-semibold">{job.name}</h3>
            <Badge variant={job.status === "active" ? "default" : "secondary"} className={`text-xs ${
              job.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" : ""
            }`}>
              {job.status}
            </Badge>
          </div>
          <KeywordQueueManager jobId={job.id} />
        </div>
      ))}
    </div>
  );
}

// ============================================================
// KEYWORD QUEUE MANAGER — Drag-and-drop sortable queue
// ============================================================

function SortableKeywordRow({ kw, index, onRemove }: { kw: any; index: number; onRemove: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: kw.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors ${isDragging ? "shadow-lg z-50" : ""}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none">
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-xs text-muted-foreground font-mono w-6">{index + 1}</span>
        <span className="text-sm truncate">{kw.keyword}</span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-red-500"
        onClick={() => onRemove(kw.id)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function KeywordQueueManager({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const [newKeywords, setNewKeywords] = useState("");
  const [, navigate] = useLocation();
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: keywords, isLoading } = trpc.scheduler.listKeywords.useQuery({ jobId });

  const addMutation = trpc.scheduler.addKeywords.useMutation({
    onSuccess: () => {
      utils.scheduler.listKeywords.invalidate({ jobId });
      setNewKeywords("");
      toast.success("Keywords added to queue");
    },
    onError: (err) => toast.error(err.message),
  });

  const removeMutation = trpc.scheduler.removeKeyword.useMutation({
    onSuccess: () => {
      utils.scheduler.listKeywords.invalidate({ jobId });
      toast.success("Keyword removed");
    },
  });

  const reorderMutation = trpc.scheduler.reorderKeywords.useMutation({
    onSuccess: () => {
      utils.scheduler.listKeywords.invalidate({ jobId });
    },
    onError: (err) => toast.error("Failed to reorder: " + err.message),
  });

  const handleAdd = () => {
    const kws = newKeywords.split("\n").map(k => k.trim()).filter(Boolean);
    if (kws.length === 0) {
      toast.error("Enter at least one keyword");
      return;
    }
    addMutation.mutate({
      jobId,
      keywords: kws.map(keyword => ({ keyword })),
    });
  };

  const pendingKeywords = keywords?.filter(k => k.status === "pending") ?? [];
  const processingKeywords = keywords?.filter(k => k.status === "processing") ?? [];
  const completedKeywords = keywords?.filter(k => k.status === "completed") ?? [];
  const failedKeywords = keywords?.filter(k => k.status === "failed") ?? [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = pendingKeywords.findIndex(k => k.id === active.id);
    const newIndex = pendingKeywords.findIndex(k => k.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(pendingKeywords, oldIndex, newIndex);
    utils.scheduler.listKeywords.setData({ jobId }, (old) => {
      if (!old) return old;
      const nonPending = old.filter(k => k.status !== "pending");
      return [...reordered, ...nonPending];
    });
    reorderMutation.mutate({
      jobId,
      orderedIds: reordered.map(k => k.id),
    });
  };

  return (
    <div className="space-y-5">
      {/* Add Keywords */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <Textarea
              placeholder={"medicare advantage plans 2026\nmedicare part d coverage\n..."}
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              rows={3}
              className="font-mono text-sm flex-1"
            />
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 self-end"
              onClick={handleAdd}
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 bg-muted/50 rounded-lg text-center">
          <p className="text-xl font-bold">{pendingKeywords.length}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-xl font-bold text-blue-700">{processingKeywords.length}</p>
          <p className="text-xs text-blue-600">Processing</p>
        </div>
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-xl font-bold text-green-700">{completedKeywords.length}</p>
          <p className="text-xs text-green-600">Completed</p>
        </div>
        <div className="p-3 bg-red-50 rounded-lg text-center">
          <p className="text-xl font-bold text-red-700">{failedKeywords.length}</p>
          <p className="text-xs text-red-600">Failed</p>
        </div>
      </div>

      {/* Keyword List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : !keywords?.length ? (
        <div className="text-center py-8 text-muted-foreground">
          <ListOrdered className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No keywords in queue yet. Add some above.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Up Next — Draggable */}
          {pendingKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Up Next ({pendingKeywords.length})</h4>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={pendingKeywords.map(k => k.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {pendingKeywords.map((kw, index) => (
                      <SortableKeywordRow
                        key={kw.id}
                        kw={kw}
                        index={index}
                        onRemove={(id) => removeMutation.mutate({ id })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Processing */}
          {processingKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-3">Processing</h4>
              <div className="space-y-1">
                {processingKeywords.map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between p-3 rounded-lg border bg-blue-50/50 border-blue-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                      <span className="text-sm truncate">{kw.keyword}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failed */}
          {failedKeywords.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-3">Failed ({failedKeywords.length})</h4>
              <div className="space-y-1">
                {failedKeywords.map((kw) => (
                  <div key={kw.id} className="flex items-center justify-between p-3 rounded-lg border bg-red-50/50 border-red-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span className="text-sm truncate">{kw.keyword}</span>
                    </div>
                    <span className="text-xs text-red-500 max-w-48 truncate" title={kw.errorMessage ?? ""}>
                      {kw.errorMessage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Written (Completed) — Collapsible */}
          {completedKeywords.length > 0 && (
            <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-sm font-semibold text-green-700 uppercase tracking-wide mb-3 hover:text-green-800 transition-colors">
                  {showCompleted ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  Written ({completedKeywords.length})
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-1">
                  {completedKeywords.map((kw) => (
                    <div key={kw.id} className="flex items-center justify-between p-3 rounded-lg border bg-green-50/50 border-green-100">
                      <div className="flex items-center gap-3 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                        <span className="text-sm truncate text-muted-foreground">{kw.keyword}</span>
                        {kw.processedAt && (
                          <span className="text-xs text-muted-foreground ml-2 shrink-0">
                            {new Date(kw.processedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {new Date(kw.processedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      {kw.generatedArticleId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                          onClick={() => navigate(`/articles/${kw.generatedArticleId}`)}
                        >
                          View Article
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SCHEDULE TAB — Job List with Create/Edit/Pause/Resume/Delete/Run Now
// ============================================================

function ScheduleTab({ projectId }: { projectId: number }) {
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);

  if (selectedJobId) {
    return (
      <JobDetailView
        jobId={selectedJobId}
        projectId={projectId}
        onBack={() => setSelectedJobId(null)}
      />
    );
  }

  return <JobListView projectId={projectId} onSelectJob={(id) => setSelectedJobId(id)} />;
}

function JobListView({ projectId, onSelectJob }: { projectId: number; onSelectJob: (id: number) => void }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const utils = trpc.useUtils();

  const { data: jobs, isLoading } = trpc.scheduler.listJobs.useQuery({ projectId });

  const deleteMutation = trpc.scheduler.deleteJob.useMutation({
    onSuccess: () => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Job deleted");
    },
  });

  const pauseMutation = trpc.scheduler.pauseJob.useMutation({
    onSuccess: () => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Job paused");
    },
  });

  const resumeMutation = trpc.scheduler.resumeJob.useMutation({
    onSuccess: () => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Job resumed");
    },
  });

  const runNowMutation = trpc.scheduler.runNow.useMutation({
    onSuccess: () => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Job execution started!");
    },
    onError: (err) => toast.error(err.message),
  });

  const activeJobs = jobs?.filter((j) => j.status === "active") ?? [];
  const pausedJobs = jobs?.filter((j) => j.status === "paused") ?? [];
  const completedJobs = jobs?.filter((j) => j.status === "completed") ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-50 text-green-700">
            <Play className="w-3.5 h-3.5" />
            <span className="font-semibold">{activeJobs.length}</span>
            <span className="text-green-600/70">active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-amber-50 text-amber-700">
            <Pause className="w-3.5 h-3.5" />
            <span className="font-semibold">{pausedJobs.length}</span>
            <span className="text-amber-600/70">paused</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-50 text-indigo-700">
            <FileText className="w-3.5 h-3.5" />
            <span className="font-semibold">{jobs?.reduce((sum, j) => sum + (j.totalGenerated ?? 0), 0) ?? 0}</span>
            <span className="text-indigo-600/70">generated</span>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </DialogTrigger>
          <CreateJobDialog
            projectId={projectId}
            onClose={() => setShowCreateDialog(false)}
            onCreated={(jobId) => onSelectJob(jobId)}
          />
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
        </div>
      ) : !jobs?.length ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Timer className="w-8 h-8 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Scheduled Jobs</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Create your first scheduled job to automate article generation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="cursor-pointer hover:shadow-md transition-all group"
              onClick={() => onSelectJob(job.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`p-2.5 rounded-xl ${
                      job.status === "active" ? "bg-green-50" :
                      job.status === "paused" ? "bg-amber-50" : "bg-muted/50"
                    }`}>
                      {job.keywordSource === "ai" ? (
                        <Sparkles className={`w-5 h-5 ${
                          job.status === "active" ? "text-green-600" :
                          job.status === "paused" ? "text-amber-600" : "text-muted-foreground"
                        }`} />
                      ) : (
                        <ListOrdered className={`w-5 h-5 ${
                          job.status === "active" ? "text-green-600" :
                          job.status === "paused" ? "text-amber-600" : "text-muted-foreground"
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate">{job.name}</h3>
                        <Badge variant={
                          job.status === "active" ? "default" :
                          job.status === "paused" ? "secondary" : "outline"
                        } className={`text-xs ${
                          job.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                          job.status === "paused" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : ""
                        }`}>
                          {job.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-muted-foreground">
                        <span className="capitalize">{job.frequency}</span>
                        <span>&middot;</span>
                        <span>{job.keywordSource === "ai" ? "AI-Suggested" : "Keyword Queue"}</span>
                        <span>&middot;</span>
                        <span>{job.totalGenerated ?? 0} generated</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground">Next run</p>
                      <p className="text-sm font-medium">{formatNextRun(job.nextRunAt)}</p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={() => setEditingJob(job)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => runNowMutation.mutate({ jobId: job.id })}>
                          <Zap className="w-4 h-4 mr-2" />
                          Run Now
                        </DropdownMenuItem>
                        {job.status === "active" ? (
                          <DropdownMenuItem onClick={() => pauseMutation.mutate({ id: job.id })}>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        ) : job.status === "paused" ? (
                          <DropdownMenuItem onClick={() => resumeMutation.mutate({ id: job.id })}>
                            <Play className="w-4 h-4 mr-2" />
                            Resume
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => {
                            if (confirm("Delete this scheduled job? This cannot be undone.")) {
                              deleteMutation.mutate({ id: job.id });
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editingJob && (
        <Dialog open={!!editingJob} onOpenChange={(open) => { if (!open) setEditingJob(null); }}>
          <EditJobDialog
            job={editingJob}
            projectId={projectId}
            onClose={() => setEditingJob(null)}
          />
        </Dialog>
      )}
    </div>
  );
}

// ============================================================
// CREATE JOB DIALOG — Simplified version
// ============================================================

function CreateJobDialog({ projectId, onClose, onCreated }: { projectId: number; onClose: () => void; onCreated: (jobId: number) => void }) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [keywordSource, setKeywordSource] = useState<"queue" | "ai">("queue");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourEt, setHourEt] = useState(9);
  const [targetWordCount, setTargetWordCount] = useState(2000);
  const [numSections, setNumSections] = useState(8);
  const [numFaqs, setNumFaqs] = useState(5);
  const [contentType, setContentType] = useState("blog");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">("html");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [tone, setTone] = useState("professional");
  const [researchEnabled, setResearchEnabled] = useState(true);

  const { data: brandVoices } = trpc.brandVoices.list.useQuery({ projectId });
  const { data: icpProfiles } = trpc.icpProfiles.list.useQuery({ projectId });
  const [brandVoiceId, setBrandVoiceId] = useState<number | undefined>();
  const [icpProfileId, setIcpProfileId] = useState<number | undefined>();

  const createMutation = trpc.scheduler.createJob.useMutation({
    onSuccess: (job) => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Scheduled job created!");
      onClose();
      if (job) onCreated(job.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!name.trim()) {
      toast.error("Please enter a job name");
      return;
    }

    const keywords = keywordSource === "queue"
      ? keywordsText.split("\n").map(k => k.trim()).filter(Boolean)
      : undefined;

    createMutation.mutate({
      projectId,
      name: name.trim(),
      keywordSource,
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      hourUtc: etHourToUtc(hourEt),
      articleSettings: {
        targetWordCount,
        numSections,
        numFaqs,
        contentType,
        outputFormat,
        additionalInstructions: additionalInstructions.trim() || undefined,
        tone,
        researchEnabled,
        brandVoiceId,
        icpProfileId,
      },
      keywords,
    });
  };

  return (
    <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl">Create Scheduled Job</DialogTitle>
        <DialogDescription>
          Set up automated article generation. Articles will be generated as drafts.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">Job Name</Label>
          <Input placeholder="e.g., Weekly Medicare Blog Posts" value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Keyword Source</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setKeywordSource("queue")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "queue" ? "border-indigo-500 bg-indigo-50" : "border-border hover:border-indigo-200"
              }`}
            >
              <ListOrdered className={`w-5 h-5 mb-2 ${keywordSource === "queue" ? "text-indigo-600" : "text-muted-foreground"}`} />
              <p className="font-medium text-sm">Keyword Queue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-load keywords, picks next one each run</p>
            </button>
            <button
              onClick={() => setKeywordSource("ai")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "ai" ? "border-indigo-500 bg-indigo-50" : "border-border hover:border-indigo-200"
              }`}
            >
              <Sparkles className={`w-5 h-5 mb-2 ${keywordSource === "ai" ? "text-indigo-600" : "text-muted-foreground"}`} />
              <p className="font-medium text-sm">AI-Suggested</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI picks the best topic based on your ICP</p>
            </button>
          </div>
        </div>

        {keywordSource === "queue" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Initial Keywords (one per line)</Label>
            <Textarea
              placeholder={"medicare advantage plans 2026\nmedicare part d coverage"}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
          </div>
        )}

        <div className="space-y-3">
          <Label className="text-sm font-medium">Schedule</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Day</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {frequency === "monthly" && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Day of Month</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Time (ET)</Label>
              <Select value={String(hourEt)} onValueChange={(v) => setHourEt(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ET_HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>{formatEtHour(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Article Settings</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Word Count</Label>
              <Input type="number" value={targetWordCount} onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)} min={500} max={10000} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sections</Label>
              <Input type="number" value={numSections} onChange={(e) => setNumSections(parseInt(e.target.value) || 8)} min={3} max={20} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">FAQs</Label>
              <Input type="number" value={numFaqs} onChange={(e) => setNumFaqs(parseInt(e.target.value) || 5)} min={0} max={15} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="guide">How-To Guide</SelectItem>
                  <SelectItem value="listicle">Listicle</SelectItem>
                  <SelectItem value="pillar">Pillar Page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {brandVoices && brandVoices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Brand Voice</Label>
              <Select value={brandVoiceId ? String(brandVoiceId) : "none"} onValueChange={(v) => setBrandVoiceId(v === "none" ? undefined : parseInt(v))}>
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Default</SelectItem>
                  {brandVoices.map((bv: any) => (
                    <SelectItem key={bv.id} value={String(bv.id)}>{bv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Additional Instructions</Label>
            <Textarea
              placeholder="Any specific instructions for article generation..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleCreate} disabled={createMutation.isPending} className="bg-indigo-600 hover:bg-indigo-700">
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Create Job
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// EDIT JOB DIALOG — Stub that delegates to the same form pattern
// ============================================================

function EditJobDialog({ job, projectId, onClose }: { job: any; projectId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(job.name);
  const [frequency, setFrequency] = useState(job.frequency);
  const [dayOfWeek, setDayOfWeek] = useState(job.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(job.dayOfMonth ?? 1);
  const [hourEt, setHourEt] = useState(utcHourToEt(job.hourUtc ?? 0));

  const updateMutation = trpc.scheduler.updateJob.useMutation({
    onSuccess: () => {
      utils.scheduler.listJobs.invalidate({ projectId });
      utils.scheduler.getJob.invalidate({ id: job.id });
      toast.success("Job updated");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <DialogContent className="sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle>Edit Job</DialogTitle>
      </DialogHeader>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label>Job Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Frequency</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Day</Label>
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {frequency === "monthly" && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Day of Month</Label>
              <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Time (ET)</Label>
            <Select value={String(hourEt)} onValueChange={(v) => setHourEt(parseInt(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ET_HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{formatEtHour(h)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => updateMutation.mutate({
            id: job.id,
            name: name.trim(),
            frequency,
            dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
            dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
            hourUtc: etHourToUtc(hourEt),
          })}
          disabled={updateMutation.isPending}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Save Changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// JOB DETAIL VIEW — Overview, Keywords, Run History
// ============================================================

function JobDetailView({ jobId, projectId, onBack }: { jobId: number; projectId: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: job, isLoading } = trpc.scheduler.getJob.useQuery({ id: jobId });
  const { data: keywords } = trpc.scheduler.listKeywords.useQuery({ jobId });
  const { data: runHistory } = trpc.scheduler.listRunHistory.useQuery({ jobId, limit: 50 });

  const runNowMutation = trpc.scheduler.runNow.useMutation({
    onSuccess: () => {
      utils.scheduler.getJob.invalidate({ id: jobId });
      toast.success("Job execution started!");
    },
    onError: (err) => toast.error(err.message),
  });

  const pauseMutation = trpc.scheduler.pauseJob.useMutation({
    onSuccess: () => {
      utils.scheduler.getJob.invalidate({ id: jobId });
      toast.success("Job paused");
    },
  });

  const resumeMutation = trpc.scheduler.resumeJob.useMutation({
    onSuccess: () => {
      utils.scheduler.getJob.invalidate({ id: jobId });
      toast.success("Job resumed");
    },
  });

  const deleteMutation = trpc.scheduler.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted");
      onBack();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Job Not Found</h2>
        <Button variant="outline" className="mt-4" onClick={onBack}>Back</Button>
      </div>
    );
  }

  const settings = job.articleSettings as any ?? {};
  const pendingKeywords = keywords?.filter(k => k.status === "pending") ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowRight className="w-5 h-5 rotate-180" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{job.name}</h2>
              <Badge variant={job.status === "active" ? "default" : "secondary"} className={`${
                job.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                job.status === "paused" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : ""
              }`}>
                {job.status}
              </Badge>
              {job.isRunning ? (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Running
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {job.frequency} at {formatEtHour(utcHourToEt(job.hourUtc ?? 0))} &middot; {job.keywordSource === "ai" ? "AI-Suggested" : "Keyword Queue"} &middot; {job.totalGenerated ?? 0} articles generated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => runNowMutation.mutate({ jobId: job.id })} disabled={runNowMutation.isPending || !!job.isRunning}>
            <Zap className="w-4 h-4 mr-2" />
            Run Now
          </Button>
          {job.status === "active" ? (
            <Button variant="outline" onClick={() => pauseMutation.mutate({ id: job.id })}>
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : job.status === "paused" ? (
            <Button variant="outline" onClick={() => resumeMutation.mutate({ id: job.id })}>
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          ) : null}
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              if (confirm("Delete this scheduled job?")) deleteMutation.mutate({ id: job.id });
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Settings2 className="w-4 h-4" />
            Overview
          </TabsTrigger>
          {job.keywordSource === "queue" && (
            <TabsTrigger value="keywords" className="gap-1.5">
              <ListOrdered className="w-4 h-4" />
              Keywords
              {pendingKeywords.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{pendingKeywords.length}</Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-1.5">
            <History className="w-4 h-4" />
            Run History
            {runHistory?.length ? (
              <Badge variant="secondary" className="ml-1 text-xs">{runHistory.length}</Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <span className="text-sm font-medium capitalize">{job.frequency}</span>
                </div>
                {job.frequency === "weekly" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Day</span>
                    <span className="text-sm font-medium">{DAYS_OF_WEEK[job.dayOfWeek ?? 1]}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Time</span>
                  <span className="text-sm font-medium">{formatEtHour(utcHourToEt(job.hourUtc ?? 0))}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Next Run</span>
                  <span className="text-sm font-medium">{formatNextRun(job.nextRunAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Run</span>
                  <span className="text-sm font-medium">
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Article Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Word Count</span>
                  <span className="text-sm font-medium">{settings.targetWordCount ?? 2000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sections</span>
                  <span className="text-sm font-medium">{settings.numSections ?? 8}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">FAQs</span>
                  <span className="text-sm font-medium">{settings.numFaqs ?? 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Content Type</span>
                  <span className="text-sm font-medium capitalize">{settings.contentType ?? "blog"}</span>
                </div>
                {settings.additionalInstructions && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">Instructions</span>
                      <p className="text-sm mt-1">{settings.additionalInstructions}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {job.keywordSource === "queue" && (
          <TabsContent value="keywords" className="mt-4">
            <KeywordQueueManager jobId={jobId} />
          </TabsContent>
        )}

        <TabsContent value="history" className="mt-4">
          <RunHistoryView runs={runHistory ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// OUTPUT TAB — Run History across all jobs + CMS status
// ============================================================

function OutputTab({ projectId }: { projectId: number }) {
  const { data: jobs, isLoading: jobsLoading } = trpc.scheduler.listJobs.useQuery({ projectId });
  const { data: pipelineJobs } = trpc.pipeline.getJobs.useQuery({ projectId });
  const [, navigate] = useLocation();

  if (jobsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalGenerated = jobs?.reduce((sum, j) => sum + (j.totalGenerated ?? 0), 0) ?? 0;
  const completedPipelineJobs = pipelineJobs?.filter((j: any) => j.status === "approved" || j.status === "sent_to_scheduler") ?? [];

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-indigo-600">{totalGenerated}</p>
            <p className="text-sm text-muted-foreground mt-1">Articles Generated</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalGenerated}</p>
            <p className="text-sm text-muted-foreground mt-1">Pushed to CMS</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-amber-600">{completedPipelineJobs.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Briefs Approved</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-Job Run History */}
      {jobs && jobs.length > 0 ? (
        <div className="space-y-6">
          {jobs.map((job) => (
            <JobRunHistorySection key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
            <h3 className="text-lg font-semibold">No Output Yet</h3>
            <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
              Once your scheduled jobs start running, generated articles and CMS push status will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function JobRunHistorySection({ job }: { job: any }) {
  const { data: runHistory } = trpc.scheduler.listRunHistory.useQuery({ jobId: job.id, limit: 20 });
  const [expanded, setExpanded] = useState(true);

  if (!runHistory?.length) return null;

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <button className="flex items-center gap-2 w-full text-left hover:bg-muted/30 p-2 rounded-lg transition-colors">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <span className="font-semibold text-sm">{job.name}</span>
          <Badge variant="secondary" className="text-xs">{runHistory.length} runs</Badge>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pt-2">
          <RunHistoryView runs={runHistory} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================================
// RUN HISTORY VIEW — Shared component
// ============================================================

function RunHistoryView({ runs }: { runs: any[] }) {
  const [, navigate] = useLocation();
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  if (!runs.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No runs yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const isExpanded = expandedRunId === run.id;
        return (
          <Collapsible
            key={run.id}
            open={isExpanded}
            onOpenChange={(open) => setExpandedRunId(open ? run.id : null)}
          >
            <div className={`rounded-lg border ${
              run.status === "completed" ? "border-green-100 bg-green-50/30" :
              run.status === "failed" ? "border-red-100 bg-red-50/30" :
              "border-blue-100 bg-blue-50/30"
            }`}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 text-left hover:bg-black/[0.02] transition-colors rounded-lg">
                  <div className="flex items-center gap-3 min-w-0">
                    {run.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : run.status === "failed" ? (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{run.keyword}</span>
                        <Badge variant="outline" className="text-xs">
                          {run.keywordSource === "ai" ? "AI" : "Queue"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        <span>{new Date(run.startedAt).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                        <span>{formatDuration(run.durationMs)}</span>
                        {run.status === "failed" && run.errorMessage && (
                          <span className="text-red-500 truncate max-w-64" title={run.errorMessage}>
                            {run.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {run.status === "completed" && run.articleId && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={(e) => { e.stopPropagation(); navigate(`/articles/${run.articleId}`); }}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        View Article
                      </Button>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <RunLogTimeline runId={run.id} />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}

// ============================================================
// RUN LOG TIMELINE
// ============================================================

const STEP_ICONS: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  keyword_selection: { icon: Sparkles, color: "text-indigo-500" },
  keyword_suggestion: { icon: Sparkles, color: "text-violet-500" },
  outline: { icon: ListOrdered, color: "text-blue-500" },
  article: { icon: FileText, color: "text-purple-500" },
  auto_grade: { icon: Zap, color: "text-amber-500" },
  em_dash_removal: { icon: Settings2, color: "text-muted-foreground" },
  complete: { icon: CheckCircle2, color: "text-green-500" },
  error: { icon: XCircle, color: "text-red-500" },
};

const LEVEL_STYLES: Record<string, string> = {
  success: "text-green-600",
  warning: "text-amber-600",
  error: "text-red-600",
  info: "text-muted-foreground",
};

function RunLogTimeline({ runId }: { runId: number }) {
  const { data: logs, isLoading } = trpc.scheduler.getRunLogs.useQuery(
    { runId },
    { enabled: !!runId }
  );

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2 border-t border-dashed">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="w-4 h-4 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-16 ml-auto" />
          </div>
        ))}
      </div>
    );
  }

  if (!logs?.length) {
    return (
      <div className="pt-2 border-t border-dashed">
        <p className="text-xs text-muted-foreground">No detailed logs available for this run.</p>
      </div>
    );
  }

  return (
    <div className="pt-3 border-t border-dashed">
      <div className="relative">
        <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border" />
        <div className="space-y-3">
          {logs.map((log: any, idx: number) => {
            const stepConfig = STEP_ICONS[log.step] ?? { icon: AlertCircle, color: "text-muted-foreground" };
            const Icon = stepConfig.icon;
            const levelStyle = LEVEL_STYLES[log.level] ?? LEVEL_STYLES.info;
            const timestamp = new Date(log.createdAt).toLocaleString("en-US", {
              timeZone: "America/New_York",
              hour: "numeric",
              minute: "2-digit",
              second: "2-digit",
            });

            const isKeywordSuggestion =
              log.step === "keyword_suggestion" &&
              log.level === "success" &&
              log.metadata?.related;

            return (
              <div key={log.id ?? idx} className="flex items-start gap-3 relative">
                <div className={`shrink-0 z-10 bg-card rounded-full p-0.5 ${stepConfig.color}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-xs leading-relaxed ${levelStyle}`}>
                    {log.message}
                  </span>
                  {isKeywordSuggestion && (
                    <div className="mt-2 space-y-1.5">
                      {([
                        { label: "Related", key: "related", chipClass: "bg-violet-50 text-violet-700 border-violet-200" },
                        { label: "LSI", key: "lsi", chipClass: "bg-blue-50 text-blue-700 border-blue-200" },
                        { label: "Long-tail", key: "longTail", chipClass: "bg-teal-50 text-teal-700 border-teal-200" },
                      ] as const).map(({ label, key, chipClass }) => {
                        const kws: string[] = log.metadata[key] ?? [];
                        if (!kws.length) return null;
                        return (
                          <div key={key} className="flex flex-wrap items-center gap-1">
                            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide w-14 shrink-0">{label}</span>
                            {kws.map((kw: string) => (
                              <span key={kw} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${chipClass}`}>
                                {kw}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums pt-0.5">
                  {timestamp} ET
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
