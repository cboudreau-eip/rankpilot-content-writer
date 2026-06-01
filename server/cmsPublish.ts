/**
 * CMS Publish Helper
 * Publishes articles to the MedicareFAQ CMS via its GitHub Editor API.
 * 
 * API: POST https://medicarefaq-next-nine.vercel.app/api/cms/create/
 * Auth: x-cms-password header
 */

import { ENV } from "./_core/env";

const CMS_API_URL = "https://medicarefaq-next-nine.vercel.app/api/cms/create/";

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
 * Publish an article to the MedicareFAQ CMS.
 * Returns the commit result or throws on failure.
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

  // Add optional fields if provided
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.category) body.category = input.category;
  if (input.image) {
    body.image = input.image;
    body.ogImage = input.image;
  }
  if (input.imageAlt) body.imageAlt = input.imageAlt;

  const response = await fetch(CMS_API_URL, {
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
