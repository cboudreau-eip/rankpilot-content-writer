import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Search, Loader2, Download, Upload, Plus, Trash2,
  KeyRound, ArrowUpDown, ArrowUp, ArrowDown,
  FileText, ExternalLink, Link2, X, Check, Info,
  CheckCircle2,
} from "lucide-react";

// ---- Helpers ----

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(vol >= 10_000 ? 0 : 1)}K`;
  return vol.toString();
}

function formatTotalVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}K`;
  return vol.toString();
}

// ---- Priority Badge ----

function PriorityBadge({ priority, label }: { priority: number; label: string }) {
  const colors = label === "High"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : label === "Med"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${colors} font-medium`}>
      {priority} · {label}
    </Badge>
  );
}

// ---- Competition Badge ----

function CompetitionBadge({ label }: { label: string }) {
  const colors = label === "High"
    ? "bg-red-50 text-red-600 border-red-200"
    : label === "Medium" || label === "Med"
    ? "bg-amber-50 text-amber-600 border-amber-200"
    : "bg-emerald-50 text-emerald-600 border-emerald-200";
  const displayLabel = label === "Medium" ? "Med" : label;
  return (
    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${colors}`}>
      {displayLabel}
    </Badge>
  );
}

// ---- Status Badge ----

function StatusBadge({ status, articleId }: { status: string; articleId?: number | null }) {
  if (status === "article" && articleId) {
    return (
      <a href={`/articles/${articleId}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Article
      </a>
    );
  }
  if (status === "outline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600">
        <FileText className="w-3.5 h-3.5" />
        Outline
      </span>
    );
  }
  return <span className="text-xs text-muted-foreground">—</span>;
}

// ---- Sort Header ----

function SortHeader({
  label, field, currentSort, currentDir, onSort,
}: {
  label: string;
  field: string;
  currentSort: string;
  currentDir: "asc" | "desc";
  onSort: (field: string) => void;
}) {
  const isActive = currentSort === field;
  return (
    <button
      className={`inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider hover:text-foreground transition-colors ${isActive ? "text-indigo-600" : "text-muted-foreground"}`}
      onClick={() => onSort(field)}
    >
      {label}
      {isActive ? (
        currentDir === "desc" ? <ArrowDown className="w-3 h-3" /> : <ArrowUp className="w-3 h-3" />
      ) : (
        <ArrowUpDown className="w-3 h-3 opacity-40" />
      )}
    </button>
  );
}

// ---- Reusable Panel Component ----

interface ProjectKeywordsPanelProps {
  projectId: number;
  projectName: string;
  /** If true, renders without the outer page padding — for embedding in Dashboard */
  embedded?: boolean;
}

export function ProjectKeywordsPanel({ projectId, projectName, embedded }: ProjectKeywordsPanelProps) {
  // Search & sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [addKeywordsText, setAddKeywordsText] = useState("");
  const [importText, setImportText] = useState("");

  // Page URL editing
  const [editingPageId, setEditingPageId] = useState<number | null>(null);
  const [editingPageUrl, setEditingPageUrl] = useState("");

  // Query
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.entity.getProjectKeywords.useQuery(
    { projectId, search: searchQuery || undefined, sortBy, sortDir },
    { enabled: !!projectId, refetchOnWindowFocus: false },
  );

  // Mutations
  const deleteMutation = trpc.entity.deleteProjectKeywords.useMutation({
    onSuccess: (data) => {
      setSelectedIds(new Set());
      utils.entity.getProjectKeywords.invalidate();
      toast.success(`Deleted ${data.deleted} keyword${data.deleted !== 1 ? "s" : ""}`);
    },
    onError: (err) => toast.error(err.message || "Delete failed"),
  });

  const addManualMutation = trpc.entity.addKeywordsManually.useMutation({
    onSuccess: (data) => {
      setShowAddDialog(false);
      setAddKeywordsText("");
      utils.entity.getProjectKeywords.invalidate();
      toast.success(`Added ${data.inserted} keyword${data.inserted !== 1 ? "s" : ""}${data.skipped > 0 ? ` (${data.skipped} duplicates skipped)` : ""}`);
    },
    onError: (err) => toast.error(err.message || "Failed to add keywords"),
  });

  const importMutation = trpc.entity.importKeywords.useMutation({
    onSuccess: (data) => {
      setShowImportDialog(false);
      setImportText("");
      utils.entity.getProjectKeywords.invalidate();
      toast.success(`Imported ${data.inserted} keyword${data.inserted !== 1 ? "s" : ""}${data.skipped > 0 ? ` (${data.skipped} duplicates skipped)` : ""}`);
    },
    onError: (err) => toast.error(err.message || "Import failed"),
  });

  const updatePageMutation = trpc.entity.updateKeywordPage.useMutation({
    onSuccess: () => {
      setEditingPageId(null);
      utils.entity.getProjectKeywords.invalidate();
      toast.success("Page URL updated");
    },
    onError: (err) => toast.error(err.message || "Update failed"),
  });

  // Handlers
  const handleSort = useCallback((field: string) => {
    if (sortBy === field) {
      setSortDir(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
  }, [sortBy]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (!data) return;
    if (selectedIds.size === data.keywords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.keywords.map(k => k.id)));
    }
  }, [selectedIds, data]);

  const handleDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    deleteMutation.mutate({ ids: Array.from(selectedIds) });
  }, [selectedIds, deleteMutation]);

  const handleAddManual = useCallback(() => {
    const keywords = addKeywordsText
      .split("\n")
      .map(k => k.trim())
      .filter(k => k.length > 0);
    if (keywords.length === 0) {
      toast.error("Please enter at least one keyword");
      return;
    }
    addManualMutation.mutate({ projectId, keywords });
  }, [projectId, addKeywordsText, addManualMutation]);

  const handleImport = useCallback(() => {
    const lines = importText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      toast.error("Please paste keyword data");
      return;
    }
    // Try to detect CSV with headers
    const firstLine = lines[0].toLowerCase();
    const isCSV = firstLine.includes(",") && (firstLine.includes("keyword") || firstLine.includes("volume"));
    let keywords: { keyword: string; volume?: number; cpc?: number; competition?: number; kd?: number; position?: number }[] = [];
    if (isCSV) {
      const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
      const kwIdx = headers.findIndex(h => h.includes("keyword") || h === "kw" || h === "query" || h === "search term");
      const volIdx = headers.findIndex(h => h.includes("volume") || h === "vol" || h.includes("search vol") || h.includes("traffic"));
      const cpcIdx = headers.findIndex(h => h.includes("cpc") || h.includes("cost"));
      const compIdx = headers.findIndex(h => h.includes("competition") || h.includes("comp") || h.includes("kd") || h.includes("difficulty"));
      const posIdx = headers.findIndex(h => h.includes("position") || h.includes("pos") || h.includes("rank"));
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",").map(c => c.trim().replace(/"/g, ""));
        const kw = cols[kwIdx >= 0 ? kwIdx : 0];
        if (!kw) continue;
        keywords.push({
          keyword: kw,
          volume: volIdx >= 0 ? parseInt(cols[volIdx]) || undefined : undefined,
          cpc: cpcIdx >= 0 ? parseFloat(cols[cpcIdx]) || undefined : undefined,
          competition: compIdx >= 0 ? parseFloat(cols[compIdx]) || undefined : undefined,
          position: posIdx >= 0 ? parseInt(cols[posIdx]) || undefined : undefined,
        });
      }
    } else {
      // Plain text — one keyword per line
      keywords = lines.map(l => ({ keyword: l }));
    }
    if (keywords.length === 0) {
      toast.error("No keywords found in the input");
      return;
    }
    importMutation.mutate({ projectId, keywords });
  }, [projectId, importText, importMutation]);

  const handleSavePage = useCallback((id: number) => {
    updatePageMutation.mutate({ id, pageUrl: editingPageUrl.trim() || null });
  }, [editingPageUrl, updatePageMutation]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!data || data.keywords.length === 0) return;
    const rows = data.keywords.map(k => [
      k.keyword,
      k.volume,
      k.cpc.toFixed(2),
      k.competitionLabel,
      k.kd ?? "",
      k.position ?? "",
      `${k.priority} (${k.priorityLabel})`,
      k.status === "article" ? "Article" : k.status === "outline" ? "Outline" : "",
      k.pageUrl ?? "",
    ]);
    const header = ["Keyword", "Volume", "CPC", "Competition", "KD", "Position", "Priority", "Status", "Page URL"];
    const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${projectName}-keywords.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [data, projectName]);

  return (
    <>
      <div className={embedded ? "space-y-5" : "p-6 max-w-[1400px] mx-auto space-y-5"}>
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Project Keywords</h2>
                  <p className="text-sm text-muted-foreground">
                    {data ? (
                      <>
                        {data.count} keyword{data.count !== 1 ? "s" : ""} saved to {projectName}
                        {data.totalVolume > 0 && (
                          <> · <span className="text-emerald-600 font-semibold">{formatTotalVolume(data.totalVolume)} total monthly volume</span></>
                        )}
                      </>
                    ) : (
                      "Loading..."
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV} disabled={!data || data.keywords.length === 0}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                  <Upload className="w-4 h-4 mr-1.5" />
                  Upload File
                </Button>
                <Button size="sm" onClick={() => setShowAddDialog(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Keywords
                </Button>
              </div>
            </div>

            {/* Info Banner */}
            <div className="mt-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-700">
              <Info className="w-4 h-4 shrink-0" />
              <span>Supported formats: .txt (one per line), .csv — auto-detects Volume, CPC, Difficulty, Position & Competition columns from SE Ranking, Semrush, Ahrefs & more</span>
            </div>
          </CardContent>
        </Card>

        {/* Search + Actions Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-1.5" />
              )}
              Delete ({selectedIds.size})
            </Button>
          )}
        </div>

        {/* Keywords Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p className="text-sm text-muted-foreground">Loading keywords...</p>
              </div>
            ) : error ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <p className="text-sm text-red-500">Failed to load keywords: {error.message}</p>
              </div>
            ) : data && data.keywords.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
                  <KeyRound className="w-7 h-7 text-indigo-400" />
                </div>
                <h3 className="font-semibold text-lg">No keywords yet</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Add keywords manually, import from a file, or save them from Keyword Research.
                </p>
                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
                    <Plus className="w-4 h-4 mr-1.5" />
                    Add Keywords
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
                    <Upload className="w-4 h-4 mr-1.5" />
                    Import File
                  </Button>
                </div>
              </div>
            ) : data ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="py-3 pl-4 pr-2 w-10">
                        <Checkbox
                          checked={selectedIds.size === data.keywords.length && data.keywords.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </th>
                      <th className="py-3 px-3 text-left">
                        <SortHeader label="Keyword" field="keyword" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="py-3 px-3 text-right">
                        <SortHeader label="Volume" field="volume" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="py-3 px-3 text-right">
                        <SortHeader label="CPC" field="cpc" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="py-3 px-3 text-center">
                        <SortHeader label="Comp." field="competition" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">KD</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pos.</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <SortHeader label="Priority" field="priority" currentSort={sortBy} currentDir={sortDir} onSort={handleSort} />
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</span>
                      </th>
                      <th className="py-3 px-3 text-center">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1 justify-center"><Link2 className="w-3 h-3" /> Page</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.keywords.map((kw) => (
                      <tr key={kw.id} className={`border-b last:border-0 hover:bg-muted/20 transition-colors ${selectedIds.has(kw.id) ? "bg-indigo-50/50" : ""}`}>
                        <td className="py-3.5 pl-4 pr-2">
                          <Checkbox
                            checked={selectedIds.has(kw.id)}
                            onCheckedChange={() => toggleSelect(kw.id)}
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="text-sm font-medium">{kw.keyword}</span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="font-semibold text-sm">{formatVolume(kw.volume)}</span>
                          <span className="text-xs text-muted-foreground ml-0.5">/mo</span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <span className="text-sm">${kw.cpc.toFixed(2)}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <CompetitionBadge label={kw.competitionLabel} />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="text-sm text-muted-foreground">{kw.kd ?? "—"}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <span className="text-sm text-muted-foreground">{kw.position ?? "—"}</span>
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <PriorityBadge priority={kw.priority} label={kw.priorityLabel} />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          <StatusBadge status={kw.status} articleId={kw.articleId} />
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {editingPageId === kw.id ? (
                            <div className="flex items-center gap-1">
                              <Input
                                value={editingPageUrl}
                                onChange={(e) => setEditingPageUrl(e.target.value)}
                                placeholder="https://..."
                                className="h-7 text-xs w-40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSavePage(kw.id);
                                  if (e.key === "Escape") setEditingPageId(null);
                                }}
                              />
                              <button onClick={() => handleSavePage(kw.id)} className="text-emerald-600 hover:text-emerald-700">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingPageId(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : kw.pageUrl ? (
                            <a
                              href={kw.pageUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 max-w-[120px] truncate"
                              title={kw.pageUrl}
                            >
                              <ExternalLink className="w-3 h-3 shrink-0" />
                              {(() => { try { return new URL(kw.pageUrl).pathname || "/"; } catch { return kw.pageUrl; } })()}
                            </a>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPageId(kw.id);
                                setEditingPageUrl(kw.pageUrl ?? "");
                              }}
                              className="text-xs text-muted-foreground hover:text-indigo-600 transition-colors"
                            >
                              + Add
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Add Keywords Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Keywords</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Enter keywords (one per line). Metrics will be automatically fetched from Keywords Everywhere.
            </p>
            <Textarea
              value={addKeywordsText}
              onChange={(e) => setAddKeywordsText(e.target.value)}
              placeholder={"medicare plan g\nmedicare supplement\nmedigap plans comparison"}
              rows={8}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {addKeywordsText.split("\n").filter(l => l.trim()).length} keyword{addKeywordsText.split("\n").filter(l => l.trim()).length !== 1 ? "s" : ""} detected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button
              onClick={handleAddManual}
              disabled={addManualMutation.isPending || !addKeywordsText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {addManualMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Adding...</>
              ) : (
                <><Plus className="w-4 h-4 mr-1.5" /> Add Keywords</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Keywords Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Keywords</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Paste CSV data or plain text (one keyword per line). Auto-detects Volume, CPC, Difficulty, Position & Competition columns.</span>
            </div>
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"Keyword,Volume,CPC,Competition\nmedicare plan g,12100,1.74,0.45\nmedicare plan g prices,1000,1.91,0.67\n\nOr just paste keywords:\nmedicare plan g\nmedicare supplement"}
              rows={10}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {importText.split("\n").filter(l => l.trim()).length} line{importText.split("\n").filter(l => l.trim()).length !== 1 ? "s" : ""} detected
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>Cancel</Button>
            <Button
              onClick={handleImport}
              disabled={importMutation.isPending || !importText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {importMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="w-4 h-4 mr-1.5" /> Import Keywords</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Page Wrapper (standalone route) ----

export default function ProjectKeywords() {
  const { activeProject } = useActiveProject();

  if (!activeProject) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
            <KeyRound className="w-10 h-10 text-muted-foreground" />
            <h3 className="font-semibold text-lg">No project selected</h3>
            <p className="text-sm text-muted-foreground">Select a project from the sidebar to manage keywords.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <ProjectKeywordsPanel projectId={activeProject.id} projectName={activeProject.name} />;
}
