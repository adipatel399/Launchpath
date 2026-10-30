import { lookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";
import { Agent, fetch as fetchPinned } from "undici";
import * as cheerio from "cheerio";
export function isPublicIP(ip: string) {
  try {
    const a = ipaddr.process(ip);
    return a.range() === "unicast";
  } catch {
    return false;
  }
}
export function parsePublicURL(input: string) {
  const u = new URL(input);
  if (
    !["http:", "https:"].includes(u.protocol) ||
    u.username ||
    u.password ||
    !["", "80", "443"].includes(u.port)
  )
    throw Error(
      "Use a public HTTP(S) URL without credentials or a custom port.",
    );
  if (
    u.hostname === "localhost" ||
    u.hostname.endsWith(".local") ||
    u.hostname.endsWith(".internal")
  )
    throw Error("Private network URLs cannot be checked.");
  return u;
}
export async function safeFetch(
  input: string,
  limit = 600_000,
  signal?: AbortSignal,
) {
  let url = parsePublicURL(input);
  for (let i = 0; i < 4; i++) {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addresses = await lookup(host, { all: true });
    if (!addresses.length || addresses.some((a) => !isPublicIP(a.address)))
      throw Error("Private or reserved network addresses cannot be fetched.");
    const address = addresses[0];
    const dispatcher = new Agent({
      connect: {
        autoSelectFamily: false,
        lookup: (_host, _options, cb) =>
          cb(null, address.address, address.family),
      },
    });
    try {
      const res = await fetchPinned(url, {
        dispatcher,
        redirect: "manual",
        signal: signal
          ? AbortSignal.any([AbortSignal.timeout(12000), signal])
          : AbortSignal.timeout(12000),
        headers: {
          "User-Agent":
            "LaunchPath/0.1 (public documentation and readiness checks)",
          Accept: "text/html,text/plain,application/json",
        },
      });
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get("location");
        await res.body?.cancel();
        if (!loc) throw Error("Redirect without location");
        url = parsePublicURL(new URL(loc, url).href);
        continue;
      }
      const type = res.headers.get("content-type") || "";
      if (!/text|json|xml/.test(type)) {
        await res.body?.cancel();
        throw Error("Only text pages can be inspected.");
      }
      const reader = res.body?.getReader();
      let bytes = 0;
      const chunks: Uint8Array[] = [];
      if (reader)
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > limit) {
            await reader.cancel();
            throw Error("Page exceeds the inspection size limit.");
          }
          chunks.push(value);
        }
      return {
        url: url.href,
        status: res.status,
        html: Buffer.concat(chunks).toString("utf8"),
      };
    } finally {
      await dispatcher.close();
    }
  }
  throw Error("Too many redirects.");
}
export function textOf(html: string) {
  const $ = cheerio.load(html);
  $("script,style,nav,footer,header,noscript").remove();
  const content = $("main").first().length
    ? $("main").first()
    : $("article").first().length
      ? $("article").first()
      : $("body");
  content.find("td,th,p,li,h1,h2,h3,h4,h5,h6,tr,br").append(" ");
  return content.text().replace(/\s+/g, " ").trim().slice(0, 22000);
}
export function linksOf(html: string, base: string) {
  const $ = cheerio.load(html);
  return $("a[href]")
    .toArray()
    .map((a) => {
      try {
        return {
          text: $(a).text().trim(),
          url: new URL($(a).attr("href")!, base).href,
        };
      } catch {
        return null;
      }
    })
    .filter((a): a is { text: string; url: string } => !!a);
}
