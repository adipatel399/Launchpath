import { isIP } from "node:net";
import { safeFetch, textOf, parsePublicURL, isPublicIP } from "./safe-fetch";

/** Remove navigation preceding the first document heading in extracted Markdown. */
export function cleanExtractedText(raw: string) {
  const heading = raw.search(/^#\s+\S/m);
  return (heading >= 0 ? raw.slice(heading) : raw).trim().slice(0, 22000);
}

export function evidenceExcerpt(text: string) {
  const plain = text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 700);
}

export async function retrieveResearchPage(
  item: { url: string; raw_content?: string | null },
  signal: AbortSignal,
  fetchPage: typeof safeFetch = safeFetch,
) {
  const target = parsePublicURL(item.url);
  const host = target.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicIP(host))
    throw Error("Private or reserved target");
  try {
    const page = await fetchPage(item.url, 600000, signal);
    if (page.status >= 400) throw Error(`HTTP ${page.status}`);
    const text = textOf(page.html);
    if (text.length < 160)
      throw Error("Page has insufficient readable content");
    return { text, url: page.url, retrieval: "direct" as const };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Unavailable";
    // Extraction must never turn a rejected private-network target into an allowed one.
    if (/private|reserved|credentials|custom port/i.test(reason)) throw error;
    if (!item.raw_content || item.raw_content.trim().length < 160) throw error;
    const text = cleanExtractedText(item.raw_content);
    if (text.length < 160) throw error;
    return {
      text,
      url: item.url,
      retrieval: "search-extraction" as const,
      reason,
    };
  }
}
