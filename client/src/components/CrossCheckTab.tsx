import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Pencil, Trash2, Loader2, Upload, FileText, FileCheck,
  AlertTriangle, Info, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function CrossCheckTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: refDoc, isLoading } = trpc.crossCheck.getReferenceDoc.useQuery({ projectId });
  const [docContent, setDocContent] = useState("");
  const [docName, setDocName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const updateMut = trpc.crossCheck.updateReferenceDoc.useMutation({
    onSuccess: (data, variables) => {
      utils.crossCheck.getReferenceDoc.invalidate();
      setIsEditing(false);
      if (variables.referenceDoc) {
        toast.success("Reference document saved successfully", {
          description: `${variables.referenceDoc.length.toLocaleString()} characters saved to database and backed up to cloud storage.`,
          duration: 5000,
        });
      } else {
        toast.success("Reference document removed");
      }
    },
    onError: (err) => {
      toast.error("Failed to save reference document", {
        description: err.message,
        duration: 8000,
      });
    },
  });

  const startEditing = () => {
    setDocContent(refDoc?.referenceDoc ?? "");
    setDocName(refDoc?.referenceDocName ?? "");
    setIsEditing(true);
  };

  const handleSave = () => {
    if (!docContent.trim()) {
      toast.error("Please enter the reference document content");
      return;
    }
    updateMut.mutate({
      projectId,
      referenceDoc: docContent.trim(),
      referenceDocName: docName.trim() || "Reference Document",
    });
  };

  const handleRemove = () => {
    updateMut.mutate({
      projectId,
      referenceDoc: null,
      referenceDocName: null,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setDocContent(text);
      setDocName(file.name);
      setIsEditing(true);
    };
    reader.readAsText(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasDoc = !!(refDoc?.referenceDoc || refDoc?.hasMetadata);

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-violet-50/50 border-violet-200 dark:bg-violet-950/20 dark:border-violet-800">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-violet-900 dark:text-violet-200 mb-1">How Cross Check Works</h4>
              <p className="text-sm text-violet-700 dark:text-violet-400">
                Upload a reference document (product specs, company facts, guidelines, etc.) and the AI will compare your generated articles against it to identify factual discrepancies. This is especially useful for regulated industries where accuracy is critical.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Reference Doc or Upload */}
      {!isEditing && hasDoc ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{refDoc?.referenceDocName || "Reference Document"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {(refDoc?.referenceDocLength ?? refDoc?.referenceDoc?.length ?? 0).toLocaleString()} characters
                    {refDoc?.referenceDocUpdatedAt && (
                      <span className="ml-2 text-muted-foreground/60">
                        &middot; Last updated {new Date(refDoc.referenceDocUpdatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                {/* Confirmation dialog before removing */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive gap-1.5"
                      disabled={updateMut.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove Reference Document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your reference document
                        {refDoc?.referenceDocName ? ` "${refDoc.referenceDocName}"` : ""} 
                        ({(refDoc?.referenceDocLength ?? refDoc?.referenceDoc?.length ?? 0).toLocaleString()} characters).
                        This action cannot be undone. Articles that were already cross-checked will keep their results, 
                        but you won't be able to run new cross-checks until you upload a new document.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleRemove}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, Remove Document
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Storage status indicator */}
            <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span>Stored in database with cloud backup</span>
            </div>

            {refDoc?.s3FetchFailed && !refDoc?.referenceDoc ? (
              <div className="bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">Content temporarily unavailable</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400 mb-3">
                      The reference document metadata is saved, but the content could not be loaded. This can happen after a deployment. Please re-upload or paste your document content to restore it.
                    </p>
                    <Button size="sm" onClick={startEditing} className="gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Re-upload Content
                    </Button>
                  </div>
                </div>
              </div>
            ) : refDoc?.referenceDoc ? (
              <div className="bg-muted/40 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">
                  {refDoc.referenceDoc.substring(0, 2000)}
                  {refDoc.referenceDoc.length > 2000 ? "\n\n... (truncated for preview)" : ""}
                </pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : !isEditing ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center mb-4">
              <FileCheck className="w-7 h-7 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Reference Document</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Add a reference document to enable fact-checking against your articles. You can paste text directly or upload a .txt or .md file.
            </p>
            <div className="flex gap-3">
              <Button onClick={() => setIsEditing(true)} className="gap-2">
                <Pencil className="w-4 h-4" /> Paste Text
              </Button>
              <label>
                <Button variant="outline" className="gap-2" asChild>
                  <span>
                    <Upload className="w-4 h-4" /> Upload File
                    <input type="file" accept=".txt,.md,.text" className="hidden" onChange={handleFileUpload} />
                  </span>
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Reference Document</h3>
              <label>
                <Button variant="outline" size="sm" className="gap-1.5" asChild>
                  <span>
                    <Upload className="w-3.5 h-3.5" /> Upload File
                    <input type="file" accept=".txt,.md,.text" className="hidden" onChange={handleFileUpload} />
                  </span>
                </Button>
              </label>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Document Name</Label>
              <Input
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                placeholder="e.g., Medicare 2025 Fact Sheet"
                className="text-base"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Document Content</Label>
              <Textarea
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                placeholder="Paste your reference document content here..."
                className="text-base min-h-[300px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">{docContent.length.toLocaleString()} characters</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
                {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Document
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
