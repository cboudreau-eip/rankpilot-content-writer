import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useActiveProject } from "@/components/AppLayout";
import {
  FileText, Search, Plus, MoreHorizontal, Eye, Pencil, Trash2,
  Filter, Clock, CheckCircle2, Send, FileEdit, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileEdit },
  review: { label: "Review", color: "bg-amber-100 text-amber-700", icon: Eye },
  complete: { label: "Complete", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: Send },
} as const;

const STATUS_TABS = [
  { key: "all", label: "All Articles" },
  { key: "draft", label: "Drafts" },
  { key: "review", label: "In Review" },
  { key: "complete", label: "Complete" },
  { key: "published", label: "Published" },
];

export default function Articles() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;

  const { data: articles = [], isLoading, refetch } = trpc.articles.list.useQuery(
    { projectId: activeProjectId!, status: statusFilter === "all" ? undefined : statusFilter },
    { enabled: !!activeProjectId }
  );

  const { data: stats } = trpc.articles.stats.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const deleteMutation = trpc.articles.delete.useMutation({
    onSuccess: () => {
      toast.success("Article deleted");
      refetch();
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to delete article"),
  });

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article updated");
      refetch();
    },
    onError: () => toast.error("Failed to update article"),
  });

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles;
    const q = searchQuery.toLowerCase();
    return articles.filter((a: any) =>
      a.title.toLowerCase().includes(q) ||
      a.keyword?.toLowerCase().includes(q)
    );
  }, [articles, searchQuery]);

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  if (!activeProjectId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
        <p className="text-muted-foreground mb-6">Select or create a project to manage articles.</p>
        <Button onClick={() => navigate("/projects")}>Go to Projects</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Articles</h1>
          <p className="text-muted-foreground mt-1">
            Manage your content — {stats?.total ?? 0} articles, {(stats?.totalWords ?? 0).toLocaleString()} words
          </p>
        </div>
        <Button onClick={() => navigate("/generate")} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Plus className="w-4 h-4" />
          New Article
        </Button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats?.total ?? 0, color: "text-foreground" },
          { label: "Drafts", value: stats?.draft ?? 0, color: "text-gray-600" },
          { label: "In Review", value: stats?.review ?? 0, color: "text-amber-600" },
          { label: "Published", value: stats?.published ?? 0, color: "text-emerald-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-border/60 p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === tab.key
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Articles Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-border/60 p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-xl border border-border/60">
          <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold mb-1">
            {searchQuery ? "No articles found" : "No articles yet"}
          </h3>
          <p className="text-muted-foreground text-sm mb-6 max-w-sm">
            {searchQuery
              ? "Try adjusting your search or filters."
              : "Start by generating your first article from an outline."}
          </p>
          {!searchQuery && (
            <Button onClick={() => navigate("/generate")} className="gap-2">
              <Plus className="w-4 h-4" />
              Generate Article
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredArticles.map((article: any) => {
            const statusInfo = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG];
            const StatusIcon = statusInfo?.icon ?? FileEdit;
            return (
              <div
                key={article.id}
                className="group bg-white rounded-xl border border-border/60 hover:border-indigo-200 hover:shadow-sm transition-all p-5 cursor-pointer"
                onClick={() => navigate(`/articles/${article.id}`)}
              >
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-600" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-[15px] truncate">{article.title}</h3>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo?.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusInfo?.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      {article.keyword && (
                        <span className="flex items-center gap-1">
                          <Search className="w-3 h-3" />
                          {article.keyword}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(article.updatedAt)}
                      </span>
                      {article.wordCount > 0 && (
                        <span>{article.wordCount.toLocaleString()} words</span>
                      )}
                      {article.contentType && (
                        <span className="capitalize">{article.contentType}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/articles/${article.id}`); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {article.status !== "published" && (
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          const nextStatus = article.status === "draft" ? "review" : article.status === "review" ? "complete" : "published";
                          updateMutation.mutate({ id: article.id, status: nextStatus });
                        }}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Move to {article.status === "draft" ? "Review" : article.status === "review" ? "Complete" : "Published"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(article.id); }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this article? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
