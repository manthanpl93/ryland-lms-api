import axios from "axios";
import * as cheerio from "cheerio";
import { parse as parseUrl } from "url";

export interface LinkPreviewData {
  title: string;
  description: string;
  image?: string;
  siteName?: string;
  url: string;
}

/**
 * Validates and normalizes a URL
 * @param url - URL to validate
 * @returns Normalized URL or null if invalid
 */
function validateAndNormalizeUrl(url: string): string | null {
  try {
    // Add protocol if missing
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const parsed = parseUrl(url);
    
    // Check for required components
    if (!parsed.protocol || !parsed.hostname) {
      return null;
    }

    // Reconstruct URL to ensure it's valid
    return url;
  } catch (error) {
    return null;
  }
}

/**
 * Extracts Open Graph tags from HTML
 * @param $ - Cheerio instance
 * @returns Partial link preview data from OG tags
 */
function extractOpenGraphData($: cheerio.CheerioAPI): Partial<LinkPreviewData> {
  const data: Partial<LinkPreviewData> = {};

  // Extract Open Graph tags
  const ogTitle = $("meta[property=\"og:title\"]").attr("content");
  const ogDescription = $("meta[property=\"og:description\"]").attr("content");
  const ogImage = $("meta[property=\"og:image\"]").attr("content");
  const ogSiteName = $("meta[property=\"og:site_name\"]").attr("content");

  if (ogTitle) data.title = ogTitle;
  if (ogDescription) data.description = ogDescription;
  if (ogImage) data.image = ogImage;
  if (ogSiteName) data.siteName = ogSiteName;

  return data;
}

/**
 * Extracts metadata from standard HTML meta tags
 * @param $ - Cheerio instance
 * @returns Partial link preview data from meta tags
 */
function extractMetaData($: cheerio.CheerioAPI): Partial<LinkPreviewData> {
  const data: Partial<LinkPreviewData> = {};

  // Try standard meta tags
  const metaDescription = $("meta[name=\"description\"]").attr("content");
  const metaTitle = $("meta[name=\"title\"]").attr("content");

  // Try Twitter Card tags as fallback
  const twitterTitle = $("meta[name=\"twitter:title\"]").attr("content");
  const twitterDescription = $("meta[name=\"twitter:description\"]").attr("content");
  const twitterImage = $("meta[name=\"twitter:image\"]").attr("content");

  if (metaTitle) data.title = metaTitle;
  if (metaDescription) data.description = metaDescription;
  
  // Use Twitter tags if standard tags not found
  if (!data.title && twitterTitle) data.title = twitterTitle;
  if (!data.description && twitterDescription) data.description = twitterDescription;
  if (twitterImage) data.image = twitterImage;

  return data;
}

/**
 * Fetches and extracts preview data from a URL
 * @param url - URL to fetch preview for
 * @param timeout - Timeout in milliseconds (default: 5000)
 * @returns Link preview data
 * @throws Error if fetch fails or URL is invalid
 */
export async function fetchLinkPreview(
  url: string,
  timeout: number = 5000
): Promise<LinkPreviewData> {
  // Validate and normalize URL
  const normalizedUrl = validateAndNormalizeUrl(url);
  if (!normalizedUrl) {
    throw new Error("Invalid URL format");
  }

  try {
    // Fetch HTML with timeout
    const response = await axios.get(normalizedUrl, {
      timeout,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RylandLMS/1.0; +http://ryland-lms.com)",
      },
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Parse HTML
    const $ = cheerio.load(response.data);

    // Extract Open Graph data first (most reliable)
    const ogData = extractOpenGraphData($);

    // Extract meta data as fallback
    const metaData = extractMetaData($);

    // Get title from <title> tag if not found in meta
    const pageTitle = $("title").text()?.trim();

    // Combine data with priority: OG > Meta > HTML
    const previewData: LinkPreviewData = {
      url: normalizedUrl,
      title: ogData.title || metaData.title || pageTitle || "No title",
      description: ogData.description || metaData.description || "",
      image: ogData.image || metaData.image,
      siteName: ogData.siteName,
    };

    // Trim description if too long
    if (previewData.description.length > 300) {
      previewData.description = previewData.description.substring(0, 297) + "...";
    }

    return previewData;
  } catch (error: any) {
    // Handle specific error types
    if (error.code === "ENOTFOUND") {
      throw new Error("URL not found or unreachable");
    } else if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
      throw new Error("Request timeout - URL took too long to respond");
    } else if (error.response?.status) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    } else {
      throw new Error(`Failed to fetch preview: ${error.message || "Unknown error"}`);
    }
  }
}

/**
 * Extracts URLs from text content
 * @param text - Text to extract URLs from
 * @returns Array of found URLs
 */
export function extractUrlsFromText(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  return matches || [];
}

/**
 * Checks if a URL is valid for preview fetching
 * @param url - URL to check
 * @returns True if URL is valid
 */
export function isValidPreviewUrl(url: string): boolean {
  const normalized = validateAndNormalizeUrl(url);
  return normalized !== null;
}
