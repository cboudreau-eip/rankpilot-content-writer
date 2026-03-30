// ---- Entity + Salience Analysis Types ----

export interface EntityItem {
  name: string;
  type: string;
  prominence: "High" | "Medium" | "Low";
  rationale: string;
}

export interface SalienceStructure {
  dominanceGap: {
    grade: "Strong dominance" | "Moderate dominance" | "Split focus" | "Competing entities";
    description: string;
  };
  earlyReinforcement: {
    inFirstParagraph: boolean;
    inHeading: boolean;
    withinFirst120Words: boolean;
    summary: string;
  };
  entityDrift: {
    level: "No drift" | "Minor drift" | "Moderate drift" | "Severe dilution";
    description: string;
  };
}

export interface SupportingCoverage {
  grade: "Comprehensive" | "Adequate" | "Thin" | "Incomplete";
  relatedSubEntities: string[];
  missingComponents: string[];
  evaluation: string;
}

export interface GeoExtractability {
  grade: "High" | "Moderate" | "Low";
  hasConcisenDefinitions: boolean;
  hasClearQuestionAnswering: boolean;
  hasShortAnswerSummary: boolean;
  hasCleanHeadings: boolean;
  evaluation: string;
}

export interface EntityScores {
  primaryEntityClarity: number;
  entityFocus: number;
  supportingCoverage: number;
  geoExtractability: number;
  overallScore: number;
}

export interface AdvancedRecommendations {
  refinedPrimaryEntity: string;
  refinedEntityRationale: string;
  suggestedTitleRewrite: string;
  missingSupportingEntities: string[];
}

export interface EntityAnalysisResult {
  primaryEntity: {
    name: string;
    type: string;
    justification: string;
  };
  entities: EntityItem[];
  salienceStructure: SalienceStructure;
  supportingCoverage: SupportingCoverage;
  geoExtractability: GeoExtractability;
  scores: EntityScores;
  actionableFixes: string[];
  advancedRecommendations: AdvancedRecommendations;
}

// ---- Semantic Analysis Types ----

export interface SectionAnalysis {
  heading: string;
  headingLevel: string;
  relevanceScore: number;
  relevanceExplanation: string;
  overlapsWith: string[];
  overlapSeverity: "None" | "Low" | "Moderate" | "High";
  uniqueValue: string;
}

export interface SemanticRelevance {
  score: number;
  introRelevance: number;
  headingsRelevance: number;
  bodyRelevance: number;
  evaluation: string;
}

export interface SemanticRedundancy {
  score: number;
  redundantPairs: Array<{
    sectionA: string;
    sectionB: string;
    similarity: "High" | "Moderate" | "Low";
    explanation: string;
  }>;
  overallAssessment: string;
  uniquenessScore: number;
}

export interface SemanticCoverage {
  score: number;
  coveredTopics: string[];
  missingTopics: string[];
  expectedTopics: string[];
  evaluation: string;
}

export interface SemanticScores {
  relevance: number;
  coverage: number;
  uniqueness: number;
  overallSemantic: number;
}

export interface SemanticAnalysisResult {
  targetKeyword: string;
  relevance: SemanticRelevance;
  redundancy: SemanticRedundancy;
  coverage: SemanticCoverage;
  sections: SectionAnalysis[];
  scores: SemanticScores;
  semanticFixes: string[];
}
