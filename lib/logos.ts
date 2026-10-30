type Logo = {
  body: Uint8Array;
  type: string;
  source: "catalog" | "favicon" | "unavailable";
};
const cache = new Map<string, { expires: number; promise: Promise<Logo> }>();
const unavailable = new TextEncoder().encode(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g fill="none" stroke="#84908c" stroke-width="1.5"><circle cx="16" cy="16" r="11"/><ellipse cx="16" cy="16" rx="5" ry="11"/><path d="M5 16h22M8 9h16M8 23h16"/></g></svg>',
);
/** Fixed trusted image services only: user input never becomes a fetched hostname. */
export async function resolveLogo(
  name: string,
  domain: string,
  fetcher: typeof fetch = fetch,
): Promise<Logo> {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 80);
  const candidates = [
    {
      url: "https://logos.composio.dev/api/" + slug,
      source: "catalog" as const,
    },
    {
      url:
        "https://www.google.com/s2/favicons?sz=128&domain=" +
        encodeURIComponent(domain),
      source: "favicon" as const,
    },
  ];
  for (const candidate of candidates) {
    try {
      let url = new URL(candidate.url);
      let response: Response | undefined;
      for (let redirects = 0; redirects < 4; redirects++) {
        response = await fetcher(url.href, {
          signal: AbortSignal.timeout(5000),
          redirect: "manual",
        });
        if (response.status < 300 || response.status >= 400) break;
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw Error("Missing logo redirect");
        const next = new URL(location, url);
        const trusted = [
          "logos.composio.dev",
          "google.com",
          "gstatic.com",
          "googleusercontent.com",
        ];
        if (
          next.protocol !== "https:" ||
          next.username ||
          next.password ||
          next.port ||
          !trusted.some(
            (host) =>
              next.hostname === host || next.hostname.endsWith("." + host),
          )
        )
          throw Error("Untrusted logo redirect");
        url = next;
      }
      if (!response) continue;
      const type = response.headers.get("content-type")?.split(";")[0] || "";
      if (
        !response.ok ||
        !/^image\/(svg\+xml|png|jpeg|webp|x-icon|vnd.microsoft.icon)$/.test(
          type,
        )
      )
        continue;
      const reader = response.body?.getReader();
      if (!reader) continue;
      const chunks: Uint8Array[] = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 500_000) {
          await reader.cancel();
          throw Error("Oversized logo");
        }
        chunks.push(value);
      }
      if (size)
        return {
          body: new Uint8Array(Buffer.concat(chunks)),
          type,
          source: candidate.source,
        };
    } catch {
      /* The next source is a real provider favicon; never fabricate a brand mark. */
    }
  }
  return { body: unavailable, type: "image/svg+xml", source: "unavailable" };
}
export function cachedLogo(name: string, domain: string) {
  const key = name + ":" + domain;
  const current = cache.get(key);
  if (current && current.expires > Date.now()) return current.promise;
  if (cache.size >= 200) cache.delete(cache.keys().next().value!);
  const promise = resolveLogo(name, domain);
  cache.set(key, { expires: Date.now() + 3600_000, promise });
  return promise;
}
