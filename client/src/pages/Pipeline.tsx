import { useState, useEffect } from "react";
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
  Sparkles,
  Send,
  Calendar,
  Pencil,
  Hash,
  Link2,
  BookOpen,
  Target,
  Tags,
  RotateCcw,
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
  const [activeTab, setActiveTab] = useState("briefs");

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
            Ingest content ideas from S3, review AI-generated briefs, and send approved topics to the Content Scheduler.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="briefs" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Briefs
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

        <TabsContent value="briefs" className="mt-6">
          <BriefsTab projectId={activeProject.id} />
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

// ---- Briefs Tab (Main Review Interface) ----
function BriefsTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: briefs, isLoading } = trpc.pipeline.getBriefs.useQuery({ projectId, status: "pending_review" });
  const { data: scheduledJobs } = trpc.pipeline.getScheduledJobs.useQuery({ projectId });
  const [editingBriefId, setEditingBriefId] = useState<number | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveBriefId, setApproveBriefId] = useState<number | null>(null);
  const [bulkApproveDialogOpen, setBulkApproveDialogOpen] = useState(false);
  const [selectedBriefs, setSelectedBriefs] = useState<Set<number>>(new Set());
  const [selectedScheduledJobId, setSelectedScheduledJobId] = useState<string>("");

  const approveMutation = trpc.pipeline.approveBrief.useMutation({
    onSuccess: () => {
      toast.success("Brief approved and sent to Scheduler queue.");
      setApproveDialogOpen(false);
      setApproveBriefId(null);
      utils.pipeline.getBriefs.invalidate();
      utils.pipeline.getJobs.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const bulkApproveMutation = trpc.pipeline.bulkApproveBriefs.useMutation({
    onSuccess: (result) => {
      toast.success(`${result.approved} brief${result.approved !== 1 ? "s" : ""} approved. ${result.failed > 0 ? `${result.failed} failed.` : ""}`);
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

  if (!briefs || briefs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-3" />
          <h3 className="text-lg font-semibold">No Briefs to Review</h3>
          <p className="text-muted-foreground text-sm mt-1 text-center max-w-sm">
            Run a poll from the Settings tab to ingest content from your S3 bucket. The AI will generate briefs for each article.
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
          <p className="text-sm text-muted-foreground">{briefs.length} brief{briefs.length !== 1 ? "s" : ""} awaiting review</p>
          {selectedBriefs.size > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedBriefs.size} selected
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            {selectedBriefs.size === briefs.length ? "Deselect All" : "Select All"}
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

      {briefs.map((brief: any) => (
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

      {/* Approve Dialog (single) */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Approve Brief
            </DialogTitle>
            <DialogDescription>
              Choose which Scheduled Job to send this keyword to. The Scheduler will generate the article using its configured settings.
            </DialogDescription>
          </DialogHeader>

          {queueModeJobs.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No Scheduled Jobs with "Keyword Queue" source found.</p>
              <p className="text-xs mt-1">Create one in the Content Scheduler first.</p>
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

// ---- Brief Card (Editable) ----
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
          {/* Checkbox */}
          <div className="pt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelect}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">AI-Generated Brief</span>
              {brief.editedFields && brief.editedFields.length > 0 && (
                <Badge variant="secondary" className="text-xs">Edited</Badge>
              )}
            </div>

            {isEditing ? (
              /* ---- Edit Mode ---- */
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
                        <button
                          onClick={() => removeSecondaryKeyword(kw)}
                          className="ml-1 hover:text-red-600 transition-colors"
                        >
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
              /* ---- View Mode ---- */
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

          {/* Actions */}
          {!isEditing && (
            <div className="flex flex-col items-end gap-2 shrink-0">
              <Button
                size="sm"
                onClick={onApprove}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={onRegenerate}
              >
                <RotateCcw className="w-4 h-4 mr-1.5" />
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={onReject}
              >
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
      utils.pipeline.getBriefs.invalidate();
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
  const [initialized, setInitialized] = useState(false);

  // Initialize form from settings
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
            Fetch new files from the S3 bucket and generate AI briefs for each article found.
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

      {/* How it Works Card */}
      <Card className="border-purple-200 bg-purple-50/30">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="font-medium text-sm">How the Pipeline Works</h4>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1.5 list-decimal list-inside">
                <li>Click "Run Poll Now" to fetch new JSON files from your S3 bucket</li>
                <li>The AI analyzes each article and generates a <strong>Brief</strong> (title, keyword, description, etc.)</li>
                <li>Review briefs in the <strong>Briefs</strong> tab - edit any fields as needed</li>
                <li>Approve briefs to send them to the Content Scheduler's keyword queue</li>
                <li>The Scheduler generates the full article with your configured settings</li>
              </ol>
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
