import { useState, useMemo, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useActiveProject } from "@/components/AppLayout";
import {
  Users, Mic, MousePointerClick, Plus, Pencil, Trash2, ChevronRight,
  Target, MapPin, GraduationCap, Briefcase, DollarSign, AlertCircle,
  Goal, ShieldAlert, BookOpen, Search, Star, X, Check, Loader2,
  Globe, Link2, FileCheck, RefreshCw, ExternalLink, Upload, FileText,
  CheckCircle2, XCircle, AlertTriangle, Info, Save, Zap, Shield, TrendingUp,
  Crown, Sparkles, MessageSquareText, Bot, BrainCircuit
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

type Tab = "icp" | "voice" | "cta" | "sitemaps" | "citations" | "crosscheck" | "llm";

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

// ---- Bullet Section Component (for ICP) ----
function BulletSection({ icon, iconColor, bgColor, borderColor, label, description, items, placeholder, onAdd, onUpdate, onRemove }: {
  icon: React.ReactNode; iconColor: string; bgColor: string; borderColor: string;
  label: string; description: string; items: string[]; placeholder: string;
  onAdd: () => void; onUpdate: (i: number, v: string) => void; onRemove: (i: number) => void;
}) {
  return (
    <div className={`${bgColor} rounded-xl border ${borderColor} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className={`flex items-center gap-2 ${iconColor}`}>
            {icon}
            <span className="font-medium text-sm text-foreground">{label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        {items.length < 5 && (
          <Button size="sm" variant="outline" onClick={onAdd} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Add
          </Button>
        )}
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm w-4">{index + 1}.</span>
            <Input value={item} onChange={(e) => onUpdate(index, e.target.value)} placeholder={placeholder} className="flex-1 bg-card" />
            <Button size="sm" variant="ghost" onClick={() => onRemove(index)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">No items added yet. Click "Add" to start.</p>
        )}
      </div>
    </div>
  );
}

// ---- ICP Tab (inline single-ICP form stored on project) ----
function ICPTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId });
  const updateMut = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      setHasChanges(false);
      toast.success("ICP saved successfully");
    },
    onError: () => toast.error("Failed to save ICP"),
  });

  const [icpPrimaryName, setIcpPrimaryName] = useState("");
  const [icpWhoTheyAre, setIcpWhoTheyAre] = useState("");
  const [icpPains, setIcpPains] = useState<string[]>([]);
  const [icpGoals, setIcpGoals] = useState<string[]>([]);
  const [icpObjections, setIcpObjections] = useState<string[]>([]);
  const [icpDecisionTriggers, setIcpDecisionTriggers] = useState<string[]>([]);
  const [icpTrustSignals, setIcpTrustSignals] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Populate form when project data loads
  if (project && !initialized) {
    setIcpPrimaryName(project.icpPrimaryName || "");
    setIcpWhoTheyAre(project.icpWhoTheyAre || "");
    setIcpPains(project.icpPains || []);
    setIcpGoals(project.icpGoals || []);
    setIcpObjections(project.icpObjections || []);
    setIcpDecisionTriggers(project.icpDecisionTriggers || []);
    setIcpTrustSignals(project.icpTrustSignals || []);
    setInitialized(true);
  }

  const updateField = (setter: (v: any) => void) => (value: any) => {
    setter(value);
    setHasChanges(true);
  };

  const addBullet = (items: string[], setItems: (v: string[]) => void) => {
    if (items.length < 5) { setItems([...items, ""]); setHasChanges(true); }
  };
  const updateBullet = (items: string[], setItems: (v: string[]) => void, index: number, value: string) => {
    const copy = [...items]; copy[index] = value; setItems(copy); setHasChanges(true);
  };
  const removeBullet = (items: string[], setItems: (v: string[]) => void, index: number) => {
    setItems(items.filter((_, i) => i !== index)); setHasChanges(true);
  };

  const handleSave = () => {
    updateMut.mutate({
      id: projectId,
      icpPrimaryName: icpPrimaryName || undefined,
      icpWhoTheyAre: icpWhoTheyAre || undefined,
      icpPains: icpPains.filter(Boolean).length ? icpPains.filter(Boolean) : undefined,
      icpGoals: icpGoals.filter(Boolean).length ? icpGoals.filter(Boolean) : undefined,
      icpObjections: icpObjections.filter(Boolean).length ? icpObjections.filter(Boolean) : undefined,
      icpDecisionTriggers: icpDecisionTriggers.filter(Boolean).length ? icpDecisionTriggers.filter(Boolean) : undefined,
      icpTrustSignals: icpTrustSignals.filter(Boolean).length ? icpTrustSignals.filter(Boolean) : undefined,
    });
  };

  const isConfigured = !!(icpPrimaryName && icpWhoTheyAre);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Target className="w-5 h-5 text-violet-500" />
            Ideal Customer Profile
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Define your target audience to enhance content relevance
          </p>
        </div>
        {isConfigured ? (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Configured
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            <Info className="w-3 h-3 mr-1" /> Not Configured
          </Badge>
        )}
      </div>

      {/* Info box */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
        <p className="text-sm text-violet-800">
          <strong>ICP works alongside Brand Voice</strong> — it influences <em>who</em> content is written for (pain points, examples, vocabulary), while Brand Voice controls <em>how</em> it sounds (tone, personality, style).
        </p>
      </div>

      {/* Primary Identity Section */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <div className="flex items-center gap-2 text-violet-600 mb-2">
          <Users className="w-4 h-4" />
          <span className="font-medium text-sm">Primary Identity</span>
        </div>
        <div>
          <Label className="text-sm font-medium">ICP Name</Label>
          <Input
            placeholder="e.g., Medicare-eligible seniors in Florida"
            value={icpPrimaryName}
            onChange={(e) => updateField(setIcpPrimaryName)(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-sm font-medium">Who They Are</Label>
          <Textarea
            placeholder="1-2 sentences describing your ideal customer..."
            value={icpWhoTheyAre}
            onChange={(e) => updateField(setIcpWhoTheyAre)(e.target.value)}
            className="mt-1 min-h-[80px]"
          />
        </div>
      </div>

      {/* Pain Points */}
      <BulletSection
        icon={<AlertTriangle className="w-4 h-4" />}
        iconColor="text-red-500" bgColor="bg-red-50" borderColor="border-red-200"
        label="Pain Points" description="What problems do they face? (3-5 bullets)"
        items={icpPains} placeholder="e.g., Confused by Medicare enrollment deadlines"
        onAdd={() => addBullet(icpPains, setIcpPains)}
        onUpdate={(i, v) => updateBullet(icpPains, setIcpPains, i, v)}
        onRemove={(i) => removeBullet(icpPains, setIcpPains, i)}
      />

      {/* Goals */}
      <BulletSection
        icon={<TrendingUp className="w-4 h-4" />}
        iconColor="text-emerald-500" bgColor="bg-emerald-50" borderColor="border-emerald-200"
        label="Goals" description="What do they want to achieve? (3-5 bullets)"
        items={icpGoals} placeholder="e.g., Find affordable prescription drug coverage"
        onAdd={() => addBullet(icpGoals, setIcpGoals)}
        onUpdate={(i, v) => updateBullet(icpGoals, setIcpGoals, i, v)}
        onRemove={(i) => removeBullet(icpGoals, setIcpGoals, i)}
      />

      {/* Common Objections */}
      <BulletSection
        icon={<Shield className="w-4 h-4" />}
        iconColor="text-amber-500" bgColor="bg-amber-50" borderColor="border-amber-200"
        label="Common Objections" description="What hesitations do they have? (3-5 bullets)"
        items={icpObjections} placeholder="e.g., Worried about hidden costs or fees"
        onAdd={() => addBullet(icpObjections, setIcpObjections)}
        onUpdate={(i, v) => updateBullet(icpObjections, setIcpObjections, i, v)}
        onRemove={(i) => removeBullet(icpObjections, setIcpObjections, i)}
      />

      {/* Decision Triggers */}
      <BulletSection
        icon={<Zap className="w-4 h-4" />}
        iconColor="text-blue-500" bgColor="bg-blue-50" borderColor="border-blue-200"
        label="Decision Triggers" description="What prompts them to take action? (3-5 bullets)"
        items={icpDecisionTriggers} placeholder="e.g., Approaching 65th birthday deadline"
        onAdd={() => addBullet(icpDecisionTriggers, setIcpDecisionTriggers)}
        onUpdate={(i, v) => updateBullet(icpDecisionTriggers, setIcpDecisionTriggers, i, v)}
        onRemove={(i) => removeBullet(icpDecisionTriggers, setIcpDecisionTriggers, i)}
      />

      {/* Trust Signals */}
      <BulletSection
        icon={<CheckCircle2 className="w-4 h-4" />}
        iconColor="text-indigo-500" bgColor="bg-indigo-50" borderColor="border-indigo-200"
        label="Trust Signals" description="What builds their confidence? (3-5 bullets)"
        items={icpTrustSignals} placeholder="e.g., Licensed agents with local expertise"
        onAdd={() => addBullet(icpTrustSignals, setIcpTrustSignals)}
        onUpdate={(i, v) => updateBullet(icpTrustSignals, setIcpTrustSignals, i, v)}
        onRemove={(i) => removeBullet(icpTrustSignals, setIcpTrustSignals, i)}
      />

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={updateMut.isPending || !hasChanges} className="bg-violet-600 hover:bg-violet-700 text-white">
          {updateMut.isPending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4 mr-2" /> Save ICP</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---- Brand Voice Helpers ----
const TONE_PRESETS = [
  "Friendly", "Professional", "Supportive", "Educational",
  "Authoritative", "Conversational", "Empathetic", "Trustworthy",
  "Enthusiastic", "Calm", "Witty", "Formal",
];

const PERSPECTIVE_OPTIONS = [
  { value: "first", label: "First Person (we/our)", example: '"We help you..."' },
  { value: "second", label: "Second Person (you/your)", example: '"You can expect..."' },
  { value: "third", label: "Third Person", example: '"The company provides..."' },
];

const SENTENCE_STYLE_OPTIONS = [
  { value: "short", label: "Short and Direct", description: "Concise sentences under 12 words. Minimal filler, tight paragraphs (1-3 sentences). Strong clarity with no unnecessary elaboration." },
  { value: "mixed", label: "Mixed (Varied and Natural Rhythm)", description: "Varied sentence length\u2014short for emphasis, medium for clarity, longer for explanation. Natural rhythm with paragraphs of 2-5 sentences." },
  { value: "detailed", label: "Detailed and Explanatory", description: "Longer, fully developed sentences with expanded context. Thorough explanations, logical transitions, structured paragraphs that unpack complex ideas." },
];

const AVOID_PRESETS = [
  { id: "jargon", label: "Overly technical jargon" },
  { id: "salesy", label: "Sales-heavy language" },
  { id: "fear", label: "Fear-based messaging" },
  { id: "exaggerated", label: "Exaggerated claims" },
  { id: "cliches", label: "Industry clich\u00e9s" },
  { id: "passive", label: "Passive voice" },
  { id: "buzzwords", label: "Buzzwords" },
  { id: "rhetorical", label: "Rhetorical questions" },
  { id: "unverified", label: "Unverified statistics" },
  { id: "competitor", label: "Competitor comparisons" },
];

function parseToneTraits(toneTraits: string): { primary: string[]; supporting: string[] } {
  if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
    const parts = toneTraits.split("|");
    let primary: string[] = [];
    let supporting: string[] = [];
    for (const part of parts) {
      if (part.startsWith("PRIMARY:")) primary = part.replace("PRIMARY:", "").split(",").map(t => t.trim()).filter(Boolean);
      else if (part.startsWith("SUPPORTING:")) supporting = part.replace("SUPPORTING:", "").split(",").map(t => t.trim()).filter(Boolean);
    }
    return { primary, supporting };
  }
  const allTraits = toneTraits.split(",").map(t => t.trim()).filter(Boolean);
  return { primary: allTraits.slice(0, 2), supporting: allTraits.slice(2, 5) };
}

function serializeToneTraits(primary: string[], supporting: string[]): string {
  const parts: string[] = [];
  if (primary.length > 0) parts.push(`PRIMARY:${primary.join(",")}`);
  if (supporting.length > 0) parts.push(`SUPPORTING:${supporting.join(",")}`);
  return parts.join("|");
}

function parseAvoidList(avoidList: string): { presets: string[]; custom: string } {
  if (!avoidList) return { presets: [], custom: "" };
  if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
    const parts = avoidList.split("|");
    let presets: string[] = [];
    let custom = "";
    for (const part of parts) {
      if (part.startsWith("PRESETS:")) presets = part.replace("PRESETS:", "").split(",").filter(Boolean);
      else if (part.startsWith("CUSTOM:")) custom = part.replace("CUSTOM:", "");
    }
    return { presets, custom };
  }
  return { presets: [], custom: avoidList };
}

function serializeAvoidList(presets: string[], custom: string): string {
  const parts: string[] = [];
  if (presets.length > 0) parts.push(`PRESETS:${presets.join(",")}`);
  if (custom.trim()) parts.push(`CUSTOM:${custom.trim()}`);
  return parts.join("|");
}

function getAvoidListDisplay(avoidList: string): string[] {
  const { presets, custom } = parseAvoidList(avoidList);
  const labels = presets.map(id => AVOID_PRESETS.find(p => p.id === id)?.label || id);
  if (custom.trim()) labels.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
  return labels;
}

// ---- Brand Voice Form ----
function BrandVoiceForm({ projectId, existing, onClose }: { projectId: number; existing?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMut = trpc.brandVoices.create.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); onClose(); toast.success("Brand Voice created"); } });
  const updateMut = trpc.brandVoices.update.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); onClose(); toast.success("Brand Voice updated"); } });

  // Parse existing tone traits
  const existingTones = existing?.toneTraits ? parseToneTraits(existing.toneTraits) : { primary: [], supporting: [] };
  const existingAvoid = existing?.avoidList ? parseAvoidList(existing.avoidList) : { presets: [], custom: "" };

  const [name, setName] = useState(existing?.name ?? "");
  const [primaryTones, setPrimaryTones] = useState<string[]>(existingTones.primary);
  const [supportingTones, setSupportingTones] = useState<string[]>(existingTones.supporting);
  const [perspective, setPerspective] = useState(existing?.perspective ?? "second");
  const [sentenceStyle, setSentenceStyle] = useState(existing?.sentenceStyle ?? "mixed");
  const [writingStyleSample, setWritingStyleSample] = useState(existing?.writingStyleSample ?? "");
  const [selectedAvoidPresets, setSelectedAvoidPresets] = useState<string[]>(existingAvoid.presets);
  const [customAvoidText, setCustomAvoidText] = useState(existingAvoid.custom);
  const [isDefault, setIsDefault] = useState(existing?.isDefault === 1);

  const loading = createMut.isPending || updateMut.isPending;

  const togglePrimaryTone = (trait: string) => {
    if (primaryTones.includes(trait)) { setPrimaryTones(prev => prev.filter(t => t !== trait)); return; }
    if (supportingTones.includes(trait)) {
      if (primaryTones.length >= 2) { toast.error("Maximum 2 primary tones allowed"); return; }
      setSupportingTones(prev => prev.filter(t => t !== trait));
      setPrimaryTones(prev => [...prev, trait]);
      return;
    }
    if (primaryTones.length >= 2) { toast.error("Maximum 2 primary tones allowed"); return; }
    setPrimaryTones(prev => [...prev, trait]);
  };

  const toggleSupportingTone = (trait: string) => {
    if (supportingTones.includes(trait)) { setSupportingTones(prev => prev.filter(t => t !== trait)); return; }
    if (primaryTones.includes(trait)) {
      if (supportingTones.length >= 3) { toast.error("Maximum 3 supporting tones allowed"); return; }
      setPrimaryTones(prev => prev.filter(t => t !== trait));
      setSupportingTones(prev => [...prev, trait]);
      return;
    }
    if (supportingTones.length >= 3) { toast.error("Maximum 3 supporting tones allowed"); return; }
    setSupportingTones(prev => [...prev, trait]);
  };

  const removeTone = (trait: string) => {
    setPrimaryTones(prev => prev.filter(t => t !== trait));
    setSupportingTones(prev => prev.filter(t => t !== trait));
  };

  const toggleAvoidPreset = (presetId: string) => {
    setSelectedAvoidPresets(prev => prev.includes(presetId) ? prev.filter(id => id !== presetId) : [...prev, presetId]);
  };

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (primaryTones.length === 0) { toast.error("Please select at least one primary tone"); return; }
    const toneTraits = serializeToneTraits(primaryTones, supportingTones);
    const avoidList = serializeAvoidList(selectedAvoidPresets, customAvoidText);
    const data = {
      name: name.trim(),
      toneTraits: toneTraits || undefined,
      perspective,
      sentenceStyle,
      writingStyleSample: writingStyleSample || undefined,
      avoidList: avoidList || undefined,
      isDefault: isDefault ? 1 : 0,
    };
    if (existing) {
      updateMut.mutate({ id: existing.id, ...data });
    } else {
      createMut.mutate({ ...data, projectId });
    }
  };

  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
      {/* Voice Name */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Voice Name *</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Medicare Educational Voice" className="text-base" />
      </div>

      {/* Primary Tones */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-amber-500" />
          <Label className="text-base font-semibold">Primary Tone (max 2) *</Label>
        </div>
        <p className="text-sm text-muted-foreground">These tones will have the strongest influence on generated content</p>
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((trait) => {
            const isPrimary = primaryTones.includes(trait);
            const isSupporting = supportingTones.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => togglePrimaryTone(trait)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isPrimary
                    ? "bg-amber-500 text-white"
                    : isSupporting
                    ? "bg-purple-100 text-purple-700 border border-purple-300"
                    : "bg-muted text-muted-foreground hover:bg-amber-100 hover:text-amber-700"
                }`}
              >
                {isPrimary && <Crown className="w-3 h-3 inline mr-1" />}
                {trait}
              </button>
            );
          })}
        </div>
      </div>

      {/* Supporting Tones */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <Label className="text-base font-semibold">Supporting Tone (max 3)</Label>
        </div>
        <p className="text-sm text-muted-foreground">These tones add nuance and balance to your content</p>
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((trait) => {
            const isPrimary = primaryTones.includes(trait);
            const isSupporting = supportingTones.includes(trait);
            return (
              <button
                key={trait}
                type="button"
                onClick={() => toggleSupportingTone(trait)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isSupporting
                    ? "bg-purple-500 text-white"
                    : isPrimary
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "bg-muted text-muted-foreground hover:bg-purple-100 hover:text-purple-700"
                }`}
              >
                {isSupporting && <Check className="w-3 h-3 inline mr-1" />}
                {trait}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tone Summary */}
      {(primaryTones.length > 0 || supportingTones.length > 0) && (
        <div className="bg-muted/50 rounded-lg p-3 border">
          <p className="text-xs font-medium text-foreground mb-2">Selected Tones Summary</p>
          <div className="space-y-1.5">
            {primaryTones.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-amber-600 font-medium flex items-center gap-1"><Crown className="w-3 h-3" /> Leading:</span>
                {primaryTones.map((trait) => (
                  <span key={trait} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                    {trait}
                    <button type="button" onClick={() => removeTone(trait)} className="hover:text-amber-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            {supportingTones.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-purple-600 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Supporting:</span>
                {supportingTones.map((trait) => (
                  <span key={trait} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                    {trait}
                    <button type="button" onClick={() => removeTone(trait)} className="hover:text-purple-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <Separator />

      {/* Perspective */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Perspective</Label>
        <Select value={perspective} onValueChange={setPerspective}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERSPECTIVE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                <span>{opt.label}</span>
                <span className="text-xs text-muted-foreground ml-2">{opt.example}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Sentence Style */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Sentence Style *</Label>
        <p className="text-sm text-muted-foreground">Controls sentence length, pacing, and paragraph structure</p>
        <Select value={sentenceStyle} onValueChange={setSentenceStyle}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {SENTENCE_STYLE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700">
            {SENTENCE_STYLE_OPTIONS.find(opt => opt.value === sentenceStyle)?.description}
          </p>
        </div>
      </div>

      <Separator />

      {/* Writing Style Sample */}
      <div className="space-y-2">
        <Label className="text-base font-semibold">Writing Style Sample</Label>
        <p className="text-sm text-muted-foreground">Paste 1-3 paragraphs that demonstrate your ideal voice</p>
        <Textarea
          value={writingStyleSample}
          onChange={(e) => setWritingStyleSample(e.target.value)}
          placeholder="Medicare can feel confusing at first \u2014 but you're not alone. Whether you're turning 65 soon or exploring new coverage options, understanding the basics can make the process much easier..."
          className="text-base min-h-[120px]"
        />
      </div>

      <Separator />

      {/* Things to Avoid */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Things to Avoid</Label>
        <p className="text-sm text-muted-foreground">Select constraints the AI should follow\u2014these will override default tendencies</p>
        <div className="grid grid-cols-2 gap-2">
          {AVOID_PRESETS.map((preset) => {
            const isSelected = selectedAvoidPresets.includes(preset.id);
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => toggleAvoidPreset(preset.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors border ${
                  isSelected
                    ? "bg-red-50 border-red-300 text-red-700"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-red-50 hover:border-red-200"
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected ? "bg-red-500 border-red-500" : "border-muted-foreground/30"
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{preset.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2">
          <Label className="text-sm text-muted-foreground">Additional restrictions (optional)</Label>
          <Input
            value={customAvoidText}
            onChange={(e) => setCustomAvoidText(e.target.value)}
            placeholder="e.g., Brand name misspellings, Specific competitor mentions"
            className="mt-1 text-base"
          />
        </div>
        {(selectedAvoidPresets.length > 0 || customAvoidText.trim()) && (
          <div className="p-3 bg-red-50 rounded-lg border border-red-100">
            <p className="text-xs font-medium text-red-700 mb-1.5">
              {selectedAvoidPresets.length + (customAvoidText.trim() ? customAvoidText.split(",").filter(s => s.trim()).length : 0)} constraint(s) enabled
            </p>
            <div className="flex flex-wrap gap-1.5">
              {selectedAvoidPresets.map((presetId) => {
                const preset = AVOID_PRESETS.find(p => p.id === presetId);
                return (
                  <span key={presetId} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">
                    {preset?.label}
                    <button type="button" onClick={() => toggleAvoidPreset(presetId)} className="hover:text-red-900"><X className="w-3 h-3" /></button>
                  </span>
                );
              })}
              {customAvoidText.trim() && customAvoidText.split(",").filter(s => s.trim()).map((item, idx) => (
                <span key={`custom-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                  {item.trim()}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Set as Default */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isDefault"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-muted-foreground/30"
        />
        <Label htmlFor="isDefault" className="cursor-pointer text-sm">Set as default voice for this project</Label>
      </div>

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
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write the CTA text/HTML..." className="text-base min-h-[100px]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-base font-semibold">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
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
            <SelectTrigger className="text-base"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="beginning">Beginning</SelectItem>
              <SelectItem value="middle">Middle</SelectItem>
              <SelectItem value="end">End</SelectItem>
              <SelectItem value="after-h2">After Each H2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">URL (optional)</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="text-base" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Button Text (optional)</Label>
        <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="e.g., Get Started" className="text-base" />
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

// ---- Citation Form ----
function CitationForm({ projectId, existing, onClose }: { projectId: number; existing?: any; onClose: () => void }) {
  const utils = trpc.useUtils();
  const createMut = trpc.citations.create.useMutation({ onSuccess: () => { utils.citations.list.invalidate(); onClose(); toast.success("Citation source added"); } });
  const updateMut = trpc.citations.update.useMutation({ onSuccess: () => { utils.citations.list.invalidate(); onClose(); toast.success("Citation source updated"); } });

  const [name, setName] = useState(existing?.name ?? "");
  const [url, setUrl] = useState(existing?.url ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [category, setCategory] = useState(existing?.category ?? "");

  const loading = createMut.isPending || updateMut.isPending;

  const categoryOptions = [
    "Government", "Research", "Industry", "News", "Academic", "Medical", "Legal", "Technical", "Other"
  ];

  const handleSubmit = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!url.trim()) { toast.error("URL is required"); return; }
    const data = {
      name: name.trim(),
      url: url.trim(),
      description: description || undefined,
      category: category || undefined,
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
        <Label className="text-base font-semibold">Source Name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Medicare.gov - Official Medicare Information" className="text-base" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">URL</Label>
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.medicare.gov" className="text-base" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Description (optional)</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this source cover?" className="text-base min-h-[80px]" />
      </div>
      <div className="space-y-2">
        <Label className="text-base font-semibold">Category</Label>
        <div className="flex flex-wrap gap-2">
          {categoryOptions.map((c) => (
            <Badge
              key={c}
              variant={category === c.toLowerCase() ? "default" : "outline"}
              className="cursor-pointer text-sm py-1.5 px-3"
              onClick={() => setCategory(c.toLowerCase())}
            >
              {c}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {existing ? "Update Source" : "Add Source"}
        </Button>
      </div>
    </div>
  );
}

// ---- Sitemaps Tab Content ----
function SitemapsTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: sitemapList = [], isLoading } = trpc.sitemaps.list.useQuery({ projectId });
  const [addUrl, setAddUrl] = useState("");
  const [showUrls, setShowUrls] = useState<number | null>(null);

  const createMut = trpc.sitemaps.create.useMutation({
    onSuccess: () => {
      utils.sitemaps.list.invalidate();
      setAddUrl("");
      toast.success("Sitemap added and parsed successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const refreshMut = trpc.sitemaps.refresh.useMutation({
    onSuccess: () => {
      utils.sitemaps.list.invalidate();
      toast.success("Sitemap refreshed");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMut = trpc.sitemaps.delete.useMutation({
    onSuccess: () => {
      utils.sitemaps.list.invalidate();
      toast.success("Sitemap removed");
    },
  });

  const handleAdd = () => {
    if (!addUrl.trim()) { toast.error("Please enter a sitemap URL"); return; }
    createMut.mutate({ url: addUrl.trim(), projectId });
  };

  const totalUrls = useMemo(() => sitemapList.reduce((sum: number, s: any) => sum + (s.urlCount || 0), 0), [sitemapList]);

  return (
    <div className="space-y-6">
      {/* Add Sitemap */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-1">Add Sitemap URL</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Paste your sitemap URL and we'll parse it to extract all page URLs. These URLs will be available for internal linking during article generation.
          </p>
          <div className="flex gap-3">
            <Input
              value={addUrl}
              onChange={(e) => setAddUrl(e.target.value)}
              placeholder="https://example.com/sitemap.xml"
              className="text-base flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
            <Button onClick={handleAdd} disabled={createMut.isPending} className="gap-2 shrink-0">
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Sitemap
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {sitemapList.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-blue-50 rounded-xl px-5 py-3 flex items-center gap-3">
            <Globe className="w-5 h-5 text-blue-500" />
            <div>
              <div className="text-2xl font-bold text-blue-700">{sitemapList.length}</div>
              <div className="text-xs text-blue-600">Sitemaps</div>
            </div>
          </div>
          <div className="bg-indigo-50 rounded-xl px-5 py-3 flex items-center gap-3">
            <Link2 className="w-5 h-5 text-indigo-500" />
            <div>
              <div className="text-2xl font-bold text-indigo-700">{totalUrls}</div>
              <div className="text-xs text-indigo-600">Total URLs</div>
            </div>
          </div>
        </div>
      )}

      {/* Sitemap List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : sitemapList.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Sitemaps Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Add your website's sitemap so the AI can use your existing pages for internal linking in generated articles.
            </p>
          </CardContent>
        </Card>
      ) : (
        sitemapList.map((sitemap: any) => (
          <Card key={sitemap.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-medium truncate">{sitemap.url}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1"><Link2 className="w-3.5 h-3.5" /> {sitemap.urlCount} URLs</span>
                        <span>Parsed: {new Date(sitemap.lastParsed).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Toggle URL list */}
                  {showUrls === sitemap.id && sitemap.parsedUrls && (
                    <div className="mt-3 ml-13 bg-muted/40 rounded-lg p-4 max-h-60 overflow-y-auto">
                      <div className="space-y-1.5">
                        {(sitemap.parsedUrls as any[]).slice(0, 50).map((u: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                            <span className="text-muted-foreground truncate">{u.title || u.url}</span>
                          </div>
                        ))}
                        {(sitemap.parsedUrls as any[]).length > 50 && (
                          <p className="text-xs text-muted-foreground mt-2">...and {(sitemap.parsedUrls as any[]).length - 50} more</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => setShowUrls(showUrls === sitemap.id ? null : sitemap.id)}
                  >
                    {showUrls === sitemap.id ? "Hide" : "View"} URLs
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refreshMut.mutate({ id: sitemap.id })}
                    disabled={refreshMut.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshMut.isPending ? "animate-spin" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => deleteMut.mutate({ id: sitemap.id })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ---- Cross Check Tab Content ----
function CrossCheckTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: refDoc, isLoading } = trpc.crossCheck.getReferenceDoc.useQuery({ projectId });
  const [docContent, setDocContent] = useState("");
  const [docName, setDocName] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const updateMut = trpc.crossCheck.updateReferenceDoc.useMutation({
    onSuccess: () => {
      utils.crossCheck.getReferenceDoc.invalidate();
      setIsEditing(false);
      toast.success("Reference document updated");
    },
    onError: (err) => toast.error(err.message),
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
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-violet-50/50 border-violet-200">
        <CardContent className="p-5">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-violet-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-violet-900 mb-1">How Cross Check Works</h4>
              <p className="text-sm text-violet-700">
                Upload a reference document (product specs, company facts, guidelines, etc.) and the AI will compare your generated articles against it to identify factual discrepancies. This is especially useful for regulated industries where accuracy is critical.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Reference Doc or Upload */}
      {!isEditing && (refDoc?.referenceDoc || refDoc?.hasMetadata) ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-violet-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{refDoc?.referenceDocName || "Reference Document"}</h3>
                  <p className="text-sm text-muted-foreground">{(refDoc?.referenceDocLength ?? refDoc?.referenceDoc?.length ?? 0).toLocaleString()} characters</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleRemove} disabled={updateMut.isPending}>
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </Button>
              </div>
            </div>
            {refDoc?.s3FetchFailed && !refDoc?.referenceDoc ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 mb-1">Content temporarily unavailable</p>
                    <p className="text-sm text-amber-700 mb-3">
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
                <pre className="text-sm whitespace-pre-wrap font-sans text-muted-foreground">{refDoc.referenceDoc.substring(0, 2000)}{refDoc.referenceDoc.length > 2000 ? "\n\n... (truncated for preview)" : ""}</pre>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : !isEditing ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-14 h-14 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
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

// ---- LLM / AI Model Settings Tab ----
const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (Latest)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (Fast)" },
];

function LLMSettingsTab({ projectId }: { projectId: number }) {
  const utils = trpc.useUtils();
  const { data: project, isLoading } = trpc.projects.getById.useQuery({ id: projectId });
  const updateMut = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("AI model settings saved");
    },
    onError: () => toast.error("Failed to save AI model settings"),
  });

  const [provider, setProvider] = useState<"builtin" | "claude">("builtin");
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [initialized, setInitialized] = useState(false);

  if (project && !initialized) {
    setProvider((project.llmProvider as "builtin" | "claude") || "builtin");
    setModel(project.llmModel || "claude-sonnet-4-20250514");
    setInitialized(true);
  }

  const handleSave = () => {
    updateMut.mutate({
      id: projectId,
      llmProvider: provider,
      llmModel: provider === "claude" ? model : undefined,
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">AI Model Configuration</h2>
        <p className="text-muted-foreground text-sm mt-0.5">Choose which AI model powers your content generation.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Built-in Option */}
        <Card
          className={`cursor-pointer transition-all ${
            provider === "builtin"
              ? "ring-2 ring-indigo-500 border-indigo-300 shadow-md"
              : "hover:border-border/80 hover:shadow-sm"
          }`}
          onClick={() => setProvider("builtin")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="text-base">Built-in AI</CardTitle>
                <CardDescription className="text-sm">Default model (Gemini)</CardDescription>
              </div>
              {provider === "builtin" && (
                <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-0">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Uses the platform's built-in AI model. No additional API key required. Good balance of speed and quality.
            </p>
          </CardContent>
        </Card>

        {/* Claude Option */}
        <Card
          className={`cursor-pointer transition-all ${
            provider === "claude"
              ? "ring-2 ring-cyan-500 border-cyan-300 shadow-md"
              : "hover:border-border/80 hover:shadow-sm"
          }`}
          onClick={() => setProvider("claude")}
        >
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Bot className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle className="text-base">Claude (Anthropic)</CardTitle>
                <CardDescription className="text-sm">Advanced reasoning model</CardDescription>
              </div>
              {provider === "claude" && (
                <Badge className="ml-auto bg-cyan-100 text-cyan-700 border-0">Active</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Anthropic's Claude models. Excellent for nuanced writing, detailed analysis, and following complex instructions.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Claude Model Selector */}
      {provider === "claude" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Claude Model</CardTitle>
            <CardDescription>Select which Claude model to use for content generation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLAUDE_MODELS.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Sonnet 4 is recommended for the best balance of quality and speed. Haiku is faster but less detailed. Opus provides the highest quality but is slower.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
          {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          <Save className="w-4 h-4" />
          Save AI Model Settings
        </Button>
      </div>
    </div>
  );
}

// ---- Banned Phrases Section ----
function BannedPhrasesSection({ projectId }: { projectId: number }) {
  const { data: project } = trpc.projects.getById.useQuery({ id: projectId });
  const utils = trpc.useUtils();
  const updateMut = trpc.projects.update.useMutation({
    onSuccess: () => {
      utils.projects.getById.invalidate({ id: projectId });
      toast.success("Banned phrases saved");
    },
  });

  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (project?.bannedPhrases) {
      setText(project.bannedPhrases.filter(Boolean).join("\n"));
    } else {
      setText("");
    }
  }, [project?.bannedPhrases]);

  const phraseCount = text.split("\n").filter(l => l.trim()).length;

  const handleSave = () => {
    const phrases = text
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean);
    updateMut.mutate({ id: projectId, bannedPhrases: phrases });
    setIsEditing(false);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Banned Phrases</CardTitle>
              <CardDescription>Phrases that should never appear in generated content</CardDescription>
            </div>
          </div>
          {phraseCount > 0 && (
            <Badge variant="secondary" className="bg-red-50 text-red-600">
              {phraseCount} phrase{phraseCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!isEditing && !text.trim() ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">
              No banned phrases yet. Add phrases the AI should never use in your content.
            </p>
            <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Banned Phrases
            </Button>
          </div>
        ) : !isEditing ? (
          <div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {text.split("\n").filter(l => l.trim()).map((phrase, idx) => (
                <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-lg text-sm bg-red-50 text-red-700 border border-red-100">
                  <XCircle className="w-3.5 h-3.5 mr-1.5 text-red-400" />
                  {phrase.trim()}
                </span>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-sm text-muted-foreground mb-1.5 block">
                Enter one phrase per line
              </Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={"learn more at\nit's important to note\nnavigate the complexities\nin today's world"}
                rows={6}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={updateMut.isPending} className="gap-2">
                {updateMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" /> Save
              </Button>
              <Button variant="ghost" onClick={() => {
                setText(project?.bannedPhrases?.filter(Boolean).join("\n") || "");
                setIsEditing(false);
              }}>Cancel</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              These phrases will be blocked during article generation. The AI will be instructed to never use them, and a post-generation scan will flag any that slip through.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Main Settings Page ----
export default function ProjectSettings() {
  const { activeProject } = useActiveProject();
  const activeProjectId = activeProject?.id ?? null;
  const [activeTab, setActiveTab] = useState<Tab>("icp");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  const { data: voiceList = [], isLoading: voiceLoading } = trpc.brandVoices.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );
  const { data: ctaList = [], isLoading: ctaLoading } = trpc.ctaTemplates.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );
  const { data: sitemapList = [] } = trpc.sitemaps.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );
  const { data: citationList = [] } = trpc.citations.list.useQuery(
    { projectId: activeProjectId! },
    { enabled: !!activeProjectId }
  );

  const utils = trpc.useUtils();

  const deleteVoice = trpc.brandVoices.delete.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); toast.success("Brand Voice deleted"); } });
  const setDefaultVoice = trpc.brandVoices.update.useMutation({ onSuccess: () => { utils.brandVoices.list.invalidate(); toast.success("Default voice updated"); } });
  const deleteCTA = trpc.ctaTemplates.delete.useMutation({ onSuccess: () => { utils.ctaTemplates.list.invalidate(); toast.success("CTA Template deleted"); } });
  const deleteCitation = trpc.citations.delete.useMutation({ onSuccess: () => { utils.citations.list.invalidate(); toast.success("Citation source deleted"); } });

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
    { id: "icp" as Tab, label: "ICP", icon: Target, count: 0, color: "text-violet-500", bg: "bg-violet-50" },
    { id: "voice" as Tab, label: "Brand Voice", icon: Mic, count: voiceList.length, color: "text-emerald-500", bg: "bg-emerald-50" },
    { id: "cta" as Tab, label: "CTA Templates", icon: MousePointerClick, count: ctaList.length, color: "text-amber-500", bg: "bg-amber-50" },
    { id: "sitemaps" as Tab, label: "Sitemaps", icon: Globe, count: sitemapList.length, color: "text-blue-500", bg: "bg-blue-50" },
    { id: "citations" as Tab, label: "Citations", icon: Link2, count: citationList.length, color: "text-rose-500", bg: "bg-rose-50" },
    { id: "crosscheck" as Tab, label: "Cross Check", icon: FileCheck, count: 0, color: "text-violet-500", bg: "bg-violet-50" },
    { id: "llm" as Tab, label: "AI Model", icon: BrainCircuit, count: 0, color: "text-cyan-500", bg: "bg-cyan-50" },
  ];

  const openCreate = () => { setEditItem(null); setDialogOpen(true); };
  const openEdit = (item: any) => { setEditItem(item); setDialogOpen(true); };

  const dialogTitle = activeTab === "voice"
    ? (editItem ? "Edit Brand Voice" : "New Brand Voice")
    : activeTab === "cta"
    ? (editItem ? "Edit CTA Template" : "New CTA Template")
    : activeTab === "citations"
    ? (editItem ? "Edit Citation Source" : "New Citation Source")
    : "";

  const dialogDesc = activeTab === "voice"
    ? "Configure writing style and tone for consistent brand messaging."
    : activeTab === "cta"
    ? "Create reusable call-to-action blocks for your articles."
    : activeTab === "citations"
    ? "Add trusted sources that the AI should cite in generated articles."
    : "";

  // Determine if the active tab has a "create" button
  const showCreateButton = ["cta", "citations"].includes(activeTab);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Project Settings</h1>
        <p className="text-muted-foreground text-lg mt-1">Configure content generation settings for your project.</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-xl text-base font-medium transition-all ${
                isActive
                  ? "bg-card shadow-md border border-border/60 text-foreground"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
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

      {/* Content Area Header */}
      {showCreateButton && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">
              {activeTab === "voice" && "Brand Voices"}
              {activeTab === "cta" && "CTA Templates"}
              {activeTab === "citations" && "Citation Sources"}
            </h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {activeTab === "voice" && "Set the tone and style for your AI-generated articles."}
              {activeTab === "cta" && "Create reusable calls-to-action to embed in articles."}
              {activeTab === "citations" && "Add trusted sources the AI should reference in articles."}
            </p>
          </div>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            {activeTab === "voice" && "New Brand Voice"}
            {activeTab === "cta" && "New CTA Template"}
            {activeTab === "citations" && "New Citation Source"}
          </Button>
        </div>
      )}

      {/* ICP Tab */}
      {activeTab === "icp" && <ICPTab projectId={activeProjectId} />}

      {/* Brand Voice Tab */}
      {activeTab === "voice" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left column: Brand Voice cards */}
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
            voiceList.map((voice: any) => {
              const { primary, supporting } = voice.toneTraits ? parseToneTraits(voice.toneTraits) : { primary: [], supporting: [] };
              const avoidItems = voice.avoidList ? getAvoidListDisplay(voice.avoidList) : [];
              return (
                <Card key={voice.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                            <MessageSquareText className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{voice.name}</h3>
                            {voice.isDefault === 1 && <Badge className="bg-purple-100 text-purple-700 text-xs">Default</Badge>}
                          </div>
                        </div>

                        {/* Tone Traits */}
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {primary.map((trait: string, idx: number) => (
                            <span key={`p-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                              <Crown className="w-3 h-3" />{trait}
                            </span>
                          ))}
                          {supporting.map((trait: string, idx: number) => (
                            <span key={`s-${idx}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                              {trait}
                            </span>
                          ))}
                        </div>

                        {/* Perspective & Sentence Style */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <p>Perspective: <span className="font-medium">{PERSPECTIVE_OPTIONS.find(p => p.value === voice.perspective)?.label || voice.perspective || "Not set"}</span></p>
                          <p>Style: <span className="font-medium">{SENTENCE_STYLE_OPTIONS.find(s => s.value === voice.sentenceStyle)?.label || "Mixed"}</span></p>
                        </div>

                        {/* Avoid Constraints */}
                        {avoidItems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            <span className="text-xs text-red-500 mr-1">Avoids:</span>
                            {avoidItems.slice(0, 3).map((item: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-red-50 text-red-600">{item}</span>
                            ))}
                            {avoidItems.length > 3 && <span className="text-xs text-red-400">+{avoidItems.length - 3} more</span>}
                          </div>
                        )}

                        {/* Writing Sample Preview */}
                        {voice.writingStyleSample && (
                          <div className="mt-2 p-2 bg-muted/50 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Writing sample:</p>
                            <p className="text-xs text-foreground/70 italic line-clamp-2">
                              "{voice.writingStyleSample.slice(0, 150)}{voice.writingStyleSample.length > 150 ? "..." : ""}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-4">
                        {voice.isDefault !== 1 && (
                          <Button variant="ghost" size="icon" title="Set as default" onClick={() => setDefaultVoice.mutate({ id: voice.id, isDefault: 1 })}>
                            <Star className="w-4 h-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openEdit(voice)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteVoice.mutate({ id: voice.id })}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Add New Brand Voice button below cards */}
          {voiceList.length > 0 && (
            <Button onClick={openCreate} variant="outline" className="gap-2 w-full border-dashed">
              <Plus className="w-4 h-4" /> New Brand Voice
            </Button>
          )}

          </div>

          {/* Right column: Banned Phrases */}
          <div>
            <BannedPhrasesSection projectId={activeProjectId!} />
          </div>
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

      {/* Sitemaps Tab */}
      {activeTab === "sitemaps" && <SitemapsTab projectId={activeProjectId} />}

      {/* Citations Tab */}
      {activeTab === "citations" && (
        <div className="space-y-4">
          {citationList.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                  <Link2 className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Citation Sources Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Add trusted sources that the AI should reference and cite when generating articles. This improves credibility and E-E-A-T signals.
                </p>
                <Button onClick={openCreate} className="gap-2"><Plus className="w-4 h-4" /> Add First Source</Button>
              </CardContent>
            </Card>
          ) : (
            citationList.map((citation: any) => (
              <Card key={citation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center">
                          <Link2 className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{citation.name}</h3>
                          <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                            {citation.url} <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </div>
                      {citation.description && <p className="text-muted-foreground mb-3">{citation.description}</p>}
                      <div className="flex flex-wrap gap-2 text-sm">
                        {citation.category && <Badge variant="outline" className="capitalize">{citation.category}</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(citation)}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => deleteCitation.mutate({ id: citation.id })}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Cross Check Tab */}
      {activeTab === "crosscheck" && <CrossCheckTab projectId={activeProjectId} />}

      {/* AI Model Tab */}
      {activeTab === "llm" && <LLMSettingsTab projectId={activeProjectId} />}


      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[712px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDesc}</DialogDescription>
          </DialogHeader>
          {activeTab === "voice" && <BrandVoiceForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
          {activeTab === "cta" && <CTAForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
          {activeTab === "citations" && <CitationForm projectId={activeProjectId} existing={editItem} onClose={() => setDialogOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
