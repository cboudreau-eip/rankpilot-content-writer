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
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PipelineStatus = "pending" | "generating_outline" | "generating_article" | "pending_approval" | "approved" | "rejected" | "failed";

const statusConfig: Record<PipelineStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: "Pending", color: "bg-slate-100 text-slate-700 border-slate-200", icon: <Clock className="w-3.5 h-3.5" /> },
  generating_outline: { label: "Generating Outline", color: "bg-blue-100 text-blue-700 border-blue-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  generating_article: { label: "Generating Article", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: <Loader2 className="w-3.5 h-3.5 animate-spin" /> },
  pending_approval: { label: "Awaiting Review", color: "bg-amber-100 text-amber-700 border-amber-200", icon: <Eye className="w-3.5 h-3.5" /> },
  approved: { label: "Approved", color: "bg-green-100 text-green-700 border-green-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
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
            Automated content generation from your JSON bucket with human approval.
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectJobId, setRejectJobId] = useState<number | null>(null);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [outlinePreviewJobId, setOutlinePreviewJobId] = useState<number | null>(null);

  const approveMutation = trpc.pipeline.approveArticle.useMutation({
    onSuccess: () => {
      toast.success("Article approved — the article has been published.");
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const rejectMutation = trpc.pipeline.rejectArticle.useMutation({
    onSuccess: () => {
      toast.success("Article rejected — sent back.");
      setRejectDialogOpen(false);
      setRejectFeedback("");
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateOutlineMutation = trpc.pipeline.generateOutlineForJob.useMutation({
    onSuccess: (result) => {
      toast.success("Outline generated successfully.");
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err) => toast.error(`Outline generation failed: ${err.message}`),
  });

  const generateArticleMutation = trpc.pipeline.generateArticleForJob.useMutation({
    onSuccess: (result) => {
      toast.success("Article generated successfully — ready for review.");
      utils.pipeline.getQueue.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err) => toast.error(`Article generation failed: ${err.message}`),
  });

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
            No articles are waiting for review. Run a poll from the Settings tab to ingest new content from your bucket.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{queue.length} item{queue.length !== 1 ? "s" : ""} in queue</p>
      </div>

      {queue.map((job: any) => (
        <Card key={job.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={job.status} />
                  {job.category && (
                    <Badge variant="secondary" className="text-xs">{job.category}</Badge>
                  )}
                  {job.outlineId && !job.articleId && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs gap-1">
                      <ListTree className="w-3 h-3" />
                      Outline Ready
                    </Badge>
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
                  {job.processedAt && <> · Generated: {formatDate(job.processedAt)}</>}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Generation buttons — shown when no outline/article yet */}
                {!job.outlineId && !job.articleId && job.status === "pending_approval" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateOutlineMutation.mutate({ jobId: job.id, projectId })}
                    disabled={generateOutlineMutation.isPending}
                    className="text-blue-700 border-blue-200 hover:bg-blue-50"
                  >
                    {generateOutlineMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <ListTree className="w-4 h-4 mr-1.5" />
                    )}
                    Generate Outline
                  </Button>
                )}

                {/* Outline exists but no article — show preview + generate article */}
                {job.outlineId && !job.articleId && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setOutlinePreviewJobId(job.id)}
                    >
                      <Eye className="w-4 h-4 mr-1.5" />
                      Preview Outline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => generateArticleMutation.mutate({ jobId: job.id, projectId })}
                      disabled={generateArticleMutation.isPending}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {generateArticleMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                      ) : (
                        <Sparkles className="w-4 h-4 mr-1.5" />
                      )}
                      Generate Article
                    </Button>
                  </div>
                )}

                {/* Article exists — show approve/reject */}
                {job.articleId && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/articles/${job.articleId}`}>
                        <Eye className="w-4 h-4 mr-1.5" />
                        Preview
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => approveMutation.mutate({ jobId: job.id })}
                      disabled={approveMutation.isPending}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setRejectJobId(job.id);
                        setRejectDialogOpen(true);
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1.5" />
                      Reject
                    </Button>
                  </div>
                )}

                {/* No outline, no article, status is pending (just ingested, auto-gen off) */}
                {!job.outlineId && !job.articleId && job.status === "pending" && (
                  <Button
                    size="sm"
                    onClick={() => generateOutlineMutation.mutate({ jobId: job.id, projectId })}
                    disabled={generateOutlineMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {generateOutlineMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <ListTree className="w-4 h-4 mr-1.5" />
                    )}
                    Generate Outline
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Article</DialogTitle>
            <DialogDescription>Provide optional feedback for why this article was rejected.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Optional feedback (e.g., needs more depth, wrong angle, etc.)"
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

      {/* Outline Preview Dialog */}
      {outlinePreviewJobId && (
        <OutlinePreviewDialog
          jobId={outlinePreviewJobId}
          projectId={projectId}
          onClose={() => setOutlinePreviewJobId(null)}
          onGenerateArticle={() => {
            generateArticleMutation.mutate({ jobId: outlinePreviewJobId, projectId });
            setOutlinePreviewJobId(null);
          }}
          isGenerating={generateArticleMutation.isPending}
        />
      )}
    </div>
  );
}

// ---- Outline Preview Dialog ----
function OutlinePreviewDialog({
  jobId,
  projectId,
  onClose,
  onGenerateArticle,
  isGenerating,
}: {
  jobId: number;
  projectId: number;
  onClose: () => void;
  onGenerateArticle: () => void;
  isGenerating: boolean;
}) {
  const { data: outline, isLoading } = trpc.pipeline.getJobOutline.useQuery({ jobId });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-indigo-600" />
            Outline Preview
          </DialogTitle>
          <DialogDescription>
            Review the generated outline before creating the full article.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !outline ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>No outline found for this job.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{outline.title}</h3>
              {outline.keyword && (
                <p className="text-sm text-muted-foreground mt-1">
                  Target keyword: <span className="font-medium text-foreground">{outline.keyword}</span>
                </p>
              )}
            </div>

            <div className="border rounded-lg divide-y">
              {(outline.sections && Array.isArray(outline.sections) ? outline.sections : []).map((section: any, idx: number) => (
                <div key={idx} className="p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full w-6 h-6 flex items-center justify-center font-bold">
                        {idx + 1}
                      </span>
                      {section.heading || section.title}
                    </h4>
                    {section.targetWordCount && (
                      <span className="text-xs text-muted-foreground">{section.targetWordCount} words</span>
                    )}
                  </div>
                  {section.points && section.points.length > 0 && (
                    <ul className="mt-2 space-y-1 ml-8">
                      {section.points.map((point: string, pIdx: number) => (
                        <li key={pIdx} className="text-sm text-muted-foreground flex items-start gap-2">
                          <ArrowRight className="w-3 h-3 mt-1 shrink-0 text-indigo-400" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {(outline.sections && Array.isArray(outline.sections) && outline.sections.length > 0) && (
              <p className="text-xs text-muted-foreground text-right">
                {outline.sections.length} sections · ~{outline.sections.reduce((sum: number, s: any) => sum + (s.targetWordCount || 0), 0)} words target
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          {outline && (
            <Button
              onClick={onGenerateArticle}
              disabled={isGenerating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Sparkles className="w-4 h-4 mr-1.5" />
              )}
              Generate Article from Outline
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.pipeline.deleteJob.useMutation({
    onSuccess: () => {
      toast.success("Job deleted.");
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateOutlineMutation = trpc.pipeline.generateOutlineForJob.useMutation({
    onSuccess: () => {
      toast.success("Outline generated.");
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const generateArticleMutation = trpc.pipeline.generateArticleForJob.useMutation({
    onSuccess: () => {
      toast.success("Article generated.");
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err) => toast.error(err.message),
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
            Run a poll from the Settings tab to start ingesting content from your JSON bucket.
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
                    {job.articleId && (
                      <a href={`/articles/${job.articleId}`} className="text-indigo-600 hover:text-indigo-700">
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
                    {/* Generate Outline button — shown when no outline exists and status allows */}
                    {!job.outlineId && (job.status === "pending" || job.status === "pending_approval") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50"
                        onClick={() => generateOutlineMutation.mutate({ jobId: job.id, projectId })}
                        disabled={generateOutlineMutation.isPending}
                        title="Generate Outline"
                      >
                        <ListTree className="w-3.5 h-3.5 mr-1" />
                        Outline
                      </Button>
                    )}
                    {/* Generate Article button — shown when outline exists but no article */}
                    {job.outlineId && !job.articleId && (job.status === "pending_approval") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50"
                        onClick={() => generateArticleMutation.mutate({ jobId: job.id, projectId })}
                        disabled={generateArticleMutation.isPending}
                        title="Generate Article"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1" />
                        Article
                      </Button>
                    )}
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
  const [autoOutline, setAutoOutline] = useState(true);
  const [autoArticle, setAutoArticle] = useState(true);
  const [wordCount, setWordCount] = useState("1600");
  const [instructions, setInstructions] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize form from settings
  if (settings && !initialized) {
    setBucketUrl(settings.bucketUrl || "https://json-test.abacusai.app");
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
    onError: (err) => toast.error(err.message),
  });

  const pollMutation = trpc.pipeline.runPoll.useMutation({
    onSuccess: (result) => {
      toast.success(`Poll complete: ${result.ingested} ingested, ${result.skipped} skipped, ${result.errors} errors`);
      utils.pipeline.getJobs.invalidate();
      utils.pipeline.getQueue.invalidate();
    },
    onError: (err) => toast.error(`Poll failed: ${err.message}`),
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
            Fetch new files from the JSON bucket and start the content generation pipeline.
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

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Configuration</CardTitle>
          <CardDescription>Configure the JSON bucket source and auto-generation behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="bucketUrl">Bucket URL</Label>
            <Input
              id="bucketUrl"
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              placeholder="https://json-test.abacusai.app"
            />
            <p className="text-xs text-muted-foreground">
              The base URL of the JSON bucket API. Must expose /api/files and /api/files/:id endpoints.
            </p>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Pipeline Enabled</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Enable or disable the content pipeline</p>
            </div>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Auto-Generate Outline</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically create an outline from ingested ideas</p>
            </div>
            <Switch checked={autoOutline} onCheckedChange={setAutoOutline} />
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <Label>Auto-Generate Article</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Automatically generate a full article from the outline</p>
            </div>
            <Switch checked={autoArticle} onCheckedChange={setAutoArticle} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="wordCount">Default Word Count Target</Label>
            <Input
              id="wordCount"
              type="number"
              min={500}
              max={10000}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Default Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="E.g., Write in a conversational tone, target Medicare beneficiaries..."
              rows={3}
            />
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
