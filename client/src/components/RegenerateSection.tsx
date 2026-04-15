import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RefreshCw, Loader2, X, Check, RotateCcw, ChevronDown, ChevronUp,
  Sparkles, ArrowDownToLine, ArrowUpToLine, Equal,
} from "lucide-react";
import { toast } from "sonner";

interface RegenerateSectionProps {
  articleId: number;
  editorElement: HTMLElement | null;
  onSectionRegenerated: (data: {
    oldContent: string;
    newContent: string;
    updatedArticleContent: string;
    wordCount: number;
    sectionHeading: string;
  }) => void;
}

/**
 * Floating regenerate button that appears when hovering over H2 headings in the editor.
 * When clicked, opens an inline form for regeneration options.
 */
export function RegenerateSection({ articleId, editorElement, onSectionRegenerated }: RegenerateSectionProps) {
  const [hoveredHeading, setHoveredHeading] = useState<{ text: string; element: HTMLElement } | null>(null);
  const [activeHeading, setActiveHeading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [toneOverride, setToneOverride] = useState("");
  const [lengthPreference, setLengthPreference] = useState<"shorter" | "same" | "longer">("same");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const regenerateMutation = trpc.articles.regenerateSection.useMutation({
    onSuccess: (data: any) => {
      toast.success(`Section "${data.sectionHeading}" regenerated`);
      onSectionRegenerated(data);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to regenerate section");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setActiveHeading(null);
    setInstructions("");
    setToneOverride("");
    setLengthPreference("same");
    setShowAdvanced(false);
  };

  // Track H2 hover state
  useEffect(() => {
    if (!editorElement) return;

    const handleMouseOver = (e: MouseEvent) => {
      // Don't update hover state when form is open
      if (showForm) return;

      const target = e.target as HTMLElement;
      const h2 = target.closest("h2");
      if (h2 && editorElement.contains(h2)) {
        const text = h2.textContent?.trim() || "";
        if (text) {
          clearTimeout(hideTimeoutRef.current);
          setHoveredHeading({ text, element: h2 });
        }
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      if (showForm) return;

      const relatedTarget = e.relatedTarget as HTMLElement | null;
      // Don't hide if moving to the button or another H2
      if (relatedTarget && (
        buttonRef.current?.contains(relatedTarget) ||
        relatedTarget.closest("h2")
      )) return;

      hideTimeoutRef.current = setTimeout(() => {
        setHoveredHeading(null);
      }, 200);
    };

    editorElement.addEventListener("mouseover", handleMouseOver);
    editorElement.addEventListener("mouseout", handleMouseOut);

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver);
      editorElement.removeEventListener("mouseout", handleMouseOut);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [editorElement, showForm]);

  const handleRegenerate = () => {
    if (!activeHeading) return;
    regenerateMutation.mutate({
      articleId,
      sectionHeading: activeHeading,
      instructions: instructions.trim() || undefined,
      toneOverride: toneOverride || undefined,
      lengthPreference,
    });
  };

  const handleButtonClick = () => {
    if (!hoveredHeading) return;
    setActiveHeading(hoveredHeading.text);
    setShowForm(true);
  };

  // Calculate button position relative to the hovered heading
  const getButtonPosition = useCallback(() => {
    if (!hoveredHeading?.element || !editorElement) return null;
    const headingRect = hoveredHeading.element.getBoundingClientRect();
    const editorRect = editorElement.getBoundingClientRect();
    return {
      top: headingRect.top - editorRect.top,
      right: 8,
    };
  }, [hoveredHeading, editorElement]);

  const buttonPos = getButtonPosition();

  // Form position: below the active heading
  const getFormPosition = useCallback(() => {
    if (!activeHeading || !editorElement) return null;
    const headings = Array.from(editorElement.querySelectorAll("h2"));
    for (const h2 of headings) {
      if (h2.textContent?.trim() === activeHeading) {
        const headingRect = h2.getBoundingClientRect();
        const editorRect = editorElement.getBoundingClientRect();
        return {
          top: headingRect.bottom - editorRect.top + 4,
          left: 16,
          right: 16,
        };
      }
    }
    return null;
  }, [activeHeading, editorElement]);

  const formPos = getFormPosition();

  return (
    <>
      {/* Floating Regenerate Button */}
      {hoveredHeading && buttonPos && !showForm && !regenerateMutation.isPending && (
        <div
          ref={buttonRef}
          className="absolute z-20 transition-all duration-150"
          style={{ top: buttonPos.top, right: buttonPos.right }}
          onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
          onMouseLeave={() => {
            hideTimeoutRef.current = setTimeout(() => setHoveredHeading(null), 200);
          }}
        >
          <button
            onClick={handleButtonClick}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
              bg-indigo-50 text-indigo-700 border border-indigo-200
              hover:bg-indigo-100 hover:border-indigo-300
              shadow-sm transition-all duration-150
              opacity-90 hover:opacity-100"
            title={`Regenerate "${hoveredHeading.text}"`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Regenerate
          </button>
        </div>
      )}

      {/* Regenerating indicator on the heading */}
      {regenerateMutation.isPending && activeHeading && buttonPos && (
        <div
          className="absolute z-20"
          style={{ top: buttonPos.top, right: 8 }}
        >
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium
            bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Regenerating...
          </div>
        </div>
      )}

      {/* Inline Regeneration Form */}
      {showForm && formPos && !regenerateMutation.isPending && (
        <div
          ref={formRef}
          className="absolute z-30 bg-card rounded-xl border border-indigo-200 shadow-lg p-4 space-y-3"
          style={{
            top: formPos.top,
            left: formPos.left,
            right: formPos.right,
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Regenerate Section</h4>
                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{activeHeading}</p>
              </div>
            </div>
            <button onClick={resetForm} className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Instructions */}
          <div>
            <Label className="text-xs font-medium text-secondary-foreground">Instructions (optional)</Label>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Make it more concise, add a comparison table, focus on costs..."
              className="mt-1 text-sm min-h-[60px] resize-none"
              rows={2}
            />
          </div>

          {/* Length Preference */}
          <div className="flex items-center gap-2">
            <Label className="text-xs font-medium text-secondary-foreground shrink-0">Length:</Label>
            <div className="flex gap-1">
              {([
                { value: "shorter", label: "Shorter", icon: ArrowUpToLine },
                { value: "same", label: "Same", icon: Equal },
                { value: "longer", label: "Longer", icon: ArrowDownToLine },
              ] as const).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  onClick={() => setLengthPreference(value)}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                    lengthPreference === value
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Advanced options
          </button>

          {showAdvanced && (
            <div>
              <Label className="text-xs font-medium text-secondary-foreground">Tone Override</Label>
              <Select value={toneOverride} onValueChange={setToneOverride}>
                <SelectTrigger className="mt-1 text-sm h-8">
                  <SelectValue placeholder="Use project default" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Use project default</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="conversational">Conversational</SelectItem>
                  <SelectItem value="authoritative">Authoritative</SelectItem>
                  <SelectItem value="empathetic">Empathetic</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="simplified">Simplified</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={handleRegenerate}
              disabled={regenerateMutation.isPending}
              size="sm"
              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {regenerateMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Regenerate
            </Button>
            <Button variant="outline" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Diff preview panel that shows after a section is regenerated.
 * Shows old vs new content side by side with accept/discard actions.
 */
interface DiffPreviewProps {
  sectionHeading: string;
  oldContent: string;
  newContent: string;
  onAccept: () => void;
  onDiscard: () => void;
  onTryAgain: () => void;
}

export function SectionDiffPreview({ sectionHeading, oldContent, newContent, onAccept, onDiscard, onTryAgain }: DiffPreviewProps) {
  const [showOld, setShowOld] = useState(false);

  const stripHtml = (html: string) => {
    const div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent || "";
  };

  const oldText = stripHtml(oldContent);
  const newText = stripHtml(newContent);
  const oldWordCount = oldText.split(/\s+/).filter(Boolean).length;
  const newWordCount = newText.split(/\s+/).filter(Boolean).length;
  const wordDiff = newWordCount - oldWordCount;

  return (
    <div className="w-96 bg-card rounded-xl border border-indigo-200 shadow-lg flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Section Regenerated</h3>
              <p className="text-xs text-muted-foreground truncate max-w-[240px]">{sectionHeading}</p>
            </div>
          </div>
        </div>

        {/* Word count comparison */}
        <div className="flex items-center gap-3 mt-2 text-xs">
          <span className="text-muted-foreground">
            {oldWordCount} words <span className="mx-1">→</span> {newWordCount} words
          </span>
          <span className={`font-medium ${wordDiff > 0 ? "text-emerald-600" : wordDiff < 0 ? "text-amber-600" : "text-muted-foreground"}`}>
            ({wordDiff > 0 ? "+" : ""}{wordDiff})
          </span>
        </div>
      </div>

      {/* Content Preview */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {/* Toggle between old and new */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setShowOld(false)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              !showOld ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            New Version
          </button>
          <button
            onClick={() => setShowOld(true)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              showOld ? "bg-muted text-secondary-foreground border border-border" : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            Old Version
          </button>
        </div>

        <div className="text-sm text-secondary-foreground leading-relaxed prose prose-sm max-w-none">
          {showOld ? (
            <div className="opacity-60" dangerouslySetInnerHTML={{ __html: oldContent }} />
          ) : (
            <div dangerouslySetInnerHTML={{ __html: newContent }} />
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 bg-muted/50/50 flex items-center gap-2">
        <Button
          onClick={onAccept}
          size="sm"
          className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
        >
          <Check className="w-3.5 h-3.5" />
          Accept
        </Button>
        <Button
          onClick={onTryAgain}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Try Again
        </Button>
        <Button
          onClick={onDiscard}
          variant="outline"
          size="sm"
          className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <X className="w-3.5 h-3.5" />
          Discard
        </Button>
      </div>
    </div>
  );
}
