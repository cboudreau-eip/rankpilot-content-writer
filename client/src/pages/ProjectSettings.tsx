import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import {
  Users, Mic, MousePointerClick, Plus, Pencil, Trash2, ChevronRight,
  Target, MapPin, GraduationCap, Briefcase, DollarSign, AlertCircle,
  Goal, ShieldAlert, BookOpen, Search, Star, X, Check, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Tab = "icp" | "voice" | "cta";

// ---- Tag Input Component ----
function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, i) => (
          <Badge key={i} variant="secondary" className="gap-1 text-sm py-1 px-3">
            {tag}
            <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => onChange(value.filter((_, j) => j !== i))} />
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          className="text-base"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>Add</Button>
      </div>
    </div>
  );
}

// ---- ICP Profile Form ----
function ICPForm({ projectId, existing, onClose }: { projectId: number; existing?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMut = trpc.icpProfiles.create.useMutation({ onSuccess: () => { utils.icpProfiles.list.invalidate(); onClose(); toast.success("ICP Profile created"); } });
  const updateMut = trpc.icpProfiles.update.useMutation({ onSuccess: () => { utils.icpProfiles.list.invalidate(); onClose(); toast.success("ICP Profile updated"); } });

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [ageRange, setAgeRange] = useState(existing?.demographics?.ageRange ?? "");
  const [location, setLocation] = useState(existing?.demographics?.location ?? "");
  const [income, setIncome] = useState(existing?.demographics?.income ?? "");
  const [education, setEducation] = useState(existing?.demographics?.education ?? "");
  const [occupation, setOccupation] = useState(existing?.demographics?.occupation ?? "");
  const [painPoints, setPainPoints] = useState<string[]>(existing?.painPoints ?? []);
  const [goals, setGoals] = useState<string[]>(existing?.goals ?? []);
  const [objections, setObjections] = useState<string[]>(existing?.objections ?? []);
  const [contentPreferences, setContentPreferences] = useState<string[]>(existing?.contentPreferences ?? []);
  const [searchBehavior, setSearchBehavior] = useState(existing?.searchBehavior ?? "");

  const loading = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const data = {
      name: name.trim(),
      description: description || undefined,
      demographics: { ageRange, location, income, education, occupation },
      painPoints: painPoints.length ? painPoints : undefined,
      goals: goals.length ? goals : undefined,
      objections: objections.length ? objections : undefined,
      contentPreferences: contentPreferences.length ? contentPreferences : undefined,
      searchBehavior: searchBehavior || undefined,
    };
    if (existing) {
      updateMut.mutate({ id: existing.id, ...data });
    } else {
      createMut.mutate({ ...data, projectId });
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Profile Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Medicare Shoppers 65+" className="text-base" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of this ICP..." className="text-base min-h-[80px]" />
      </div>

      <Separator />
      <h3 className="text-lg font-semibold flex items-center gap-2"><Target className="w-5 h-5 text-indigo-500" /> Demographics</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><Users className="w-4 h-4 text-muted-foreground" /> Age Range</Label>
          <Input value={ageRange} onChange={(e) => setAgeRange(e.target.value)} placeholder="e.g., 55-75" className="text-base" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-muted-foreground" /> Location</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g., United States" className="text-base" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-muted-foreground" /> Income</Label>
          <Input value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g., $40k-$80k" className="text-base" />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-muted-foreground" /> Education</Label>
          <Input value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g., High school+" className="text-base" />
        </div>
        <div className="space-y-2 col-span-2">
          <Label className="flex items-center gap-1.5"><Briefcase className="w-4 h-4 text-muted-foreground" /> Occupation</Label>
          <Input value={occupation} onChange={(e) => setOccupation(e.target.value)} placeholder="e.g., Retired, Semi-retired" className="text-base" />
        </div>
      </div>

      <Separator />
      <h3 className="text-lg font-semibold flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> Pain Points</h3>
      <TagInput value={painPoints} onChange={setPainPoints} placeholder="Add a pain point..." />

      <h3 className="text-lg font-semibold flex items-center gap-2"><Goal className="w-5 h-5 text-green-500" /> Goals & Motivations</h3>
      <TagInput value={goals} onChange={setGoals} placeholder="Add a goal..." />

      <h3 className="text-lg font-semibold flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-amber-500" /> Objections & Concerns</h3>
      <TagInput value={objections} onChange={setObjections} placeholder="Add an objection..." />

      <h3 className="text-lg font-semibold flex items-center gap-2"><BookOpen className="w-5 h-5 text-blue-500" /> Content Preferences</h3>
      <TagInput value={contentPreferences} onChange={setContentPreferences} placeholder="e.g., Step-by-step guides" />

      <div className="space-y-2">
        <Label className="text-base font-semibold flex items-center gap-2"><Search className="w-5 h-5 text-purple-500" /> Search Behavior</Label>
        <Textarea value={searchBehavior} onChange={(e) => setSearchBehavior(e.target.value)} placeholder="How does this audience search? What queries do they use?" className="text-base min-h-[80px]" />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existing ? "Update Profile" : "Create Profile"}
        </Button>
      </div>
    </div>
  );
}

// ---- Brand Voice Form ----
function BrandVoiceForm({ projectId, existing, onClose }: { projectId: number; existing?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMut = trpc.brandVoices.create.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); onClose(); toast.success("Brand Voice created"); } });
  const updateMut = trpc.brandVoices.update.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); onClose(); toast.success("Brand Voice updated"); } });

  const [name, setName] = useState(existing?.name ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [tone, setTone] = useState(existing?.tone ?? "");
  const [style, setStyle] = useState(existing?.style ?? "");
  const [vocabulary, setVocabulary] = useState<string[]>(existing?.vocabulary ?? []);
  const [avoidWords, setAvoidWords] = useState<string[]>(existing?.avoidWords ?? []);
  const [examples, setExamples] = useState<string[]>(existing?.examples ?? []);
  const [rules, setRules] = useState<string[]>(existing?.rules ?? []);

  const loading = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    const data = {
      name: name.trim(),
      description: description || undefined,
      tone: tone || undefined,
      style: style || undefined,
      vocabulary: vocabulary.length ? vocabulary : undefined,
      avoidWords: avoidWords.length ? avoidWords : undefined,
      examples: examples.length ? examples : undefined,
      rules: rules.length ? rules : undefined,
    };
    if (existing) {
      updateMut.mutate({ id: existing.id, ...data });
    } else {
      createMut.mutate({ ...data, projectId });
    }
  };

  const toneOptions = [
    "Professional", "Conversational", "Authoritative", "Friendly",
    "Academic", "Casual", "Empathetic", "Persuasive", "Technical", "Inspirational"
  ];

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Voice Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Medicare FAQ Main Voice" className="text-base" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this brand voice..." className="text-base min-h-[80px]" />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Tone</Label>
        <Select value={tone} onValueChange={setTone}>
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Select a tone..." />
          </SelectTrigger>
          <SelectContent>
            {toneOptions.map((t) => (
              <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Writing Style Guidelines</Label>
        <Textarea value={style} onChange={(e) => setStyle(e.target.value)} placeholder="Describe the writing style: sentence length, paragraph structure, use of jargon, etc." className="text-base min-h-[100px]" />
      </div>

      <Separator />

      <h3 className="text-lg font-semibold">Preferred Vocabulary</h3>
      <p className="text-sm text-muted-foreground">Words and phrases to use frequently in content.</p>
      <TagInput value={vocabulary} onChange={setVocabulary} placeholder="Add a word or phrase..." />

      <h3 className="text-lg font-semibold">Words to Avoid</h3>
      <p className="text-sm text-muted-foreground">Words and phrases that should never appear in content.</p>
      <TagInput value={avoidWords} onChange={setAvoidWords} placeholder="Add a word to avoid..." />

      <h3 className="text-lg font-semibold">Example Sentences</h3>
      <p className="text-sm text-muted-foreground">Sentences that demonstrate this voice. The AI will use these as reference.</p>
      <TagInput value={examples} onChange={setExamples} placeholder="Add an example sentence..." />

      <h3 className="text-lg font-semibold">Brand Rules</h3>
      <p className="text-sm text-muted-foreground">Specific rules (e.g., "Always capitalize Medicare", "Never use first person").</p>
      <TagInput value={rules} onChange={setRules} placeholder="Add a rule..." />

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existing ? "Update Voice" : "Create Voice"}
        </Button>
      </div>
    </div>
  );
}

// ---- CTA Template Form ----
function CTAForm({ projectId, existing, onClose }: { projectId: number; existing?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMut = trpc.ctaTemplates.create.useMutation({ onSuccess: () => { utils.ctaTemplates.list.invalidate(); onClose(); toast.success("CTA Template created"); } });
  const updateMut = trpc.ctaTemplates.update.useMutation({ onSuccess: () => { utils.ctaTemplates.list.invalidate(); onClose(); toast.success("CTA Template updated"); } });

  const [name, setName] = useState(existing?.name ?? "");
  const [content, setContent] = useState(existing?.content ?? "");
  const [type, setType] = useState(existing?.type ?? "inline");
  const [placement, setPlacement] = useState(existing?.placement ?? "end");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [buttonText, setButtonText] = useState(existing?.buttonText ?? "");

  const loading = createMut.isPending || updateMut.isPending;

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!content.trim()) { toast.error("CTA content is required"); return; }
    const data = {
      name: name.trim(),
      content: content.trim(),
      type,
      placement,
      url: url || undefined,
      buttonText: buttonText || undefined,
    };
    if (existing) {
      updateMut.mutate({ id: existing.id, ...data });
    } else {
      createMut.mutate({ ...data, projectId });
    }
  };

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      <div className="space-y-2">
        <Label className="text-base font-semibold">Template Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Free Consultation CTA" className="text-base" />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">CTA Content</Label>
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the CTA text or HTML..." className="text-base min-h-[120px]" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inline">Inline</SelectItem>
              <SelectItem value="banner">Banner</SelectItem>
              <SelectItem value="sidebar">Sidebar</SelectItem>
              <SelectItem value="footer">Footer</SelectItem>
              <SelectItem value="popup">Popup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-base font-semibold">Placement</Label>
          <Select value={placement} onValueChange={setPlacement}>
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="start">Start of Article</SelectItem>
              <SelectItem value="middle">Middle of Article</SelectItem>
              <SelectItem value="end">End of Article</SelectItem>
              <SelectItem value="after-h2">After Each H2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Link URL (optional)</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="text-base" />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-semibold">Button Text (optional)</Label>
        <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="e.g., Get Started Free" className="text-base" />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existing ? "Update Template" : "Create Template"}
        </Button>
      </div>
    </div>
  );
}

// ---- Main Settings Page ----
export default function ProjectSettings() {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;
  const [activeTab, setActiveTab] = useState<Tab>("icp");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: icpList = [], isLoading: icpLoading } = trpc.icpProfiles.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );
  const { data: voiceList = [], isLoading: voiceLoading } = trpc.brandVoices.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );
  const { data: ctaList = [], isLoading: ctaLoading } = trpc.ctaTemplates.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const deleteICP = trpc.icpProfiles.delete.useMutation({ onSuccess: () => { trpc.useUtils().icpProfiles.list.invalidate(); toast.success("ICP Profile deleted"); } });
  const deleteVoice = trpc.brandVoices.delete.useMutation({ onSuccess: () => { trpc.useUtils().brandVoices.list.invalidate(); toast.success("Brand Voice deleted"); } });
  const deleteCTA = trpc.ctaTemplates.delete.useMutation({ onSuccess: () => { trpc.useUtils().ctaTemplates.list.invalidate(); toast.success("CTA Template deleted"); } });

  if (!activeProjectId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">No Project Selected</h2>
          <p className="text-muted-foreground text-lg">Select a project from the header to configure settings.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "icp" as Tab, label: "ICP Profiles", icon: Users, count: icpList.length, color: "text-indigo-500", bg: "bg-indigo-50" },
    { id: "voice" as Tab, label: "Brand Voice", icon: Mic, count: voiceList.length, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "cta" as Tab, label: "CTA Templates", icon: MousePointerClick, count: ctaList.length, color: "text-amber-500", bg: "bg-amber-50" },
  ];

  const openCreate = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setDialogOpen(true); };

  const dialogTitle = activeTab === "icp"
    ? (editItem ? "Edit ICP Profile" : "New ICP Profile")
    : activeTab === "voice"
    ? (editItem ? "Edit Brand Voice" : "New Brand Voice")
    : (editItem ? "Edit CTA Template" : "New CTA Template");

  const dialogDesc = activeTab === "icp"
    ? "Define your ideal customer profile to tailor content generation."
    : activeTab === "voice"
    ? "Configure writing style and tone for consistent brand messaging."
    : "Create reusable call-to-action blocks for your articles.";

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground text-lg mt-1">Configure ICP targeting, brand voice, and CTAs for your content.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-medium transition-all ${
                isActive
                  ? "bg-white shadow-md border border-border/60 text-foreground"
                  : "text-muted-foreground hover:bg-white/60 hover:text-foreground"
              }`}
            >
              <div className={`w-8 h-8 rounded-lg ${tab.bg} flex items-center justify-center`}>
                <Icon className={`w-4 h-4 ${tab.color}`} />
              </div>
              {tab.label}
              {tab.count > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">{tab.count}</Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">
            {activeTab === "icp" && "ICP Profiles"}
            {activeTab === "voice" && "Brand Voices"}
            {activeTab === "cta" && "CTA Templates"}
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {activeTab === "icp" && "Define your target audience to generate more relevant content."}
            {activeTab === "voice" && "Set the tone and style for your AI-generated articles."}
            {activeTab === "cta" && "Create reusable calls-to-action to embed in articles."}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          {activeTab === "icp" && "New ICP Profile"}
          {activeTab === "voice" && "New Brand Voice"}
          {activeTab === "cta" && "New CTA Template"}
        </Button>
      </div>

      {/* ICP Profiles Tab */}
      {activeTab === "icp" && (
        <div className="space-y-4">
          {icpLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : icpList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No ICP Profiles Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Create an Ideal Customer Profile to help the AI generate content tailored to your target audience.
                </p>
                <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Create First Profile</Button>
              </CardContent>
            </Card>
          ) : (
            icpList.map((icp: any) => (
              <Card key={icp.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                          <Users className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{icp.name}</h3>
                          {icp.isDefault === 1 && <Badge className="bg-indigo-100 text-indigo-700 text-xs">Default</Badge>}
                        </div>
                      </div>
                      {icp.description && <p className="text-muted-foreground mb-3">{icp.description}</p>}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {icp.demographics?.ageRange && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {icp.demographics.ageRange}</span>}
                        {icp.demographics?.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {icp.demographics.location}</span>}
                        {icp.demographics?.occupation && <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {icp.demographics.occupation}</span>}
                        {icp.painPoints?.length > 0 && <span>{icp.painPoints.length} pain points</span>}
                        {icp.goals?.length > 0 && <span>{icp.goals.length} goals</span>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(icp)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteICP.mutate({ id: icp.id })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Brand Voice Tab */}
      {activeTab === "voice" && (
        <div className="space-y-4">
          {voiceLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : voiceList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                  <Mic className="w-7 h-7 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Brand Voices Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Define your brand voice so the AI writes in a consistent tone and style across all articles.
                </p>
                <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Create First Voice</Button>
              </CardContent>
            </Card>
          ) : (
            voiceList.map((voice: any) => (
              <Card key={voice.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                          <Mic className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{voice.name}</h3>
                          {voice.isDefault === 1 && <Badge className="bg-emerald-100 text-emerald-700 text-xs">Default</Badge>}
                        </div>
                      </div>
                      {voice.description && <p className="text-muted-foreground mb-3">{voice.description}</p>}
                      <div className="flex flex-wrap gap-2 text-sm">
                        {voice.tone && <Badge variant="outline" className="capitalize">{voice.tone}</Badge>}
                        {voice.vocabulary?.length > 0 && <Badge variant="secondary">{voice.vocabulary.length} preferred words</Badge>}
                        {voice.avoidWords?.length > 0 && <Badge variant="secondary">{voice.avoidWords.length} words to avoid</Badge>}
                        {voice.rules?.length > 0 && <Badge variant="secondary">{voice.rules.length} rules</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(voice)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteVoice.mutate({ id: voice.id })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* CTA Templates Tab */}
      {activeTab === "cta" && (
        <div className="space-y-4">
          {ctaLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : ctaList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-4">
                  <MousePointerClick className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No CTA Templates Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Create reusable call-to-action blocks that the AI will embed in your generated articles.
                </p>
                <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Create First Template</Button>
              </CardContent>
            </Card>
          ) : (
            ctaList.map((cta: any) => (
              <Card key={cta.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                          <MousePointerClick className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{cta.name}</h3>
                          {cta.isDefault === 1 && <Badge className="bg-amber-100 text-amber-700 text-xs">Default</Badge>}
                        </div>
                      </div>
                      <p className="text-muted-foreground mb-3 line-clamp-2">{cta.content}</p>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <Badge variant="outline" className="capitalize">{cta.type}</Badge>
                        <Badge variant="secondary" className="capitalize">Placement: {cta.placement}</Badge>
                        {cta.buttonText && <Badge variant="secondary">{cta.buttonText}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(cta)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteCTA.mutate({ id: cta.id })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDesc}</DialogDescription>
          </DialogHeader>
          {activeTab === "icp" && <ICPForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
          {activeTab === "voice" && <BrandVoiceForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
          {activeTab === "cta" && <CTAForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
