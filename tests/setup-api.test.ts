import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as create } from "../app/api/setup/route";
import { GET as get, POST as act } from "../app/api/setup/[id]/route";
test("private setup HTTP contract: owner cookie, cross-session denial and fake callback immunity", async () => {
  const { mkdtemp, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const path = await import("node:path");
  const temp = await mkdtemp(path.join(tmpdir(), "lp-api-"));
  const old = process.env.DATA_DIR;
  process.env.DATA_DIR = temp;
  try {
    const req = new NextRequest("http://127.0.0.1:3000/api/setup", {
      method: "POST",
      headers: {
        host: "127.0.0.1:3000",
        origin: "http://127.0.0.1:3000",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        guideId: "github",
        mode: "custom",
        appName: "HTTP test",
      }),
    });
    const made = await create(req);
    assert.equal(made.status, 201);
    const body = await made.json();
    assert.equal(body.status, "PREPARED");
    const cookie = made.headers.get("set-cookie")!;
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=lax/i);
    const ownerCookie = cookie.split(";")[0];
    const context = { params: Promise.resolve({ id: body.id }) };
    const noOwner = await get(
      new NextRequest("http://127.0.0.1:3000/api/setup/" + body.id),
      context,
    );
    assert.equal(noOwner.status, 404);
    const owned = await get(
      new NextRequest(
        "http://127.0.0.1:3000/api/setup/" +
          body.id +
          "?status=success&connected_account_id=ca_forged",
        { headers: { cookie: ownerCookie } },
      ),
      context,
    );
    assert.equal(owned.status, 200);
    const retained = await owned.json();
    assert.equal(retained.status, "PREPARED");
    assert.equal(retained.smoke, undefined);
    for (const k of [
      "ownerHash",
      "userId",
      "authConfigId",
      "connectedAccountId",
    ])
      assert.ok(!(k in retained));
    const forged = await act(
      new NextRequest("http://127.0.0.1:3000/api/setup/" + body.id, {
        method: "POST",
        headers: {
          cookie: ownerCookie,
          host: "127.0.0.1:3000",
          origin: "http://127.0.0.1:3000",
        },
        body: JSON.stringify({ action: "test" }),
      }),
      context,
    );
    assert.equal(forged.status, 400);
    assert.match((await forged.json()).error, /ACTIVE/);
  } finally {
    if (old === undefined) delete process.env.DATA_DIR;
    else process.env.DATA_DIR = old;
    await rm(temp, { recursive: true, force: true });
  }
});
test("setup creation rejects unknown guides and cross-origin requests before performing setup", async () => {
  const unknown = await create(
    new NextRequest("http://127.0.0.1:3000/api/setup", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" },
      body: JSON.stringify({
        guideId: "not-a-guide",
        mode: "managed",
        appName: "Test",
      }),
    }),
  );
  assert.equal(unknown.status, 404);
  const cross = await create(
    new NextRequest("http://127.0.0.1:3000/api/setup", {
      method: "POST",
      headers: { host: "127.0.0.1:3000", origin: "https://attacker.example" },
      body: JSON.stringify({
        guideId: "github",
        mode: "managed",
        appName: "Test",
      }),
    }),
  );
  assert.equal(cross.status, 400);
  assert.match((await cross.json()).error, /Cross-origin/);
});
