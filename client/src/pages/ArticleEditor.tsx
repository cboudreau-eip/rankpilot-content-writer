import { trpc } from "@/lib/trpc";
import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading2, Heading3, Quote, Code,
  AlignLeft, AlignCenter, AlignRight, Link as LinkIcon,
  Highlighter, Undo2, Redo2, Save, ArrowLeft,
  FileText, Search, Clock, CheckCircle2, Send, FileEdit,
  Eye, ChevronDown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [slug, setSlug] = useState("");
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: "Start writing your article..." }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight,
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

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/articles")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
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

        <div className="flex items-center gap-2">
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

          {/* SEO Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowSeo(!showSeo)}
            className={showSeo ? "bg-indigo-50 text-indigo-700 border-indigo-200" : ""}
          >
            SEO
          </Button>

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

        {/* SEO Sidebar */}
        {showSeo && (
          <div className="w-80 bg-white rounded-xl border border-border/60 p-5 space-y-5 flex-shrink-0 self-start sticky top-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Search className="w-4 h-4 text-indigo-600" />
              SEO Settings
            </h3>

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

            {/* SEO Preview */}
            <div className="pt-3 border-t border-border/40">
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
          </div>
        )}
      </div>
    </div>
  );
}
