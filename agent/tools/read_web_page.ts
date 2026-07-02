import { isIP } from "node:net";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { parallelRequest } from "../lib/librarian/parallel.js";

function isPublicInternetUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;

  const host = parsed.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return false;
  if (isPrivateOrSpecialIp(host)) return false;

  return true;
}

function isPrivateOrSpecialIp(host: string) {
  const normalized = host.replace(/^\[|\]$/g, "");
  const ipVersion = isIP(normalized);
  if (ipVersion === 0) return false;

  if (ipVersion === 4) {
    return isPrivateOrSpecialIpv4(normalized);
  }

  const compact = normalized.toLowerCase();
  const ipv4Mapped = compact.match(/^::ffff:(?<ipv4>\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4Mapped?.groups?.ipv4) return isPrivateOrSpecialIpv4(ipv4Mapped.groups.ipv4);
  if (compact.startsWith("::ffff:")) return true;

  const firstHextet = Number.parseInt(compact.split(":", 1)[0] || "0", 16);
  return (
    compact === "::" ||
    compact === "::1" ||
    compact.startsWith("2001:db8:") ||
    compact.startsWith("2001:2:") ||
    (firstHextet & 0xfe00) === 0xfc00 ||
    (firstHextet & 0xffc0) === 0xfe80 ||
    (firstHextet & 0xff00) === 0xff00
  );
}

function isPrivateOrSpecialIpv4(ip: string) {
  const [first, second, third] = ip.split(".").map(Number);

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && (second === 0 || second === 168)) ||
    (first === 198 && (second === 18 || second === 19 || (second === 51 && third === 100))) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

export default defineTool({
  description:
    "Read the contents of a public web page at a URL using Parallel Extract. Not intended for localhost or non-Internet-accessible URLs.",
  inputSchema: z.object({
    url: z.string().url().describe("Public URL to fetch."),
    objective: z.string().optional().describe("Natural-language description of what to find on the page."),
    searchQueries: z.array(z.string().min(1)).optional().describe("Short keyword queries used with the objective to focus excerpts."),
    fullContent: z
      .boolean()
      .default(false)
      .describe(
        "Return full markdown content when true; otherwise return focused excerpts. With only url, returns the page converted to Markdown.",
      ),
    forceRefetch: z.boolean().default(false).describe("Request a fresh fetch where supported. Parallel may still apply its own fetch policy."),
  }),
  async execute({ url, objective, searchQueries, fullContent, forceRefetch }) {
    if (!isPublicInternetUrl(url)) {
      throw new Error("read_web_page is for public Internet URLs only. Localhost and private hosts are not supported.");
    }

    const payload = await parallelRequest({
      endpoint: "/v1/extract",
      body: {
        urls: [url],
        objective,
        search_queries: searchQueries,
        max_chars_total: fullContent ? 80_000 : 16_000,
        advanced_settings: {
          excerpt_settings: {
            max_chars_per_result: fullContent ? 16_000 : 8_000,
          },
          full_content: fullContent ? { max_chars_per_result: 80_000 } : false,
          fetch_policy: forceRefetch ? { max_age_seconds: 600, disable_cache_fallback: false } : undefined,
        },
      },
    });

    const response = payload as {
      extract_id?: string;
      session_id?: string;
      results?: Array<{
        url?: string;
        title?: string;
        publish_date?: string | null;
        excerpts?: string[];
        full_content?: string | null;
      }>;
      errors?: Array<{
        url?: string;
        error_type?: string;
        http_status_code?: number;
        content?: string;
      }>;
      warnings?: unknown;
      usage?: unknown;
    };

    return {
      extractId: response.extract_id,
      sessionId: response.session_id,
      results: (response.results ?? []).map((result) => ({
        url: result.url,
        title: result.title,
        publishDate: result.publish_date,
        excerpts: result.excerpts ?? [],
        fullContent: result.full_content,
      })),
      errors: response.errors ?? [],
      warnings: response.warnings,
      usage: response.usage,
    };
  },
});
