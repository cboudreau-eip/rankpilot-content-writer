import { useState, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Timer,
  Plus,
  Play,
  Pause,
  Trash2,
  Clock,
  FileText,
  Zap,
  ListOrdered,
  Sparkles,
  ChevronLeft,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  GripVertical,
  ArrowRight,
  Settings2,
  History,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ContentScheduler() {
  const [, params] = useRoute("/scheduler/:jobId");
  const [, navigate] = useLocation();
  const { activeProject } = useActiveProject();
  const jobId = params?.jobId ? parseInt(params.jobId) : null;

  if (!activeProject) {
    return (
      <div className="p-8 text-center text-slate-500">
        <Timer className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700 mb-2">Select a Project</h2>
        <p>Choose a project from the sidebar to manage scheduled content generation.</p>
      </div>
    );
  }

  if (jobId) {
    return <JobDetailView jobId={jobId} projectId={activeProject.id} onBack={() => navigate("/scheduler")} />;
  }

  return <JobListView projectId={activeProject.id} />;
}

// ============================================================
// JOB LIST VIEW
// ============================================================

function JobListView({ projectId }: { projectId: number }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [, navigate] = useLocation();
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
      toast.success("Job execution started! You'll be notified when the article is ready.");
    },
    onError: (err) => toast.error(err.message),
  });

  const activeJobs = jobs?.filter((j) => j.status === "active") ?? [];
  const pausedJobs = jobs?.filter((j) => j.status === "paused") ?? [];
  const completedJobs = jobs?.filter((j) => j.status === "completed") ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Timer className="w-6 h-6 text-indigo-500" />
            Content Scheduler
          </h1>
          <p className="text-slate-500 mt-1">Automate article generation on a schedule</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="w-4 h-4 mr-2" />
              New Scheduled Job
            </Button>
          </DialogTrigger>
          <CreateJobDialog
            projectId={projectId}
            onClose={() => setShowCreateDialog(false)}
          />
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Play className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{activeJobs.length}</p>
                <p className="text-xs text-slate-500">Active Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Pause className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pausedJobs.length}</p>
                <p className="text-xs text-slate-500">Paused</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {jobs?.reduce((sum, j) => sum + (j.totalGenerated ?? 0), 0) ?? 0}
                </p>
                <p className="text-xs text-slate-500">Articles Generated</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg">
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{completedJobs.length}</p>
                <p className="text-xs text-slate-500">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Job List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : !jobs?.length ? (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <Timer className="w-16 h-16 mx-auto mb-4 text-slate-200" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Scheduled Jobs Yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Create your first scheduled job to automatically generate articles on a recurring basis.
            </p>
            <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card
              key={job.id}
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/scheduler/${job.id}`)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl ${
                      job.status === "active" ? "bg-green-50" :
                      job.status === "paused" ? "bg-amber-50" : "bg-slate-50"
                    }`}>
                      {job.keywordSource === "ai" ? (
                        <Sparkles className={`w-5 h-5 ${
                          job.status === "active" ? "text-green-600" :
                          job.status === "paused" ? "text-amber-600" : "text-slate-400"
                        }`} />
                      ) : (
                        <ListOrdered className={`w-5 h-5 ${
                          job.status === "active" ? "text-green-600" :
                          job.status === "paused" ? "text-amber-600" : "text-slate-400"
                        }`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900 truncate">{job.name}</h3>
                        <Badge variant={
                          job.status === "active" ? "default" :
                          job.status === "paused" ? "secondary" : "outline"
                        } className={`text-xs ${
                          job.status === "active" ? "bg-green-100 text-green-700 hover:bg-green-100" :
                          job.status === "paused" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : ""
                        }`}>
                          {job.status}
                        </Badge>
                        {job.isRunning ? (
                          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Running
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {job.frequency} at {job.hourUtc}:00 UTC
                        </span>
                        <span className="flex items-center gap-1">
                          {job.keywordSource === "ai" ? (
                            <><Sparkles className="w-3.5 h-3.5" /> AI-Suggested</>
                          ) : (
                            <><ListOrdered className="w-3.5 h-3.5" /> Keyword Queue</>
                          )}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {job.totalGenerated ?? 0} generated
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-slate-400">Next run</p>
                      <p className="text-sm font-medium text-slate-700">{formatNextRun(job.nextRunAt)}</p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
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

                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATE JOB DIALOG
// ============================================================

function CreateJobDialog({ projectId, onClose }: { projectId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();

  const [name, setName] = useState("");
  const [keywordSource, setKeywordSource] = useState<"queue" | "ai">("queue");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourUtc, setHourUtc] = useState(8);
  const [targetWordCount, setTargetWordCount] = useState(2000);
  const [numSections, setNumSections] = useState(8);
  const [numFaqs, setNumFaqs] = useState(5);
  const [contentType, setContentType] = useState("blog");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">("html");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [keywordsText, setKeywordsText] = useState("");

  // Load brand voices and ICP profiles for the project
  const { data: brandVoices } = trpc.brandVoice.list.useQuery({ projectId });
  const { data: icpProfiles } = trpc.icp.list.useQuery({ projectId });
  const [brandVoiceId, setBrandVoiceId] = useState<number | undefined>();
  const [icpProfileId, setIcpProfileId] = useState<number | undefined>();

  const createMutation = trpc.scheduler.createJob.useMutation({
    onSuccess: (job) => {
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Scheduled job created!");
      onClose();
      if (job) navigate(`/scheduler/${job.id}`);
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

    if (keywordSource === "queue" && (!keywords || keywords.length === 0)) {
      toast.error("Please add at least one keyword to the queue");
      return;
    }

    createMutation.mutate({
      name: name.trim(),
      keywordSource,
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : undefined,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : undefined,
      hourUtc,
      articleSettings: {
        targetWordCount,
        numSections,
        numFaqs,
        contentType,
        outputFormat,
        brandVoiceId,
        icpProfileId,
        additionalInstructions: additionalInstructions.trim() || undefined,
      },
      projectId,
      keywords,
    });
  };

  return (
    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-indigo-500" />
          Create Scheduled Job
        </DialogTitle>
        <DialogDescription>
          Set up automated article generation on a recurring schedule.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Job Name */}
        <div className="space-y-2">
          <Label>Job Name</Label>
          <Input
            placeholder="e.g., Weekly Medicare Blog Posts"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Keyword Source */}
        <div className="space-y-2">
          <Label>Keyword Source</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setKeywordSource("queue")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "queue"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <ListOrdered className={`w-5 h-5 mb-2 ${keywordSource === "queue" ? "text-indigo-600" : "text-slate-400"}`} />
              <p className="font-medium text-sm">Keyword Queue</p>
              <p className="text-xs text-slate-500 mt-1">Pre-load keywords; processes one per run</p>
            </button>
            <button
              type="button"
              onClick={() => setKeywordSource("ai")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "ai"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Sparkles className={`w-5 h-5 mb-2 ${keywordSource === "ai" ? "text-indigo-600" : "text-slate-400"}`} />
              <p className="font-medium text-sm">AI-Suggested</p>
              <p className="text-xs text-slate-500 mt-1">AI picks the best topic each run</p>
            </button>
          </div>
        </div>

        {/* Keywords (queue mode only) */}
        {keywordSource === "queue" && (
          <div className="space-y-2">
            <Label>Keywords (one per line)</Label>
            <Textarea
              placeholder={"medicare advantage plans 2026\nmedicare part d coverage\nmedicare supplement insurance\n..."}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={5}
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">
              {keywordsText.split("\n").filter(k => k.trim()).length} keyword(s) added
            </p>
          </div>
        )}

        <Separator />

        {/* Schedule */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Schedule</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label className="text-sm">Day of Week</Label>
                <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label className="text-sm">Day of Month</Label>
                <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Time (UTC)</Label>
              <Select value={String(hourUtc)} onValueChange={(v) => setHourUtc(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {String(h).padStart(2, "0")}:00 UTC
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator />

        {/* Article Settings */}
        <div className="space-y-4">
          <Label className="text-base font-semibold">Article Settings</Label>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Word Count</Label>
              <Input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)}
                min={500}
                max={10000}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Sections (H2)</Label>
              <Input
                type="number"
                value={numSections}
                onChange={(e) => setNumSections(parseInt(e.target.value) || 8)}
                min={3}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">FAQs</Label>
              <Input
                type="number"
                value={numFaqs}
                onChange={(e) => setNumFaqs(parseInt(e.target.value) || 5)}
                min={0}
                max={15}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="guide">Guide</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="listicle">Listicle</SelectItem>
                  <SelectItem value="how-to">How-To</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Output Format</Label>
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="plaintext">Plain Text</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Brand Voice & ICP */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Brand Voice</Label>
              <Select
                value={brandVoiceId ? String(brandVoiceId) : "default"}
                onValueChange={(v) => setBrandVoiceId(v === "default" ? undefined : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  {brandVoices?.map((bv: any) => (
                    <SelectItem key={bv.id} value={String(bv.id)}>{bv.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">ICP Profile</Label>
              <Select
                value={icpProfileId ? String(icpProfileId) : "default"}
                onValueChange={(v) => setIcpProfileId(v === "default" ? undefined : parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Project Default</SelectItem>
                  {icpProfiles?.map((icp: any) => (
                    <SelectItem key={icp.id} value={String(icp.id)}>{icp.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Instructions */}
          <div className="space-y-2">
            <Label className="text-sm">Additional Instructions (optional)</Label>
            <Textarea
              placeholder="Any specific instructions for the AI writer..."
              value={additionalInstructions}
              onChange={(e) => setAdditionalInstructions(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleCreate}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
          ) : (
            <><Plus className="w-4 h-4 mr-2" /> Create Job</>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// JOB DETAIL VIEW
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
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-slate-300" />
        <h2 className="text-xl font-semibold text-slate-700">Job Not Found</h2>
        <Button variant="outline" className="mt-4" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-2" />
          Back to Scheduler
        </Button>
      </div>
    );
  }

  const settings = job.articleSettings as any ?? {};
  const pendingKeywords = keywords?.filter(k => k.status === "pending") ?? [];
  const completedKeywords = keywords?.filter(k => k.status === "completed") ?? [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{job.name}</h1>
              <Badge variant={
                job.status === "active" ? "default" :
                job.status === "paused" ? "secondary" : "outline"
              } className={`${
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
            <p className="text-sm text-slate-500 mt-0.5">
              {job.frequency} at {job.hourUtc}:00 UTC &middot; {job.keywordSource === "ai" ? "AI-Suggested" : "Keyword Queue"} &middot; {job.totalGenerated ?? 0} articles generated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => runNowMutation.mutate({ jobId: job.id })}
            disabled={runNowMutation.isPending || !!job.isRunning}
          >
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
              if (confirm("Delete this scheduled job? This cannot be undone.")) {
                deleteMutation.mutate({ id: job.id });
              }
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
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

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Schedule Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" />
                  Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Frequency</span>
                  <span className="text-sm font-medium capitalize">{job.frequency}</span>
                </div>
                {job.frequency === "weekly" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Day</span>
                    <span className="text-sm font-medium">{DAYS_OF_WEEK[job.dayOfWeek ?? 1]}</span>
                  </div>
                )}
                {job.frequency === "monthly" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Day of Month</span>
                    <span className="text-sm font-medium">{job.dayOfMonth ?? 1}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Time</span>
                  <span className="text-sm font-medium">{job.hourUtc}:00 UTC</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Next Run</span>
                  <span className="text-sm font-medium">{formatNextRun(job.nextRunAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Last Run</span>
                  <span className="text-sm font-medium">
                    {job.lastRunAt ? new Date(job.lastRunAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Never"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Article Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  Article Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Word Count</span>
                  <span className="text-sm font-medium">{settings.targetWordCount ?? 2000}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Sections</span>
                  <span className="text-sm font-medium">{settings.numSections ?? 8}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">FAQs</span>
                  <span className="text-sm font-medium">{settings.numFaqs ?? 5}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Content Type</span>
                  <span className="text-sm font-medium capitalize">{settings.contentType ?? "blog"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Output Format</span>
                  <span className="text-sm font-medium uppercase">{settings.outputFormat ?? "html"}</span>
                </div>
                {settings.additionalInstructions && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-slate-500">Instructions</span>
                      <p className="text-sm mt-1 text-slate-700">{settings.additionalInstructions}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords Tab */}
        {job.keywordSource === "queue" && (
          <TabsContent value="keywords" className="mt-4">
            <KeywordQueueManager jobId={jobId} />
          </TabsContent>
        )}

        {/* Run History Tab */}
        <TabsContent value="history" className="mt-4">
          <RunHistoryView runs={runHistory ?? []} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// KEYWORD QUEUE MANAGER
// ============================================================

function KeywordQueueManager({ jobId }: { jobId: number }) {
  const utils = trpc.useUtils();
  const [newKeywords, setNewKeywords] = useState("");
  const [, navigate] = useLocation();

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

  return (
    <div className="space-y-6">
      {/* Add Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Keywords</CardTitle>
          <CardDescription>Enter keywords one per line to add them to the queue.</CardDescription>
        </CardHeader>
        <CardContent>
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
        <div className="p-3 bg-slate-50 rounded-lg text-center">
          <p className="text-xl font-bold text-slate-900">{pendingKeywords.length}</p>
          <p className="text-xs text-slate-500">Pending</p>
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
        <div className="text-center py-8 text-slate-500">
          <ListOrdered className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p>No keywords in queue yet. Add some above.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {keywords.map((kw, index) => (
            <div
              key={kw.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                kw.status === "completed" ? "bg-green-50/50 border-green-100" :
                kw.status === "failed" ? "bg-red-50/50 border-red-100" :
                kw.status === "processing" ? "bg-blue-50/50 border-blue-100" :
                "bg-white border-slate-100"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-slate-400 w-6 text-right">{index + 1}</span>
                {kw.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : kw.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : kw.status === "processing" ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className={`text-sm truncate ${kw.status === "completed" ? "text-slate-500 line-through" : "text-slate-900"}`}>
                  {kw.keyword}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {kw.status === "completed" && kw.generatedArticleId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                    onClick={() => navigate(`/articles/${kw.generatedArticleId}`)}
                  >
                    View Article
                  </Button>
                )}
                {kw.status === "failed" && kw.errorMessage && (
                  <span className="text-xs text-red-500 max-w-48 truncate" title={kw.errorMessage}>
                    {kw.errorMessage}
                  </span>
                )}
                {kw.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-red-500"
                    onClick={() => removeMutation.mutate({ id: kw.id })}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// RUN HISTORY VIEW
// ============================================================

function RunHistoryView({ runs }: { runs: any[] }) {
  const [, navigate] = useLocation();

  if (!runs.length) {
    return (
      <div className="text-center py-12 text-slate-500">
        <History className="w-10 h-10 mx-auto mb-3 text-slate-300" />
        <p>No runs yet. The first run will appear here after the job executes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => (
        <div
          key={run.id}
          className={`flex items-center justify-between p-4 rounded-lg border ${
            run.status === "completed" ? "border-green-100 bg-green-50/30" :
            run.status === "failed" ? "border-red-100 bg-red-50/30" :
            "border-blue-100 bg-blue-50/30"
          }`}
        >
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
                <span className="text-sm font-medium text-slate-900 truncate">{run.keyword}</span>
                <Badge variant="outline" className="text-xs">
                  {run.keywordSource === "ai" ? "AI" : "Queue"}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                <span>{new Date(run.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                <span>{formatDuration(run.durationMs)}</span>
                {run.status === "failed" && run.errorMessage && (
                  <span className="text-red-500 truncate max-w-64" title={run.errorMessage}>
                    {run.errorMessage}
                  </span>
                )}
              </div>
            </div>
          </div>

          {run.status === "completed" && run.articleId && (
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => navigate(`/articles/${run.articleId}`)}
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              View Article
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
