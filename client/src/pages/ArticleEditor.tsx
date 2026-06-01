import { trpc } from "@/lib/trpc";
import { RegenerateSection, SectionDiffPreview } from "@/components/RegenerateSection";
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
  FileCheck, Info, ExternalLink, Repeat2, MoreVertical, Download, Scan, Image, ImagePlus, Trash2, RefreshCw, Palette,
  ListTree, FolderKanban, Unlink, Link2, Globe,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useActiveProject } from "@/components/AppLayout";

/**
 * Strips unwanted <strong>/<b> wrapping that LLMs sometimes add to "highlight" edits.
 * Only strips tags that wrap an ENTIRE block element's content.
 * Preserves legitimate inline bold (e.g., "The cost is <strong>$202.90</strong> per month").
 */
function stripWrappingStrongTags(content: string): string {
  let result = content;
  result = result.replace(
    /(<(?:p|h[1-6]|li|td|th|div|blockquote)(?:\s[^>]*)?>)\s*<(?:strong|b)>((?:(?!<\/(?:strong|b)>).)*)<\/(?:strong|b)>\s*(<\/(?:p|h[1-6]|li|td|th|div|blockquote)>)/gi,
    '$1$2$3'
  );
  result = result.replace(
    /^<(?:strong|b)>((?:(?!<(?:strong|b)[\s>]).)*)<\/(?:strong|b)>$/gm,
    '$1'
  );
  return result;
}

/**
 * Decode common HTML entities to their plain text equivalents.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#8211;/g, '\u2013') // en-dash
    .replace(/&#8212;/g, '\u2014') // em-dash
    .replace(/&#8216;/g, '\u2018') // left single quote
    .replace(/&#8217;/g, '\u2019') // right single quote
    .replace(/&#8220;/g, '\u201C') // left double quote
    .replace(/&#8221;/g, '\u201D') // right double quote
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Normalize text for fuzzy matching: decode entities, collapse whitespace,
 * normalize dashes and quotes to ASCII equivalents.
 */
function normalizeForMatch(text: string): string {
  return decodeHtmlEntities(text)
    .replace(/[\u2013\u2014\u2015]/g, '-') // en-dash, em-dash → hyphen
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // smart single quotes → '
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // smart double quotes → "
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Robust find-and-replace in HTML content.
 * Strips HTML tags to build plain text, finds the search phrase (with normalized
 * whitespace fallback, HTML entity decoding, and virtual tag-boundary spaces),
 * then surgically replaces the matched text in the original HTML while preserving
 * all surrounding tags.
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
    const virtualParts: string[] = [];
    const charMap: { segIdx: number; offset: number }[] = [];
    let segCounter = 0;
    for (let si = 0; si < segments.length; si++) {
      if (segments[si].type === 'text') {
        if (virtualParts.length > 0) {
          const lastChar = virtualParts[virtualParts.length - 1];
          const prevChar = lastChar[lastChar.length - 1];
          const nextChar = segments[si].content[0];
          if (prevChar && !/\s/.test(prevChar) && nextChar && !/\s/.test(nextChar)) {
            virtualParts.push(' ');
            charMap.push({ segIdx: -1, offset: -1 });
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

      let realStart = -1;
      for (let i = vStartIdx; i < charMap.length; i++) {
        if (charMap[i].segIdx >= 0) { realStart = i; break; }
      }
      let realEnd = -1;
      for (let i = Math.min(vEndIdx, charMap.length) - 1; i >= 0; i--) {
        if (charMap[i].segIdx >= 0) { realEnd = i + 1; break; }
      }
      if (realStart < 0 || realEnd < 0) return { html, applied: false };

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

  // FINAL FALLBACK: Decode HTML entities and normalize dashes/quotes for matching.
  // This handles cases where the article HTML contains &gt;, &#8211;, etc. but the
  // LLM's plain text version uses >, –, etc.
  if (phraseStart < 0) {
    // Build virtual text with spaces at tag boundaries AND decoded entities
    const virtualParts: string[] = [];
    const charMap: { segIdx: number; offset: number }[] = [];
    let segCounter = 0;
    for (let si = 0; si < segments.length; si++) {
      if (segments[si].type === 'text') {
        if (virtualParts.length > 0) {
          virtualParts.push(' ');
          charMap.push({ segIdx: -1, offset: -1 });
        }
        // Decode HTML entities in the text segment for matching
        const decoded = decodeHtmlEntities(segments[si].content);
        virtualParts.push(decoded);
        // Map each decoded char back to the original segment
        // Since decoding can change length, we map proportionally
        const origLen = segments[si].content.length;
        const decodedLen = decoded.length;
        for (let ci = 0; ci < decodedLen; ci++) {
          // Map decoded position to closest original position
          const origOffset = Math.min(Math.round((ci / decodedLen) * origLen), origLen - 1);
          charMap.push({ segIdx: segCounter, offset: origOffset });
        }
        segCounter++;
      }
    }
    const virtualText = virtualParts.join('');
    const normalizedVirtual = normalizeForMatch(virtualText);
    const normalizedSearchFuzzy = normalizeForMatch(effectiveSearchText);
    const normIdx = normalizedVirtual.indexOf(normalizedSearchFuzzy);

    if (normIdx >= 0) {
      // Map normalized position back to virtual text
      let vStartIdx = -1;
      let vEndIdx = -1;
      let nPos = 0;
      for (let i = 0; i < virtualText.length; i++) {
        const ch = virtualText[i];
        if (/\s/.test(ch)) {
          if (i === 0 || !/\s/.test(virtualText[i - 1])) {
            if (nPos === normIdx) vStartIdx = i;
            if (nPos === normIdx + normalizedSearchFuzzy.length) { vEndIdx = i; break; }
            nPos++;
          }
        } else {
          if (nPos === normIdx) vStartIdx = i;
          nPos++;
          if (nPos === normIdx + normalizedSearchFuzzy.length) { vEndIdx = i + 1; break; }
        }
      }
      if (vStartIdx >= 0) {
        if (vEndIdx < 0) vEndIdx = virtualText.length;

        let realStart = -1;
        for (let i = vStartIdx; i < charMap.length; i++) {
          if (charMap[i].segIdx >= 0) { realStart = i; break; }
        }
        let realEnd = -1;
        for (let i = Math.min(vEndIdx, charMap.length) - 1; i >= 0; i--) {
          if (charMap[i].segIdx >= 0) { realEnd = i + 1; break; }
        }
        if (realStart >= 0 && realEnd >= 0) {
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
    }
  }

  // LAST RESORT: Try matching just the first 40 chars of the search text.
  // For very long table-extracted text, even small differences accumulate.
  // Matching the beginning is usually enough to locate the right spot.
  if (phraseStart < 0 && normalizedSearch.length > 50) {
    const shortSearch = normalizeForMatch(effectiveSearchText).slice(0, 40);
    const decodedFull = normalizeForMatch(
      segments.filter(s => s.type === 'text').map(s => s.content).join(' ')
    );
    const shortIdx = decodedFull.indexOf(shortSearch);
    if (shortIdx >= 0) {
      // Find the end: try to match as much as possible
      const fullSearchNorm = normalizeForMatch(effectiveSearchText);
      let bestEnd = shortIdx + shortSearch.length;
      for (let len = fullSearchNorm.length; len > shortSearch.length; len--) {
        const candidate = fullSearchNorm.slice(0, len);
        if (decodedFull.indexOf(candidate) === shortIdx) {
          bestEnd = shortIdx + len;
          break;
        }
      }

      // Map decodedFull positions back to fullText positions
      // Build a mapping from decoded text to original fullText
      const origFullText = segments.filter(s => s.type === 'text').map(s => s.content).join(' ');
      const origNorm = origFullText.replace(/\s+/g, ' ').trim();

      // Approximate: use character ratio mapping
      const ratio = origNorm.length / decodedFull.length;
      phraseStart = Math.max(0, Math.floor(shortIdx * ratio));
      phraseEnd = Math.min(fullText.length, Math.ceil(bestEnd * ratio));
    }
  }

  if (phraseStart < 0) return { html, applied: false };

  // Rebuild HTML replacing the matched text portion
  const newSegments: string[] = [];
  let textOffset = 0;
  for (const seg of segments) {
    if (seg.type === 'tag') {
      if (textOffset <= phraseStart || textOffset >= phraseEnd) {
        newSegments.push(seg.content);
      }
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
  draft: { label: "Draft", color: "bg-muted text-secondary-foreground", icon: FileEdit },
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

  // Regenerate Section state
  const [regenDiff, setRegenDiff] = useState<{
    sectionHeading: string;
    oldContent: string;
    newContent: string;
    updatedArticleContent: string;
    wordCount: number;
  } | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Cross Check state
  const [showCrossCheck, setShowCrossCheck] = useState(false);
  const [crossCheckResult, setCrossCheckResult] = useState<any>(null);

  // Redundancy Checker state
  const [showRedundancy, setShowRedundancy] = useState(false);
  const [redundancyResult, setRedundancyResult] = useState<any>(null);

  // Entity Analyzer state
  const [showEntity, setShowEntity] = useState(false);
  const [entityResult, setEntityResult] = useState<EntityAnalysisResult | null>(null);

  // Broken Link Checker state
  const [showBrokenLinks, setShowBrokenLinks] = useState(false);
  const [brokenLinksResult, setBrokenLinksResult] = useState<any>(null);

  // Links Audit state
  const [showLinksAudit, setShowLinksAudit] = useState(false);

  // Save to CMS as draft state
  const publishCmsMutation = trpc.articles.publishToCms.useMutation({
    onSuccess: (data) => {
      toast.success(`Draft saved to CMS! Review and publish from the CMS editor.`);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to publish to CMS");
    },
  });

  const brokenLinksMutation = trpc.brokenLinks.check.useMutation({
    onSuccess: (data) => {
      setBrokenLinksResult(data);
      setShowBrokenLinks(true);
      if (data.brokenCount === 0) {
        toast.success(`All ${data.checkedCount} links are working!`);
      } else {
        toast.error(`Found ${data.brokenCount} broken link${data.brokenCount === 1 ? '' : 's'} out of ${data.checkedCount}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to check links");
    },
  });

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
              setShowGrade(true);
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
                  setShowEntity(true);
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
                  setShowCrossCheck(true);
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
                  setShowRedundancy(true);
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
              <DropdownMenuItem
                onClick={() => {
                  if (showBrokenLinks) { setShowBrokenLinks(false); return; }
                  setShowBrokenLinks(true);
                  brokenLinksMutation.mutate({ articleId });
                }}
                disabled={brokenLinksMutation.isPending}
                className={showBrokenLinks ? "bg-red-50 text-red-700" : ""}
              >
                {brokenLinksMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4 mr-2 text-red-500" />
                )}
                Broken Links
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setShowLinksAudit(!showLinksAudit);
                }}
                className={showLinksAudit ? "bg-blue-50 text-blue-700" : ""}
              >
                <Link2 className="w-4 h-4 mr-2 text-blue-600" />
                Links Audit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  if (!articleId) return;
                  if (article?.status === "published") {
                    toast.info("Article is already published");
                    return;
                  }
                  publishCmsMutation.mutate({ articleId });
                }}
                disabled={publishCmsMutation.isPending || article?.status === "published"}
              >
                {publishCmsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Globe className="w-4 h-4 mr-2 text-emerald-600" />
                )}
                {article?.status === "published" ? "Sent to CMS" : "Send to CMS (Draft)"}
              </DropdownMenuItem>
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
                <Download className="w-4 h-4 mr-2 text-muted-foreground" />
                Download HTML
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Save */}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </Button>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Editor */}
        <div className="flex-1 bg-card rounded-xl border border-border/60 overflow-hidden">
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
                    : "bg-muted/50 text-muted-foreground hover:bg-muted border-border"
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
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground hover:bg-muted transition-colors border border-border"
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
          <div ref={editorContainerRef} className="relative">
            <EditorContent editor={editor} />
            {/* Regenerate Section Overlay */}
            {editor && editorContainerRef.current && (
              <RegenerateSection
                articleId={articleId}
                editorElement={editorContainerRef.current}
                onSectionRegenerated={(data) => {
                  setRegenDiff(data);
                  // Update editor with the new content immediately (with highlights)
                  const oldHtml = editor.getHTML();
                  const highlightedHtml = buildHighlightedHtml(oldHtml, data.updatedArticleContent);
                  editor.commands.setContent(highlightedHtml);
                  setHasHighlights(true);
                  skipNextSyncRef.current = true;
                  refetch();
                }}
              />
            )}
          </div>
        </div>

        {/* Grade Sidebar */}
        {showGrade && gradeMutation.isPending && (
          <ScanPanelSkeleton
            title="Content Grader"
            icon={<BarChart3 className="w-4 h-4 text-purple-600" />}
            gradientFrom="from-purple-50"
            gradientTo="to-indigo-50"
            accentColor="text-purple-600"
            description="Grading content quality, readability, SEO optimization, and structure"
            onClose={() => setShowGrade(false)}
            onCancel={() => { gradeMutation.reset(); setShowGrade(false); }}
          />
        )}
        {showGrade && !gradeMutation.isPending && gradeResult && (
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
        {showCrossCheck && crossCheckMutation.isPending && (
          <ScanPanelSkeleton
            title="Cross Check"
            icon={<FileCheck className="w-4 h-4 text-teal-600" />}
            gradientFrom="from-teal-50"
            gradientTo="to-emerald-50"
            accentColor="text-teal-600"
            description="Checking article against reference sources for factual accuracy"
            onClose={() => setShowCrossCheck(false)}
            onCancel={() => { crossCheckMutation.reset(); setShowCrossCheck(false); }}
          />
        )}
        {showCrossCheck && !crossCheckMutation.isPending && crossCheckResult && (
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
              // Safety net: strip unwanted <strong>/<b> wrapping from LLM corrections
              html = stripWrappingStrongTags(html);
              const highlightedHtml = buildHighlightedHtml(oldHtml, html);
              editor.commands.setContent(highlightedHtml);
              setHasHighlights(true);
              skipNextSyncRef.current = true;
              toast.success(`Applied ${appliedCount} correction${appliedCount > 1 ? 's' : ''}`);
            }}
          />
        )}

        {/* Redundancy Check Sidebar */}
        {showRedundancy && redundancyMutation.isPending && (
          <ScanPanelSkeleton
            title="Redundancy Check"
            icon={<Repeat2 className="w-4 h-4 text-orange-600" />}
            gradientFrom="from-orange-50"
            gradientTo="to-amber-50"
            accentColor="text-orange-600"
            description="Scanning for repeated ideas, duplicate phrasing, and content overlap"
            onClose={() => setShowRedundancy(false)}
            onCancel={() => { redundancyMutation.reset(); setShowRedundancy(false); }}
          />
        )}
        {showRedundancy && !redundancyMutation.isPending && redundancyResult && (
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
              // Safety net: strip unwanted <strong>/<b> wrapping from LLM fixes
              html = stripWrappingStrongTags(html);
              const highlightedHtml = buildHighlightedHtml(oldHtml, html);
              editor.commands.setContent(highlightedHtml);
              setHasHighlights(true);
              skipNextSyncRef.current = true;
              toast.success(`Fixed ${appliedCount} redundanc${appliedCount > 1 ? 'ies' : 'y'}`);
            }}
          />
        )}

        {/* Entity Analyzer Sidebar */}
        {showEntity && entityMutation.isPending && !entityResult && (
          <EntityPanelSkeleton onClose={() => { setShowEntity(false); }} onCancel={() => { entityMutation.reset(); setShowEntity(false); }} />
        )}
        {showEntity && entityMutation.isPending && entityResult && (
          <EntityPanelSkeleton onClose={() => { setShowEntity(false); }} onCancel={() => { entityMutation.reset(); setShowEntity(false); }} label="Re-scanning..." />
        )}
        {showEntity && !entityMutation.isPending && entityResult && (
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
            articleKeyword={article?.keyword || keyword}
            articleProjectId={article?.projectId}
          />
        )}

        {/* Broken Link Checker Sidebar */}
        {showBrokenLinks && brokenLinksMutation.isPending && (
          <ScanPanelSkeleton
            title="Broken Link Checker"
            icon={<Unlink className="w-4 h-4 text-red-500" />}
            gradientFrom="from-red-50"
            gradientTo="to-rose-50"
            accentColor="text-red-600"
            description="Checking all links in the article for broken or unreachable URLs"
            onClose={() => setShowBrokenLinks(false)}
            onCancel={() => { brokenLinksMutation.reset(); setShowBrokenLinks(false); }}
          />
        )}
        {showBrokenLinks && !brokenLinksMutation.isPending && brokenLinksResult && (
          <BrokenLinksPanel
            result={brokenLinksResult}
            onClose={() => setShowBrokenLinks(false)}
            onRescan={() => brokenLinksMutation.mutate({ articleId })}
            articleKeyword={article?.keyword || keyword}
            articleProjectId={article?.projectId ?? undefined}
            onReplaceLink={(oldUrl, newUrl) => {
              if (!editor) return;
              const html = editor.getHTML();
              // Replace all occurrences of the broken URL in href attributes
              const updated = html.replace(
                new RegExp(`href="${oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
                `href="${newUrl}"`
              );
              editor.commands.setContent(updated);
              // Auto-save after replacement
              const wordCount = editor.getText().split(/\s+/).filter(Boolean).length;
              updateMutation.mutate({
                id: articleId,
                content: updated,
                wordCount,
              });
            }}
          />
        )}

        {/* Links Audit Sidebar */}
        {showLinksAudit && (
          <LinksAuditPanel
            articleId={articleId}
            onClose={() => setShowLinksAudit(false)}
            onLinkInserted={() => {
              // Refetch article to sync editor
              refetch();
            }}
            editor={editor}
          />
        )}

        {/* Section Regeneration Diff Preview */}
        {regenDiff && (
          <SectionDiffPreview
            sectionHeading={regenDiff.sectionHeading}
            oldContent={regenDiff.oldContent}
            newContent={regenDiff.newContent}
            onAccept={() => {
              // Content is already applied — just clear the diff panel and save
              if (editor) {
                editor.chain().focus().selectAll().unsetHighlight().run();
                editor.commands.setTextSelection(0);
                setHasHighlights(false);
              }
              setRegenDiff(null);
              toast.success("Section accepted");
            }}
            onDiscard={() => {
              // Revert to the original content by refetching from DB
              // The old content is still in the DB until we save
              skipNextSyncRef.current = false;
              refetch();
              setRegenDiff(null);
              setHasHighlights(false);
              toast.info("Section reverted to original");
            }}
            onTryAgain={() => {
              // Revert and re-open the form
              skipNextSyncRef.current = false;
              refetch();
              setHasHighlights(false);
              setRegenDiff(null);
              toast.info("Reverted — try regenerating again");
            }}
          />
        )}

        {/* Brief Compliance Panel */}
        {article.briefComplianceScore != null && article.briefComplianceDetails && (
          <div className="w-80 bg-card rounded-xl border border-border/60 p-5 space-y-4 flex-shrink-0 self-start sticky top-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                Brief Compliance
              </h3>
              <span className={`text-2xl font-bold ${
                article.briefComplianceScore >= 80 ? 'text-emerald-600' :
                article.briefComplianceScore >= 60 ? 'text-amber-600' :
                'text-red-600'
              }`}>
                {article.briefComplianceScore}%
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              {(article.briefComplianceDetails as any).summary}
            </p>

            {/* Category Breakdown */}
            {[
              { key: 'titleAdherence', label: 'Title Adherence', icon: '\uD83C\uDFAF' },
              { key: 'keywordCoverage', label: 'Keyword Coverage', icon: '\uD83D\uDD11' },
              { key: 'angleAlignment', label: 'Angle Alignment', icon: '\uD83E\uDDED' },
              { key: 'wordCountAccuracy', label: 'Word Count', icon: '\uD83D\uDCDD' },
              { key: 'linkCountAccuracy', label: 'Link Count', icon: '\uD83D\uDD17' },
            ].map(({ key, label, icon }) => {
              const cat = (article.briefComplianceDetails as any)?.[key];
              if (!cat) return null;
              const pct = Math.round((cat.score / cat.maxScore) * 100);
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{icon} {label}</span>
                    <span className={`font-semibold ${
                      pct >= 80 ? 'text-emerald-600' : pct >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {cat.score}/{cat.maxScore}
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{cat.notes}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* SEO Sidebar */}
        {showSeo && (
          <div className="w-80 bg-card rounded-xl border border-border/60 p-5 space-y-5 flex-shrink-0 self-start sticky top-4">
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
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
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
          const meta = gradeCategoryMeta[key] || { icon: ShieldCheck, color: "text-muted-foreground", bgColor: "bg-muted/50" };
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
                              : "border-border/40 bg-card hover:border-orange-300 hover:bg-orange-50/30"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                            isSelected
                              ? "border-orange-500 bg-orange-500"
                              : "border-border bg-card"
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
                        : "bg-muted text-muted-foreground cursor-not-allowed"
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
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
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
                            : 'border-border bg-card'
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
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
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
                          : 'border-border bg-card'
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
  Low: { color: "text-muted-foreground", bgColor: "bg-muted/50", borderColor: "border-border" },
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
  articleKeyword,
  articleProjectId,
}: {
  result: EntityAnalysisResult;
  onClose: () => void;
  onApplyFixes?: (selectedFixes: string[], primaryEntity: string) => void;
  isApplying?: boolean;
  articleKeyword?: string;
  articleProjectId?: number;
}) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    entities: true,
    salience: false,
    fixes: true,
  });
  const [selectedFixes, setSelectedFixes] = useState<Set<number>>(new Set());
  const [showOutlineDialog, setShowOutlineDialog] = useState(false);

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
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden max-h-[calc(100vh-120px)] overflow-y-auto">
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
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
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
                        : "border-border bg-card"
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
        <div className="px-4 py-3 border-b border-border/40">
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

      {/* Generate Outline from Analysis */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowOutlineDialog(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs font-semibold hover:from-indigo-600 hover:to-purple-600 transition-all shadow-sm hover:shadow-md"
        >
          <ListTree className="w-4 h-4" />
          Generate Outline from Analysis
        </button>
        <p className="text-[9px] text-muted-foreground mt-1.5 text-center">
          Create a new, optimized outline based on these findings
        </p>
      </div>

      {/* Outline Generation Dialog */}
      {showOutlineDialog && (
        <GenerateOutlineFromAnalysisDialog
          result={result}
          articleKeyword={articleKeyword}
          articleProjectId={articleProjectId}
          onClose={() => setShowOutlineDialog(false)}
        />
      )}
    </div>
  );
}

function EntityPanelSkeleton({
  onClose,
  onCancel,
  label = "Analyzing entities...",
}: {
  onClose: () => void;
  onCancel?: () => void;
  label?: string;
}) {
  return (
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
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

      {/* Loading content */}
      <div className="px-6 py-10 flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-cyan-50 ring-4 ring-cyan-100 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-cyan-600 animate-spin" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Scanning entities, salience structure, and GEO extractability
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Animated skeleton bars */}
        <div className="w-full space-y-3 mt-2">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-muted rounded-full animate-pulse" />
              <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" />
              <div className="h-2 w-8 bg-muted rounded-full animate-pulse" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 bg-muted rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <div className="h-2 w-8 bg-muted rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-28 bg-muted rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
              <div className="h-2 w-8 bg-muted rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-muted rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
              <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
              <div className="h-2 w-8 bg-muted rounded-full animate-pulse" style={{ animationDelay: "450ms" }} />
            </div>
          </div>

          {/* Skeleton entity cards */}
          <div className="border-t border-border/30 pt-3 space-y-2">
            <div className="h-3 w-32 bg-muted rounded animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-2 rounded-lg border border-gray-100 bg-muted/50/50 space-y-1.5" style={{ animationDelay: `${i * 200}ms` }}>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-24 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  <div className="h-2 w-12 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200 + 100}ms` }} />
                </div>
                <div className="h-2 w-full bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200 + 50}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Links Audit Panel Component ── */
function LinksAuditPanel({
  articleId,
  onClose,
  onLinkInserted,
  editor,
}: {
  articleId: number;
  onClose: () => void;
  onLinkInserted: () => void;
  editor: any;
}) {
  const [showExternal, setShowExternal] = useState(false);
  const [showInternal, setShowInternal] = useState(true);
  const [insertingPhrase, setInsertingPhrase] = useState<string | null>(null);

  // Analyze links query
  const { data: analysis, isLoading: isAnalyzing, refetch: refetchAnalysis } = trpc.linksAudit.analyze.useQuery(
    { articleId },
    { refetchOnWindowFocus: false }
  );

  // Suggest internal links mutation
  const suggestMutation = trpc.linksAudit.suggest.useMutation({
    onError: (err) => toast.error(err.message || "Failed to get suggestions"),
  });

  // Insert link mutation
  const insertMutation = trpc.linksAudit.insertLink.useMutation({
    onSuccess: (data) => {
      toast.success("Internal link inserted!");
      setInsertingPhrase(null);
      // Update editor content
      if (editor && data.updatedContent) {
        editor.commands.setContent(data.updatedContent);
      }
      // Refetch analysis to update counts
      refetchAnalysis();
      onLinkInserted();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to insert link");
      setInsertingPhrase(null);
    },
  });

  const internalCount = analysis?.internalCount ?? 0;
  const externalCount = analysis?.externalCount ?? 0;
  const totalCount = analysis?.totalCount ?? 0;
  const internalLinks = analysis?.internalLinks ?? [];
  const externalLinks = analysis?.externalLinks ?? [];
  const suggestions = suggestMutation.data?.suggestions ?? [];

  return (
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden max-h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-blue-500/5 via-indigo-500/5 to-cyan-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Links Audit
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Summary Stats */}
        {isAnalyzing ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing links...
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-blue-700">{totalCount}</p>
              <p className="text-[10px] font-medium text-blue-600">Total Links</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-emerald-700">{internalCount}</p>
              <p className="text-[10px] font-medium text-emerald-600">Internal</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2.5 text-center">
              <p className="text-2xl font-bold text-purple-700">{externalCount}</p>
              <p className="text-[10px] font-medium text-purple-600">External</p>
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Internal Links Section */}
        <div>
          <button
            onClick={() => setShowInternal(!showInternal)}
            className="w-full flex items-center justify-between text-sm font-semibold text-foreground mb-2"
          >
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              Internal Links ({internalCount})
            </span>
            {showInternal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showInternal && (
            <div className="space-y-1.5">
              {internalLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No internal links found in this article.</p>
              ) : (
                internalLinks.map((link: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                    <ExternalLink className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{link.anchorText || "(no anchor text)"}</p>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-emerald-600 hover:underline truncate block">
                        {link.url}
                      </a>
                      {link.matchesSitemap && (
                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium mt-0.5 inline-block">In Sitemap</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* External Links Section */}
        <div>
          <button
            onClick={() => setShowExternal(!showExternal)}
            className="w-full flex items-center justify-between text-sm font-semibold text-foreground mb-2"
          >
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              External Links ({externalCount})
            </span>
            {showExternal ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showExternal && (
            <div className="space-y-1.5">
              {externalLinks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">No external links found.</p>
              ) : (
                externalLinks.map((link: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-purple-50/50 border border-purple-100">
                    <ExternalLink className="w-3.5 h-3.5 text-purple-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{link.anchorText || "(no anchor text)"}</p>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-purple-600 hover:underline truncate block">
                        {link.url}
                      </a>
                      <span className="text-[9px] text-muted-foreground">{link.domain}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Suggestions Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Internal Link Suggestions
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={() => suggestMutation.mutate({ articleId })}
              disabled={suggestMutation.isPending}
              className="h-7 text-xs gap-1"
            >
              {suggestMutation.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Finding...</>
              ) : suggestions.length > 0 ? (
                <><RefreshCw className="w-3 h-3" /> Refresh</>
              ) : (
                <><Wand2 className="w-3 h-3" /> Find Suggestions</>
              )}
            </Button>
          </div>

          {suggestMutation.isPending && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 space-y-2">
                  <div className="h-3 w-3/4 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
                  <div className="h-2 w-full bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 150 + 75}ms` }} />
                  <div className="h-2 w-1/2 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 150 + 150}ms` }} />
                </div>
              ))}
            </div>
          )}

          {!suggestMutation.isPending && suggestions.length === 0 && !suggestMutation.data && (
            <p className="text-xs text-muted-foreground italic py-2">
              Click "Find Suggestions" to discover internal linking opportunities from your sitemap.
            </p>
          )}

          {!suggestMutation.isPending && suggestMutation.data && suggestions.length === 0 && (
            <p className="text-xs text-muted-foreground italic py-2">
              No additional internal link opportunities found. All relevant sitemap pages may already be linked.
            </p>
          )}

          {!suggestMutation.isPending && suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((s: any, i: number) => (
                <div key={i} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-xs font-medium text-foreground">
                      <span className="bg-amber-200/60 px-1 py-0.5 rounded">"{s.phrase}"</span>
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] gap-1 shrink-0 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      disabled={insertMutation.isPending && insertingPhrase === s.phrase}
                      onClick={() => {
                        setInsertingPhrase(s.phrase);
                        insertMutation.mutate({
                          articleId,
                          phrase: s.phrase,
                          targetUrl: s.targetUrl,
                        });
                      }}
                    >
                      {insertMutation.isPending && insertingPhrase === s.phrase ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <><Link2 className="w-3 h-3" /> Insert</>
                      )}
                    </Button>
                  </div>
                  <a href={s.targetUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline block truncate mb-1">
                    {s.targetUrl}
                  </a>
                  {s.reason && (
                    <p className="text-[10px] text-muted-foreground">{s.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function ScanPanelSkeleton({
  title,
  icon,
  gradientFrom,
  gradientTo,
  accentColor,
  description,
  onClose,
  onCancel,
  label,
}: {
  title: string;
  icon: React.ReactNode;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  description: string;
  onClose: () => void;
  onCancel?: () => void;
  label?: string;
}) {
  return (
    <div className="w-80 bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header */}
      <div className={`px-4 py-3 border-b border-border/40 bg-gradient-to-r ${gradientFrom} ${gradientTo} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="font-semibold text-sm">{title}</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Loading content */}
      <div className="px-6 py-10 flex flex-col items-center gap-4">
        <div className="relative">
          <div className={`w-14 h-14 rounded-full bg-muted/50 ring-4 ring-gray-100 flex items-center justify-center`}>
            <Loader2 className={`w-6 h-6 ${accentColor} animate-spin`} />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">{label || `Running ${title.toLowerCase()}...`}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {description}
          </p>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="text-xs text-muted-foreground hover:text-foreground border border-border/60 rounded-md px-3 py-1.5 hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        )}

        {/* Animated skeleton rows */}
        <div className="w-full space-y-3 mt-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-2 w-20 bg-muted rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              <div className="flex-1 h-1.5 bg-muted rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
              <div className="h-2 w-8 bg-muted rounded-full animate-pulse" style={{ animationDelay: `${i * 150}ms` }} />
            </div>
          ))}

          {/* Skeleton result cards */}
          <div className="border-t border-border/30 pt-3 space-y-2">
            <div className="h-3 w-28 bg-muted rounded animate-pulse" />
            {[0, 1, 2].map((i) => (
              <div key={i} className="p-2.5 rounded-lg border border-gray-100 bg-muted/50/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-20 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                  <div className="h-2 w-14 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200 + 100}ms` }} />
                </div>
                <div className="h-2 w-full bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200 + 50}ms` }} />
                <div className="h-2 w-3/4 bg-muted rounded animate-pulse" style={{ animationDelay: `${i * 200 + 100}ms` }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── Broken Links Panel Component ── */
function BrokenLinksPanel({
  result,
  onClose,
  onRescan,
  articleKeyword,
  articleProjectId,
  onReplaceLink,
}: {
  result: { links: any[]; brokenCount: number; checkedCount: number };
  onClose: () => void;
  onRescan: () => void;
  articleKeyword?: string;
  articleProjectId?: number;
  onReplaceLink: (oldUrl: string, newUrl: string) => void;
}) {
  const { links, brokenCount, checkedCount } = result;
  const brokenLinks = links.filter((l: any) => !l.ok);
  const workingLinks = links.filter((l: any) => l.ok);
  const [showWorking, setShowWorking] = useState(false);
  // Track which broken link index is showing suggestions
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  // Store suggestions per broken link URL
  const [suggestions, setSuggestions] = useState<Record<string, any[]>>({});
  const [loadingUrl, setLoadingUrl] = useState<string | null>(null);
  const [replacedUrls, setReplacedUrls] = useState<Set<string>>(new Set());

  const suggestMutation = trpc.brokenLinks.suggestReplacement.useMutation({
    onSuccess: (data, variables) => {
      setSuggestions(prev => ({ ...prev, [variables.brokenUrl]: data.suggestions || [] }));
      setLoadingUrl(null);
      if (data.error) {
        toast.error(data.error);
      }
    },
    onError: (err) => {
      setLoadingUrl(null);
      toast.error(err.message || "Failed to find replacements");
    },
  });

  const handleFindReplacement = (link: any, idx: number) => {
    if (expandedIdx === idx && suggestions[link.url]) {
      setExpandedIdx(null);
      return;
    }
    setExpandedIdx(idx);
    if (suggestions[link.url]) return; // Already fetched
    setLoadingUrl(link.url);
    suggestMutation.mutate({
      brokenUrl: link.url,
      anchorText: link.anchorText,
      articleKeyword: articleKeyword || undefined,
      projectId: articleProjectId || undefined,
    });
  };

  const handleReplace = (oldUrl: string, newUrl: string) => {
    onReplaceLink(oldUrl, newUrl);
    setReplacedUrls(prev => new Set(prev).add(oldUrl));
    toast.success("Link replaced in article");
  };

  const getStatusBadge = (link: any) => {
    if (link.ok) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" />
          {link.status}
        </span>
      );
    }
    if (link.status === 404) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" />
          404 Not Found
        </span>
      );
    }
    if (link.status === 403) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" />
          403 Forbidden
        </span>
      );
    }
    if (link.status === 500 || link.status === 502 || link.status === 503) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" />
          {link.status} Server Error
        </span>
      );
    }
    if (link.error) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" />
          {link.statusText}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-700">
        <AlertTriangle className="w-3 h-3" />
        {link.status || "Error"}
      </span>
    );
  };

  return (
    <div className="w-[420px] bg-card rounded-xl border border-border/60 flex-shrink-0 self-start sticky top-4 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-gradient-to-r from-red-500/5 via-rose-500/5 to-pink-500/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Unlink className="w-4 h-4 text-red-500" />
            Broken Link Checker
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={onRescan} className="p-1 rounded hover:bg-muted" title="Re-scan">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={onClose} className="p-1 rounded hover:bg-muted">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground">
            {checkedCount} link{checkedCount !== 1 ? 's' : ''} checked
          </div>
          {brokenCount === 0 ? (
            <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              All links working
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-100 text-red-700 rounded-lg px-2.5 py-1 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              {brokenCount} broken
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-h-[60vh] overflow-y-auto">
        {/* Broken Links Section */}
        {brokenLinks.length > 0 && (
          <div className="p-4 space-y-2">
            <h4 className="text-xs font-semibold text-red-600 uppercase tracking-wider">Broken Links</h4>
            {brokenLinks.map((link: any, i: number) => {
              const isReplaced = replacedUrls.has(link.url);
              const isExpanded = expandedIdx === i;
              const linkSuggestions = suggestions[link.url];
              const isLoading = loadingUrl === link.url;

              return (
                <div key={i} className={`rounded-lg border space-y-1.5 ${isReplaced ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {isReplaced ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              Replaced
                            </span>
                          ) : (
                            getStatusBadge(link)
                          )}
                        </div>
                        <p className="text-xs font-medium text-foreground truncate" title={link.anchorText}>
                          "{link.anchorText}"
                        </p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`text-[11px] hover:text-foreground truncate block mt-0.5 ${isReplaced ? 'line-through text-muted-foreground/60' : 'text-muted-foreground'}`}
                          title={link.url}
                        >
                          {link.url}
                        </a>
                        {link.error && !isReplaced && (
                          <p className="text-[10px] text-red-500 mt-1">{link.error}</p>
                        )}
                      </div>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded hover:bg-red-100 flex-shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                      </a>
                    </div>

                    {/* Find Replacement Button */}
                    {!isReplaced && (
                      <button
                        onClick={() => handleFindReplacement(link, i)}
                        disabled={isLoading}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Finding replacements...
                          </>
                        ) : isExpanded && linkSuggestions ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Hide suggestions
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3" />
                            Find Replacement
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {isExpanded && !isReplaced && (
                    <div className="border-t border-red-200/60 bg-white/80 p-2 space-y-1.5">
                      {isLoading && (
                        <div className="space-y-1.5">
                          {[0, 1, 2].map(j => (
                            <div key={j} className="p-2 rounded border border-gray-100 bg-gray-50/50 space-y-1">
                              <div className="h-2.5 w-32 bg-muted rounded animate-pulse" style={{ animationDelay: `${j * 150}ms` }} />
                              <div className="h-2 w-full bg-muted rounded animate-pulse" style={{ animationDelay: `${j * 150 + 75}ms` }} />
                              <div className="h-2 w-3/4 bg-muted rounded animate-pulse" style={{ animationDelay: `${j * 150 + 150}ms` }} />
                            </div>
                          ))}
                        </div>
                      )}
                      {!isLoading && linkSuggestions && linkSuggestions.length === 0 && (
                        <p className="text-[11px] text-muted-foreground text-center py-2">No replacement suggestions found</p>
                      )}
                      {!isLoading && linkSuggestions && linkSuggestions.map((s: any, j: number) => (
                        <div key={j} className={`p-2.5 rounded-lg border transition-colors ${
                          s.verified
                            ? 'border-emerald-200 bg-emerald-50/30 hover:bg-emerald-50/60'
                            : 'border-amber-200 bg-amber-50/30 opacity-60'
                        }`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px] font-semibold text-foreground">{s.source}</span>
                                {s.verified ? (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-emerald-100 text-emerald-700">
                                    <CheckCircle2 className="w-2.5 h-2.5" />
                                    Verified
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    Unverified
                                  </span>
                                )}
                              </div>
                              <a
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:text-blue-800 truncate block"
                                title={s.url}
                              >
                                {s.url}
                              </a>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{s.reason}</p>
                            </div>
                            {s.verified && (
                              <button
                                onClick={() => handleReplace(link.url, s.url)}
                                className="flex-shrink-0 px-2 py-1 rounded text-[10px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                              >
                                Replace
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Working Links Section (collapsible) */}
        {workingLinks.length > 0 && (
          <div className="border-t border-border/40">
            <button
              onClick={() => setShowWorking(!showWorking)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/50"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                {workingLinks.length} working link{workingLinks.length !== 1 ? 's' : ''}
              </span>
              {showWorking ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {showWorking && (
              <div className="px-4 pb-3 space-y-1.5">
                {workingLinks.map((link: any, i: number) => (
                  <div key={i} className="p-2 rounded-lg border border-emerald-100 bg-emerald-50/30 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-foreground truncate" title={link.anchorText}>
                        "{link.anchorText}"
                      </p>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-muted-foreground hover:text-foreground truncate block"
                        title={link.url}
                      >
                        {link.url}
                      </a>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-medium flex-shrink-0">{link.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {checkedCount === 0 && (
          <div className="p-8 text-center">
            <Unlink className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No links found in this article</p>
          </div>
        )}
      </div>
    </div>
  );
}

/** Dialog for generating an outline from entity analysis results */
function GenerateOutlineFromAnalysisDialog({
  result,
  articleKeyword,
  articleProjectId,
  onClose,
}: {
  result: EntityAnalysisResult;
  articleKeyword?: string;
  articleProjectId?: number;
  onClose: () => void;
}) {
  const [, navigate] = useLocation();
  const { projects } = useActiveProject();
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(articleProjectId ?? null);
  const [keyword, setKeyword] = useState(articleKeyword || result.primaryEntity?.name || "");
  const [targetWordCount, setTargetWordCount] = useState("2000");
  const [numSections, setNumSections] = useState("8");
  const [numFaqs, setNumFaqs] = useState("5");

  // Fetch brand voices and ICP profiles for the selected project
  const { data: brandVoices = [] } = trpc.brandVoices.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );
  const { data: icpProfiles = [] } = trpc.icpProfiles.list.useQuery(
    { projectId: selectedProjectId! },
    { enabled: !!selectedProjectId }
  );

  const [selectedBrandVoiceId, setSelectedBrandVoiceId] = useState<number | null>(null);
  const [selectedIcpId, setSelectedIcpId] = useState<number | null>(null);

  // Auto-select defaults when brand voices / ICPs load
  useEffect(() => {
    if (brandVoices.length > 0 && !selectedBrandVoiceId) {
      const defaultVoice = brandVoices.find((v: any) => v.isDefault === 1) || brandVoices[0];
      if (defaultVoice) setSelectedBrandVoiceId(defaultVoice.id);
    }
  }, [brandVoices, selectedBrandVoiceId]);

  useEffect(() => {
    if (icpProfiles.length > 0 && !selectedIcpId) {
      const defaultIcp = icpProfiles.find((p: any) => p.isDefault === 1) || icpProfiles[0];
      if (defaultIcp) setSelectedIcpId(defaultIcp.id);
    }
  }, [icpProfiles, selectedIcpId]);

  const generateMutation = trpc.entity.generateOutlineFromAnalysis.useMutation({
    onSuccess: (data: any) => {
      if (data) {
        toast.success("Outline generated from analysis! Redirecting to review...");
        // Navigate to GenerateArticle page with the outline data stored in sessionStorage
        sessionStorage.setItem("entityOutlineData", JSON.stringify({
          outlineId: data.id,
          title: data.title,
          sections: data.sections,
          keyword,
          projectId: selectedProjectId,
        }));
        navigate("/generate?fromEntityAnalysis=1");
        onClose();
      }
    },
    onError: (err: any) => {
      const msg = err.message || "";
      if (/overloaded|529|rate.?limit|too many|capacity/i.test(msg)) {
        toast.error("The AI service is currently overloaded. Please wait a moment and try again.");
      } else {
        toast.error(msg || "Failed to generate outline from analysis");
      }
    },
  });

  const handleGenerate = () => {
    if (!selectedProjectId) {
      toast.error("Please select a project");
      return;
    }
    if (!keyword.trim()) {
      toast.error("Please enter a keyword");
      return;
    }

    generateMutation.mutate({
      entityAnalysis: result,
      keyword: keyword.trim(),
      projectId: selectedProjectId,
      brandVoiceId: selectedBrandVoiceId ?? undefined,
      icpProfileId: selectedIcpId ?? undefined,
      targetWordCount: parseInt(targetWordCount) || 2000,
      numSections: parseInt(numSections) || 8,
      numFaqs: parseInt(numFaqs) || 5,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTree className="w-5 h-5 text-indigo-600" />
            Generate Outline from Analysis
          </DialogTitle>
          <DialogDescription>
            Create a fresh, optimized outline that addresses every weakness found in the analysis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Suggested Title */}
          {result.advancedRecommendations?.suggestedTitleRewrite && (
            <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-3">
              <p className="text-[11px] font-semibold text-indigo-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Suggested Title
              </p>
              <p className="text-sm font-medium text-indigo-900">{result.advancedRecommendations.suggestedTitleRewrite}</p>
            </div>
          )}

          {/* Score Overview */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${
              (result.scores?.overallScore ?? 0) >= 70 ? 'bg-emerald-500' :
              (result.scores?.overallScore ?? 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
            }`}>
              {Math.round(result.scores?.overallScore ?? 0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">Current Article Score</p>
              <p className="text-xs text-muted-foreground">
                {result.entities?.length || 0} entities found &middot; {result.actionableFixes?.length || 0} fixes to address
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Target</p>
              <p className="text-sm font-bold text-emerald-600">85+</p>
            </div>
          </div>

          {/* What the outline will fix */}
          {result.actionableFixes?.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                What the Outline Will Fix
              </p>
              <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                {result.actionableFixes.map((fix, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{fix}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Topics being added */}
          {(() => {
            const missingEntities = result.advancedRecommendations?.missingSupportingEntities || [];
            const missingComponents = result.supportingCoverage?.missingComponents || [];
            const allTopics = Array.from(new Set([...missingEntities, ...missingComponents]));
            if (allTopics.length === 0) return null;
            return (
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-purple-600" />
                  Topics Being Added
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allTopics.map((topic, i) => (
                    <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-100">
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Project Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" />
              Project
            </Label>
            <Select
              value={selectedProjectId?.toString() || ""}
              onValueChange={(v) => {
                setSelectedProjectId(parseInt(v));
                setSelectedBrandVoiceId(null);
                setSelectedIcpId(null);
              }}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a project..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Keyword */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Target Keyword</Label>
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g., Medicare Supplement Plans"
              className="h-9"
            />
          </div>

          {/* Brand Voice & ICP row */}
          {selectedProjectId && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Brand Voice</Label>
                <Select
                  value={selectedBrandVoiceId?.toString() || ""}
                  onValueChange={(v) => setSelectedBrandVoiceId(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandVoices.map((v: any) => (
                      <SelectItem key={v.id} value={v.id.toString()}>
                        {v.name} {v.isDefault === 1 ? "(default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">ICP Profile</Label>
                <Select
                  value={selectedIcpId?.toString() || ""}
                  onValueChange={(v) => setSelectedIcpId(parseInt(v))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Default" />
                  </SelectTrigger>
                  <SelectContent>
                    {icpProfiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>
                        {p.name} {p.isDefault === 1 ? "(default)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Settings row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Word Count</Label>
              <Input
                type="number"
                value={targetWordCount}
                onChange={(e) => setTargetWordCount(e.target.value)}
                className="h-9"
                min={500}
                max={10000}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Sections</Label>
              <Input
                type="number"
                value={numSections}
                onChange={(e) => setNumSections(e.target.value)}
                className="h-9"
                min={3}
                max={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">FAQs</Label>
              <Input
                type="number"
                value={numFaqs}
                onChange={(e) => setNumFaqs(e.target.value)}
                className="h-9"
                min={0}
                max={15}
              />
            </div>
          </div>


        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={generateMutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !selectedProjectId || !keyword.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-600 hover:to-purple-600"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                Generating Outline...
              </>
            ) : (
              <>
                <ListTree className="w-4 h-4 mr-1.5" />
                Generate Outline
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
