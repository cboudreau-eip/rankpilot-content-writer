/**
 * Entity + Salience Analysis prompt — 6-step framework.
 * Adapted from the standalone Entity/Salience Analyzer.
 */
export function getEntityAnalysisPrompt(content: string, primaryKeyword?: string): string {
  const keywordInstruction = primaryKeyword
    ? `
TARGET PRIMARY KEYWORD: "${primaryKeyword}"

IMPORTANT: The user has specified "${primaryKeyword}" as their intended primary entity/keyword. Your analysis should:
1. Evaluate how well the content establishes "${primaryKeyword}" as the primary entity
2. Score "Primary Entity Clarity" based on how effectively "${primaryKeyword}" is positioned as the dominant entity (NOT based on what you think the primary entity should be)
3. Still identify and list all other entities found in the content
4. Assess whether "${primaryKeyword}" has sufficient dominance, early reinforcement, and structural support
5. If "${primaryKeyword}" is NOT well-established as the primary entity, your recommendations should focus on how to better establish it

In the output, set the primaryEntity.name to "${primaryKeyword}" and evaluate the content against this target keyword.
`
    : `
Determine the PRIMARY ENTITY (central to thesis, appears early, structurally reinforced, discussed in most sections)
Justify why this entity is primary
`;

  return `You are an expert SEO analyst specializing in entity-based optimization and content structure analysis. Analyze the following article content using the comprehensive 6-step Entity + Salience framework.

ARTICLE CONTENT:
---
${content}
---
${keywordInstruction}
Perform the complete analysis following these steps:

STEP 1: ENTITY EXTRACTION
- Identify ALL meaningful entities: Organizations, Products, Government programs, Locations, Named concepts, Plan types/coverage types
- For each entity determine: Entity name, Entity type, Estimated prominence (High/Medium/Low), Rationale for prominence level${!primaryKeyword ? "\n- Determine the PRIMARY ENTITY (central to thesis, appears early, structurally reinforced, discussed in most sections)\n- Justify why this entity is primary" : ""}

STEP 2: SALIENCE STRUCTURE ANALYSIS
Evaluate:
A) Dominance Gap - Grade: Strong dominance / Moderate dominance / Split focus / Competing entities
B) Early Reinforcement - Check: in first paragraph, in heading, within first 120 words
C) Entity Drift - Label: No drift / Minor drift / Moderate drift / Severe dilution

STEP 3: SUPPORTING ENTITY COVERAGE
Evaluate if related sub-entities, expected comparisons, key structural components are covered
Grade: Comprehensive / Adequate / Thin / Incomplete

STEP 4: GEO / AI OVERVIEW EXTRACTABILITY
Evaluate: concise definitions, clear question answering, short answer summary, clean headings, AI extractability
Grade: High / Moderate / Low

STEP 5: SCORING (0-100 for each):
- Primary Entity Clarity (0-40: unclear, 40-70: clear but diluted, 70-90: clear and reinforced, 90-100: dominant)
- Entity Focus (0-40: major drift, 40-70: some dilution, 70-90: strong focus, 90-100: extremely tight)
- Supporting Entity Coverage (0-40: missing core, 40-70: partial, 70-90: solid, 90-100: comprehensive)
- GEO Extractability (0-40: poorly structured, 40-70: some signals, 70-90: clear structure, 90-100: highly citation-ready)
- Calculate Overall Score = (Primary Clarity * 0.3) + (Entity Focus * 0.3) + (Supporting Coverage * 0.2) + (GEO Extractability * 0.2)

STEP 6: ACTIONABLE FIXES
Provide exactly 5 specific, actionable fixes tied directly to entity and salience structure improvements.

ADVANCED ANALYSIS:
- If the current primary entity is too broad, suggest a refined primary entity framing
- Provide a suggested title rewrite aligned to the dominant entity
- Identify 3 missing supporting entities that should be added

Respond with raw JSON only in this exact structure:
{
  "primaryEntity": {
    "name": "Primary entity name",
    "type": "Entity type",
    "justification": "Detailed justification for why this is the primary entity"
  },
  "entities": [
    {
      "name": "Entity name",
      "type": "Organization|Product|Location|Concept|Program|Person|etc",
      "prominence": "High|Medium|Low",
      "rationale": "Why this prominence level"
    }
  ],
  "salienceStructure": {
    "dominanceGap": {
      "grade": "Strong dominance|Moderate dominance|Split focus|Competing entities",
      "description": "Explanation of dominance analysis"
    },
    "earlyReinforcement": {
      "inFirstParagraph": true,
      "inHeading": true,
      "withinFirst120Words": true,
      "summary": "Summary of early reinforcement analysis"
    },
    "entityDrift": {
      "level": "No drift|Minor drift|Moderate drift|Severe dilution",
      "description": "Explanation of any drift detected"
    }
  },
  "supportingCoverage": {
    "grade": "Comprehensive|Adequate|Thin|Incomplete",
    "relatedSubEntities": ["list of related sub-entities found"],
    "missingComponents": ["list of expected but missing components"],
    "evaluation": "Detailed evaluation"
  },
  "geoExtractability": {
    "grade": "High|Moderate|Low",
    "hasConcisenDefinitions": true,
    "hasClearQuestionAnswering": true,
    "hasShortAnswerSummary": true,
    "hasCleanHeadings": true,
    "evaluation": "Detailed evaluation of AI extractability"
  },
  "scores": {
    "primaryEntityClarity": 75,
    "entityFocus": 80,
    "supportingCoverage": 70,
    "geoExtractability": 65,
    "overallScore": 73.5
  },
  "actionableFixes": [
    "Fix 1 - specific actionable recommendation",
    "Fix 2 - specific actionable recommendation",
    "Fix 3 - specific actionable recommendation",
    "Fix 4 - specific actionable recommendation",
    "Fix 5 - specific actionable recommendation"
  ],
  "advancedRecommendations": {
    "refinedPrimaryEntity": "Suggested refined primary entity if current is too broad, or same if adequate",
    "refinedEntityRationale": "Explanation of the refinement",
    "suggestedTitleRewrite": "New title aligned to dominant entity",
    "missingSupportingEntities": ["Entity 1", "Entity 2", "Entity 3"]
  }
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;
}

/**
 * Semantic Analysis prompt — 4-layer framework.
 * Adapted from the standalone Entity/Salience Analyzer.
 */
export function getSemanticAnalysisPrompt(content: string, targetKeyword: string): string {
  return `You are an expert SEO semantic content analyst. Analyze the following article content for semantic quality against the target keyword/topic.

TARGET KEYWORD/TOPIC: "${targetKeyword}"

ARTICLE CONTENT:
---
${content}
---

Perform the following semantic analysis:

## LAYER 1: RELEVANCE ANALYSIS
Measure how semantically close the content is to the target keyword/topic.
- Evaluate the intro/first paragraph alignment to the target keyword
- Evaluate the H2/H3 headings alignment to the target keyword
- Evaluate the full body content alignment
- Score each area 0-100
- Provide an overall relevance score 0-100
- A page can be topically related but not tightly aligned -- your score should reflect that

## LAYER 2: SECTION-LEVEL ANALYSIS
For each identifiable H2 or H3 section in the content:
- Identify the heading and its level (H2/H3)
- Score its relevance to the target keyword (0-100)
- Explain why this score
- Identify which OTHER sections it semantically overlaps with (if any)
- Rate overlap severity: None / Low / Moderate / High
- Describe what unique value this section provides

If two or more sections land in the same semantic neighborhood (meaning they essentially say the same thing or cover the same ground), that indicates redundancy/fluff.

## LAYER 3: REDUNDANCY ANALYSIS
Measure how much repeated meaning exists across sections.
- Identify specific pairs of sections that have high semantic overlap
- For each pair, explain what they share and rate similarity: High / Moderate / Low
- Calculate a uniqueness score (0-100, where 100 = every section is distinct)
- Calculate a redundancy score (0-100, where 100 = extreme redundancy, 0 = no redundancy)
- Provide an overall assessment

## LAYER 4: TOPIC COVERAGE ANALYSIS
Measure whether the content covers the expected concept space for the target keyword.
- List what a comprehensive page on this topic SHOULD cover (expected topics/subtopics)
- List which of those topics ARE covered in the content
- List which topics are MISSING
- Score coverage 0-100
- Provide evaluation explaining gaps

## SCORING
- Relevance Score: 0-100
- Coverage Score: 0-100
- Uniqueness Score: 0-100 (inverse of redundancy)
- Overall Semantic Score = (Relevance x 0.40) + (Coverage x 0.35) + (Uniqueness x 0.25)

## SEMANTIC FIXES
Provide exactly 5 specific, actionable fixes tied directly to semantic relevance, redundancy, and coverage.
Do not provide generic SEO advice.
Every recommendation should reference a specific section, gap, or overlap you identified.

Respond with raw JSON only in this exact structure:
{
  "targetKeyword": "${targetKeyword}",
  "relevance": {
    "score": 75,
    "introRelevance": 80,
    "headingsRelevance": 70,
    "bodyRelevance": 75,
    "evaluation": "Detailed evaluation of semantic relevance to target keyword"
  },
  "redundancy": {
    "score": 20,
    "redundantPairs": [
      {
        "sectionA": "Heading of first section",
        "sectionB": "Heading of second section",
        "similarity": "High|Moderate|Low",
        "explanation": "What they share semantically"
      }
    ],
    "overallAssessment": "Summary of redundancy findings",
    "uniquenessScore": 80
  },
  "coverage": {
    "score": 70,
    "coveredTopics": ["topic1", "topic2"],
    "missingTopics": ["topic1", "topic2"],
    "expectedTopics": ["topic1", "topic2"],
    "evaluation": "Detailed evaluation of topic coverage"
  },
  "sections": [
    {
      "heading": "Section heading text",
      "headingLevel": "H2|H3",
      "relevanceScore": 80,
      "relevanceExplanation": "Why this relevance score",
      "overlapsWith": ["Other section heading if overlaps"],
      "overlapSeverity": "None|Low|Moderate|High",
      "uniqueValue": "What unique value this section provides"
    }
  ],
  "scores": {
    "relevance": 75,
    "coverage": 70,
    "uniqueness": 80,
    "overallSemantic": 74.5
  },
  "semanticFixes": [
    "Fix 1 - specific actionable recommendation referencing a specific section or gap",
    "Fix 2",
    "Fix 3",
    "Fix 4",
    "Fix 5"
  ]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;
}
