import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Search, Loader2, TrendingUp, TrendingDown, Minus, Download,
  Coins, Filter, RotateCcw, ChevronDown,
} from "lucide-react";

// ---- Types ----

interface KeywordResult {
  keyword: string;
  type: "seed" | "related";
  volume: number;
  cpc: number;
  cpcCurrency: string;
  competition: number;
  competitionLabel: "Low" | "Medium" | "High";
  trendDirection: "rising" | "declining" | "stable";
  trendData: { month: string; year: number; value: number }[];
}

interface SearchResults {
  results: KeywordResult[];
  seedKeyword: string;
  totalResults: number;
  creditsConsumed: number;
  creditsRemaining: number | null;
}

// ---- Mini Sparkline Component ----

function TrendSparkline({ data, direction }: { data: { value: number }[]; direction: "rising" | "declining" | "stable" }) {
  if (!data || data.length < 2) return <span className="text-xs text-muted-foreground">—</span>;

  const values = data.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const width = 80;
  const height = 28;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((v - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  const color = direction === "rising" ? "#22c55e" : direction === "declining" ? "#ef4444" : "#94a3b8";

  return (
    <svg width={width} height={height} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---- Volume Formatter ----

function formatVolume(vol: number): string {
  if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}M`;
  if (vol >= 1_000) return `${(vol / 1_000).toFixed(vol >= 10_000 ? 0 : 1)}K`;
  return vol.toString();
}

// ---- Countries ----

const COUNTRIES = [
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "in", label: "India" },
  { value: "de", label: "Germany" },
  { value: "fr", label: "France" },
  { value: "es", label: "Spain" },
  { value: "it", label: "Italy" },
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
  { value: "nl", label: "Netherlands" },
  { value: "se", label: "Sweden" },
  { value: "no", label: "Norway" },
  { value: "dk", label: "Denmark" },
  { value: "fi", label: "Finland" },
  { value: "pl", label: "Poland" },
  { value: "jp", label: "Japan" },
  { value: "kr", label: "South Korea" },
  { value: "sg", label: "Singapore" },
];

// ---- Main Component ----

export default function KeywordResearch() {
  // Search state
  const [keyword, setKeyword] = useState("");
  const [numRelated, setNumRelated] = useState("10");
  const [country, setCountry] = useState("us");
  const [dataSource, setDataSource] = useState<"gkp" | "cli">("cli");

  // Results state
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);

  // Filter state
  const [hideDeclinig, setHideDeclining] = useState(false);
  const [minVolume, setMinVolume] = useState("0");
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());

  // Credit balance
  const { data: creditData } = trpc.entity.getKeCredits.useQuery(undefined, {
    refetchOnWindowFocus: false,
    staleTime: 60_000,
  });

  // Search mutation
  const searchMutation = trpc.entity.keywordResearch.useMutation({
    onSuccess: (data) => {
      setSearchResults(data);
      setSelectedKeywords(new Set());
      toast.success(`Found ${data.results.length} keywords (${data.creditsConsumed} credits used)`);
    },
    onError: (err) => {
      toast.error(err.message || "Search failed");
    },
  });

  const handleSearch = useCallback(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      toast.error("Please enter a keyword");
      return;
    }
    searchMutation.mutate({
      keyword: trimmed,
      numRelated: parseInt(numRelated),
      country,
      dataSource,
    });
  }, [keyword, numRelated, country, dataSource, searchMutation]);

  // Filtered results
  const filteredResults = useMemo(() => {
    if (!searchResults) return [];
    let results = searchResults.results;
    if (hideDeclinig) {
      results = results.filter(r => r.trendDirection !== "declining");
    }
    const minVol = parseInt(minVolume);
    if (minVol > 0) {
      results = results.filter(r => r.volume >= minVol);
    }
    return results;
  }, [searchResults, hideDeclinig, minVolume]);

  const hiddenCount = searchResults ? searchResults.results.length - filteredResults.length : 0;

  // Selection
  const toggleSelect = useCallback((kw: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(kw)) next.delete(kw);
      else next.add(kw);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedKeywords.size === filteredResults.length) {
      setSelectedKeywords(new Set());
    } else {
      setSelectedKeywords(new Set(filteredResults.map(r => r.keyword)));
    }
  }, [selectedKeywords, filteredResults]);

  // Export CSV
  const exportCSV = useCallback(() => {
    if (!searchResults) return;
    const rows = filteredResults.map(r => [
      r.keyword,
      r.type,
      r.volume,
      `${r.cpcCurrency}${r.cpc.toFixed(2)}`,
      r.competitionLabel,
      r.trendDirection,
    ]);
    const header = ["Keyword", "Type", "Volume", "CPC", "Competition", "Trend"];
    const csv = [header, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `keyword-research-${searchResults.seedKeyword.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [searchResults, filteredResults]);

  const resetFilters = useCallback(() => {
    setHideDeclining(false);
    setMinVolume("0");
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Keyword Research</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Discover high-value keywords and search opportunities powered by Keywords Everywhere
          </p>
        </div>
        {creditData && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
            <Coins className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">
              {creditData.credits.toLocaleString()} credits
            </span>
          </div>
        )}
      </div>

      {/* Search Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            {/* Main search row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="keyword-input" className="text-sm font-medium mb-1.5 block">Seed Keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="keyword-input"
                    placeholder="Enter a keyword (e.g., medicare plan g)"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-40">
                <Label className="text-sm font-medium mb-1.5 block">Related Keywords</Label>
                <Select value={numRelated} onValueChange={setNumRelated}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 related</SelectItem>
                    <SelectItem value="10">10 related</SelectItem>
                    <SelectItem value="25">25 related</SelectItem>
                    <SelectItem value="50">50 related</SelectItem>
                    <SelectItem value="100">100 related</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-48">
                <Label className="text-sm font-medium mb-1.5 block">Country</Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44">
                <Label className="text-sm font-medium mb-1.5 block">Data Source</Label>
                <Select value={dataSource} onValueChange={(v) => setDataSource(v as "gkp" | "cli")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cli">GKP + Clickstream</SelectItem>
                    <SelectItem value="gkp">Google KP Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={searchMutation.isPending || !keyword.trim()}
                  className="h-9"
                >
                  {searchMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Search
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Section */}
      {searchMutation.isPending && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Searching for keywords and fetching metrics...</p>
          </CardContent>
        </Card>
      )}

      {searchResults && !searchMutation.isPending && (
        <Card>
          <CardContent className="pt-6">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">Results</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredResults.length} of {searchResults.results.length} keywords
                  {hiddenCount > 0 && (
                    <span className="text-amber-600 font-medium"> ({hiddenCount} hidden by filters)</span>
                  )}
                  {" · "}
                  1 seed + {searchResults.results.filter(r => r.type === "related").length} related
                  {" · "}
                  {searchResults.creditsConsumed} credits used
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-1.5" />
                  Export CSV
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4 py-3 px-4 mb-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                <Filter className="w-3.5 h-3.5" />
                FILTERS
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={hideDeclinig}
                  onCheckedChange={(checked) => setHideDeclining(!!checked)}
                />
                <span className="text-sm">Hide declining trend</span>
              </label>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Min volume</span>
                <Select value={minVolume} onValueChange={setMinVolume}>
                  <SelectTrigger className="w-24 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Any</SelectItem>
                    <SelectItem value="10">10+</SelectItem>
                    <SelectItem value="50">50+</SelectItem>
                    <SelectItem value="100">100+</SelectItem>
                    <SelectItem value="500">500+</SelectItem>
                    <SelectItem value="1000">1,000+</SelectItem>
                    <SelectItem value="5000">5,000+</SelectItem>
                    <SelectItem value="10000">10,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <button
                onClick={resetFilters}
                className="ml-auto text-sm text-primary hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset filters
              </button>
            </div>

            {/* Results Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 pr-3 w-10">
                      <Checkbox
                        checked={selectedKeywords.size === filteredResults.length && filteredResults.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Keyword</th>
                    <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      <span className="inline-flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Volume
                        <ChevronDown className="w-3 h-3" />
                      </span>
                    </th>
                    <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider text-right">$ CPC</th>
                    <th className="pb-3 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <span className="inline-flex items-center gap-1">
                        <ChevronDown className="w-3 h-3 rotate-90" /> Competition
                      </span>
                    </th>
                    <th className="pb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted-foreground">
                        No keywords match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredResults.map((result) => (
                      <tr key={result.keyword} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="py-4 pr-3">
                          <Checkbox
                            checked={selectedKeywords.has(result.keyword)}
                            onCheckedChange={() => toggleSelect(result.keyword)}
                          />
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{result.keyword}</span>
                            <TrendBadge direction={result.trendDirection} />
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <span className={`text-sm font-medium ${result.type === "seed" ? "text-primary" : "text-muted-foreground"}`}>
                            {result.type === "seed" ? "Seed" : "Related"}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <span className="font-semibold text-sm">{formatVolume(result.volume)}</span>
                          <span className="text-xs text-muted-foreground ml-0.5">/mo</span>
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <span className="text-sm">{result.cpcCurrency}{result.cpc.toFixed(2)}</span>
                        </td>
                        <td className="py-4 pr-4">
                          <CompetitionBadge label={result.competitionLabel} />
                        </td>
                        <td className="py-4">
                          <TrendSparkline data={result.trendData} direction={result.trendDirection} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!searchResults && !searchMutation.isPending && (
        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Search className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Enter a keyword to get started</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Search for any keyword to discover related terms with volume, CPC, competition, and trend data from Keywords Everywhere.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Sub-components ----

function TrendBadge({ direction }: { direction: "rising" | "declining" | "stable" }) {
  if (direction === "rising") {
    return (
      <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 bg-emerald-50 text-emerald-700 border-emerald-200 gap-0.5">
        <TrendingUp className="w-3 h-3" />
        Rising
      </Badge>
    );
  }
  if (direction === "declining") {
    return (
      <Badge variant="outline" className="text-[11px] px-1.5 py-0 h-5 bg-orange-50 text-orange-700 border-orange-200 gap-0.5">
        <TrendingDown className="w-3 h-3" />
        Declining
      </Badge>
    );
  }
  return null; // Don't show badge for stable
}

function CompetitionBadge({ label }: { label: "Low" | "Medium" | "High" }) {
  const colors = {
    Low: "text-emerald-600",
    Medium: "text-amber-600",
    High: "text-red-600",
  };
  return <span className={`text-sm font-medium ${colors[label]}`}>{label}</span>;
}
