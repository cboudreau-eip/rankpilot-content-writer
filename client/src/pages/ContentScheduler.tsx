import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
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
  ArrowRight,
  Settings2,
  History,
  Pencil,
  Save,
  ChevronDown,
  ChevronRight,
  Link2,
  Globe,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// US Eastern Time helpers — uses dynamic offset to handle EST (UTC-5) and EDT (UTC-4) correctly

/** Get the current ET offset from UTC (4 in summer EDT, 5 in winter EST) */
function getEtOffset(): number {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const etHour = parseInt(
    now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", hour12: false })
  );
  return (utcHour - etHour + 24) % 24;
}

/** Convert an ET hour (0-23) to UTC hour (0-23) for storage */
function etHourToUtc(etHour: number): number {
  return (etHour + getEtOffset()) % 24;
}

/** Convert a stored UTC hour (0-23) to ET hour (0-23) for display */
function utcHourToEt(utcHour: number): number {
  return (utcHour - getEtOffset() + 24) % 24;
}

/** Format an ET hour as a human-readable 12-hour string, e.g. "9:00 AM ET" */
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

function formatDuration(ms: number | null): string {
  if (!ms) return "—";
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// ============================================================
// EXPORTED TAB COMPONENT — used inside ProjectSettings
// ============================================================

export function SchedulerTab({ projectId }: { projectId: number }) {
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

// ============================================================
// JOB LIST VIEW
// ============================================================

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
      toast.success("Job execution started! You'll be notified when the article is ready.");
    },
    onError: (err) => toast.error(err.message),
  });

  const activeJobs = jobs?.filter((j) => j.status === "active") ?? [];
  const pausedJobs = jobs?.filter((j) => j.status === "paused") ?? [];
  const completedJobs = jobs?.filter((j) => j.status === "completed") ?? [];

  return (
    <div className="space-y-4">
      {/* Header row: stats + action */}
      <div className="flex items-center justify-between gap-4">
        {/* Inline stats bar */}
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
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-muted text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-semibold">{completedJobs.length}</span>
            <span className="text-muted-foreground/70">completed</span>
          </div>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
              <Plus className="w-4 h-4 mr-2" />
              New Scheduled Job
            </Button>
          </DialogTrigger>
          <CreateJobDialog
            projectId={projectId}
            onClose={() => setShowCreateDialog(false)}
            onCreated={(jobId) => onSelectJob(jobId)}
          />
        </Dialog>
      </div>

      {/* Job List */}
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
              Create your first scheduled job to automate article generation for this project.
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
                        <span>
                          {job.totalGenerated ?? 0} generated
                        </span>
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
      {/* Edit Job Dialog */}
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
// CREATE JOB DIALOG
// ============================================================

function CreateJobDialog({ projectId, onClose, onCreated }: { projectId: number; onClose: () => void; onCreated: (jobId: number) => void }) {
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [keywordSource, setKeywordSource] = useState<"queue" | "ai">("queue");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [dayOfWeek, setDayOfWeek] = useState(1); // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [hourEt, setHourEt] = useState(9); // 9 AM ET = 14:00 UTC
  const [targetWordCount, setTargetWordCount] = useState(2000);
  const [numSections, setNumSections] = useState(8);
  const [numFaqs, setNumFaqs] = useState(5);
  const [contentType, setContentType] = useState("blog");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">("html");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [keywordsText, setKeywordsText] = useState("");
  const [tone, setTone] = useState("professional");
  const [targetLocation, setTargetLocation] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [autoLinkCount, setAutoLinkCount] = useState(5);
  const [researchEnabled, setResearchEnabled] = useState(true);
  const [autoGradeEnabled, setAutoGradeEnabled] = useState(false);
  const [targetGrade, setTargetGrade] = useState("A-");
  const [maxGradeIterations, setMaxGradeIterations] = useState(2);
  const [suggestKeywordsEnabled, setSuggestKeywordsEnabled] = useState(true);
  const [manualLinks, setManualLinks] = useState<{ url: string; anchorText: string }[]>([]);
  const [selectedSitemapUrls, setSelectedSitemapUrls] = useState<string[]>([]);

  // Load brand voices, ICP profiles, and sitemaps for the project
  const { data: brandVoices } = trpc.brandVoices.list.useQuery({ projectId });
  const { data: icpProfiles } = trpc.icpProfiles.list.useQuery({ projectId });
  const { data: sitemaps } = trpc.sitemaps.list.useQuery({ projectId });
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
        targetLocation: targetLocation.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        autoLinkCount: autoLinkCount > 0 ? autoLinkCount : undefined,
        researchEnabled,
        autoGradeEnabled: autoGradeEnabled || undefined,
        targetGrade: autoGradeEnabled ? targetGrade : undefined,
        maxGradeIterations: autoGradeEnabled ? maxGradeIterations : undefined,
        brandVoiceId,
        icpProfileId,
        suggestKeywordsEnabled,
        manualLinks: manualLinks.length > 0 ? manualLinks.filter(l => l.url.trim()) : undefined,
        sitemapUrls: selectedSitemapUrls.length > 0 ? selectedSitemapUrls : undefined,
      },
      keywords,
    });
  };

  return (
    <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl">Create Scheduled Job</DialogTitle>
        <DialogDescription>
          Set up automated article generation. Articles will be generated as drafts for your review.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Job Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Job Name</Label>
          <Input
            placeholder="e.g., Weekly Medicare Blog Posts"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        {/* Keyword Source */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Keyword Source</Label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setKeywordSource("queue")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "queue"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-border hover:border-indigo-200"
              }`}
            >
              <ListOrdered className={`w-5 h-5 mb-2 ${keywordSource === "queue" ? "text-indigo-600" : "text-muted-foreground"}`} />
              <p className="font-medium text-sm">Keyword Queue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pre-load keywords, picks next one each run</p>
            </button>
            <button
              onClick={() => setKeywordSource("ai")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                keywordSource === "ai"
                  ? "border-indigo-500 bg-indigo-50"
                  : "border-border hover:border-indigo-200"
              }`}
            >
              <Sparkles className={`w-5 h-5 mb-2 ${keywordSource === "ai" ? "text-indigo-600" : "text-muted-foreground"}`} />
              <p className="font-medium text-sm">AI-Suggested</p>
              <p className="text-xs text-muted-foreground mt-0.5">AI picks the best topic based on your ICP</p>
            </button>
          </div>
        </div>

        {/* Initial Keywords (for queue mode) */}
        {keywordSource === "queue" && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Initial Keywords (one per line)</Label>
            <Textarea
              placeholder={"medicare advantage plans 2026\nmedicare part d coverage\nmedicare supplement insurance"}
              value={keywordsText}
              onChange={(e) => setKeywordsText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              You can add more keywords later from the job detail view.
            </p>
          </div>
        )}

        {/* Schedule */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Schedule</Label>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
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
                <Label className="text-xs text-muted-foreground">Day</Label>
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
                <Label className="text-xs text-muted-foreground">Day of Month</Label>
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
              <Label className="text-xs text-muted-foreground">Time (ET)</Label>
              <Select value={String(hourEt)} onValueChange={(v) => setHourEt(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ET_HOURS.map((h) => (
                    <SelectItem key={h} value={String(h)}>{formatEtHour(h)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Article Settings */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Article Settings</Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Word Count</Label>
              <Input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(parseInt(e.target.value) || 2000)}
                min={500}
                max={10000}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Sections</Label>
              <Input
                type="number"
                value={numSections}
                onChange={(e) => setNumSections(parseInt(e.target.value) || 8)}
                min={3}
                max={20}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">FAQs</Label>
              <Input
                type="number"
                value={numFaqs}
                onChange={(e) => setNumFaqs(parseInt(e.target.value) || 5)}
                min={0}
                max={15}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Content Type</Label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blog">Blog Post</SelectItem>
                  <SelectItem value="comparison">Comparison</SelectItem>
                  <SelectItem value="guide">How-To Guide</SelectItem>
                  <SelectItem value="listicle">Listicle</SelectItem>
                  <SelectItem value="pillar">Pillar Page</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="case-study">Case Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Output Format */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Output Format</Label>
          <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="plaintext">Plain Text</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="conversational">Conversational</SelectItem>
              <SelectItem value="authoritative">Authoritative</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="academic">Academic</SelectItem>
              <SelectItem value="persuasive">Persuasive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Target Location & Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g., New York, NY"
              value={targetLocation}
              onChange={(e) => setTargetLocation(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Audience <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g., seniors 65+"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
          </div>
        </div>

        {/* Suggest Keywords */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Auto-Suggest Secondary Keywords
              </p>
              <p className="text-xs text-muted-foreground">On each run, AI suggests 4 related + 2 LSI + 2 long-tail keywords for the primary keyword.</p>
            </div>
            <button
              type="button"
              onClick={() => setSuggestKeywordsEnabled(!suggestKeywordsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${suggestKeywordsEnabled ? "bg-indigo-600" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${suggestKeywordsEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Sitemap Picker */}
        {sitemaps && sitemaps.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Sitemaps for Internal Linking
            </Label>
            <p className="text-xs text-muted-foreground">Select sitemaps to resolve URLs for internal linking. If none selected, all project sitemaps are used.</p>
            <div className="space-y-2 max-h-32 overflow-y-auto rounded-md border border-border/60 p-3">
              {sitemaps.map((sm: any) => (
                <label key={sm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedSitemapUrls.includes(sm.url)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSitemapUrls(prev => [...prev, sm.url]);
                      } else {
                        setSelectedSitemapUrls(prev => prev.filter(u => u !== sm.url));
                      }
                    }}
                  />
                  <span className="truncate">{sm.url}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Manual Links */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Manual Links <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground">Force specific internal links with custom anchor text into every article.</p>
          {manualLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder="https://example.com/page"
                value={link.url}
                onChange={(e) => {
                  const updated = [...manualLinks];
                  updated[idx] = { ...updated[idx], url: e.target.value };
                  setManualLinks(updated);
                }}
                className="flex-1"
              />
              <Input
                placeholder="anchor text"
                value={link.anchorText}
                onChange={(e) => {
                  const updated = [...manualLinks];
                  updated[idx] = { ...updated[idx], anchorText: e.target.value };
                  setManualLinks(updated);
                }}
                className="w-40"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setManualLinks(manualLinks.filter((_, i) => i !== idx))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManualLinks([...manualLinks, { url: "", anchorText: "" }])}
          >
            <Plus className="w-3 h-3 mr-1" /> Add Link
          </Button>
        </div>

        {/* Auto-Link Count & Research */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-Link Count</Label>
            <Input
              type="number"
              value={autoLinkCount}
              onChange={(e) => setAutoLinkCount(parseInt(e.target.value) || 0)}
              min={0}
              max={20}
            />
            <p className="text-xs text-muted-foreground">Internal links to auto-insert from sitemap</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Research Mode</Label>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setResearchEnabled(!researchEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  researchEnabled ? "bg-indigo-600" : "bg-muted"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                    researchEnabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
              <span className="text-sm text-muted-foreground">
                {researchEnabled ? "Enabled" : "Disabled"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Run web research before generating</p>
          </div>
        </div>

        {/* Brand Voice & ICP */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Voice</Label>
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
            <Label className="text-sm font-medium">ICP Profile</Label>
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

        {/* Enable Grading */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enable Grading</p>
              <p className="text-xs text-muted-foreground">Grade and iteratively improve the article after generation.</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoGradeEnabled(!autoGradeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoGradeEnabled ? "bg-indigo-600" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${autoGradeEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {autoGradeEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Grade</Label>
                <Select value={targetGrade} onValueChange={setTargetGrade}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["A", "A-", "B+", "B", "B-", "C+", "C"].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Iterations</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={maxGradeIterations}
                  onChange={(e) => setMaxGradeIterations(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                />
              </div>
            </div>
          )}
        </div>

        {/* Additional Instructions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Additional Instructions (optional)</Label>
          <Textarea
            placeholder="Any specific instructions for the AI writer..."
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            rows={3}
          />
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
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Create Job
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

// ============================================================
// EDIT JOB DIALOG
// ============================================================

function EditJobDialog({ job, projectId, onClose }: { job: any; projectId: number; onClose: () => void }) {
  const utils = trpc.useUtils();
  const settings = (job.articleSettings as any) ?? {};

  const [name, setName] = useState(job.name ?? "");
  const [keywordSource, setKeywordSource] = useState<"queue" | "ai">(job.keywordSource ?? "queue");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">(job.frequency ?? "weekly");
  const [dayOfWeek, setDayOfWeek] = useState(job.dayOfWeek ?? 1);
  const [dayOfMonth, setDayOfMonth] = useState(job.dayOfMonth ?? 1);
  const [hourEt, setHourEt] = useState(utcHourToEt(job.hourUtc ?? 14)); // convert stored UTC to ET for display
  const [targetWordCount, setTargetWordCount] = useState(settings.targetWordCount ?? 2000);
  const [numSections, setNumSections] = useState(settings.numSections ?? 8);
  const [numFaqs, setNumFaqs] = useState(settings.numFaqs ?? 5);
  const [contentType, setContentType] = useState(settings.contentType ?? "blog");
  const [outputFormat, setOutputFormat] = useState<"html" | "plaintext">(settings.outputFormat ?? "html");
  const [additionalInstructions, setAdditionalInstructions] = useState(settings.additionalInstructions ?? "");
  const [tone, setTone] = useState(settings.tone ?? "professional");
  const [targetLocation, setTargetLocation] = useState(settings.targetLocation ?? "");
  const [targetAudience, setTargetAudience] = useState(settings.targetAudience ?? "");
  const [autoLinkCount, setAutoLinkCount] = useState(settings.autoLinkCount ?? 5);
  const [researchEnabled, setResearchEnabled] = useState(settings.researchEnabled !== false);
  const [autoGradeEnabled, setAutoGradeEnabled] = useState(!!settings.autoGradeEnabled);
  const [targetGrade, setTargetGrade] = useState(settings.targetGrade ?? "A-");
  const [maxGradeIterations, setMaxGradeIterations] = useState(settings.maxGradeIterations ?? 2);
  const [suggestKeywordsEnabled, setSuggestKeywordsEnabled] = useState(settings.suggestKeywordsEnabled !== false);
  const [manualLinks, setManualLinks] = useState<{ url: string; anchorText: string }[]>(settings.manualLinks ?? []);
  const [selectedSitemapUrls, setSelectedSitemapUrls] = useState<string[]>(settings.sitemapUrls ?? []);

  const { data: brandVoices } = trpc.brandVoices.list.useQuery({ projectId });
  const { data: icpProfiles } = trpc.icpProfiles.list.useQuery({ projectId });
  const { data: sitemaps } = trpc.sitemaps.list.useQuery({ projectId });
  const [brandVoiceId, setBrandVoiceId] = useState<number | undefined>(settings.brandVoiceId);
  const [icpProfileId, setIcpProfileId] = useState<number | undefined>(settings.icpProfileId);

  const updateMutation = trpc.scheduler.updateJob.useMutation({
    onSuccess: () => {
      utils.scheduler.getJob.invalidate({ id: job.id });
      utils.scheduler.listJobs.invalidate({ projectId });
      toast.success("Job updated!");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Please enter a job name");
      return;
    }
    updateMutation.mutate({
      id: job.id,
      name: name.trim(),
      keywordSource,
      frequency,
      dayOfWeek: frequency === "weekly" ? dayOfWeek : null,
      dayOfMonth: frequency === "monthly" ? dayOfMonth : null,
      hourUtc: etHourToUtc(hourEt),
      articleSettings: {
        targetWordCount,
        numSections,
        numFaqs,
        contentType,
        outputFormat,
        additionalInstructions: additionalInstructions.trim() || undefined,
        tone,
        targetLocation: targetLocation.trim() || undefined,
        targetAudience: targetAudience.trim() || undefined,
        autoLinkCount: autoLinkCount > 0 ? autoLinkCount : undefined,
        researchEnabled,
        autoGradeEnabled: autoGradeEnabled || undefined,
        targetGrade: autoGradeEnabled ? targetGrade : undefined,
        maxGradeIterations: autoGradeEnabled ? maxGradeIterations : undefined,
        brandVoiceId,
        icpProfileId,
        suggestKeywordsEnabled,
        manualLinks: manualLinks.length > 0 ? manualLinks.filter(l => l.url.trim()) : undefined,
        sitemapUrls: selectedSitemapUrls.length > 0 ? selectedSitemapUrls : undefined,
      },
    });
  };

  return (
    <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-xl">Edit Scheduled Job</DialogTitle>
        <DialogDescription>Update the settings for "{job.name}".</DialogDescription>
      </DialogHeader>

      <div className="space-y-6 py-4">
        {/* Job Name */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Job Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        {/* Keyword Source */}
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

        {/* Schedule */}
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

        {/* Article Settings */}
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
                  <SelectItem value="review">Review</SelectItem>
                  <SelectItem value="case-study">Case Study</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Output Format & Tone */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Output Format</Label>
            <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="html">HTML</SelectItem>
                <SelectItem value="plaintext">Plain Text</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
                <SelectItem value="authoritative">Authoritative</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="academic">Academic</SelectItem>
                <SelectItem value="persuasive">Persuasive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Target Location & Audience */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Location <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g., New York, NY" value={targetLocation} onChange={(e) => setTargetLocation(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Audience <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input placeholder="e.g., seniors 65+" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} />
          </div>
        </div>

        {/* Suggest Keywords */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-500" />
                Auto-Suggest Secondary Keywords
              </p>
              <p className="text-xs text-muted-foreground">On each run, AI suggests 4 related + 2 LSI + 2 long-tail keywords for the primary keyword.</p>
            </div>
            <button
              type="button"
              onClick={() => setSuggestKeywordsEnabled(!suggestKeywordsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${suggestKeywordsEnabled ? "bg-indigo-600" : "bg-muted"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${suggestKeywordsEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* Sitemap Picker */}
        {sitemaps && sitemaps.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Sitemaps for Internal Linking
            </Label>
            <p className="text-xs text-muted-foreground">Select sitemaps to resolve URLs for internal linking. If none selected, all project sitemaps are used.</p>
            <div className="space-y-2 max-h-32 overflow-y-auto rounded-md border border-border/60 p-3">
              {sitemaps.map((sm: any) => (
                <label key={sm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedSitemapUrls.includes(sm.url)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedSitemapUrls(prev => [...prev, sm.url]);
                      } else {
                        setSelectedSitemapUrls(prev => prev.filter(u => u !== sm.url));
                      }
                    }}
                  />
                  <span className="truncate">{sm.url}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Manual Links */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Link2 className="w-4 h-4 text-muted-foreground" />
            Manual Links <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <p className="text-xs text-muted-foreground">Force specific internal links with custom anchor text into every article.</p>
          {manualLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                placeholder="https://example.com/page"
                value={link.url}
                onChange={(e) => {
                  const updated = [...manualLinks];
                  updated[idx] = { ...updated[idx], url: e.target.value };
                  setManualLinks(updated);
                }}
                className="flex-1"
              />
              <Input
                placeholder="anchor text"
                value={link.anchorText}
                onChange={(e) => {
                  const updated = [...manualLinks];
                  updated[idx] = { ...updated[idx], anchorText: e.target.value };
                  setManualLinks(updated);
                }}
                className="w-40"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => setManualLinks(manualLinks.filter((_, i) => i !== idx))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setManualLinks([...manualLinks, { url: "", anchorText: "" }])}
          >
            <Plus className="w-3 h-3 mr-1" /> Add Link
          </Button>
        </div>

        {/* Auto-Link Count & Research */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Auto-Link Count</Label>
            <Input type="number" value={autoLinkCount} onChange={(e) => setAutoLinkCount(parseInt(e.target.value) || 0)} min={0} max={20} />
            <p className="text-xs text-muted-foreground">Internal links to auto-insert from sitemap</p>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Research Mode</Label>
            <div className="flex items-center gap-3 pt-2">
              <button type="button" onClick={() => setResearchEnabled(!researchEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${researchEnabled ? "bg-indigo-600" : "bg-muted"}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${researchEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </button>
              <span className="text-sm text-muted-foreground">{researchEnabled ? "Enabled" : "Disabled"}</span>
            </div>
            <p className="text-xs text-muted-foreground">Run web research before generating</p>
          </div>
        </div>

        {/* Brand Voice & ICP */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Brand Voice</Label>
            <Select value={brandVoiceId ? String(brandVoiceId) : "default"} onValueChange={(v) => setBrandVoiceId(v === "default" ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default</SelectItem>
                {brandVoices?.map((bv: any) => (
                  <SelectItem key={bv.id} value={String(bv.id)}>{bv.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">ICP Profile</Label>
            <Select value={icpProfileId ? String(icpProfileId) : "default"} onValueChange={(v) => setIcpProfileId(v === "default" ? undefined : parseInt(v))}>
              <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Project Default</SelectItem>
                {icpProfiles?.map((icp: any) => (
                  <SelectItem key={icp.id} value={String(icp.id)}>{icp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enable Grading */}
        <div className="rounded-lg border border-border/60 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Enable Grading</p>
              <p className="text-xs text-muted-foreground">Grade and iteratively improve the article after generation.</p>
            </div>
            <button type="button" onClick={() => setAutoGradeEnabled(!autoGradeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${autoGradeEnabled ? "bg-indigo-600" : "bg-muted"}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${autoGradeEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {autoGradeEnabled && (
            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Target Grade</Label>
                <Select value={targetGrade} onValueChange={setTargetGrade}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["A", "A-", "B+", "B", "B-", "C+", "C"].map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Max Iterations</Label>
                <Input type="number" min={1} max={5} value={maxGradeIterations}
                  onChange={(e) => setMaxGradeIterations(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} />
              </div>
            </div>
          )}
        </div>

        {/* Additional Instructions */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Additional Instructions (optional)</Label>
          <Textarea placeholder="Any specific instructions for the AI writer..." value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)} rows={3} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button className="bg-indigo-600 hover:bg-indigo-700" onClick={handleSave} disabled={updateMutation.isPending}>
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
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
  const [showEditDialog, setShowEditDialog] = useState(false);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{job.name}</h2>
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
            <p className="text-sm text-muted-foreground mt-0.5">
              {job.frequency} at {formatEtHour(utcHourToEt(job.hourUtc ?? 0))} &middot; {job.keywordSource === "ai" ? "AI-Suggested" : "Keyword Queue"} &middot; {job.totalGenerated ?? 0} articles generated
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowEditDialog(true)}
          >
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
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

      {/* Edit Job Dialog */}
      {showEditDialog && (
        <Dialog open={showEditDialog} onOpenChange={(open) => { if (!open) setShowEditDialog(false); }}>
          <EditJobDialog
            job={job}
            projectId={projectId}
            onClose={() => setShowEditDialog(false)}
          />
        </Dialog>
      )}

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
                  <span className="text-sm text-muted-foreground">Frequency</span>
                  <span className="text-sm font-medium capitalize">{job.frequency}</span>
                </div>
                {job.frequency === "weekly" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Day</span>
                    <span className="text-sm font-medium">{DAYS_OF_WEEK[job.dayOfWeek ?? 1]}</span>
                  </div>
                )}
                {job.frequency === "monthly" && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Day of Month</span>
                    <span className="text-sm font-medium">{job.dayOfMonth ?? 1}</span>
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
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Output Format</span>
                  <span className="text-sm font-medium uppercase">{settings.outputFormat ?? "html"}</span>
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
        <div className="space-y-1">
          {keywords.map((kw, index) => (
            <div
              key={kw.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                kw.status === "completed" ? "bg-green-50/50 border-green-100" :
                kw.status === "failed" ? "bg-red-50/50 border-red-100" :
                kw.status === "processing" ? "bg-blue-50/50 border-blue-100" :
                "bg-background border-border"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs text-muted-foreground w-6 text-right">{index + 1}</span>
                {kw.status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : kw.status === "failed" ? (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                ) : kw.status === "processing" ? (
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                ) : (
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={`text-sm truncate ${kw.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                  {kw.keyword}
                </span>
                {kw.status === "completed" && kw.processedAt && (
                  <span className="text-xs text-muted-foreground ml-2 shrink-0">
                    {new Date(kw.processedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })} at {new Date(kw.processedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                  </span>
                )}
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
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
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
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null);

  if (!runs.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <History className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>No runs yet. The first run will appear here after the job executes.</p>
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
            <div
              className={`rounded-lg border ${
                run.status === "completed" ? "border-green-100 bg-green-50/30" :
                run.status === "failed" ? "border-red-100 bg-red-50/30" :
                "border-blue-100 bg-blue-50/30"
              }`}
            >
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
// RUN LOG TIMELINE — fetches and displays step-level logs for a run
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
        {/* Vertical timeline line */}
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

            // Detect keyword_suggestion entries with categorized metadata
            const isKeywordSuggestion =
              log.step === "keyword_suggestion" &&
              log.level === "success" &&
              log.metadata?.related;

            return (
              <div key={log.id ?? idx} className="flex items-start gap-3 relative">
                <div className={`shrink-0 z-10 bg-card dark:bg-background rounded-full p-0.5 ${stepConfig.color}`}>
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
                              <span
                                key={kw}
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${chipClass}`}
                              >
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
