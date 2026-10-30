import { test } from "node:test";
import assert from "node:assert/strict";
import { guides } from "../lib/guides";
import { validateGuide, deriveGuide } from "../lib/schema";
import { isPublicIP, parsePublicURL, safeFetch } from "../lib/safe-fetch";
import { inspectWebsite } from "../lib/preflight";
test("reference guides retain source support for every step, scope and blocker", () => {
  for (const g of guides) {
    assert.equal(validateGuide(g).id, g.id);
    assert.ok(g.steps.length >= 5);
    assert.match(g.tested, /No|no/);
  }
});
test("broken citations cannot be published", () => {
  const g = structuredClone(guides[0]);
  g.steps[0].sourceIds = ["fabricated"];
  assert.throws(() => validateGuide(g), /unavailable source/);
});
test("send-only Gmail removes restricted-data assessment; inbox reading retains it", () => {
  const g = guides.find((g) => g.id === "gmail")!;
  const send = deriveGuide(g, {
    audience: "public",
    capability: "send",
    route: "custom",
  });
  const read = deriveGuide(g, {
    audience: "public",
    capability: "read",
    route: "custom",
  });
  assert.equal(send.scopes[0].classification, "Sensitive");
  assert.equal(read.scopes[0].classification, "Restricted");
  assert.ok(!send.steps.some((s) => s.id === "assessment"));
  assert.ok(read.steps.some((s) => s.id === "assessment"));
});
test("internal Slack does not inherit a Marketplace submission step", () => {
  const g = guides.find((g) => g.id === "slack")!;
  assert.ok(
    !deriveGuide(g, {
      audience: "internal",
      capability: "read",
      route: "custom",
    }).steps.some((s) => s.id === "review"),
  );
});
test("managed route does not ask developers to register custom credentials", () => {
  const g = deriveGuide(guides[0], {
    audience: "public",
    capability: "read",
    route: "managed",
  });
  assert.deepEqual(
    g.steps.map((x) => x.id),
    ["route", "test"],
  );
});
test("private, metadata, mapped and reserved IP addresses are blocked", () => {
  for (const ip of [
    "127.0.0.1",
    "10.0.0.1",
    "192.168.1.1",
    "169.254.169.254",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "224.0.0.1",
  ])
    assert.equal(isPublicIP(ip), false, ip);
  assert.equal(isPublicIP("8.8.8.8"), true);
});
test("fetcher rejects credentials, unsafe schemes and custom ports", () => {
  for (const u of [
    "file:///etc/passwd",
    "http://localhost",
    "http://example.com:8080",
    "https://user:secret@example.com",
  ])
    assert.throws(() => parsePublicURL(u));
});
test("actual fetch cannot reach loopback", async () => {
  await assert.rejects(
    () => safeFetch("http://127.0.0.1/"),
    /Private or reserved/,
  );
});
test("preflight fixture distinguishes detected gaps from unverified compliance", async () => {
  const r = await inspectWebsite(
    guides.find((g) => g.id === "gmail")!,
    {
      guideId: "gmail",
      website: "https://demo.launchpath.example",
      redirect: "https://example.com/callback",
      scopes: "gmail.send",
      demo: true,
    },
  );
  assert.equal(r.demo, true);
  assert.equal(
    r.checks.find((c) => c.title === "Privacy policy link")!.status,
    "action",
  );
  assert.equal(
    r.checks.find((c) => c.title === "Redirect URI structure")!.status,
    "observed",
  );
  assert.equal(
    r.checks.find((c) => c.title === "Account, domain and review status")!
      .status,
    "unknown",
  );
  assert.match(r.limitations, /No login/);
});

test("same-origin browser requests work through Next hostname normalization", async () => {
  const { NextRequest } = await import("next/server");
  const { guard } = await import("../lib/guard");
  const r = new NextRequest("http://localhost:3000/api/preflight", {
    headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
  });
  assert.doesNotThrow(() => guard(r, "test"));
  const x = new NextRequest("http://localhost:3000/api/preflight", {
    headers: { host: "127.0.0.1:3000", origin: "https://attacker.example" },
  });
  assert.throws(() => guard(x, "test"), /Cross-origin/);
});

test("generated guide snapshots round-trip without exposing private inspection input", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const folder = await mkdtemp(path.join(tmpdir(), "launchpath-test-"));
  const old = process.env.DATA_DIR;
  process.env.DATA_DIR = folder;
  try {
    const { saveGuide, getGuide, listGuides } = await import("../lib/store");
    const g = {
      ...structuredClone(guides[0]),
      id: "research-test-snapshot",
      domain: "sample-provider.example",
      generated: true,
      permissionsEvidenceChecked: true,
    };
    await saveGuide(g);
    assert.deepEqual(await getGuide(g.id), g);
    assert.equal((await listGuides()).length, 4);
    assert.equal(await getGuide("../../.env.local"), null);
    assert.ok(!("website" in (await getGuide(g.id))!));
    const legacy = {
      ...g,
      id: "research-old-permissions",
      permissionsEvidenceChecked: undefined,
    };
    await saveGuide(legacy);
    const projected = await getGuide(legacy.id);
    assert.deepEqual(projected?.scopes, []);
    assert.ok(
      projected?.unknowns.some((s) =>
        s.includes("predates permission-evidence"),
      ),
    );
  } finally {
    if (old === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = old;
    await rm(folder, { recursive: true, force: true });
  }
});

test("full-page extraction is usable after a DNS failure, without treating snippets as page evidence", async () => {
  const { retrieveResearchPage } = await import("../lib/retrieval");
  const failure: typeof safeFetch = async () => {
    throw Error("getaddrinfo ENOTFOUND docs.provider.example");
  };
  const page = await retrieveResearchPage(
    {
      url: "https://docs.provider.example/oauth",
      raw_content:
        "# Authorization\n" + "Public OAuth app configuration. ".repeat(20),
    },
    AbortSignal.timeout(1000),
    failure,
  );
  assert.equal(page.retrieval, "search-extraction");
  await assert.rejects(
    () =>
      retrieveResearchPage(
        { url: "https://docs.provider.example/oauth" },
        AbortSignal.timeout(1000),
        failure,
      ),
    /ENOTFOUND/,
  );
});
test("content extraction cannot bypass a private-address or redirect rejection", async () => {
  const { retrieveResearchPage } = await import("../lib/retrieval");
  const failure: typeof safeFetch = async () => {
    throw Error("Private or reserved network addresses cannot be fetched.");
  };
  await assert.rejects(
    () =>
      retrieveResearchPage(
        {
          url: "https://public.example/oauth",
          raw_content: "content ".repeat(100),
        },
        AbortSignal.timeout(1000),
        failure,
      ),
    /Private/,
  );
  await assert.rejects(
    () =>
      retrieveResearchPage(
        { url: "http://127.0.0.1", raw_content: "content ".repeat(100) },
        AbortSignal.timeout(1000),
      ),
    /Private/,
  );
});
test("extracted navigation is removed before selecting an evidence passage", async () => {
  const { cleanExtractedText, evidenceExcerpt } =
    await import("../lib/retrieval");
  const text = cleanExtractedText(
    "navigation and logos\n# Authorization\nCreate a [public app](https://provider.example).",
  );
  assert.ok(text.startsWith("# Authorization"));
  assert.ok(!evidenceExcerpt(text).includes("navigation"));
  assert.ok(evidenceExcerpt(text).includes("public app"));
});

test("transient upstream failure retries once, while quota errors do not retry", async () => {
  const { fetchWithRetry } = await import("../lib/provider-request");
  let calls = 0;
  let retries = 0;
  const fetcher: typeof fetch = async () =>
    new Response("{}", { status: ++calls === 1 ? 503 : 200 });
  const r = await fetchWithRetry(
    "https://provider.example",
    {},
    {
      fetcher,
      onRetry: () => {
        retries++;
      },
      delay: async () => {},
    },
  );
  assert.equal(r.status, 200);
  assert.equal(calls, 2);
  assert.equal(retries, 1);
  calls = 0;
  const quota: typeof fetch = async () => {
    calls++;
    return new Response("{}", { status: 429 });
  };
  assert.equal(
    (await fetchWithRetry("https://provider.example", {}, { fetcher: quota }))
      .status,
    429,
  );
  assert.equal(calls, 1);
});
test("review schema forbids citations to discarded secondary sources", async () => {
  const { z } = await import("zod");
  const { constrainCitations } = await import("../lib/model-schema");
  const schema = z.toJSONSchema(
    z.object({
      steps: z.array(
        z.object({ done: z.string(), sourceIds: z.array(z.string()).min(1) }),
      ),
    }),
  );
  const result = constrainCitations(schema, ["official-1"]);
  const item = (result.properties as any).steps.items.properties;
  assert.deepEqual(item.sourceIds.items.enum, ["official-1"]);
  assert.equal(item.done.type, "string");
  assert.ok(
    !(schema.properties as any).steps.items.properties.sourceIds.items.enum,
  );
});
