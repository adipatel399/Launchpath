import { z } from "zod";
import type { Guide } from "../schema";
import type { SetupRecord } from "./session";
import { recordEvent } from "./session";
import { providerProfile } from "../provider-profile";
const BASE = "https://backend.composio.dev/api/v3.1";
export type Transport = (path: string, body?: unknown) => Promise<unknown>;
export async function composioRequest(path: string, body?: unknown) {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key)
    throw Error(
      "Add COMPOSIO_API_KEY to .env.local to enable real account authorization. Prepared guides and artifacts work without it.",
    );
  const r = await fetch(BASE + path, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "x-api-key": key },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(25000),
    cache: "no-store",
  });
  if (!r.ok)
    throw Error(
      `Composio request failed (${r.status}). Check the project key, toolkit availability and account limits. No successful setup is inferred.`,
    );
  return r.json() as Promise<unknown>;
}
export function managedAdapter(g: Guide, capability: "read" | "send" = "read") {
  const profile = providerProfile(g.domain);
  if (!profile.adapter) return null;
  return { ...profile.adapter, ...profile.adapterOverrides?.[capability] };
}
export async function inspectManagedToolkit(
  g: Guide,
  transport: Transport = composioRequest,
  capability: "read" | "send" = "read",
) {
  const adapter = managedAdapter(g, capability);
  if (!adapter)
    throw Error(
      "No verified connection adapter is available for this guide. Use the registration worksheet and provider console handoff.",
    );
  const raw = await transport("/toolkits/" + adapter.slug);
  const toolkit = z
    .object({
      slug: z.string(),
      composio_managed_auth_schemes: z.array(z.string()).default([]),
    })
    .passthrough()
    .parse(raw);
  if (
    toolkit.slug !== adapter.slug ||
    !toolkit.composio_managed_auth_schemes.some(
      (s) => s.toUpperCase() === "OAUTH2",
    )
  )
    throw Error(
      "Current toolkit metadata does not establish managed OAuth2 availability. Continue with the custom registration guide.",
    );
  return { adapter, toolkit };
}
export async function authorizeSetup(
  record: SetupRecord,
  g: Guide,
  callbackURL: string,
  transport: Transport = composioRequest,
) {
  if (record.status === "EXPIRED")
    throw Error("This setup workspace expired. Start another one.");
  if (record.mode !== "managed")
    throw Error(
      "Custom app registration requires the provider console. Use the prepared artifacts; it has not been automated.",
    );
  if (
    record.connectedAccountId &&
    record.status === "AWAITING_CONSENT" &&
    record.redirectUrl &&
    Date.parse(record.linkExpiresAt || "") > Date.now()
  )
    return record;
  if (record.status === "ACTIVE") return record;
  const { adapter } = await inspectManagedToolkit(
    g,
    transport,
    record.capability,
  );
  record.toolkit = adapter.slug;
  recordEvent(
    record,
    "Managed OAuth availability checked",
    `The current ${adapter.slug} toolkit exposes a Composio-managed OAUTH2 method.`,
    "observed",
  );
  if (!record.authConfigId) {
    const config = z
      .object({ auth_config: z.object({ id: z.string().min(1) }) })
      .parse(
        await transport("/auth_configs", {
          toolkit: { slug: adapter.slug },
          auth_config: {
            type: "use_composio_managed_auth",
            name: "LaunchPath " + record.id.slice(0, 8),
            credentials: { scopes: adapter.scope },
          },
        }),
      );
    record.authConfigId = config.auth_config.id;
    recordEvent(
      record,
      "Auth configuration created",
      `Created a managed configuration requesting ${adapter.scope}. This does not create your own provider OAuth app.`,
      "observed",
    );
  }
  const link = z
    .object({
      redirect_url: z.string().url(),
      connected_account_id: z.string().min(1),
      expires_at: z.string(),
    })
    .parse(
      await transport("/connected_accounts/link", {
        auth_config_id: record.authConfigId,
        user_id: record.userId,
        callback_url: callbackURL,
      }),
    );
  const u = new URL(link.redirect_url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    !(
      u.hostname === "connect.composio.dev" ||
      u.hostname.endsWith(".connect.composio.dev")
    )
  )
    throw Error(
      "The provider returned an unexpected authorization URL. It was not opened.",
    );
  record.connectedAccountId = link.connected_account_id;
  record.redirectUrl = link.redirect_url;
  record.linkExpiresAt = link.expires_at;
  record.status = "AWAITING_CONSENT";
  recordEvent(
    record,
    "Your sign-in and consent are required",
    adapter.purpose +
      " Open the hosted authorization page, inspect its actual permissions, and approve only if they match your intent. No account is marked connected yet.",
    "handoff",
  );
  return record;
}
export async function verifySetup(
  record: SetupRecord,
  transport: Transport = composioRequest,
) {
  if (!record.connectedAccountId || !record.toolkit)
    throw Error("Start an authorization attempt first.");
  const account = z
    .object({
      id: z.string(),
      user_id: z.string(),
      toolkit: z.object({ slug: z.string() }),
      status: z.string(),
    })
    .parse(
      await transport(
        "/connected_accounts/" + encodeURIComponent(record.connectedAccountId),
      ),
    );
  if (
    account.id !== record.connectedAccountId ||
    account.user_id !== record.userId ||
    account.toolkit.slug !== record.toolkit
  )
    throw Error(
      "Connection identity does not match this browser’s setup attempt.",
    );
  if (account.status === "ACTIVE") {
    record.status = "ACTIVE";
    recordEvent(
      record,
      "Authorization confirmed by Composio",
      "The server reports this exact user/toolkit connection as ACTIVE. This proves a user connection, not custom app registration or production approval.",
      "observed",
    );
  } else if (["FAILED", "REVOKED", "EXPIRED"].includes(account.status)) {
    record.status = account.status === "EXPIRED" ? "EXPIRED" : "FAILED";
    recordEvent(
      record,
      "Authorization not active",
      `Provider status: ${account.status}. No successful connection is claimed.`,
      "error",
    );
  } else
    recordEvent(
      record,
      "Waiting for authorization",
      `Provider status: ${account.status}. Complete the provider sign-in and consent, then check again.`,
      "handoff",
    );
  return record;
}
export async function smokeTestSetup(
  record: SetupRecord,
  transport: Transport = composioRequest,
) {
  if (record.status !== "ACTIVE")
    throw Error("Confirm an ACTIVE connection before testing it.");
  if (record.toolkit !== "github")
    throw Error(
      "This version has a verified read-only smoke-test adapter for GitHub only. Other connections can be checked for ACTIVE status.",
    );
  const res = z
    .object({ status: z.number() })
    .passthrough()
    .parse(
      await transport("/tools/execute/proxy", {
        connected_account_id: record.connectedAccountId,
        endpoint: "https://api.github.com/user",
        method: "GET",
      }),
    );
  record.smoke = {
    status: res.status,
    checkedAt: new Date().toISOString(),
    description:
      "Read-only GitHub GET /user through Composio. Response contents and credentials are not stored.",
  };
  recordEvent(
    record,
    res.status === 200
      ? "Authenticated read succeeded"
      : "Authenticated read failed",
    `GitHub GET /user returned HTTP ${res.status}. This does not verify production launch or provider approval.`,
    res.status === 200 ? "observed" : "error",
  );
  return record;
}
