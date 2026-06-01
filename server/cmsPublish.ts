/**
 * CMS Publish Helper
 * Saves articles as drafts in the MedicareFAQ CMS via its GitHub Editor API.
 * 
 * Draft API: PUT https://medicarefaq-next-nine.vercel.app/api/cms/drafts
 * Publish API: POST https://medicarefaq-next-nine.vercel.app/api/cms/create/
 * Auth: x-cms-password header
 */

import { ENV } from "./_core/env";

const CMS_BASE_URL = "https://medicarefaq-next-nine.vercel.app";
const CMS_DRAFTS_URL = `${CMS_BASE_URL}/api/cms/drafts`;
const CMS_CREATE_URL = `${CMS_BASE_URL}/api/cms/create/`;

export interface CmsDraftInput {
  title: string;
  slug: string;
  rawContent: string; // HTML body
  excerpt?: string;
  category?: string;
  author?: string;
  reviewer?: string;
  image?: string;
  imageAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  keyTakeaways?: string[];
}

export interface CmsDraftResult {
  id: string;
  updatedAt: string;
  slug: string;
}

export interface CmsPublishInput {
  title: string;
  slug: string;
  content: string; // HTML body
  excerpt?: string;
  category?: string;
  image?: string;
  imageAlt?: string;
}

export interface CmsPublishResult {
  committed: boolean;
  commitSha: string;
  slug: string;
  url: string;
  message: string;
}

/**
 * Generate a URL-safe slug from a title.
 * e.g. "Medicare Part D Plans" → "medicare-part-d-plans"
 */
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special chars
    .replace(/\s+/g, "-") // spaces to hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, ""); // trim leading/trailing hyphens
}

/**
 * Save an article as a draft in the MedicareFAQ CMS.
 * The article can then be reviewed and published from the CMS editor.
 * Returns the draft ID and timestamp.
 */
export async function saveDraftToCms(input: CmsDraftInput): Promise<CmsDraftResult> {
  const password = ENV.cmsPassword;
  if (!password) {
    throw new Error("CMS_PASSWORD environment variable is not set");
  }

  const body: Record<string, any> = {
    title: input.title,
    slug: input.slug,
    rawContent: input.rawContent,
  };

  // Add optional fields
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.category) body.category = input.category;
  if (input.author) body.author = input.author;
  if (input.reviewer) body.reviewer = input.reviewer;
  if (input.image) body.image = input.image;
  if (input.imageAlt) body.imageAlt = input.imageAlt;
  if (input.seoTitle) body.seoTitle = input.seoTitle;
  if (input.seoDescription) body.seoDescription = input.seoDescription;
  if (input.keyTakeaways && input.keyTakeaways.length > 0) body.keyTakeaways = input.keyTakeaways;

  const response = await fetch(CMS_DRAFTS_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-cms-password": password,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `CMS draft save failed with status ${response.status}`);
  }

  return {
    id: data.id,
    updatedAt: data.updatedAt,
    slug: input.slug,
  };
}

/**
 * Publish an article directly to the MedicareFAQ CMS (commits to GitHub, goes live).
 * Use saveDraftToCms() instead if you want to review before publishing.
 */
export async function publishToCms(input: CmsPublishInput): Promise<CmsPublishResult> {
  const password = ENV.cmsPassword;
  if (!password) {
    throw new Error("CMS_PASSWORD environment variable is not set");
  }

  const body: Record<string, any> = {
    title: input.title,
    slug: input.slug,
    content: input.content,
  };

  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.category) body.category = input.category;
  if (input.image) {
    body.image = input.image;
    body.ogImage = input.image;
  }
  if (input.imageAlt) body.imageAlt = input.imageAlt;

  const response = await fetch(CMS_CREATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cms-password": password,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `CMS publish failed with status ${response.status}`);
  }

  return data as CmsPublishResult;
}
