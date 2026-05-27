import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Play,
  Loader2,
  Clock,
  FileText,
  AlertCircle,
  Settings,
  Inbox,
  Activity,
  ExternalLink,
  Eye,
  ListTree,
  Sparkles,
  ArrowRight,
  Send,
  Calendar,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PipelineStatus = "pending" | "generating_outline" | "generating_article" | "pending_approval" | "approved" | "sent_to_scheduler" | "rejected" | "failed";

const statusConfig: Record<PipelineStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Clock className="w-3.5 h-3.5" /> },
  generating_outline: { label: "Generating Outline", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  generating_article: { label: "Generating Article", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
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

export default function Pipeline() {
  const { activeProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState("queue");

  if (!activeProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold">No Project Selected</h3>
          <p className="text-muted-foreground text-sm mt-1">Select a project from the sidebar to use the content pipeline.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Pipeline</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ingest content ideas from S3, review them, and send approved topics to the Content Scheduler.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="queue" className="gap-2">
            <Inbox className="w-4 h-4" />
            Queue
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-6">
          <QueueTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="activity" className="mt-6">
          <ActivityTab projectId={activeProject.id} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab projectId={activeProject.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---- Queue Tab ----
function QueueTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: queue, isLoading } = trpc.pipeline.getQueue.useQuery({ projectId });
  const { data: scheduledJobs } = trpc.pipeline.getScheduledJobs.useQuery({ projectId });
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string>("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectJobId, setRejectJobId] = useState<number | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendJobId, setSendJobId] = useState<number | null>(null);
  const [bulkSendDialogOpen, setBulkSendDialogOpen] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<number>>(new Set());

  const sendToSchedulerMutation = trpc.pipeline.sendToScheduler.useMutation({
    onSuccess: () => {
      toast.success("Topic sent to Content Scheduler queue.");
      setSendDialogOpen(false);
      setSendJobId(null);
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const sendBulkMutation = trpc.pipeline.sendBulkToScheduler.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.sent} topic${result.sent !== 1 ? "s" : ""} sent to Scheduler. ${result.skipped > 0 ? `${result.skipped} skipped.` : ""}`);
      setBulkSendDialogOpen(false);
      setSelectedJobs(new Set());
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const rejectMutation = trpc.pipeline.rejectArticle.useMutation({
    onSuccess: () => {
      toast.success("Item rejected.");
      setRejectDialogOpen(false);
      setRejectFeedback("");
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleJobSelection = (jobId: number) => {
    setSelectedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const selectAll = () => {
    if (!queue) return;
    if (selectedJobs.size === queue.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(queue.map((j: any) => j.id)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!queue || queue.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Inbox className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">Queue is Empty</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
            No items are waiting for review. Run a poll from the Settings tab to ingest new content from your S3 bucket.
          </p>
        </CardContent>
      </Card>
    );
  }

  const queueModeJobs = scheduledJobs?.filter((j: any) => j.keywordSource === "queue") || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">{queue.length} item{queue.length !== 1 ? "s" : ""} in queue</p>
          {selectedJobs.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedJobs.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedJobs.size === queue.length ? "Deselect All" : "Select All"}
          </Button>
          {selectedJobs.size > 0 && (
            <Button
              size="sm"
              onClick={() => setBulkSendDialogOpen(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Send {selectedJobs.size} to Scheduler
            </Button>
          )}
        </div>
      </div>

      {queue.map((job: any) => (
        <Card key={job.id} className={`hover:shadow-md transition-shadow ${selectedJobs.has(job.id) ? "ring-2 ring-purple-300 border-purple-200" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Checkbox */}
              <div className="pt-1">
                <input
                  type="checkbox"
                  checked={selectedJobs.has(job.id)}
                  onChange={() => toggleJobSelection(job.id)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={job.status} />
                  {job.category && (
                    <Badge variant="secondary" className="text-xs">{job.category}</Badge>
                  )}
                </div>
                <h4 className="font-semibold text-base mt-2 truncate">{job.title || job.filename}</h4>
                <div className="flex items-center gap-4 mt-1.5 text-sm text-muted-foreground">
                  <span>Keyword: <span className="font-medium text-foreground">{job.keyword}</span></span>
                  {job.sourceUrl && (
                    <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-foreground transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                      Source
                    </a>
                  )}
                </div>
                {job.snippet && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{job.snippet}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Ingested: {formatDate(job.createdAt)}
                </p>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <Button
                  size="sm"
                  onClick={() => {
                    setSendJobId(job.id);
                    setSendDialogOpen(true);
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Send to Scheduler
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => {
                    setRejectJobId(job.id);
                    setRejectDialogOpen(true);
                  }}
                >
                  <XCircle className="w-4 h-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Send to Scheduler Dialog (single) */}
      <Dialog open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Send to Content Scheduler
            </DialogTitle>
            <DialogDescription>
              Choose which Scheduled Job to add this keyword to. The Scheduler will generate the article using its configured settings (brand voice, scoring, grading loop, etc.).
            </DialogDescription>
          </DialogHeader>

          {queueModeJobs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No Scheduled Jobs with "Keyword Queue" source found for this project.</p>
              <p className="text-xs mt-1">Create a Scheduled Job in the Content Scheduler first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scheduled Job</Label>
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
                          <Badge variant="secondary" className="text-xs ml-1">
                            {sj.frequency}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {sj.status}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSendDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (sendJobId && selectedScheduledJobId) {
                  sendToSchedulerMutation.mutate({
                    jobId: sendJobId,
                    scheduledJobId: parseInt(selectedScheduledJobId),
                  });
                }
              }}
              disabled={!selectedScheduledJobId || sendToSchedulerMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sendToSchedulerMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Send to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send to Scheduler Dialog */}
      <Dialog open={bulkSendDialogOpen} onOpenChange={setBulkSendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-purple-600" />
              Send {selectedJobs.size} Items to Scheduler
            </DialogTitle>
            <DialogDescription>
              All selected items will be added to the chosen Scheduled Job's keyword queue.
            </DialogDescription>
          </DialogHeader>

          {queueModeJobs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No Scheduled Jobs with "Keyword Queue" source found for this project.</p>
              <p className="text-xs mt-1">Create a Scheduled Job in the Content Scheduler first.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scheduled Job</Label>
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
                          <Badge variant="secondary" className="text-xs ml-1">
                            {sj.frequency}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkSendDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (selectedScheduledJobId) {
                  sendBulkMutation.mutate({
                    jobIds: Array.from(selectedJobs),
                    scheduledJobId: parseInt(selectedScheduledJobId),
                  });
                }
              }}
              disabled={!selectedScheduledJobId || sendBulkMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sendBulkMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Send All to Queue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Item</DialogTitle>
            <DialogDescription>Provide optional feedback for why this item was rejected.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional feedback (e.g., not relevant, already covered, etc.)"
            value={rejectFeedback}
            onChange={(e) => setRejectFeedback(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (rejectJobId) {
                  rejectMutation.mutate({ jobId: rejectJobId, feedback: rejectFeedback || undefined });
                }
              }}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <XCircle className="w-4 h-4 mr-1.5" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- Activity Tab ----
function ActivityTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: jobs, isLoading } = trpc.pipeline.getJobs.useQuery({ projectId });

  const retryMutation = trpc.pipeline.retryJob.useMutation({
    onSuccess: () => {
      toast.success("Job queued for retry.");
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = trpc.pipeline.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted.");
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Activity className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No Pipeline Activity</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
            Run a poll from the Settings tab to start ingesting content from your S3 bucket.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{jobs.length} total pipeline job{jobs.length !== 1 ? "s" : ""}</p>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Title</th>
              <th className="text-left px-4 py-3 font-medium">Keyword</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Ingested</th>
              <th className="text-right px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {jobs.map((job: any) => (
              <tr key={job.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate max-w-[200px]">{job.title || job.filename}</span>
                    {job.sourceUrl && (
                      <a href={job.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px]">{job.keyword || "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(job.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(job.status === "failed" || job.status === "rejected") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => retryMutation.mutate({ jobId: job.id, projectId })}
                        disabled={retryMutation.isPending}
                        title="Retry"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm("Delete this pipeline job?")) {
                          deleteMutation.mutate({ jobId: job.id });
                        }
                      }}
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Show error messages for failed jobs */}
      {jobs.filter((j: any) => j.status === "failed" && j.errorMessage).length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Failed Jobs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobs.filter((j: any) => j.status === "failed" && j.errorMessage).map((job: any) => (
              <div key={job.id} className="text-xs text-red-600">
                <span className="font-medium">{job.title || job.filename}:</span> {job.errorMessage}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Settings Tab ----
function SettingsTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.pipeline.getSettings.useQuery({ projectId });

  const [bucketUrl, setBucketUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [autoOutline, setAutoOutline] = useState(false);
  const [autoArticle, setAutoArticle] = useState(false);
  const [wordCount, setWordCount] = useState("1600");
  const [instructions, setInstructions] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from settings
  if (settings && !initialized) {
    setBucketUrl(settings.bucketUrl || "marketing-manus-scraper");
    setEnabled(settings.enabled === 1);
    setAutoOutline(settings.autoGenerateOutline === 1);
    setAutoArticle(settings.autoGenerateArticle === 1);
    setWordCount(String(settings.defaultWordCount || 1600));
    setInstructions(settings.defaultInstructions || "");
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
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err: any) => toast.error(`Poll failed: ${err.message}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Poll Now Card */}
      <Card className="border-indigo-200 bg-indigo-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Play className="w-5 h-5 text-indigo-600" />
            Manual Poll
          </CardTitle>
          <CardDescription>
            Fetch new files from the S3 bucket (incoming/ prefix) and add them to the review queue.
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
                Polling...
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
              Last poll: {pollMutation.data.ingested} ingested, {pollMutation.data.skipped} skipped, {pollMutation.data.errors} errors (of {pollMutation.data.total} total files)
            </p>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Send className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-sm">How the Pipeline Works</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Items ingested from S3 appear in the Queue tab. Review them, then use "Send to Scheduler" to add approved keywords to your Content Scheduler's queue. The Scheduler handles article generation with all your configured settings (brand voice, scoring, grading loop, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Configuration</CardTitle>
          <CardDescription>Configure the S3 bucket source.</CardDescription>
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
                autoGenerateOutline: autoOutline ? 1 : 0,
                autoGenerateArticle: autoArticle ? 1 : 0,
                defaultWordCount: parseInt(wordCount) || 1600,
                defaultInstructions: instructions || undefined,
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
