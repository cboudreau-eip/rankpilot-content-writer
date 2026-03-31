/** Research findings produced by the LLM topic research step */
export interface ResearchFindings {
  topic: string;
  researchedAt: string;
  statistics: Array<{
    fact: string;
    value: string;
    source: string;
    sourceUrl?: string;
    year?: string;
  }>;
  authoritativeSources: Array<{
    name: string;
    url: string;
    type: string; // e.g. "government", "academic", "industry", "research", "news"
    description: string;
  }>;
  experts: Array<{
    name: string;
    credentials: string;
    organization?: string;
    notableQuote?: string;
  }>;
  commonQuestions: Array<{
    question: string;
    intent: string; // e.g. "informational", "transactional", "navigational"
    searchVolume?: string; // e.g. "high", "medium", "low"
  }>;
  competitorAngles: Array<{
    angle: string;
    description: string;
    differentiator?: string;
  }>;
  keyTakeaways: string[];
}
