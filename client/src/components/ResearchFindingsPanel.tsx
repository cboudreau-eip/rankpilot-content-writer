import { useState } from "react";
import { Search, ChevronDown } from "lucide-react";
import type { ResearchFindings } from "@shared/research-types";

export function ResearchFindingsPanel({ findings }: { findings: ResearchFindings }) {
  const [isOpen, setIsOpen] = useState(true);
  const itemCount =
    (findings.statistics?.length || 0) +
    (findings.authoritativeSources?.length || 0) +
    (findings.experts?.length || 0) +
    (findings.commonQuestions?.length || 0);

  return (
    <div className="bg-card rounded-xl border border-indigo-200 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-indigo-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-indigo-500" />
          <span className="text-sm font-semibold text-foreground">Research Findings</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
            {itemCount} items
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 space-y-4">
          {findings.statistics?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Statistics & Data Points</h4>
              <div className="space-y-1.5">
                {findings.statistics.map((stat, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-indigo-400 font-mono text-xs mt-0.5">{i + 1}.</span>
                    <div>
                      <span className="font-medium text-foreground">{stat.value}</span>
                      <span> — {stat.fact}</span>
                      <span className="text-xs text-muted-foreground"> ({stat.source}{stat.year ? `, ${stat.year}` : ''})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {findings.authoritativeSources?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-2">Authoritative Sources</h4>
              <div className="flex flex-wrap gap-2">
                {findings.authoritativeSources.map((source, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {source.name}
                    <span className="text-emerald-500">({source.type})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {findings.experts?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-purple-600 uppercase tracking-wide mb-2">Experts & Thought Leaders</h4>
              <div className="space-y-1.5">
                {findings.experts.map((expert, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-foreground">{expert.name}</span>
                    <span className="text-muted-foreground"> — {expert.credentials}</span>
                    {expert.notableQuote && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 ml-4">"{expert.notableQuote}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {findings.commonQuestions?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Common Questions (People Also Ask)</h4>
              <div className="space-y-1">
                {findings.commonQuestions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-amber-400">?</span>
                    <span className="text-foreground">{q.question}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">{q.intent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {findings.competitorAngles?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-2">Competitor Angles</h4>
              <div className="space-y-1.5">
                {findings.competitorAngles.map((angle, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-foreground">{angle.angle}</span>
                    <span className="text-muted-foreground"> — {angle.description}</span>
                    {angle.differentiator && (
                      <span className="text-xs text-rose-600 ml-1">→ {angle.differentiator}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {findings.keyTakeaways?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Key Takeaways</h4>
              <ul className="space-y-1">
                {findings.keyTakeaways.map((takeaway, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    {takeaway}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
