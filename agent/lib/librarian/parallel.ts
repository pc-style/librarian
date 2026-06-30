interface ParallelRequestOptions {
  endpoint: "/v1/search" | "/v1/extract";
  body: Record<string, unknown>;
}

export async function parallelRequest({ endpoint, body }: ParallelRequestOptions) {
  const apiKey = process.env.PARALLEL_API_KEY;

  if (!apiKey) {
    throw new Error("PARALLEL_API_KEY is required for web search and page extraction.");
  }

  const response = await fetch(`https://api.parallel.ai${endpoint}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Parallel API request failed (${response.status}): ${detail}`);
  }

  return payload;
}
