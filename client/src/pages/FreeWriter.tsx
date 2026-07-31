import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, Check, PenLine, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const FORMAT_OPTIONS = [
  { value: "linkedin", label: "LinkedIn Post", description: "Professional social post with hook + insight + CTA" },
  { value: "short-article", label: "Short Article", description: "Structured article with headings and sections" },
  { value: "facebook", label: "Facebook Post", description: "Warm, conversational social post" },
  { value: "email-newsletter", label: "Email Newsletter", description: "Subject line + preview + email body" },
  { value: "youtube-script", label: "YouTube Script", description: "Hook + segments + B-roll suggestions" },
  { value: "landing-page", label: "Landing Page Copy", description: "Hero + benefits + CTA + FAQ" },
  { value: "medium", label: "Medium Article", description: "Conversational long-form with hooks + subheadings + pull quotes" },
  { value: "custom", label: "Custom", description: "Provide your own format instructions" },
] as const;

const LENGTH_OPTIONS = [
  { value: "short", label: "Short", description: "Quick and concise" },
  { value: "medium", label: "Medium", description: "Standard length" },
  { value: "long", label: "Long", description: "In-depth coverage" },
] as const;

type FormatValue = (typeof FORMAT_OPTIONS)[number]["value"];
type LengthValue = (typeof LENGTH_OPTIONS)[number]["value"];

export default function FreeWriter() {
  const { activeProject } = useActiveProject();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyword, setKeyword] = useState("");
  const [format, setFormat] = useState<FormatValue>("linkedin");
  const [length, setLength] = useState<LengthValue>("medium");
  const [customInstructions, setCustomInstructions] = useState("");
  const [aiDirections, setAiDirections] = useState("");

  // Output state
  const [generatedContent, setGeneratedContent] = useState("");
  const [generationMeta, setGenerationMeta] = useState<{ formatLabel: string; wordCount: number; model: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const generateMutation = trpc.freeWriter.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setGenerationMeta({
        formatLabel: data.formatLabel,
        wordCount: data.wordCount,
        model: data.model,
      });
    },
    onError: (error) => {
      toast.error("Generation failed", { description: error.message });
    },
  });

  const handleGenerate = () => {
    if (!activeProject) {
      toast.error("No project selected", { description: "Please select an active project first." });
      return;
    }
    if (!title.trim()) {
      toast.error("Title required", { description: "Please enter a title or topic." });
      return;
    }

    generateMutation.mutate({
      projectId: activeProject.id,
      title: title.trim(),
      description: description.trim() || undefined,
      keyword: keyword.trim() || undefined,
      format,
      length,
      customFormatInstructions: format === "custom" ? customInstructions.trim() || undefined : undefined,
      aiDirections: aiDirections.trim() || undefined,
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleReset = () => {
    setGeneratedContent("");
    setGenerationMeta(null);
    setTitle("");
    setDescription("");
    setKeyword("");
    setCustomInstructions("");
    setAiDirections("");
  };

  const selectedFormatInfo = useMemo(
    () => FORMAT_OPTIONS.find((f) => f.value === format),
    [format]
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <PenLine className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Free Writer</h1>
            <p className="text-sm text-slate-500">
              Generate content for any format using your project's Brand Voice & ICP
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Input Form */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">What do you want to write?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title / Topic */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Title / Topic <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g., IRMAA Explained: What To Know"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Description / Brief <span className="text-slate-400">(optional)</span>
                </label>
                <Textarea
                  placeholder="Provide context, angle, or specific instructions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>

              {/* Keyword */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Target Keyword <span className="text-slate-400">(optional)</span>
                </label>
                <Input
                  placeholder="e.g., IRMAA Medicare"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* AI Directions */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  AI Directions <span className="text-slate-400">(optional)</span>
                </label>
                <Textarea
                  placeholder="Additional instructions for the AI, e.g.:\n• Include a personal anecdote about...\n• Mention our new product launch\n• Keep the tone more casual than usual\n• Reference this stat: 73% of..."
                  value={aiDirections}
                  onChange={(e) => setAiDirections(e.target.value)}
                  rows={4}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-slate-400 mt-1">Extra context, data points, or specific instructions the AI should follow</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Format & Length</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Content Format
                </label>
                <Select value={format} onValueChange={(v) => setFormat(v as FormatValue)}>
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="font-medium">{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFormatInfo && (
                  <p className="text-xs text-slate-500 mt-1.5">{selectedFormatInfo.description}</p>
                )}
              </div>

              {/* Custom instructions (only for custom format) */}
              {format === "custom" && (
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                    Custom Format Instructions
                  </label>
                  <Textarea
                    placeholder="Describe the format, structure, and any specific rules..."
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    rows={4}
                    className="text-sm resize-none"
                  />
                </div>
              )}

              {/* Length */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">
                  Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LENGTH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLength(opt.value)}
                      className={`px-3 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                        length === opt.value
                          ? "border-violet-500 bg-violet-50 text-violet-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <div>{opt.label}</div>
                      <div className="text-xs font-normal text-slate-400 mt-0.5">{opt.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !title.trim() || !activeProject}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium py-2.5"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Writing with Claude...
                  </>
                ) : (
                  <>
                    <PenLine className="w-4 h-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>

              {!activeProject && (
                <p className="text-xs text-amber-600 text-center">
                  Select an active project to use Brand Voice & ICP
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Output */}
        <div>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold">Output</CardTitle>
                {generatedContent && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      className="text-xs"
                    >
                      <RotateCcw className="w-3 h-3 mr-1" />
                      Reset
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="text-xs"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 mr-1" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 mr-1" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              {generationMeta && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {generationMeta.formatLabel}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {generationMeta.wordCount} words
                  </Badge>
                  <Badge variant="outline" className="text-xs text-slate-400">
                    {generationMeta.model}
                  </Badge>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {generateMutation.isPending ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-3" />
                  <p className="text-sm font-medium">Writing your content...</p>
                  <p className="text-xs mt-1">This usually takes 10-30 seconds</p>
                </div>
              ) : generatedContent ? (
                <div className="prose prose-sm max-w-none prose-slate">
                  {title && (
                    <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100">
                      {title}
                    </h2>
                  )}
                  <div
                    className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 font-normal"
                    dangerouslySetInnerHTML={{ __html: generatedContent }}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <PenLine className="w-10 h-10 mb-3 opacity-30" />
                  <p className="text-sm font-medium">Your content will appear here</p>
                  <p className="text-xs mt-1">Fill in the form and click Generate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
