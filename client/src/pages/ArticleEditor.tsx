import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { StyledBox } from "@/extensions/StyledBox";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Highlighter, Undo2, Redo2, Save, ArrowLeft,
  FileText, Search, Clock, CheckCircle2, Send, FileEdit,
  Eye, ChevronDown, Loader2, BarChart3, Sparkles, ShieldCheck,
  Target, Bot, BookOpen, AlertTriangle, Lightbulb, ArrowRight,
  ChevronUp, Wand2, X, Copy, ClipboardCheck, MinusCircle,
  FileCheck, Info, ExternalLink, Repeat2, MoreVertical, Download, Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { EntityAnalysisResult } from "@shared/entity-types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

/**
 * Robust find-and-replace in HTML content.
 * Strips HTML tags to build plain text, finds the search phrase (with normalized
 * whitespace fallback), then surgically replaces the matched text in the original
 * HTML while preserving all surrounding tags.
 */
function findAndReplaceInHtml(
  html: string,
  searchText: string,
  replacement: string
): { html: string; applied: boolean } {
  if (!searchText) return { html, applied: false };

  // Pre-process: if searchText contains ellipsis ("..."), the LLM truncated the quote.
  // Try to find the full text by matching the fragments before and after the ellipsis.
  let effectiveSearchText = searchText;
  if (searchText.includes('...') || searchText.includes('\u2026')) {
    const fullText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    // Split on ellipsis patterns
    const fragments = searchText.split(/\.{3}|\u2026/).map(f => f.trim()).filter(Boolean);
    if (fragments.length >= 2) {
      const firstFrag = fragments[0].replace(/\s+/g, ' ').trim();
      const lastFrag = fragments[fragments.length - 1].replace(/\s+/g, ' ').trim();
      const normalizedFull = fullText.replace(/\s+/g, ' ');
      const startIdx = normalizedFull.indexOf(firstFrag);
      if (startIdx >= 0) {
        const endIdx = normalizedFull.indexOf(lastFrag, startIdx + firstFrag.length);
        if (endIdx >= 0) {
          effectiveSearchText = normalizedFull.slice(startIdx, endIdx + lastFrag.length);
        }
      }
    }
  }

  // Split HTML into tag and text segments
  const segments: { type: 'tag' | 'text'; content: string }[] = [];
  const tagRegex = /<[^>]+>/g;
  let lastIdx = 0;
  let match;
  while ((match = tagRegex.exec(html)) !== null) {
    if (match.index > lastIdx) {
      segments.push({ type: 'text', content: html.slice(lastIdx, match.index) });
    }
    segments.push({ type: 'tag', content: match[0] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < html.length) {
    segments.push({ type: 'text', content: html.slice(lastIdx) });
  }

  // Concatenate all text content (no separators — this is the raw text)
  const fullText = segments.filter(s => s.type === 'text').map(s => s.content).join('');

  const normalize = (t: string) => t.replace(/\s+/g, ' ').trim();
  const normalizedSearch = normalize(effectiveSearchText);

  // Try exact match first
  let phraseStart = fullText.indexOf(effectiveSearchText);
  let phraseEnd = phraseStart >= 0 ? phraseStart + effectiveSearchText.length : -1;

  // If exact match fails, try normalized whitespace matching on the raw fullText
  if (phraseStart < 0) {
    const normalizedFull = normalize(fullText);
    const normIdx = normalizedFull.indexOf(normalizedSearch);
    if (normIdx >= 0) {
      // Map normalized position back to original text position
      let startOrigIdx = -1;
      let endOrigIdx = -1;
      let nPos = 0;
      for (let i = 0; i < fullText.length; i++) {
        const ch = fullText[i];
        if (/\s/.test(ch)) {
          if (i === 0 || !/\s/.test(fullText[i - 1])) {
            if (nPos === normIdx) startOrigIdx = i;
            if (nPos === normIdx + normalizedSearch.length) { endOrigIdx = i; break; }
            nPos++;
          }
        } else {
          if (nPos === normIdx) startOrigIdx = i;
          nPos++;
          if (nPos === normIdx + normalizedSearch.length) { endOrigIdx = i + 1; break; }
        }
      }
      if (startOrigIdx >= 0) {
        if (endOrigIdx < 0) endOrigIdx = fullText.length;
        phraseStart = startOrigIdx;
        phraseEnd = endOrigIdx;
      }
    }
  }

  // If still not found, try with virtual spaces at tag boundaries.
  // When HTML tags separate text (e.g. "</p><p>"), the concatenated text has no space
  // but the LLM sees them as separate words with a space between.
  if (phraseStart < 0) {
    // Build a virtual text that inserts a space at each tag boundary
    const textSegments = segments.filter(s => s.type === 'text');
    const virtualParts: string[] = [];
    // Track mapping: for each char in virtual text, which segment and offset
    const charMap: { segIdx: number; offset: number }[] = [];
    let segCounter = 0;
    for (let si = 0; si < segments.length; si++) {
      if (segments[si].type === 'text') {
        // Insert a virtual space at tag boundary if needed
        if (virtualParts.length > 0) {
          const lastChar = virtualParts[virtualParts.length - 1];
          const prevChar = lastChar[lastChar.length - 1];
          const nextChar = segments[si].content[0];
          if (prevChar && !/\s/.test(prevChar) && nextChar && !/\s/.test(nextChar)) {
            virtualParts.push(' ');
            charMap.push({ segIdx: -1, offset: -1 }); // virtual space
          }
        }
        virtualParts.push(segments[si].content);
        for (let ci = 0; ci < segments[si].content.length; ci++) {
          charMap.push({ segIdx: segCounter, offset: ci });
        }
        segCounter++;
      }
    }
    const virtualText = virtualParts.join('');
    const normalizedVirtual = normalize(virtualText);
    const normIdx = normalizedVirtual.indexOf(normalizedSearch);

    if (normIdx >= 0) {
      // Map normalized position back to virtual text, then to segments
      let vStartIdx = -1;
      let vEndIdx = -1;
      let nPos = 0;
      for (let i = 0; i < virtualText.length; i++) {
        const ch = virtualText[i];
        if (/\s/.test(ch)) {
          if (i === 0 || !/\s/.test(virtualText[i - 1])) {
            if (nPos === normIdx) vStartIdx = i;
            if (nPos === normIdx + normalizedSearch.length) { vEndIdx = i; break; }
            nPos++;
          }
        } else {
          if (nPos === normIdx) vStartIdx = i;
          nPos++;
          if (nPos === normIdx + normalizedSearch.length) { vEndIdx = i + 1; break; }
        }
      }
      if (vStartIdx < 0) return { html, applied: false };
      if (vEndIdx < 0) vEndIdx = virtualText.length;

      // Find the real segment boundaries from charMap
      // Get the first real char at or after vStartIdx
      let realStart = -1;
      for (let i = vStartIdx; i < charMap.length; i++) {
        if (charMap[i].segIdx >= 0) {
          realStart = i;
          break;
        }
      }
      // Get the last real char before vEndIdx
      let realEnd = -1;
      for (let i = Math.min(vEndIdx, charMap.length) - 1; i >= 0; i--) {
        if (charMap[i].segIdx >= 0) {
          realEnd = i + 1;
          break;
        }
      }
      if (realStart < 0 || realEnd < 0) return { html, applied: false };

      // Map back to fullText offsets
      // Count real chars before realStart to get phraseStart in fullText
      let ftStart = 0;
      for (let i = 0; i < realStart; i++) {
        if (charMap[i].segIdx >= 0) ftStart++;
      }
      let ftEnd = 0;
      for (let i = 0; i < realEnd; i++) {
        if (charMap[i].segIdx >= 0) ftEnd++;
      }

      phraseStart = ftStart;
      phraseEnd = ftEnd;
    }
  }

  if (phraseStart < 0) return { html, applied: false };

  // Rebuild HTML replacing the matched text portion
  const newSegments: string[] = [];
  let textOffset = 0;
  for (const seg of segments) {
    if (seg.type === 'tag') {
      // Keep tags that are outside the match, or skip tags inside the match
      if (textOffset <= phraseStart || textOffset >= phraseEnd) {
        newSegments.push(seg.content);
      }
      // Tags inside the matched range are dropped (replaced by the replacement text)
    } else {
      const segStart = textOffset;
      const segEnd = textOffset + seg.content.length;
      if (segEnd <= phraseStart || segStart >= phraseEnd) {
        newSegments.push(seg.content);
      } else {
        const overlapStart = Math.max(0, phraseStart - segStart);
        const overlapEnd = Math.min(seg.content.length, phraseEnd - segStart);
        let built = '';
        if (overlapStart > 0) built += seg.content.slice(0, overlapStart);
        if (segStart <= phraseStart) {
          built += replacement;
        }
        if (overlapEnd < seg.content.length) built += seg.content.slice(overlapEnd);
        newSegments.push(built);
      }
      textOffset += seg.content.length;
    }
  }

  return { html: newSegments.join(''), applied: true };
}

/**
 * Build highlighted HTML by diffing old and new content at the sentence level.
 * Returns HTML with <mark> tags wrapping changed/added sentences.
 */
function buildHighlightedHtml(oldHtml: string, newHtml: string): string {
  // Extract plain text from HTML
  const extractText = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || '';
  };

  const oldText = extractText(oldHtml);
  const newText = extractText(newHtml);

  // Split into sentences for coarser matching
  const splitSentences = (text: string) => {
    return text.split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);
  };

  const oldSentences = new Set(splitSentences(oldText));

  // Find new/changed sentences
  const newSentences = splitSentences(newText);
  const changedPhrases: string[] = [];
  for (const sentence of newSentences) {
    if (!oldSentences.has(sentence) && sentence.length > 10) {
      // Use a distinctive substring (first 40 chars) to find in HTML
      changedPhrases.push(sentence);
    }
  }

  if (changedPhrases.length === 0) return newHtml;

  // For each changed phrase, find it in the HTML text nodes and wrap with <mark>
  let result = newHtml;
  for (const phrase of changedPhrases.slice(0, 30)) {
    // Escape special regex chars in the phrase
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match the phrase but not if already inside a tag
    try {
      // Simple approach: find the text and wrap it
      // We need to be careful not to break HTML tags
      const plainIdx = newText.indexOf(phrase);
      if (plainIdx < 0) continue;

      // Find the phrase in the HTML by walking through and matching text content
      // Use a simpler approach: split HTML into text and tag segments
      const segments: { type: 'tag' | 'text'; content: string }[] = [];
      const tagRegex = /<[^>]+>/g;
      let lastIdx = 0;
      let match;
      while ((match = tagRegex.exec(result)) !== null) {
        if (match.index > lastIdx) {
          segments.push({ type: 'text', content: result.slice(lastIdx, match.index) });
        }
        segments.push({ type: 'tag', content: match[0] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < result.length) {
        segments.push({ type: 'text', content: result.slice(lastIdx) });
      }

      // Concatenate text segments to find the phrase position
      let textSoFar = '';
      let phraseStart = -1;
      const textPositions: { segIdx: number; startInSeg: number; textStart: number }[] = [];
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === 'text') {
          textPositions.push({ segIdx: i, startInSeg: 0, textStart: textSoFar.length });
          textSoFar += segments[i].content;
        }
      }

      phraseStart = textSoFar.indexOf(phrase);
      if (phraseStart < 0) continue;
      const phraseEnd = phraseStart + phrase.length;

      // Rebuild HTML with <mark> wrapping the matched text
      const newSegments: string[] = [];
      let textOffset = 0;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].type === 'tag') {
          newSegments.push(segments[i].content);
        } else {
          const segText = segments[i].content;
          const segStart = textOffset;
          const segEnd = textOffset + segText.length;

          if (segEnd <= phraseStart || segStart >= phraseEnd) {
            // No overlap
            newSegments.push(segText);
          } else {
            // Overlap — wrap the overlapping portion
            const overlapStart = Math.max(0, phraseStart - segStart);
            const overlapEnd = Math.min(segText.length, phraseEnd - segStart);
            let built = '';
            if (overlapStart > 0) built += segText.slice(0, overlapStart);
            built += '<mark data-color="#dbeafe" style="background-color:#dbeafe;border-radius:2px">';
            built += segText.slice(overlapStart, overlapEnd);
            built += '</mark>';
            if (overlapEnd < segText.length) built += segText.slice(overlapEnd);
            newSegments.push(built);
          }
          textOffset += segText.length;
        }
      }

      result = newSegments.join('');
      // Only highlight first occurrence of each phrase
    } catch {
      // Skip on error
    }
  }

  return result;
}

const STATUS_CONFIG = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: FileEdit },
  review: { label: "Review", color: "bg-amber-100 text-amber-700", icon: Eye },
  complete: { label: "Complete", color: "bg-blue-100 text-blue-700", icon: CheckCircle2 },
  published: { label: "Published", color: "bg-emerald-100 text-emerald-700", icon: Send },
} as const;

function ToolbarButton({ onClick, active, children, title }: {
  onClick: () => void; active?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded-md transition-colors ${
        active ? "bg-indigo-100 text-indigo-700" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export default function ArticleEditor() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const articleId = parseInt(params.id || "0");

  const [showSeo, setShowSeo] = useState(false);
  const [showGrade, setShowGrade] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [hasHighlights, setHasHighlights] = useState(false);
  const [expandedGradeCats, setExpandedGradeCats] = useState<Record<string, boolean>>({});

  const { data: article, isLoading, refetch } = trpc.articles.getById.useQuery(
    { id: articleId },
    { enabled: articleId > 0 }
  );

  const updateMutation = trpc.articles.update.useMutation({
    onSuccess: () => {
      toast.success("Article saved");
      setIsSaving(false);
      refetch();
    },
    onError: () => {
      toast.error("Failed to save");
      setIsSaving(false);
    },
  });

  const gradeMutation = trpc.grading.gradeArticle.useMutation({
    onSuccess: (data) => {
      setGradeResult(data);
      setShowGrade(true);
      toast.success("Article graded");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to grade article");
    },
  });

  // Track a version counter to signal GradePanel to clear selections
  const [appliedVersion, setAppliedVersion] = useState(0);
  const [copied, setCopied] = useState(false);

  // Cross Check state
  const [showCrossCheck, setShowCrossCheck] = useState(false);
  const [crossCheckResult, setCrossCheckResult] = useState<any>(null);

  // Redundancy Checker state
  const [showRedundancy, setShowRedundancy] = useState(false);
  const [redundancyResult, setRedundancyResult] = useState<any>(null);

  // Entity Analyzer state
  const [showEntity, setShowEntity] = useState(false);
  const [entityResult, setEntityResult] = useState<EntityAnalysisResult | null>(null);

  const entityMutation = trpc.entity.analyzeArticle.useMutation({
    onSuccess: (data: any) => {
      setEntityResult(data);
      setShowEntity(true);
      const score = data?.scores?.overallScore ?? 0;
      if (score >= 80) {
        toast.success(`Entity score: ${score}/100 — Strong entity structure!`);
      } else if (score >= 60) {
        toast.warning(`Entity score: ${score}/100 — Some improvements needed`);
      } else {
        toast.error(`Entity score: ${score}/100 — Significant entity issues`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to analyze entities");
    },
  });

  const applyEntityFixesMutation = trpc.entity.applyEntityFixes.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.appliedCount} entity fix${data.appliedCount > 1 ? "es" : ""} applied — re-scanning...`);
      // Update editor content with highlighted changes
      const oldContent = editor?.getHTML() || "";
      if (editor && data.content) {
        const highlightedHtml = buildHighlightedHtml(oldContent, data.content);
        editor.commands.setContent(highlightedHtml);
        setHasHighlights(true);
      }
      skipNextSyncRef.current = true;
      refetch();
      // Auto-trigger re-scan after a short delay
      setTimeout(() => {
        entityMutation.mutate({ articleId });
      }, 500);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply entity fixes");
    },
  });

  const redundancyMutation = trpc.redundancy.check.useMutation({
    onSuccess: (data) => {
      setRedundancyResult(data);
      setShowRedundancy(true);
      const count = data.results?.redundancies?.length || 0;
      if (count === 0) {
        toast.success("No redundancies found — content is clean!");
      } else {
        toast.warning(`Found ${count} redundanc${count === 1 ? "y" : "ies"} to review`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to check for redundancies");
    },
  });

  const crossCheckMutation = trpc.crossCheck.checkArticle.useMutation({
    onSuccess: (data) => {
      setCrossCheckResult(data);
      setShowCrossCheck(true);
      const discCount = data.results?.discrepancies?.length || 0;
      if (discCount === 0) {
        toast.success("Cross Check complete — no discrepancies found!");
      } else {
        toast.warning(`Cross Check found ${discCount} discrepanc${discCount === 1 ? "y" : "ies"}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to run cross check");
    },
  });
  // Skip the next article→editor sync so highlights aren't wiped by refetch
  const skipNextSyncRef = useRef(false);

  const applyImprovementsMutation = trpc.grading.applyImprovements.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.appliedCount} improvement${data.appliedCount > 1 ? "s" : ""} applied \u2014 re-grading...`);
      // Save old content for diff highlighting
      const oldContent = editor?.getHTML() || "";
      // Update editor content immediately with the improved version
      if (editor && data.content) {
        // Build HTML with <mark> tags highlighting the changes
        const highlightedHtml = buildHighlightedHtml(oldContent, data.content);
        editor.commands.setContent(highlightedHtml);
        setHasHighlights(true);
      }
      // Bump version to clear selections in GradePanel
      setAppliedVersion((v) => v + 1);
      // Skip the next useEffect sync so refetch doesn't wipe highlights
      skipNextSyncRef.current = true;
      refetch();
      // Auto-trigger re-grade after a short delay to let the DB update settle
      setTimeout(() => {
        gradeMutation.mutate({ articleId });
      }, 500);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to apply improvements");
    },
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your article..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          class: "article-table",
        },
      }),
      TableRow,
      TableCell,
      TableHeader,
      StyledBox,
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "prose prose-lg max-w-none focus:outline-none min-h-[500px] px-8 py-6",
      },
    },
  });

  // Load article data into editor
  useEffect(() => {
    if (article && editor) {
      // After applying improvements, skip the content sync to preserve highlights
      if (skipNextSyncRef.current) {
        skipNextSyncRef.current = false;
        // Still sync metadata fields (they may have changed)
        setTitle(article.title);
        setMetaTitle(article.metaTitle || "");
        setMetaDescription(article.metaDescription || "");
        setSlug(article.slug || "");
        setKeyword(article.keyword || "");
        return;
      }
      editor.commands.setContent(article.content || "");
      setTitle(article.title);
      setMetaTitle(article.metaTitle || "");
      setMetaDescription(article.metaDescription || "");
      setSlug(article.slug || "");
      setKeyword(article.keyword || "");
    }
  }, [article, editor]);

  const handleSave = useCallback(() => {
    if (!editor || !articleId) return;
    setIsSaving(true);
    const content = editor.getHTML();
    const wordCount = editor.getText().split(/\s+/).filter(Boolean).length;
    updateMutation.mutate({
      id: articleId,
      title,
      content,
      wordCount,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      slug: slug || undefined,
      keyword: keyword || undefined,
    });
  }, [editor, articleId, title, metaTitle, metaDescription, slug, keyword]);

  const handleStatusChange = (newStatus: string) => {
    updateMutation.mutate({ id: articleId, status: newStatus as any });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Article Not Found</h2>
        <Button onClick={() => navigate("/articles")} className="mt-4">Back to Articles</Button>
      </div>
    );
  }

  const statusInfo = STATUS_CONFIG[article.status as keyof typeof STATUS_CONFIG];
  const StatusIcon = statusInfo?.icon ?? FileEdit;
  const wordCount = editor ? editor.getText().split(/\s+/).filter(Boolean).length : article.wordCount ?? 0;

  const handleGradeToggle = () => {
    if (showGrade) {
      setShowGrade(false);
    } else {
      gradeMutation.mutate({ articleId });
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => navigate("/articles")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full"
              placeholder="Article title..."
            />
            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
              {keyword && (
                <span className="flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  {keyword}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(article.updatedAt).toLocaleDateString()}
              </span>
              <span>{wordCount.toLocaleString()} words</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Status Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <StatusIcon className="w-4 h-4" />
                {statusInfo?.label}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const Icon = config.icon;
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleStatusChange(key)}
                    className={article.status === key ? "bg-muted" : ""}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {config.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Grade Button */}
          <Button
            variant="outline"
            onClick={() => {
              if (showGrade) { setShowGrade(false); return; }
              gradeMutation.mutate({ articleId });
            }}
            disabled={gradeMutation.isPending}
            className={showGrade ? "bg-purple-50 text-purple-700 border-purple-200" : ""}
          >
            {gradeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-1.5" />
            )}
            Grade
          </Button>

          {/* SEO Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowSeo(!showSeo)}
            className={showSeo ? "bg-indigo-50 text-indigo-700 border-indigo-200" : ""}
          >
            <Search className="w-4 h-4 mr-1.5" />
            SEO
          </Button>

          {/* Copy HTML */}
          <Button
            variant="outline"
            onClick={async () => {
              if (!editor) return;
              const htmlContent = editor.getHTML();
              try {
                await navigator.clipboard.writeText(htmlContent);
                setCopied(true);
                toast.success("HTML copied to clipboard");
                setTimeout(() => setCopied(false), 2000);
              } catch {
                toast.error("Failed to copy HTML");
              }
            }}
            className={copied ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ""}
          >
            {copied ? <ClipboardCheck className="w-4 h-4 mr-1.5" /> : <Copy className="w-4 h-4 mr-1.5" />}
            {copied ? "Copied" : "Copy"}
          </Button>

          {/* Edit (toggle editor focus) */}
          <Button
            variant="outline"
            onClick={() => editor?.chain().focus().run()}
          >
            <Wand2 className="w-4 h-4 mr-1.5" />
            Edit
          </Button>

          {/* Overflow Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onClick={() => {
                  if (showEntity) { setShowEntity(false); return; }
                  entityMutation.mutate({ articleId });
                }}
                disabled={entityMutation.isPending}
                className={showEntity ? "bg-cyan-50 text-cyan-700" : ""}
              >
                {entityMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Scan className="w-4 h-4 mr-2 text-cyan-600" />
                )}
                Entity Analyzer
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (showCrossCheck) { setShowCrossCheck(false); return; }
                  crossCheckMutation.mutate({ articleId });
                }}
                disabled={crossCheckMutation.isPending}
                className={showCrossCheck ? "bg-teal-50 text-teal-700" : ""}
              >
                {crossCheckMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileCheck className="w-4 h-4 mr-2 text-teal-600" />
                )}
                Cross Check
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  if (showRedundancy) { setShowRedundancy(false); return; }
                  redundancyMutation.mutate({ articleId });
                }}
                disabled={redundancyMutation.isPending}
                className={showRedundancy ? "bg-orange-50 text-orange-700" : ""}
              >
                {redundancyMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Repeat2 className="w-4 h-4 mr-2 text-orange-600" />
                )}
                Redundancy Check
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!editor) return;
                  const htmlContent = editor.getHTML();
                  const blob = new Blob([htmlContent], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${slug || title || "article"}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                  toast.success("HTML file downloaded");
                }}
              >
                <Download className="w-4 h-4 mr-2 text-gray-600" />
                Download HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1 bg-white rounded-xl border border-border/60 overflow-hidden">
          {/* Toolbar */}
          {editor && (
            <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border/40 bg-muted/20 flex-wrap">
              <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
                <Bold className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
                <Italic className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Underline">
                <UnderlineIcon className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Strikethrough">
                <Strikethrough className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Highlight">
                <Highlighter className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-border mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
                <Heading2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Heading 3">
                <Heading3 className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-border mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet List">
                <List className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
                <ListOrdered className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
                <Quote className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} active={editor.isActive("codeBlock")} title="Code Block">
                <Code className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-border mx-1" />

              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align Left">
                <AlignLeft className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Align Center">
                <AlignCenter className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align Right">
                <AlignRight className="w-4 h-4" />
              </ToolbarButton>

              <div className="w-px h-5 bg-border mx-1" />

              <ToolbarButton
                onClick={() => {
                  const url = window.prompt("Enter URL:");
                  if (url) editor.chain().focus().setLink({ href: url }).run();
                }}
                active={editor.isActive("link")}
                title="Add Link"
              >
                <LinkIcon className="w-4 h-4" />
              </ToolbarButton>

              <div className="flex-1" />

              {/* Copy HTML Source Button */}
              <button
                onClick={async () => {
                  if (!editor) return;
                  const htmlContent = editor.getHTML();
                  try {
                    await navigator.clipboard.writeText(htmlContent);
                    setCopied(true);
                    toast.success("HTML copied to clipboard");
                    setTimeout(() => setCopied(false), 2000);
                  } catch {
                    toast.error("Failed to copy HTML");
                  }
                }}
                title="Copy HTML Source"
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                  copied
                    ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                }`}
              >
                {copied ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy HTML"}
              </button>

              {/* Remove Em Dashes Button */}
              <button
                onClick={() => {
                  if (!editor) return;
                  const html = editor.getHTML();
                  // Replace em dashes with comma-space (most natural substitute)
                  const cleaned = html.replace(/\s*—\s*/g, ", ");
                  if (cleaned === html) {
                    toast.info("No em dashes found");
                    return;
                  }
                  editor.commands.setContent(cleaned);
                  toast.success("Em dashes removed");
                }}
                title="Remove Em Dashes"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <MinusCircle className="w-3.5 h-3.5" />
                Remove —
              </button>

              {hasHighlights && (
                <button
                  onClick={() => {
                    editor.chain().focus().selectAll().unsetHighlight().run();
                    editor.commands.setTextSelection(0);
                    setHasHighlights(false);
                    toast.success("Highlights cleared");
                  }}
                  title="Clear Highlights"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200"
                >
                  <X className="w-3 h-3" />
                  Clear Highlights
                </button>
              )}

              <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
                <Undo2 className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
                <Redo2 className="w-4 h-4" />
              </ToolbarButton>
            </div>
          )}

          {/* Editor Content */}
          <EditorContent editor={editor} />
        </div>

        {/* Grade Sidebar */}
        {showGrade && gradeResult && (
          <GradePanel
            result={gradeResult}
            expanded={expandedGradeCats}
            onToggle={(key) => setExpandedGradeCats((p) => ({ ...p, [key]: !p[key] }))}
            onClose={() => setShowGrade(false)}
            onApply={(categoryKey: string, categoryLabel: string, improvements: string[]) => {
              applyImprovementsMutation.mutate({
                articleId,
                categoryKey,
                categoryLabel,
                selectedImprovements: improvements,
              });
            }}
            isApplying={applyImprovementsMutation.isPending}
            appliedVersion={appliedVersion}
          />
        )}

        {/* Cross Check Sidebar */}
        {showCrossCheck && crossCheckResult && (
          <CrossCheckPanel
            result={crossCheckResult}
            onClose={() => setShowCrossCheck(false)}
            onApply={(corrections) => {
              if (!editor) return;
              const oldHtml = editor.getHTML();
              let html = oldHtml;
              let appliedCount = 0;
              for (const corr of corrections) {
                const { articleText, correction } = corr;
                if (!articleText || !correction) continue;
                const result = findAndReplaceInHtml(html, articleText, correction);
                if (result.applied) {
                  html = result.html;
                  appliedCount++;
                }
              }
              if (appliedCount === 0) {
                toast.info("Could not find the text to replace \u2014 it may have been edited since the cross-check");
                return;
              }
              const highlightedHtml = buildHighlightedHtml(oldHtml, html);
              editor.commands.setContent(highlightedHtml);
              setHasHighlights(true);
              skipNextSyncRef.current = true;
              toast.success(`Applied ${appliedCount} correction${appliedCount > 1 ? 's' : ''}`);
            }}
          />
        )}

        {/* Redundancy Check Sidebar */}
        {showRedundancy && redundancyResult && (
          <RedundancyPanel
            result={redundancyResult}
            onClose={() => setShowRedundancy(false)}
            onApply={(fixes: { originalText: string; suggestedFix: string }[]) => {
              if (!editor) return;
              const oldHtml = editor.getHTML();
              let html = oldHtml;
              let appliedCount = 0;
              for (const fix of fixes) {
                const { originalText, suggestedFix } = fix;
                if (!originalText) continue;
                const result = findAndReplaceInHtml(html, originalText, suggestedFix);
                if (result.applied) {
                  html = result.html;
                  appliedCount++;
                }
              }
              if (appliedCount === 0) {
                toast.info("Could not find the text to replace \u2014 it may have been edited since the check");
                return;
              }
              const highlightedHtml = buildHighlightedHtml(oldHtml, html);
              editor.commands.setContent(highlightedHtml);
              setHasHighlights(true);
              skipNextSyncRef.current = true;
              toast.success(`Fixed ${appliedCount} redundanc${appliedCount > 1 ? 'ies' : 'y'}`);
            }}
          />
        )}

        {/* Entity Analyzer Sidebar */}
        {showEntity && entityResult && (
          <EntityPanel
            result={entityResult}
            onClose={() => setShowEntity(false)}
            onApplyFixes={(selectedFixes, primaryEntity) => {
              applyEntityFixesMutation.mutate({
                articleId,
                selectedFixes,
                primaryEntity: primaryEntity || undefined,
              });
            }}
            isApplying={applyEntityFixesMutation.isPending}
          />
        )}

        {/* SEO Sidebar */}
        {showSeo && (
          <div className="w-80 bg-white rounded-xl border border-border/60 p-5 space-y-5 flex-shrink-0 self-start sticky top-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              SEO Settings
            </h3>

            {/* Search Preview - at top */}
            <div className="pb-3 border-b border-border/40">
              <p className="text-xs font-medium text-muted-foreground mb-2">Search Preview</p>
              <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                <p className="text-blue-700 text-sm font-medium truncate">
                  {metaTitle || title || "Article Title"}
                </p>
                <p className="text-emerald-700 text-xs truncate">
                  example.com/{slug || "article-slug"}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {metaDescription || "Meta description will appear here..."}
                </p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Target Keyword</Label>
              <Input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Primary keyword"
                className="mt-1"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Meta Title</Label>
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="SEO title (max 60 chars)"
                className="mt-1"
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">{metaTitle.length}/60 characters</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Meta Description</Label>
              <Textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="SEO description (max 155 chars)"
                className="mt-1"
                rows={3}
                maxLength={155}
              />
              <p className="text-xs text-muted-foreground mt-1">{metaDescription.length}/155 characters</p>
            </div>

            <div>
              <Label className="text-sm font-medium">URL Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="article-url-slug"
                className="mt-1"
              />
            </div>


          </div>
        )}
      </div>
    </div>
  );
}

/* ── Grade Panel Component ── */

const gradeCategoryMeta: Record<string, { icon: typeof ShieldCheck; color: string; bgColor: string }> = {
  eeatTrust: { icon: ShieldCheck, color: "text-blue-600", bgColor: "bg-blue-50" },
  accuracy: { icon: Target, color: "text-emerald-600", bgColor: "bg-emerald-50" },
  aioReadiness: { icon: Bot, color: "text-purple-600", bgColor: "bg-purple-50" },
  readabilityUx: { icon: BookOpen, color: "text-amber-600", bgColor: "bg-amber-50" },
  seoEntityCoverage: { icon: Search, color: "text-indigo-600", bgColor: "bg-indigo-50" },
  riskHygiene: { icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-50" },
  brandVoiceAlignment: { icon: Sparkles, color: "text-pink-600", bgColor: "bg-pink-50" },
  icpAlignment: { icon: Target, color: "text-teal-600", bgColor: "bg-teal-50" },
};

function getGradeBandInfo(band: string) {
  if (band.startsWith("A")) return { color: "text-emerald-700", bgColor: "bg-emerald-100", ringColor: "ring-emerald-200" };
  if (band.startsWith("B")) return { color: "text-blue-700", bgColor: "bg-blue-100", ringColor: "ring-blue-200" };
  if (band.startsWith("C")) return { color: "text-amber-700", bgColor: "bg-amber-100", ringColor: "ring-amber-200" };
  if (band.startsWith("D")) return { color: "text-orange-700", bgColor: "bg-orange-100", ringColor: "ring-orange-200" };
  return { color: "text-red-700", bgColor: "bg-red-100", ringColor: "ring-red-200" };
}

function getScoreBarColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return "[&>div]:bg-emerald-500";
  if (pct >= 60) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-red-500";
}

function GradePanel({
  result,
  expanded,
  onToggle,
  onClose,
  onApply,
  isApplying,
  appliedVersion = 0,
}: {
  result: any;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
  onClose: () => void;
  onApply: (categoryKey: string, categoryLabel: string, improvements: string[]) => void;
  isApplying: boolean;
  appliedVersion?: number;
}) {
  const grades = result?.grades;
  // Track selected improvements per category: { [categoryKey]: Set<index> }
  const [selected, setSelected] = useState<Record<string, Set<number>>>({});

  // Clear selections when appliedVersion changes (after successful apply)
  useEffect(() => {
    if (appliedVersion > 0) {
      setSelected({});
    }
  }, [appliedVersion]);

  if (!grades) return null;

  const totalScore = grades.totalScore || 0;
  const maxScore = grades.maxPossible || 100;
  const gradeBand = grades.gradeBand || (() => {
    const pct = (totalScore / maxScore) * 100;
    if (pct >= 93) return "A";
    if (pct >= 90) return "A-";
    if (pct >= 87) return "B+";
    if (pct >= 83) return "B";
    if (pct >= 80) return "B-";
    if (pct >= 77) return "C+";
    if (pct >= 70) return "C";
    if (pct >= 60) return "D";
    return "F";
  })();
  const gradeInfo = getGradeBandInfo(gradeBand);
  const categories = grades.categories || {};

  const toggleSelection = (catKey: string, idx: number) => {
    setSelected((prev) => {
      const catSet = new Set(prev[catKey] || []);
      if (catSet.has(idx)) catSet.delete(idx);
      else catSet.add(idx);
      return { ...prev, [catKey]: catSet };
    });
  };

  const getSelectedCount = (catKey: string) => (selected[catKey]?.size || 0);

  const handleApplySelected = (catKey: string, catLabel: string, improvements: string[]) => {
    const catSet = selected[catKey];
    if (!catSet || catSet.size === 0) return;
    const selectedImps = improvements.filter((_: string, i: number) => catSet.has(i));
    onApply(catKey, catLabel, selectedImps);
  };

  return (
    <div className="w-[420px] bg-white rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header with Score + Grade */}
      <div className="p-4 border-b bg-gradient-to-r from-purple-500/5 via-indigo-500/5 to-pink-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            GEO Content Grade
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-6 py-2">
          {/* Score Circle */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Total Score</p>
            <div className={`w-16 h-16 rounded-full ${gradeInfo.bgColor} ring-4 ${gradeInfo.ringColor} flex items-center justify-center`}>
              <span className={`text-2xl font-black ${gradeInfo.color}`}>{totalScore}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">out of {maxScore}</p>
          </div>
          {/* Grade Band */}
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Grade Band</p>
            <div className="w-16 h-16 rounded-full bg-background ring-4 ring-border flex items-center justify-center">
              <span className="text-2xl font-black text-foreground">{gradeBand}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {result.hasBrandVoice ? "+BV" : ""}{result.hasICP ? " +ICP" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Category Cards */}
        {Object.entries(categories).map(([key, cat]: [string, any]) => {
          const meta = gradeCategoryMeta[key] || { icon: ShieldCheck, color: "text-gray-600", bgColor: "bg-gray-50" };
          const pct = cat.maxScore > 0 ? Math.round((cat.score / cat.maxScore) * 100) : 0;
          const analysis = cat.analysis || cat.explanation || cat.reason || "";
          const selCount = getSelectedCount(key);

          return (
            <div key={key} className="border-b last:border-b-0 px-4 py-3">
              {/* Category Header */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-xs">{cat.label || key}</span>
                  {cat.weight && (
                    <span className="text-[10px] text-muted-foreground">({cat.weight})</span>
                  )}
                </div>
                <span className={`text-xs font-bold ${
                  pct >= 80 ? "text-emerald-600" : pct >= 60 ? "text-amber-600" : "text-red-600"
                }`}>
                  {cat.score}/{cat.maxScore}
                </span>
              </div>

              {/* Progress Bar */}
              <Progress
                value={pct}
                className={`h-2 mb-2.5 ${getScoreBarColor(cat.score, cat.maxScore)}`}
              />

              {/* Analysis */}
              {analysis && (
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">
                  {analysis}
                </p>
              )}

              {/* Selectable Improvements */}
              {cat.improvements?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-semibold text-orange-600">Improvements:</p>
                    {selCount > 0 && (
                      <span className="text-[10px] text-orange-600 font-medium">{selCount} selected</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {cat.improvements.map((imp: string, i: number) => {
                      const isSelected = selected[key]?.has(i) || false;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => toggleSelection(key, i)}
                          className={`w-full text-left flex items-start gap-2 text-[11px] p-2 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? "border-orange-400 bg-orange-50"
                              : "border-border/40 bg-white hover:border-orange-300 hover:bg-orange-50/30"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? "border-orange-500 bg-orange-500"
                              : "border-gray-300 bg-white"
                          }`}>
                            {isSelected && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <span className={isSelected ? "text-foreground" : "text-muted-foreground"}>{imp}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Apply Selected Button */}
                  <Button
                    size="sm"
                    className={`w-full mt-2.5 text-xs h-8 gap-1.5 font-semibold transition-all ${
                      selCount > 0
                        ? "bg-orange-500 hover:bg-orange-600 text-white"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                    disabled={selCount === 0 || isApplying}
                    onClick={() => handleApplySelected(key, cat.label || key, cat.improvements)}
                  >
                    {isApplying ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Wand2 className="w-3 h-3" />
                    )}
                    {selCount > 0 ? `Apply Selected (${selCount})` : "Select improvements to apply"}
                  </Button>
                </div>
              )}
            </div>
          );
        })}

        {/* Key Strengths & Weaknesses */}
        {(grades.keyStrengths?.length > 0 || grades.keyWeaknesses?.length > 0) && (
          <div className="border-t px-4 py-3">
            {grades.keyStrengths?.length > 0 && (
              <div className="mb-2.5">
                <p className="text-[10px] font-bold text-emerald-700 mb-1.5">Key Strengths</p>
                <div className="space-y-1">
                  {grades.keyStrengths.map((s: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {grades.keyWeaknesses?.length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-red-700 mb-1.5">Key Weaknesses</p>
                <div className="space-y-1">
                  {grades.keyWeaknesses.map((w: string, i: number) => (
                    <div key={i} className="flex items-start gap-1.5 text-[11px]">
                      <X className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Penalties */}
        {grades.penalties?.length > 0 && grades.penalties.some((p: string) => p && p.trim()) && (
          <div className="border-t px-4 py-3 bg-amber-50/50">
            <p className="text-[10px] font-bold text-red-600 mb-1.5">Penalties Applied</p>
            <div className="space-y-1">
              {grades.penalties.filter((p: string) => p && p.trim()).map((p: string, i: number) => (
                <div key={i} className="flex items-start gap-1.5 text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 shrink-0" />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prioritized Corrective Actions */}
        {grades.prioritizedActions?.length > 0 && (
          <div className="border-t px-4 py-3 bg-indigo-50/30">
            <p className="text-[10px] font-bold text-indigo-700 mb-1.5">Prioritized Corrective Actions</p>
            <div className="space-y-1.5">
              {grades.prioritizedActions.map((action: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <div className="w-4 h-4 rounded bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-indigo-700">{i + 1}</span>
                  </div>
                  <span>{action}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


/* ── Cross Check Panel Component ── */

const severityConfig = {
  high: { label: "High", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-200", icon: AlertTriangle },
  medium: { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-200", icon: Info },
  low: { label: "Low", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-200", icon: Info },
} as const;

function CrossCheckPanel({
  result,
  onClose,
  onApply,
}: {
  result: any;
  onClose: () => void;
  onApply: (corrections: { articleText: string; correction: string }[]) => void;
}) {
  const { results, referenceDocName } = result || {};
  const discrepancies = results?.discrepancies || [];
  const alignedFacts = results?.alignedFacts || [];
  const summary = results?.summary || "";
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = () => {
    const corrections = Array.from(selected).map((i) => ({
      articleText: discrepancies[i]?.articleText,
      correction: discrepancies[i]?.correction,
    })).filter((c) => c.articleText && c.correction);
    if (corrections.length === 0) return;
    onApply(corrections);
    setSelected(new Set());
  };

  const highCount = discrepancies.filter((d: any) => d.severity === "high").length;
  const mediumCount = discrepancies.filter((d: any) => d.severity === "medium").length;
  const lowCount = discrepancies.filter((d: any) => d.severity === "low").length;

  return (
    <div className="w-[420px] bg-white rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-cyan-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-teal-600" />
            Cross Check Results
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Reference Doc Name */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <FileText className="w-3.5 h-3.5" />
          <span>Checked against: <strong className="text-foreground">{referenceDocName || "Reference Document"}</strong></span>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-3">
          {discrepancies.length === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-lg px-3 py-1.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              All facts aligned
            </div>
          ) : (
            <>
              {highCount > 0 && (
                <div className="flex items-center gap-1 bg-red-100 text-red-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  <AlertTriangle className="w-3 h-3" />
                  {highCount} High
                </div>
              )}
              {mediumCount > 0 && (
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  <Info className="w-3 h-3" />
                  {mediumCount} Medium
                </div>
              )}
              {lowCount > 0 && (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  <Info className="w-3 h-3" />
                  {lowCount} Low
                </div>
              )}
            </>
          )}
        </div>

        {/* Apply Selected Button */}
        {selected.size > 0 && (
          <button
            onClick={handleApply}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Apply Selected ({selected.size})
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Summary */}
        {summary && (
          <div className="px-4 py-3 border-b bg-muted/20">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Discrepancies */}
        {discrepancies.length > 0 && (
          <div className="px-4 py-3 border-b">
            <p className="text-[10px] font-bold text-red-600 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Discrepancies ({discrepancies.length})
            </p>
            <div className="space-y-3">
              {discrepancies.map((disc: any, i: number) => {
                const sev = severityConfig[disc.severity as keyof typeof severityConfig] || severityConfig.low;
                const SevIcon = sev.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border ${sev.borderColor} overflow-hidden cursor-pointer transition-all ${
                      selected.has(i) ? 'ring-2 ring-teal-400 ring-offset-1' : ''
                    }`}
                    onClick={() => disc.correction && toggleSelection(i)}
                  >
                    {/* Severity Badge + Selection */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 ${sev.bgColor}`}>
                      {disc.correction && (
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          selected.has(i)
                            ? 'bg-teal-600 border-teal-600'
                            : 'border-gray-300 bg-white'
                        }`}>
                          {selected.has(i) && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                      )}
                      <SevIcon className={`w-3 h-3 ${sev.color}`} />
                      <span className={`text-[10px] font-bold ${sev.color}`}>{sev.label} Severity</span>
                    </div>

                    <div className="px-3 py-2.5 space-y-2">
                      {/* Article Text (what's wrong) */}
                      <div>
                        <p className="text-[10px] font-semibold text-red-600 mb-0.5">In article:</p>
                        <p className="text-[11px] text-foreground bg-red-50 rounded px-2 py-1.5 leading-relaxed border border-red-100">
                          "{disc.articleText}"
                        </p>
                      </div>

                      {/* Reference Text (what's correct) */}
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">Reference says:</p>
                        <p className="text-[11px] text-foreground bg-emerald-50 rounded px-2 py-1.5 leading-relaxed border border-emerald-100">
                          "{disc.referenceText}"
                        </p>
                      </div>

                      {/* Suggested Correction */}
                      {disc.correction && (
                        <div>
                          <p className="text-[10px] font-semibold text-indigo-600 mb-0.5">Suggested correction:</p>
                          <p className="text-[11px] text-foreground bg-indigo-50 rounded px-2 py-1.5 leading-relaxed border border-indigo-100">
                            {disc.correction}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Aligned Facts */}
        {alignedFacts.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Aligned Facts ({alignedFacts.length})
            </p>
            <div className="space-y-1.5">
              {alignedFacts.map((fact: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{fact}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Reference Doc Warning */}
        {!results && (
          <div className="px-4 py-6 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm font-medium text-muted-foreground">No reference document found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add a reference document in Project Settings &gt; Cross Check tab
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Redundancy Panel Component ── */

const redundancyTypeConfig = {
  repeated_phrase: { label: "Repeated Phrase", color: "text-red-700", bgColor: "bg-red-50", icon: Repeat2 },
  redundant_idea: { label: "Redundant Idea", color: "text-amber-700", bgColor: "bg-amber-50", icon: Copy },
  recycled_stat: { label: "Recycled Stat", color: "text-purple-700", bgColor: "bg-purple-50", icon: BarChart3 },
  filler_pattern: { label: "Filler Pattern", color: "text-blue-700", bgColor: "bg-blue-50", icon: MinusCircle },
} as const;

const redundancySeverityConfig = {
  high: { label: "High", color: "text-red-700", bgColor: "bg-red-100", borderColor: "border-red-200" },
  medium: { label: "Medium", color: "text-amber-700", bgColor: "bg-amber-100", borderColor: "border-amber-200" },
  low: { label: "Low", color: "text-blue-700", bgColor: "bg-blue-100", borderColor: "border-blue-200" },
} as const;

function RedundancyPanel({
  result,
  onClose,
  onApply,
}: {
  result: any;
  onClose: () => void;
  onApply: (fixes: { originalText: string; suggestedFix: string }[]) => void;
}) {
  const { results } = result || {};
  const redundancies = results?.redundancies || [];
  const cleanSections = results?.cleanSections || [];
  const summary = results?.summary || "";
  const redundancyScore = results?.redundancyScore || 0;
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleApply = () => {
    const fixes = Array.from(selected).map((i) => ({
      originalText: redundancies[i]?.originalText,
      suggestedFix: redundancies[i]?.suggestedFix ?? "",
    })).filter((f) => f.originalText);
    if (fixes.length === 0) return;
    onApply(fixes);
    setSelected(new Set());
  };

  const highCount = redundancies.filter((r: any) => r.severity === "high").length;
  const mediumCount = redundancies.filter((r: any) => r.severity === "medium").length;
  const lowCount = redundancies.filter((r: any) => r.severity === "low").length;

  // Score color
  const scoreColor = redundancyScore >= 8 ? "text-emerald-600" : redundancyScore >= 5 ? "text-amber-600" : "text-red-600";
  const scoreBg = redundancyScore >= 8 ? "bg-emerald-50" : redundancyScore >= 5 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="w-[420px] bg-white rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-orange-500/5 via-amber-500/5 to-yellow-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Repeat2 className="w-4 h-4 text-orange-600" />
            Redundancy Check
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Score + Stats Row */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`flex items-center gap-1.5 ${scoreBg} rounded-lg px-3 py-1.5`}>
            <span className={`text-lg font-bold ${scoreColor}`}>{redundancyScore}</span>
            <span className="text-[10px] text-muted-foreground">/10</span>
          </div>
          {redundancies.length === 0 ? (
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-lg px-3 py-1.5 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              No redundancies found
            </div>
          ) : (
            <>
              {highCount > 0 && (
                <div className="flex items-center gap-1 bg-red-100 text-red-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  {highCount} High
                </div>
              )}
              {mediumCount > 0 && (
                <div className="flex items-center gap-1 bg-amber-100 text-amber-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  {mediumCount} Medium
                </div>
              )}
              {lowCount > 0 && (
                <div className="flex items-center gap-1 bg-blue-100 text-blue-700 rounded-md px-2 py-1 text-[11px] font-semibold">
                  {lowCount} Low
                </div>
              )}
            </>
          )}
        </div>

        {/* Apply Selected Button */}
        {selected.size > 0 && (
          <button
            onClick={handleApply}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-700 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Apply Selected ({selected.size})
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {/* Summary */}
        {summary && (
          <div className="px-4 py-3 border-b bg-muted/20">
            <p className="text-[11px] text-muted-foreground leading-relaxed">{summary}</p>
          </div>
        )}

        {/* Redundancies */}
        {redundancies.length > 0 && (
          <div className="px-4 py-3 border-b">
            <p className="text-[10px] font-bold text-orange-600 mb-2.5 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Redundancies ({redundancies.length})
            </p>
            <div className="space-y-3">
              {redundancies.map((item: any, i: number) => {
                const typeConf = redundancyTypeConfig[item.type as keyof typeof redundancyTypeConfig] || redundancyTypeConfig.filler_pattern;
                const sevConf = redundancySeverityConfig[item.severity as keyof typeof redundancySeverityConfig] || redundancySeverityConfig.low;
                const TypeIcon = typeConf.icon;
                return (
                  <div
                    key={i}
                    className={`rounded-lg border ${sevConf.borderColor} overflow-hidden cursor-pointer transition-all ${
                      selected.has(i) ? 'ring-2 ring-orange-400 ring-offset-1' : ''
                    }`}
                    onClick={() => toggleSelection(i)}
                  >
                    {/* Type + Severity Header */}
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 ${sevConf.bgColor}`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        selected.has(i)
                          ? 'bg-orange-600 border-orange-600'
                          : 'border-gray-300 bg-white'
                      }`}>
                        {selected.has(i) && (
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <TypeIcon className={`w-3 h-3 ${typeConf.color}`} />
                      <span className={`text-[10px] font-bold ${typeConf.color}`}>{typeConf.label}</span>
                      <span className="text-[10px] text-muted-foreground">·</span>
                      <span className={`text-[10px] font-semibold ${sevConf.color}`}>{sevConf.label}</span>
                    </div>

                    <div className="px-3 py-2.5 space-y-2">
                      {/* Description */}
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.description}</p>

                      {/* Original Text */}
                      <div>
                        <p className="text-[10px] font-semibold text-red-600 mb-0.5">Found in article:</p>
                        <p className="text-[11px] text-foreground bg-red-50 rounded px-2 py-1.5 leading-relaxed border border-red-100">
                          "{item.originalText}"
                        </p>
                      </div>

                      {/* Second Instance (if applicable) */}
                      {item.secondInstance && (
                        <div>
                          <p className="text-[10px] font-semibold text-amber-600 mb-0.5">Also appears as:</p>
                          <p className="text-[11px] text-foreground bg-amber-50 rounded px-2 py-1.5 leading-relaxed border border-amber-100">
                            "{item.secondInstance}"
                          </p>
                        </div>
                      )}

                      {/* Suggested Fix */}
                      <div>
                        <p className="text-[10px] font-semibold text-emerald-600 mb-0.5">
                          {item.suggestedFix ? "Suggested fix:" : "Suggestion: Remove this text"}
                        </p>
                        {item.suggestedFix ? (
                          <p className="text-[11px] text-foreground bg-emerald-50 rounded px-2 py-1.5 leading-relaxed border border-emerald-100">
                            {item.suggestedFix}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground italic">
                            This text can be removed without losing information.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Clean Sections */}
        {cleanSections.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-[10px] font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Clean Sections ({cleanSections.length})
            </p>
            <div className="space-y-1.5">
              {cleanSections.map((section: string, i: number) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{section}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Entity Analyzer Panel Component ── */

const prominenceConfig = {
  High: { color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200" },
  Medium: { color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200" },
  Low: { color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-200" },
} as const;

const driftConfig = {
  "No drift": { color: "text-emerald-700", bgColor: "bg-emerald-50" },
  "Minor drift": { color: "text-amber-700", bgColor: "bg-amber-50" },
  "Moderate drift": { color: "text-orange-700", bgColor: "bg-orange-50" },
  "Severe dilution": { color: "text-red-700", bgColor: "bg-red-50" },
} as const;

const dominanceConfig = {
  "Strong dominance": { color: "text-emerald-700", bgColor: "bg-emerald-50" },
  "Moderate dominance": { color: "text-blue-700", bgColor: "bg-blue-50" },
  "Split focus": { color: "text-amber-700", bgColor: "bg-amber-50" },
  "Competing entities": { color: "text-red-700", bgColor: "bg-red-50" },
} as const;

function EntityPanel({
  result,
  onClose,
  onApplyFixes,
  isApplying,
}: {
  result: EntityAnalysisResult;
  onClose: () => void;
  onApplyFixes?: (selectedFixes: string[], primaryEntity: string) => void;
  isApplying?: boolean;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entities: true,
    salience: false,
    fixes: true,
  });
  const [selectedFixes, setSelectedFixes] = useState<Set<number>>(new Set());

  const toggleFix = (index: number) => {
    setSelectedFixes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAllFixes = () => {
    const fixes = result.actionableFixes || [];
    if (selectedFixes.size === fixes.length) {
      setSelectedFixes(new Set());
    } else {
      setSelectedFixes(new Set(fixes.map((_, i) => i)));
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const scores = result.scores;
  const overallScore = scores?.overallScore ?? 0;
  const scoreColor = overallScore >= 80 ? "text-emerald-600" : overallScore >= 60 ? "text-amber-600" : "text-red-600";
  const scoreBg = overallScore >= 80 ? "bg-emerald-50" : overallScore >= 60 ? "bg-amber-50" : "bg-red-50";
  const scoreRing = overallScore >= 80 ? "ring-emerald-200" : overallScore >= 60 ? "ring-amber-200" : "ring-red-200";

  const scoreItems = [
    { label: "Primary Clarity", value: scores?.primaryEntityClarity ?? 0, max: 30 },
    { label: "Entity Focus", value: scores?.entityFocus ?? 0, max: 25 },
    { label: "Supporting Coverage", value: scores?.supportingCoverage ?? 0, max: 25 },
    { label: "GEO Extractability", value: scores?.geoExtractability ?? 0, max: 20 },
  ];

  const entities = result.entities || [];
  const salience = result.salienceStructure;
  const fixes = result.actionableFixes || [];
  const primary = result.primaryEntity;

  return (
    <div className="w-[420px] bg-white rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/40 bg-gradient-to-r from-cyan-50 to-blue-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-cyan-600" />
          <h3 className="font-semibold text-sm">Entity Analysis</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Overall Score */}
      <div className="px-4 py-3 border-b border-border/40 flex items-center gap-4">
        <div className={`w-16 h-16 rounded-full ${scoreBg} ring-4 ${scoreRing} flex items-center justify-center`}>
          <span className={`text-2xl font-black ${scoreColor}`}>{overallScore}</span>
        </div>
        <div className="flex-1 space-y-1.5">
          {scoreItems.map((item) => {
            const pct = item.max > 0 ? Math.round((item.value / item.max) * 100) : 0;
            return (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-28 shrink-0">{item.label}</span>
                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium w-10 text-right">{item.value}/{item.max}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Entity */}
      {primary && (
        <div className="px-4 py-3 border-b border-border/40 bg-cyan-50/30">
          <p className="text-[10px] font-bold text-cyan-700 mb-1.5 flex items-center gap-1">
            <Target className="w-3 h-3" />
            Primary Entity
          </p>
          <p className="text-sm font-semibold text-foreground">{primary.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            <span className="font-medium text-cyan-600">{primary.type}</span> — {primary.justification}
          </p>
        </div>
      )}

      {/* Entities List (collapsible) */}
      <div className="border-b border-border/40">
        <button
          onClick={() => toggleSection("entities")}
          className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
        >
          <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-indigo-600" />
            Detected Entities ({entities.length})
          </span>
          {expandedSections.entities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {expandedSections.entities && (
          <div className="px-4 pb-3 space-y-1.5">
            {entities.map((entity, i) => {
              const pConf = prominenceConfig[entity.prominence] || prominenceConfig.Low;
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg border ${pConf.borderColor} ${pConf.bgColor}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-foreground">{entity.name}</span>
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${pConf.bgColor} ${pConf.color}`}>
                        {entity.prominence}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="font-medium">{entity.type}</span> — {entity.rationale}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Salience Structure (collapsible) */}
      {salience && (
        <div className="border-b border-border/40">
          <button
            onClick={() => toggleSection("salience")}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
              Salience Structure
            </span>
            {expandedSections.salience ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.salience && (
            <div className="px-4 pb-3 space-y-2">
              {/* Dominance Gap */}
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground">Dominance Gap</span>
                  {(() => {
                    const conf = dominanceConfig[salience.dominanceGap.grade as keyof typeof dominanceConfig] || dominanceConfig["Split focus"];
                    return (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${conf.bgColor} ${conf.color}`}>
                        {salience.dominanceGap.grade}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-muted-foreground">{salience.dominanceGap.description}</p>
              </div>

              {/* Early Reinforcement */}
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <span className="text-[10px] font-semibold text-foreground block mb-1">Early Reinforcement</span>
                <div className="flex gap-2 mb-1">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${salience.earlyReinforcement.inFirstParagraph ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {salience.earlyReinforcement.inFirstParagraph ? "\u2713" : "\u2717"} 1st Paragraph
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${salience.earlyReinforcement.inHeading ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {salience.earlyReinforcement.inHeading ? "\u2713" : "\u2717"} In Heading
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded ${salience.earlyReinforcement.withinFirst120Words ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {salience.earlyReinforcement.withinFirst120Words ? "\u2713" : "\u2717"} First 120 Words
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{salience.earlyReinforcement.summary}</p>
              </div>

              {/* Entity Drift */}
              <div className="p-2 rounded-lg bg-muted/30 border border-border/40">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold text-foreground">Entity Drift</span>
                  {(() => {
                    const conf = driftConfig[salience.entityDrift.level as keyof typeof driftConfig] || driftConfig["Minor drift"];
                    return (
                      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${conf.bgColor} ${conf.color}`}>
                        {salience.entityDrift.level}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-[10px] text-muted-foreground">{salience.entityDrift.description}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actionable Fixes (collapsible + selectable) */}
      {fixes.length > 0 && (
        <div className="border-b border-border/40">
          <button
            onClick={() => toggleSection("fixes")}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/30 transition-colors"
          >
            <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
              Actionable Fixes ({fixes.length})
            </span>
            {expandedSections.fixes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {expandedSections.fixes && (
            <div className="px-4 pb-3 space-y-1.5">
              {/* Select All / Deselect All */}
              {onApplyFixes && (
                <button
                  onClick={selectAllFixes}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium mb-1"
                >
                  {selectedFixes.size === fixes.length ? "Deselect All" : "Select All"}
                </button>
              )}
              {fixes.map((fix, i) => (
                <div
                  key={i}
                  onClick={() => onApplyFixes && toggleFix(i)}
                  className={`flex items-start gap-2 text-[11px] rounded-lg p-1.5 transition-colors ${
                    onApplyFixes ? "cursor-pointer hover:bg-muted/40" : ""
                  } ${selectedFixes.has(i) ? "bg-amber-50 border border-amber-200" : ""}`}
                >
                  {onApplyFixes ? (
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      selectedFixes.has(i)
                        ? "bg-amber-500 border-amber-500 text-white"
                        : "border-gray-300 bg-white"
                    }`}>
                      {selectedFixes.has(i) && (
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[9px] font-bold text-amber-700">{i + 1}</span>
                    </div>
                  )}
                  <span className={`leading-relaxed ${selectedFixes.has(i) ? "text-foreground" : "text-muted-foreground"}`}>{fix}</span>
                </div>
              ))}

              {/* Apply Selected Button */}
              {onApplyFixes && selectedFixes.size > 0 && (
                <button
                  onClick={() => {
                    const selected = fixes.filter((_, i) => selectedFixes.has(i));
                    onApplyFixes(selected, primary?.name || "");
                  }}
                  disabled={isApplying}
                  className="w-full mt-2 py-2 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isApplying ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Applying Fixes...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      Apply Selected ({selectedFixes.size})
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Supporting Coverage */}
      {result.supportingCoverage && (
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-[10px] font-bold text-foreground mb-1.5 flex items-center gap-1">
            <BookOpen className="w-3 h-3 text-blue-600" />
            Supporting Coverage
            <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded ${
              result.supportingCoverage.grade === "Comprehensive" ? "bg-emerald-50 text-emerald-700" :
              result.supportingCoverage.grade === "Adequate" ? "bg-blue-50 text-blue-700" :
              result.supportingCoverage.grade === "Thin" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>{result.supportingCoverage.grade}</span>
          </p>
          <p className="text-[10px] text-muted-foreground mb-2">{result.supportingCoverage.evaluation}</p>
          {result.supportingCoverage.missingComponents.length > 0 && (
            <div>
              <p className="text-[9px] font-semibold text-red-600 mb-1">Missing:</p>
              <div className="flex flex-wrap gap-1">
                {result.supportingCoverage.missingComponents.map((comp, i) => (
                  <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
                    {comp}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* GEO Extractability */}
      {result.geoExtractability && (
        <div className="px-4 py-3">
          <p className="text-[10px] font-bold text-foreground mb-1.5 flex items-center gap-1">
            <Bot className="w-3 h-3 text-purple-600" />
            GEO/AI Extractability
            <span className={`ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded ${
              result.geoExtractability.grade === "High" ? "bg-emerald-50 text-emerald-700" :
              result.geoExtractability.grade === "Moderate" ? "bg-amber-50 text-amber-700" :
              "bg-red-50 text-red-700"
            }`}>{result.geoExtractability.grade}</span>
          </p>
          <div className="flex gap-2 mb-1.5 flex-wrap">
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.geoExtractability.hasConcisenDefinitions ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {result.geoExtractability.hasConcisenDefinitions ? "\u2713" : "\u2717"} Definitions
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.geoExtractability.hasClearQuestionAnswering ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {result.geoExtractability.hasClearQuestionAnswering ? "\u2713" : "\u2717"} Q&A Format
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.geoExtractability.hasShortAnswerSummary ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {result.geoExtractability.hasShortAnswerSummary ? "\u2713" : "\u2717"} Short Summary
            </span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded ${result.geoExtractability.hasCleanHeadings ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
              {result.geoExtractability.hasCleanHeadings ? "\u2713" : "\u2717"} Clean Headings
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{result.geoExtractability.evaluation}</p>
        </div>
      )}
    </div>
  );
}
