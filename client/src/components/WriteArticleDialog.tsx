import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, PenLine } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WriteArticleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Suggested article title (editable in the dialog). For a saved outline, pass its title. */
  title: string;
  keyword?: string;
  /** Outline sections to write from. Ignored when `outlineId` is given. */
  sections?: any[];
  /** Write from an outline that's already in the library instead of saving a new one. */
  outlineId?: number;
  /** Pre-selected project (usually the active project) */
  defaultProjectId?: number | null;
}

/**
 * Asks which project the article belongs to, then (if needed) saves the outline to that
 * project and generates the article from it, and opens the finished article.
 */
export function WriteArticleDialog({
  open,
  onOpenChange,
  title,
  keyword,
  sections,
  outlineId,
  defaultProjectId,
}: WriteArticleDialogProps) {
  const [, navigate] = useLocation();
  const { data: projects = [], isLoading } = trpc.projects.list.useQuery(undefined);
  const createOutline = trpc.outlines.create.useMutation();
  const generateArticle = trpc.articles.generate.useMutation();

  const [projectId, setProjectId] = useState<string>("");
  const [wordCount, setWordCount] = useState("1600");
  const [articleTitle, setArticleTitle] = useState(title);
  const [busy, setBusy] = useState<"saving" | "writing" | null>(null);

  // Preselect the active project and reset the title each time the dialog opens
  useEffect(() => {
    if (open) {
      setArticleTitle(title);
      setProjectId((prev) => prev || (defaultProjectId ? String(defaultProjectId) : projects[0] ? String(projects[0].id) : ""));
    }
  }, [open, defaultProjectId, projects, title]);

  const handleWrite = async () => {
    const pid = parseInt(projectId, 10);
    if (!pid) {
      toast.error("Choose a project first");
      return;
    }
    const finalTitle = articleTitle.trim();
    if (outlineId == null && !finalTitle) {
      toast.error("Give the article a title");
      return;
    }
    const words = Math.min(10000, Math.max(300, parseInt(wordCount, 10) || 1600));
    let outlineToUse = outlineId ?? null;
    try {
      if (outlineToUse == null) {
        if (!sections || sections.length === 0) {
          toast.error("This outline has no sections to write from");
          return;
        }
        setBusy("saving");
        const created: any = await createOutline.mutateAsync({
          title: finalTitle,
          keyword: keyword?.trim() || undefined,
          sections: sections.map((s: any, i: number) => ({
            ...s,
            id: s.id || `s${Date.now()}_${i}`,
            type: s.type === "h3" ? "h3" : "h2",
          })),
          settings: { contentType: "blog", targetWordCount: words, outputFormat: "html" },
          projectId: pid,
        });
        outlineToUse = created?.id ?? null;
        if (outlineToUse == null) throw new Error("The outline couldn't be saved");
      }

      setBusy("writing");
      const article: any = await generateArticle.mutateAsync({
        outlineId: outlineToUse,
        projectId: pid,
        outputFormat: "html",
      });
      if (!article?.id) throw new Error("The article was not created");
      toast.success("Article written");
      onOpenChange(false);
      navigate(`/articles/${article.id}`);
    } catch (err: any) {
      const msg: string = err?.message || "";
      const saved = outlineId == null && outlineToUse != null ? " The outline was saved to that project's library, so nothing is lost." : "";
      if (/overloaded|529|rate.?limit|too many|capacity/i.test(msg)) {
        toast.error("The AI service is overloaded right now. Please wait a moment and try again." + saved);
      } else {
        toast.error((msg || "Failed to write the article") + saved);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="w-5 h-5 text-indigo-600" />
            Write article from this outline
          </DialogTitle>
          <DialogDescription>
            Pick the project to write it for. The article uses that project's Brand Voice and audience settings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select value={projectId} onValueChange={setProjectId} disabled={!!busy || isLoading}>
              <SelectTrigger aria-label="Project">
                <SelectValue placeholder={isLoading ? "Loading projects..." : "Choose a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p: any) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {outlineId == null && (
            <div className="space-y-1.5">
              <Label htmlFor="write-article-title">Article title</Label>
              <Input
                id="write-article-title"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                disabled={!!busy}
                placeholder="e.g. Medicare Part D Costs in 2027"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="write-article-words">Target word count (approximate)</Label>
            <Input
              id="write-article-words"
              type="number"
              min={300}
              max={10000}
              value={wordCount}
              onChange={(e) => setWordCount(e.target.value)}
              disabled={!!busy || outlineId != null}
            />
            {outlineId != null && (
              <p className="text-xs text-muted-foreground">Uses the length already set on the saved outline.</p>
            )}
          </div>

          {busy && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-start gap-2">
              <Loader2 className="w-4 h-4 mt-0.5 animate-spin shrink-0" />
              <div>
                {busy === "saving" ? "Saving the outline to the project..." : "Writing the article. This can take a minute or two, so keep this page open."}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={!!busy}>Cancel</Button>
          <Button onClick={handleWrite} disabled={!!busy || !projectId || (outlineId == null && !articleTitle.trim())} className="bg-indigo-600 hover:bg-indigo-700">
            {busy ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Working...</> : <><PenLine className="w-4 h-4 mr-2" />Write Article</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
