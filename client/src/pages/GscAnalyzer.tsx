/**
 * GSC Analyzer Page
 * Upload Google Search Console Excel exports and get actionable keyword insights.
 */
import { useState, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { toast } from "sonner";
import {
  Upload, FileSpreadsheet, Trash2, ChevronRight, TrendingUp, Eye, Zap,
  MousePointerClick, AlertTriangle, BarChart3, ArrowUpRight, Search,
  ExternalLink, RefreshCw, Info, ChevronDown
} from "lucide-react";
import type { GscQueryRow, GscPageRow, GscCannibalizationGroup, GscExport } from "../../../drizzle/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

type PriorityThreshold = "page1" | "high" | "medium" | "all";

interface ThresholdOption {
  value: PriorityThreshold;
  label: string;
  minPos: number;
  maxPos: number;
}

const THRESHOLD_OPTIONS: ThresholdOption[] = [
  { value: "page1", label: "Page 1 (Pos 5–10)", minPos: 5, maxPos: 10 },
  { value: "high", label: "High Only (Pos 11–15)", minPos: 11, maxPos: 15 },
  { value: "medium", label: "Medium+ (Pos 11–20)", minPos: 11, maxPos: 20 },
  { value: "all", label: "All (Pos 11–30)", minPos: 11, maxPos: 30 },
];

type TabId = "near-jump" | "high-impression" | "quick-wins" | "zero-click" | "cannibalization";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}

const TABS: Tab[] = [
  {
    id: "near-jump",
    label: "Near-Jump",
    icon: TrendingUp,
    description: "Keywords close to ranking higher — small improvements can unlock big traffic gains.",
    color: "text-blue-600",
  },
  {
    id: "high-impression",
    label: "High Impression / Low CTR",
    icon: Eye,
    description: "Keywords getting seen but not clicked — optimize title tags and meta descriptions.",
    color: "text-purple-600",
  },
  {
    id: "quick-wins",
    label: "Quick Wins",
    icon: Zap,
    description: "Visible keywords with almost no clicks — minor content updates can drive immediate results.",
    color: "text-amber-600",
  },
  {
    id: "zero-click",
    label: "Zero-Click Pages",
    icon: MousePointerClick,
    description: "Pages indexed and shown in search but never clicked — review title, meta, and content.",
    color: "text-red-600",
  },
  {
    id: "cannibalization",
    label: "Cannibalization",
    icon: AlertTriangle,
    description: "Multiple queries competing for the same topic — consolidate or differentiate content.",
    color: "text-orange-600",
  },
];

// ─── Utility ─────────────────────────────────────────────────────────────────

function formatCtr(ctr: number): string {
  return `${(ctr * 100).toFixed(1)}%`;
}

function formatPos(pos: number): string {
  return pos.toFixed(1);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function positionBadgeColor(pos: number): string {
  if (pos <= 3) return "bg-green-100 text-green-700";
  if (pos <= 10) return "bg-blue-100 text-blue-700";
  if (pos <= 20) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }>; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{typeof value === "number" ? formatNumber(value) : value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function QueryTable({ rows, showPage = false }: { rows: (GscQueryRow | GscPageRow)[]; showPage?: boolean }) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"impressions" | "clicks" | "ctr" | "position">("impressions");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = rows.filter((r) => {
    const text = showPage ? (r as GscPageRow).page : (r as GscQueryRow).query;
    return text.toLowerCase().includes(search.toLowerCase());
  });

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortBy as keyof typeof a] as number;
    const bv = b[sortBy as keyof typeof b] as number;
    return sortDir === "desc" ? bv - av : av - bv;
  });

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  }

  function SortHeader({ col, label }: { col: typeof sortBy; label: string }) {
    const active = sortBy === col;
    return (
      <th
        className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100 transition-colors ${active ? "text-indigo-600" : "text-gray-500"}`}
        onClick={() => toggleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          {active && <ChevronDown className={`w-3 h-3 transition-transform ${sortDir === "asc" ? "rotate-180" : ""}`} />}
        </span>
      </th>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder={showPage ? "Filter pages..." : "Filter keywords..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div className="text-xs text-gray-400">{sorted.length} {showPage ? "pages" : "keywords"}</div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                {showPage ? "Page URL" : "Keyword"}
              </th>
              <SortHeader col="clicks" label="Clicks" />
              <SortHeader col="impressions" label="Impressions" />
              <SortHeader col="ctr" label="CTR" />
              <SortHeader col="position" label="Position" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.slice(0, 200).map((row, i) => {
              const text = showPage ? (row as GscPageRow).page : (row as GscQueryRow).query;
              return (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 max-w-xs">
                    {showPage ? (
                      <a
                        href={text}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline flex items-center gap-1 truncate"
                        title={text}
                      >
                        <span className="truncate">{text.replace(/^https?:\/\/[^/]+/, "")}</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <span className="text-gray-800 font-medium">{text}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatNumber(row.clicks)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatNumber(row.impressions)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${row.ctr < 0.02 ? "bg-red-100 text-red-700" : row.ctr < 0.05 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                      {formatCtr(row.ctr)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positionBadgeColor(row.position)}`}>
                      #{formatPos(row.position)}
                    </span>
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {sorted.length > 200 && (
        <p className="text-xs text-gray-400 text-center">Showing top 200 of {sorted.length} results</p>
      )}
    </div>
  );
}

function CannibalizationTable({ groups }: { groups: GscCannibalizationGroup[] }) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));

  function toggle(i: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  if (!groups.length) {
    return (
      <div className="text-center py-12 text-gray-400 text-sm">
        No cannibalization issues detected
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-400">{groups.length} keyword groups with potential cannibalization</div>
      {groups.map((group, i) => (
        <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
            onClick={() => toggle(i)}
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                {group.queries.length} queries
              </span>
              <span className="text-sm font-medium text-gray-800 capitalize">{group.topic}</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${expanded.has(i) ? "rotate-180" : ""}`} />
          </button>
          {expanded.has(i) && (
            <div className="border-t border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Keyword</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Clicks</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Impressions</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">CTR</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Position</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {group.queries.map((q, j) => (
                    <tr key={j} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{q.query}</td>
                      <td className="px-4 py-2 text-gray-600">{formatNumber(q.clicks)}</td>
                      <td className="px-4 py-2 text-gray-600">{formatNumber(q.impressions)}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${q.ctr < 0.02 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
                          {formatCtr(q.ctr)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${positionBadgeColor(q.position)}`}>
                          #{formatPos(q.position)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GscAnalyzer() {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;
  const [activeTab, setActiveTab] = useState<TabId>("near-jump");
  const [threshold, setThreshold] = useState<PriorityThreshold>("all");
  const [selectedExportId, setSelectedExportId] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const thresholdOption = THRESHOLD_OPTIONS.find((t) => t.value === threshold)!;

  // List exports
  const gscList = trpc.gsc as any;
  const { data: exports, refetch: refetchExports } = gscList.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  // Get selected export data
  const { data: exportData, isLoading: isLoadingExport } = gscList.getById.useQuery(
    { id: selectedExportId! },
    { enabled: !!selectedExportId }
  );

  // Get near-jump with custom threshold (re-fetches when threshold changes)
  const { data: nearJumpData, isLoading: isLoadingNearJump } = gscList.getNearJump.useQuery(
    { id: selectedExportId!, minPos: thresholdOption.minPos, maxPos: thresholdOption.maxPos },
    { enabled: !!selectedExportId && activeTab === "near-jump" }
  );

  // Upload mutation
  const uploadMutation = gscList.upload.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Parsed ${data.totalQueries} queries and ${data.totalPages} pages`);
      setSelectedExportId(data.id);
      refetchExports();
      setIsUploading(false);
    },
    onError: (err: Error) => {
      toast.error(`Upload failed: ${err.message}`);
      setIsUploading(false);
    },
  });

  // Delete mutation
  const deleteMutation = gscList.delete.useMutation({
    onSuccess: () => {
      toast.success("Export deleted");
      if (selectedExportId) {
        const remaining = exports?.filter((e: any) => e.id !== selectedExportId);
        setSelectedExportId(remaining?.[0]?.id ?? null);
      }
      refetchExports();
    },
  });

  // Auto-select first export
  if (exports?.length && !selectedExportId) {
    setSelectedExportId(exports[0].id);
  }

  // File upload handler
  const handleFile = useCallback(async (file: File) => {
    if (!activeProjectId) {
      toast.error("Please select a project first");
      return;
    }
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      toast.error("Please upload an Excel file (.xlsx or .xls)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large (max 20MB)");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader> | any) => {
      const base64 = (e.target?.result as string).split(",")[1];
      uploadMutation.mutate({
        projectId: activeProjectId,
        fileName: file.name,
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  }, [activeProjectId, uploadMutation]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  // Determine which rows to show for current tab
  function getTabRows(): GscQueryRow[] | GscPageRow[] | GscCannibalizationGroup[] {
    if (!exportData) return [];
    switch (activeTab) {
      case "near-jump": return nearJumpData ?? exportData.nearJumpKeywords ?? [];
      case "high-impression": return exportData.highImpressionLowCtr ?? [];
      case "quick-wins": return exportData.quickWinKeywords ?? [];
      case "zero-click": return exportData.zeroClickPages ?? [];
      case "cannibalization": return exportData.cannibalizationGroups ?? [];
    }
  }

  const tabRows = getTabRows();
  const currentTab = TABS.find((t) => t.id === activeTab)!;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            GSC Analyzer
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Upload your Google Search Console export to uncover keyword opportunities and issues.
          </p>
        </div>
        {exports && exports.length > 0 && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? "Uploading..." : "Upload New Export"}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileInput} />
      </div>

      {/* Upload Zone (shown when no exports) */}
      {(!exports || exports.length === 0) && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-16 text-center cursor-pointer transition-all ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
              <p className="text-gray-600 font-medium">Parsing your GSC export...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center">
                <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <p className="text-gray-800 font-semibold text-lg">Drop your GSC Excel export here</p>
                <p className="text-gray-500 text-sm mt-1">or click to browse — supports .xlsx files</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-100 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5" />
                <span>Export from Google Search Console → Performance → Export → Download Excel</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Selector + Results */}
      {exports && exports.length > 0 && (
        <div className="space-y-5">
          {/* Export Selector */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600">Export:</span>
            {exports.map((exp: any) => (
              <button
                key={exp.id}
                onClick={() => setSelectedExportId(exp.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${selectedExportId === exp.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-200 hover:border-indigo-300"}`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                {exp.fileName.replace(/\.xlsx?$/, "")}
                <span className="text-xs opacity-70">{exp.dateRange}</span>
              </button>
            ))}
            {selectedExportId && (
              <button
                onClick={() => {
                  if (confirm("Delete this export?")) {
                    deleteMutation.mutate({ id: selectedExportId });
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete export"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Loading state */}
          {isLoadingExport && (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          )}

          {/* Data loaded */}
          {exportData && (
            <div className="space-y-5">
              {/* Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Total Queries" value={exportData.totalQueries} icon={Search} color="bg-blue-100 text-blue-600" />
                <StatCard label="Near-Jump Keywords" value={exportData.nearJumpKeywords?.length ?? 0} icon={TrendingUp} color="bg-indigo-100 text-indigo-600" />
                <StatCard label="High Impr / Low CTR" value={exportData.highImpressionLowCtr?.length ?? 0} icon={Eye} color="bg-purple-100 text-purple-600" />
                <StatCard label="Zero-Click Pages" value={exportData.zeroClickPages?.length ?? 0} icon={MousePointerClick} color="bg-red-100 text-red-600" />
              </div>

              {/* Tabs */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {/* Tab Header */}
                <div className="border-b border-gray-200 overflow-x-auto">
                  <div className="flex min-w-max">
                    {TABS.map((tab) => {
                      const Icon = tab.icon;
                      const count = (() => {
                        if (!exportData) return 0;
                        switch (tab.id) {
                          case "near-jump": return exportData.nearJumpKeywords?.length ?? 0;
                          case "high-impression": return exportData.highImpressionLowCtr?.length ?? 0;
                          case "quick-wins": return exportData.quickWinKeywords?.length ?? 0;
                          case "zero-click": return exportData.zeroClickPages?.length ?? 0;
                          case "cannibalization": return exportData.cannibalizationGroups?.length ?? 0;
                        }
                      })();
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${isActive ? "border-indigo-600 text-indigo-600 bg-indigo-50/50" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
                        >
                          <Icon className={`w-4 h-4 ${isActive ? tab.color : ""}`} />
                          {tab.label}
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-500"}`}>
                            {count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tab Content */}
                <div className="p-5 space-y-4">
                  {/* Tab description + threshold filter */}
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-2 text-sm text-gray-500 max-w-xl">
                      <Info className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <span>{currentTab.description}</span>
                    </div>

                    {/* Priority Threshold — only shown for near-jump tab */}
                    {activeTab === "near-jump" && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">Priority Threshold</span>
                        <div className="relative">
                          <select
                            value={threshold}
                            onChange={(e) => setThreshold(e.target.value as PriorityThreshold)}
                            className="appearance-none pl-3 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white text-gray-700 cursor-pointer"
                          >
                            {THRESHOLD_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Table */}
                  {activeTab === "cannibalization" ? (
                    <CannibalizationTable groups={tabRows as GscCannibalizationGroup[]} />
                  ) : activeTab === "zero-click" ? (
                    isLoadingNearJump ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <QueryTable rows={tabRows as GscPageRow[]} showPage={true} />
                    )
                  ) : (
                    isLoadingNearJump && activeTab === "near-jump" ? (
                      <div className="flex items-center justify-center py-12">
                        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
                      </div>
                    ) : (
                      <QueryTable rows={tabRows as GscQueryRow[]} showPage={false} />
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
