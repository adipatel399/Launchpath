"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Check,
  Download,
  ExternalLink,
  LoaderCircle,
  ShieldCheck,
  UserRoundCheck,
  FileCode2,
  KeyRound,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import type { Guide } from "@/lib/schema";
import { providerProfile } from "@/lib/provider-profile";
import type { SetupArtifact } from "@/lib/setup/artifacts";
import { Header, Footer, AppIcon } from "./brand";
import OAuthExplainer from "./oauth-explainer";
type Session = {
  id: string;
  guideId: string;
  mode: "custom" | "managed";
  capability: "read" | "send";
  status: string;
  artifacts: SetupArtifact[];
  events: { at: string; title: string; detail: string; kind: string }[];
  redirectUrl?: string;
  linkExpiresAt?: string;
  smoke?: { status: number; checkedAt: string; description: string };
};
type Capabilities = {
  composioConfigured: boolean;
  adapter: { slug: string; scope: string; purpose: string } | null;
  smokeTest: boolean;
};
function download(a: SetupArtifact) {
  const url = URL.createObjectURL(new Blob([a.content], { type: a.mime }));
  const el = document.createElement("a");
  el.href = url;
  el.download = a.name;
  el.click();
  URL.revokeObjectURL(url);
}
export default function SetupView({ guide: g }: { guide: Guide }) {
  const [mode, setMode] = useState<"custom" | "managed">("custom");
  const [capability, setCapability] = useState<"read" | "send">("read");
  const [appName, setAppName] = useState("My agent");
  const [callback, setCallback] = useState("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    fetch(
      "/api/setup-capabilities?guideId=" +
        encodeURIComponent(g.id) +
        "&capability=" +
        capability,
    )
      .then((r) => r.json())
      .then(setCaps)
      .catch(() => setError("Could not inspect setup capabilities."));
  }, [g.id, capability]);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const attempt = q.get("attempt");
    if (attempt) {
      fetch("/api/setup/" + encodeURIComponent(attempt), { cache: "no-store" })
        .then(async (r) => {
          const b = await r.json();
          if (!r.ok) throw Error(b.error);
          setSession(b);
          setMode(b.mode);
          setCapability(b.capability);
        })
        .catch((e) => setError(e.message));
    } else if (q.get("mode") === "managed") setMode("managed");
    if (q.get("capability") === "send") setCapability("send");
  }, []);
  async function prepare() {
    setBusy("prepare");
    setError("");
    try {
      const r = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: g.id,
          mode,
          appName,
          callback,
          capability,
          audience: "public",
        }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setSession(b);
      const u = new URL(location.href);
      u.searchParams.set("attempt", b.id);
      history.replaceState(null, "", u.href);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not prepare setup.");
    } finally {
      setBusy("");
    }
  }
  async function act(action: "authorize" | "verify" | "test") {
    if (!session) return;
    setBusy(action);
    setError("");
    try {
      const r = await fetch("/api/setup/" + session.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const b = await r.json();
      if (b.setup) setSession(b.setup);
      if (!r.ok) throw Error(b.error);
      setSession(b);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup action failed.");
    } finally {
      setBusy("");
    }
  }
  const profile = providerProfile(g.domain);
  const consoleURL = profile.consoleUrl || g.sources[0]?.url;
  return (
    <>
      <Header active="guide" title="Assisted setup" />
      <main className="detail-main assisted-main readable-page">
        <Link href={"/guide/" + g.id} className="back-link">
          <ArrowLeft size={14} />
          Back to {g.name} guide
        </Link>
        <div className="detail-title">
          <AppIcon {...g} />
          <div>
            <div className="eyebrow">LET LAUNCHPATH HELP</div>
            <h1>Set up {g.name}, together.</h1>
          </div>
        </div>
        <p className="detail-description">
          We prepare what we can, perform supported actions, and stop where your
          account access or decision is required.
        </p>
        <OAuthExplainer />
        <div className="setup-milestones">
          <div>
            <span>01</span>
            <strong>Provider app registration</strong>
            <small>Custom identity or a managed app</small>
          </div>
          <div>
            <span>02</span>
            <strong>One test connection</strong>
            <small>Requires your sign-in and consent</small>
          </div>
          <div>
            <span>03</span>
            <strong>Wider release</strong>
            <small>Provider and customer policies still apply</small>
          </div>
        </div>
        {!session ? (
          <section className="dashboard-panel setup-choice-panel">
            <h2>What should LaunchPath help with?</h2>
            <div className="setup-options">
              <label className={mode === "custom" ? "chosen" : ""}>
                <input
                  type="radio"
                  name="setupMode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                />
                <div>
                  <FileCode2 size={20} />
                  <strong>Prepare my own OAuth app</strong>
                  <p>
                    Get the registration worksheet, a machine-readable runbook,
                    and supported configuration drafts. You complete provider
                    registration and attestations.
                  </p>
                </div>
              </label>
              <label className={mode === "managed" ? "chosen" : ""}>
                <input
                  type="radio"
                  name="setupMode"
                  checked={mode === "managed"}
                  onChange={() => setMode("managed")}
                />
                <div>
                  <KeyRound size={20} />
                  <strong>Try a managed test connection</strong>
                  <p>
                    Use Composio’s existing app identity. We can create the auth
                    configuration and authorization link; you sign in and
                    consent.
                  </p>
                </div>
              </label>
            </div>
            <form
              className="preflight-form"
              onSubmit={(e) => {
                e.preventDefault();
                prepare();
              }}
            >
              <label>
                Your application name
                <input
                  maxLength={35}
                  required
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                />
              </label>
              {!!profile.capabilities?.length && (
                <label>
                  Required capability
                  <select
                    value={capability}
                    onChange={(e) =>
                      setCapability(e.target.value as "read" | "send")
                    }
                  >
                    {profile.capabilities?.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {mode === "custom" && (
                <label>
                  Exact redirect URI{" "}
                  <span>
                    optional for worksheet; required for a Slack manifest
                  </span>
                  <input
                    type="url"
                    placeholder="Copy from your integration platform or Composio auth configuration"
                    value={callback}
                    onChange={(e) => setCallback(e.target.value)}
                  />
                </label>
              )}
              {mode === "managed" && (
                <div className="notice">
                  <strong>What this will do</strong>
                  <p>
                    {caps?.adapter?.purpose ||
                      "No verified managed-connection adapter is available for this guide. You can still prepare its registration worksheet."}
                  </p>
                  <p>
                    A test connection does not create your own branded OAuth app
                    or complete provider approval.
                  </p>
                  {!caps?.composioConfigured && (
                    <p>
                      The local server needs COMPOSIO_API_KEY to make real
                      connection requests. Your guide and preparation artifacts
                      work now.
                    </p>
                  )}
                </div>
              )}
              <button className="button primary" disabled={!!busy}>
                {busy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <FileCode2 size={15} />
                )}
                Prepare my setup <ArrowRight size={14} />
              </button>
              <p className="subtle-note">
                This workspace is private to this browser for 24 hours. Do not
                enter passwords, client secrets or API keys.
              </p>
            </form>
          </section>
        ) : (
          <>
            <div className="setup-session-status">
              <span className="badge">
                {session.status.replaceAll("_", " ")}
              </span>
              <span>
                Private setup workspace · does not change your public guide
              </span>
              <button
                className="text-button"
                onClick={() => {
                  setSession(null);
                  setConfirmed(false);
                  history.replaceState(null, "", "/setup/" + g.id);
                }}
              >
                Start a new setup
              </button>
            </div>
            <div className="detail-layout">
              <section className="detail-content">
                <div className="dashboard-panel setup-artifacts">
                  <h2>Prepared for you</h2>
                  {session.artifacts.map((a) => (
                    <article key={a.name}>
                      <FileCode2 size={21} />
                      <div>
                        <strong>{a.name}</strong>
                        <p>{a.validation}</p>
                      </div>
                      <button
                        className="button outline small"
                        onClick={() => download(a)}
                      >
                        <Download size={13} />
                        Download
                      </button>
                    </article>
                  ))}
                </div>
                {session.mode === "custom" ? (
                  <div className="notice setup-handoff">
                    <h3>Your provider account is the next handoff.</h3>
                    <p>
                      These artifacts are prepared. LaunchPath has not
                      registered an app, generated provider credentials,
                      accepted terms or submitted for review. Open the provider
                      console and follow the worksheet.
                    </p>
                    <a
                      className="button primary"
                      href={consoleURL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open provider setup <ExternalLink size={14} />
                    </a>
                    <Link className="text-button" href={"/guide/" + g.id}>
                      Follow the full registration and approval guide{" "}
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                ) : (
                  <div className="dashboard-panel setup-authorization">
                    <h2>Authorize one test account</h2>
                    <p>{caps?.adapter?.purpose}</p>
                    <div className="notice">
                      <strong>Requested scope</strong>
                      <p>
                        <code>
                          {caps?.adapter?.scope || "No verified adapter"}
                        </code>
                      </p>
                      <p>
                        The server’s configured Composio project receives this
                        test connection. Review the actual permissions on the
                        provider’s consent screen. Cancel if they differ from
                        your intent. Composio stores provider tokens; LaunchPath
                        does not receive your password or expose tokens.
                      </p>
                    </div>
                    <label className="consent-checkbox">
                      <input
                        type="checkbox"
                        checked={confirmed}
                        onChange={(e) => setConfirmed(e.target.checked)}
                      />
                      I want to create a managed auth configuration and
                      authorization link in the configured Composio test project
                      for the scope shown above.
                    </label>
                    <button
                      className="button primary"
                      disabled={
                        !!busy ||
                        !confirmed ||
                        !caps?.composioConfigured ||
                        !caps?.adapter ||
                        session.status === "ACTIVE"
                      }
                      onClick={() => act("authorize")}
                    >
                      {busy === "authorize" ? (
                        <LoaderCircle size={15} className="spin" />
                      ) : (
                        <KeyRound size={15} />
                      )}
                      Create authorization link
                    </button>
                    {!caps?.composioConfigured && (
                      <p className="subtle-note">
                        Add the Composio test-project key to .env.local, then
                        refresh this page. No authorization request has been
                        made.
                      </p>
                    )}
                    {session.redirectUrl && (
                      <div className="authorization-handoff">
                        <h3>Your sign-in and consent are required.</h3>
                        <a
                          className="button primary"
                          href={session.redirectUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Continue with {g.name} <ArrowUpRight size={14} />
                        </a>
                        <p>
                          After returning, check the server-reported connection
                          state. A callback saying “success” is not accepted as
                          proof.
                        </p>
                      </div>
                    )}
                    {["AWAITING_CONSENT", "ACTIVE", "FAILED"].includes(
                      session.status,
                    ) && (
                      <div className="form-actions">
                        <button
                          className="button outline"
                          disabled={!!busy}
                          onClick={() => act("verify")}
                        >
                          {busy === "verify" ? (
                            <LoaderCircle size={14} className="spin" />
                          ) : (
                            <UserRoundCheck size={15} />
                          )}
                          Check actual connection
                        </button>
                        {session.status === "ACTIVE" && caps?.smokeTest && (
                          <button
                            className="button primary"
                            disabled={!!busy}
                            onClick={() => act("test")}
                          >
                            {busy === "test" ? (
                              <LoaderCircle size={14} className="spin" />
                            ) : (
                              <ShieldCheck size={15} />
                            )}
                            Run read-only API test
                          </button>
                        )}
                      </div>
                    )}
                    {session.smoke && (
                      <div className="notice">
                        <strong>
                          {session.smoke.status === 200
                            ? "Authenticated request succeeded"
                            : "Authenticated request needs attention"}
                        </strong>
                        <p>
                          {session.smoke.description} HTTP{" "}
                          {session.smoke.status}.
                        </p>
                        <p>
                          This is evidence of a test connection, not
                          public-launch approval.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                <div className="activity-panel">
                  <h2>What actually happened</h2>
                  {session.events.map((ev, i) => (
                    <div className="activity" key={i}>
                      <span className="activity-check">
                        {ev.kind === "handoff" ? (
                          <UserRoundCheck size={13} />
                        ) : ev.kind === "error" ? (
                          <AlertTriangle size={13} />
                        ) : (
                          <Check size={13} />
                        )}
                      </span>
                      <div>
                        <strong>
                          {ev.title}
                          <span className="event-kind">{ev.kind}</span>
                        </strong>
                        <p>{ev.detail}</p>
                        <small>{new Date(ev.at).toLocaleString("en-GB")}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              <aside className="guide-aside">
                <div className="aside-card">
                  <div className="eyebrow">WHAT THE AGENT CAN DO</div>
                  <h3>Prepare, configure, verify.</h3>
                  <p>
                    Prepare files and runbooks. For supported managed routes,
                    create an auth configuration, issue a consent link, verify
                    server status and perform a supported read-only test.
                  </p>
                </div>
                <div className="aside-card gate">
                  <div className="eyebrow">WHERE YOU TAKE OVER</div>
                  <h3>Your account. Your decision.</h3>
                  <p>
                    Sign in, inspect permissions, give consent, complete custom
                    app registration, confirm business facts, and submit
                    required review materials. Only the provider grants
                    approval.
                  </p>
                </div>
                <div className="aside-card">
                  <h3>Using a custom OAuth app?</h3>
                  <p>
                    Register your own app when your branding or required
                    permissions need it. Managed testing is an optional
                    shortcut, not proof that custom registration is complete.
                  </p>
                  <Link href={"/guide/" + g.id} className="text-button">
                    Return to the guide <ArrowRight size={13} />
                  </Link>
                </div>
              </aside>
            </div>
          </>
        )}
        {error && (
          <div role="alert" className="error-box">
            {error}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
