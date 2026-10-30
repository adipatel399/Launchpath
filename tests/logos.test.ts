import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveLogo } from "../lib/logos";
import { guides } from "../lib/guides";
import { deriveGuide } from "../lib/schema";
test("logos use provider data through a fixed image host, without app-specific rendering", async () => {
  const calls: string[] = [];
  const logo = await resolveLogo(
    "Unfamiliar Provider",
    "new.example",
    async (url) => {
      calls.push(String(url));
      return new Response("<svg/>", {
        headers: { "content-type": "image/svg+xml" },
      });
    },
  );
  assert.deepEqual(calls, [
    "https://logos.composio.dev/api/unfamiliarprovider",
  ]);
  assert.equal(logo.source, "catalog");
});
test("missing logos fall back to provider favicons with trusted redirects only", async () => {
  const calls: string[] = [];
  const logo = await resolveLogo("New app", "new.example", async (url) => {
    calls.push(String(url));
    if (calls.length === 1) return new Response("", { status: 404 });
    if (calls.length === 2)
      return new Response("", {
        status: 302,
        headers: { location: "https://t2.gstatic.com/favicon" },
      });
    return new Response(new Uint8Array([1, 2, 3]), {
      headers: { "content-type": "image/png" },
    });
  });
  assert.equal(logo.source, "favicon");
  assert.ok(calls[1].includes("domain=new.example"));
  assert.equal(calls[2], "https://t2.gstatic.com/favicon");
});
test("untrusted logo redirects and non-image responses never reach a user-selected host", async () => {
  const hosts: string[] = [];
  const logo = await resolveLogo("New app", "127.0.0.1", async (url) => {
    hosts.push(new URL(String(url)).hostname);
    return hosts.length === 1
      ? new Response("", {
          status: 302,
          headers: { location: "http://127.0.0.1/private" },
        })
      : new Response("<html>not a logo</html>", {
          headers: { "content-type": "text/html" },
        });
  });
  assert.equal(logo.source, "unavailable");
  assert.deepEqual(hosts, ["logos.composio.dev", "www.google.com"]);
});
test("reviewed scenario configuration follows the provider rather than a hardcoded guide ID", () => {
  const gmail = guides.find((g) => g.name === "Gmail")!;
  const derived = deriveGuide(
    { ...gmail, id: "research-new-version" },
    { audience: "public", capability: "send", route: "custom" },
  );
  assert.equal(derived.scopes.length, 1);
  assert.ok(derived.scopes[0].name.endsWith("gmail.send"));
  assert.ok(!derived.steps.some((s) => s.id === "assessment"));
  assert.ok(
    !derived.blockers.some((b) => b.title === "Restricted-data assessment"),
  );
});
