import { test } from "node:test";
import assert from "node:assert/strict";
import { guides } from "../lib/guides";
import { buildSetupArtifacts } from "../lib/setup/artifacts";
import {
  createSetupRecord,
  newOwner,
  owns,
  publicSetup,
  saveSetup,
  loadSetup,
} from "../lib/setup/session";
import {
  authorizeSetup,
  verifySetup,
  smokeTestSetup,
  managedAdapter,
  type Transport,
} from "../lib/setup/composio";
import { matchExistingApp, appQuery } from "../lib/app-intent";
import { readJSON } from "../lib/http";
const github = guides.find((g) => g.id === "github")!;
const slack = guides.find((g) => g.id === "slack")!;
function record(mode: "custom" | "managed" = "managed") {
  return createSetupRecord("github", newOwner(), mode, "Protocol test", []);
}
function fakeTransport(
  userId: string,
  overrides: {
    status?: string;
    userId?: string;
    toolkit?: string;
    redirect?: string;
    managed?: string[];
    smokeStatus?: number;
  } = {},
) {
  const calls: { path: string; body?: unknown }[] = [];
  const transport: Transport = async (path, body) => {
    calls.push({ path, body });
    if (path === "/toolkits/github")
      return {
        slug: "github",
        composio_managed_auth_schemes: overrides.managed || ["OAUTH2"],
      };
    if (path === "/auth_configs")
      return { auth_config: { id: "ac_protocol_test" } };
    if (path === "/connected_accounts/link")
      return {
        connected_account_id: "ca_protocol_test",
        redirect_url:
          overrides.redirect ||
          "https://connect.composio.dev/link/test-fixture",
        expires_at: new Date(Date.now() + 600000).toISOString(),
      };
    if (path === "/connected_accounts/ca_protocol_test")
      return {
        id: "ca_protocol_test",
        user_id: overrides.userId || userId,
        toolkit: { slug: overrides.toolkit || "github" },
        status: overrides.status || "ACTIVE",
      };
    if (path === "/tools/execute/proxy")
      return {
        status: overrides.smokeStatus || 200,
        data: { oauth_token: "must-never-be-stored", login: "test-fixture" },
      };
    throw Error("Unexpected test request " + path);
  };
  return { calls, transport };
}
test("natural-language app lookup distinguishes known and unfamiliar providers", () => {
  assert.equal(appQuery("I want to connect Slack to my AI agent"), "Slack");
  assert.equal(matchExistingApp("Connect Gmail", guides)?.id, "gmail");
  assert.equal(
    matchExistingApp(
      "I want to connect a completely unfamiliar service",
      guides,
    ),
    null,
  );
  assert.equal(matchExistingApp("Gmail and Slack", guides), null);
});
test("Slack artifacts contain only the documented reference permission and stay explicitly unexecuted", () => {
  const artifacts = buildSetupArtifacts(
    slack,
    { audience: "public", capability: "read", route: "custom" },
    "Test agent",
    "https://example.com/callback",
  );
  const m = JSON.parse(
    artifacts.find((a) => a.name === "slack-app-manifest.json")!.content,
  );
  assert.deepEqual(m.oauth_config.scopes.bot, ["chat:write"]);
  assert.equal(m.oauth_config.redirect_urls[0], "https://example.com/callback");
  assert.match(artifacts[0].validation, /unverified/);
  assert.equal(
    JSON.parse(artifacts.find((a) => a.name === "agent-runbook.json")!.content)
      .executionStatus,
    "prepared_only",
  );
});
test("unsafe manifest redirects are rejected and missing redirects do not produce a fabricated manifest", () => {
  assert.throws(
    () =>
      buildSetupArtifacts(
        slack,
        { audience: "public", capability: "read", route: "custom" },
        "Test",
        "https://user:secret@example.com/callback",
      ),
    /without credentials/,
  );
  assert.equal(
    buildSetupArtifacts(
      slack,
      { audience: "public", capability: "read", route: "custom" },
      "Test",
      "",
    ).length,
    2,
  );
});
test("setup ownership and public projection never expose the internal user/account identity", () => {
  const owner = newOwner();
  const r = createSetupRecord("github", owner, "managed", "Test", []);
  r.connectedAccountId = "ca_private";
  r.authConfigId = "ac_private";
  assert.equal(owns(r, owner), true);
  assert.equal(owns(r, newOwner()), false);
  const view = publicSetup(r);
  for (const key of [
    "ownerHash",
    "userId",
    "connectedAccountId",
    "authConfigId",
  ])
    assert.equal(key in view, false);
});
test("authorization uses the supported link endpoint, requests only read:user and awaits consent", async () => {
  const r = record();
  const f = fakeTransport(r.userId);
  await authorizeSetup(
    r,
    github,
    "http://127.0.0.1:3000/setup/github",
    f.transport,
  );
  assert.equal(r.status, "AWAITING_CONSENT");
  const config = f.calls.find((c) => c.path === "/auth_configs")!.body as {
    auth_config: { credentials: { scopes: string } };
  };
  assert.equal(config.auth_config.credentials.scopes, "read:user");
  assert.ok(f.calls.some((c) => c.path === "/connected_accounts/link"));
  assert.ok(!f.calls.some((c) => c.path === "/connected_accounts"));
  assert.equal(r.smoke, undefined);
  const count = f.calls.length;
  await authorizeSetup(
    r,
    github,
    "http://127.0.0.1:3000/setup/github",
    f.transport,
  );
  assert.equal(f.calls.length, count, "an unexpired attempt is reused");
});
test("unavailable managed OAuth, custom registration and hostile redirects cannot report success", async () => {
  const r = record();
  await assert.rejects(
    () =>
      authorizeSetup(
        r,
        github,
        "http://localhost",
        fakeTransport(r.userId, { managed: ["API_KEY"] }).transport,
      ),
    /does not establish/,
  );
  assert.equal(r.status, "PREPARED");
  await assert.rejects(
    () =>
      authorizeSetup(
        record("custom"),
        github,
        "http://localhost",
        fakeTransport(r.userId).transport,
      ),
    /provider console/,
  );
  await assert.rejects(
    () =>
      authorizeSetup(
        r,
        github,
        "http://localhost",
        fakeTransport(r.userId, { redirect: "https://attacker.example/steal" })
          .transport,
      ),
    /unexpected authorization URL/,
  );
  assert.notEqual(r.status, "ACTIVE");
});
test("a pending provider status stays pending; callback success alone is never used", async () => {
  const r = record();
  r.connectedAccountId = "ca_protocol_test";
  r.toolkit = "github";
  r.status = "AWAITING_CONSENT";
  await verifySetup(
    r,
    fakeTransport(r.userId, { status: "INITIATED" }).transport,
  );
  assert.equal(r.status, "AWAITING_CONSENT");
  assert.equal(r.smoke, undefined);
});
test("provider identity mismatches prevent verification even if status is ACTIVE", async () => {
  for (const mismatch of [{ userId: "someone_else" }, { toolkit: "gmail" }]) {
    const r = record();
    r.connectedAccountId = "ca_protocol_test";
    r.toolkit = "github";
    r.status = "AWAITING_CONSENT";
    await assert.rejects(
      () => verifySetup(r, fakeTransport(r.userId, mismatch).transport),
      /does not match/,
    );
    assert.equal(r.status, "AWAITING_CONSENT");
  }
});
test("an authenticated read requires ACTIVE and records only status, never returned credentials", async () => {
  const r = record();
  await assert.rejects(
    () => smokeTestSetup(r, fakeTransport(r.userId).transport),
    /ACTIVE/,
  );
  r.connectedAccountId = "ca_protocol_test";
  r.toolkit = "github";
  await verifySetup(r, fakeTransport(r.userId).transport);
  assert.equal(r.status, "ACTIVE");
  const f = fakeTransport(r.userId);
  await smokeTestSetup(r, f.transport);
  const body = f.calls[0].body as { method: string; endpoint: string };
  assert.equal(body.method, "GET");
  assert.equal(body.endpoint, "https://api.github.com/user");
  assert.equal(r.smoke?.status, 200);
  assert.ok(!JSON.stringify(r).includes("must-never-be-stored"));
});
test("a failed read is recorded as failure, not successful setup", async () => {
  const r = record();
  r.status = "ACTIVE";
  r.toolkit = "github";
  r.connectedAccountId = "ca_protocol_test";
  await smokeTestSetup(
    r,
    fakeTransport(r.userId, { smokeStatus: 401 }).transport,
  );
  assert.equal(r.smoke?.status, 401);
  assert.equal(r.events.at(-1)?.kind, "error");
});
test("Gmail send-only helper does not request inbox reading", () => {
  const gmail = guides.find((g) => g.id === "gmail")!;
  assert.equal(
    managedAdapter(gmail, "send")?.scope,
    "https://www.googleapis.com/auth/gmail.send",
  );
  assert.equal(
    managedAdapter(gmail, "read")?.scope,
    "https://www.googleapis.com/auth/gmail.readonly",
  );
});
test("private setup records survive reload, enforce ownership, and expire", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const folder = await mkdtemp(path.join(tmpdir(), "lp-setup-"));
  const old = process.env.DATA_DIR;
  process.env.DATA_DIR = folder;
  try {
    const owner = newOwner();
    const r = createSetupRecord("github", owner, "custom", "Test", []);
    await saveSetup(r);
    assert.equal((await loadSetup(r.id, owner))?.id, r.id);
    assert.equal(await loadSetup(r.id, newOwner()), null);
    assert.equal(await loadSetup("../../.env.local", owner), null);
    r.expiresAt = new Date(Date.now() - 1000).toISOString();
    await saveSetup(r);
    assert.equal((await loadSetup(r.id, owner))?.status, "EXPIRED");
  } finally {
    if (old === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = old;
    await rm(folder, { recursive: true, force: true });
  }
});
test("chunked JSON is size limited without trusting Content-Length", async () => {
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode("x".repeat(13000)));
      c.close();
    },
  });
  const req = new Request("https://example.com", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit);
  await assert.rejects(() => readJSON(req), /size limit/);
  await assert.rejects(
    () =>
      readJSON(
        new Request("https://example.com", { method: "POST", body: "invalid" }),
      ),
    /valid JSON/,
  );
});
