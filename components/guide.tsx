"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowRight,
  Check,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  Info,
  LoaderCircle,
  ShieldCheck,
  X,
  CircleCheck,
  AlertTriangle,
  HelpCircle,
  Clock3,
  Sparkles,
} from "lucide-react";
import { Guide, Source, Scenario, deriveGuide } from "@/lib/schema";
import type { Check as PreflightCheck } from "@/lib/preflight";
import { Header, Footer, AppIcon } from "./brand";
import OAuthExplainer from "./oauth-explainer";
import { providerProfile } from "@/lib/provider-profile";
function download(name: string, content: string, type = "text/markdown") {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  URL.revokeObjectURL(u);
}
export default function GuideView({ guide: g }: { guide: Guide }) {
  const [tab, setTab] = useState("runbook");
  const [scenario, setScenario] = useState<Scenario>({
    audience: "public",
    capability: "read",
    route: "custom",
  });
  const [source, setSource] = useState<Source | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [toast, setToast] = useState("");
  const route = deriveGuide(g, scenario);
  const profile = providerProfile(g.domain);
  const nextStep = route.steps.find((step) => !completed.includes(step.id));
  const [site, setSite] = useState("");
  const [redirect, setRedirect] = useState("");
  const [scopes, setScopes] = useState("");
  const [report, setReport] = useState<{
    checkedAt: string;
    demo: boolean;
    checks: PreflightCheck[];
    summary: string;
    limitations: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState("");
  const [purpose, setPurpose] = useState("");
  useEffect(() => {
    const initialTab = new URLSearchParams(location.search).get("tab");
    if (["preflight", "evidence", "handoff"].includes(initialTab || ""))
      setTab(initialTab!);
  }, [g.id]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const progressKey =
    "progress-" +
    g.id +
    "-" +
    scenario.audience +
    "-" +
    scenario.capability +
    "-" +
    scenario.route;
  useEffect(() => {
    try {
      setCompleted(JSON.parse(localStorage.getItem(progressKey) || "[]"));
    } catch {
      setCompleted([]);
    }
    setReport(null);
  }, [progressKey]);
  useEffect(() => {
    if (!source) return;
    const before = document.activeElement as HTMLElement;
    const close = document.querySelector<HTMLButtonElement>(".drawer-close");
    close?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSource(null);
      if (e.key === "Tab") {
        const nodes = document.querySelectorAll<HTMLElement>(
          ".source-drawer button,.source-drawer a",
        );
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      before?.focus();
    };
  }, [source]);
  function toggle(id: string) {
    const next = completed.includes(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    setCompleted(next);
    localStorage.setItem(progressKey, JSON.stringify(next));
  }
  const cite = (ids: string[]) => (
    <span className="citations">
      {ids.map((id) => (
        <button
          key={id}
          onClick={() => setSource(g.sources.find((s) => s.id === id) || null)}
        >
          <ShieldCheck size={11} />
          {id}
        </button>
      ))}
    </span>
  );
  function exportGuide() {
    download(
      g.id + "-guide.md",
      `# ${g.name} OAuth launch guide\n\nScenario: ${JSON.stringify(scenario)}\n\n${route.verdict}\n\nEffort: ${g.effort}. ${g.estimateBasis}\nWaiting: ${g.wait}\n\n${route.steps.map((s, i) => `## ${i + 1}. ${s.title}\nOwner: ${s.owner}\n${s.detail}\nDone when: ${s.done}\nSources: ${s.sourceIds.map((id) => g.sources.find((x) => x.id === id)?.url).join(", ")}\n`).join("\n")}\n## What was tested\n${g.tested}\n\n## Unresolved\n${g.unknowns.join("\n")}\n\n## Sources\n${g.sources.map((s) => `- [${s.title}](${s.url}) ,  checked ${s.checkedAt}`).join("\n")}`,
    );
  }
  async function share() {
    try {
      const u = new URL(location.href);
      u.search = "";
      u.searchParams.set("audience", scenario.audience);
      u.searchParams.set("capability", scenario.capability);
      u.searchParams.set("route", scenario.route);
      await navigator.clipboard.writeText(u.href);
      setToast(
        "Guide link copied. Website inputs and private progress are excluded.",
      );
    } catch {
      setToast("Copy the guide URL from your address bar.");
    }
  }
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    setScenario((s) => ({
      ...s,
      ...(["internal", "pilot", "public"].includes(p.get("audience") || "")
        ? { audience: p.get("audience") as Scenario["audience"] }
        : {}),
      ...(["read", "send"].includes(p.get("capability") || "")
        ? { capability: p.get("capability") as Scenario["capability"] }
        : {}),
      ...(["custom", "managed"].includes(p.get("route") || "")
        ? { route: p.get("route") as Scenario["route"] }
        : {}),
    }));
  }, []);
  async function run(demo = false) {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch("/api/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: g.id,
          website: demo ? "https://demo.launchpath.example" : site,
          redirect,
          scopes: scopes || route.scopes.map((x) => x.name).join(" "),
          demo,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw Error(body.error);
      setReport(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not inspect website.");
    } finally {
      setBusy(false);
    }
  }
  function packet() {
    return `# ${g.name}: preparation brief\n\nProject: ${project || "[CONFIRM PROJECT NAME]"}\nPurpose: ${purpose || "[CONFIRM ACTUAL PRODUCT FUNCTIONALITY]"}\nAudience: ${scenario.audience}\nRoute: ${scenario.route}\n\n## Requested capabilities\n${route.scopes.map((x) => `- ${x.name}: ${purpose ? `Draft: ${project || "This application"} provides ${purpose}. This permission allows it to ${x.purpose.toLowerCase()} [CONFIRM the exact feature-to-scope mapping and API endpoint; explain why a narrower alternative is insufficient.]` : "[CONFIRM why this is necessary for a real feature]"}`).join("\n")}\n\n## Next actions\n${
      report
        ? report.checks
            .filter((x) => x.status !== "observed")
            .map((x) => `- ${x.title}: ${x.action}`)
            .join("\n")
        : route.steps
            .map((x) => `- ${x.title}: ${x.done} (Owner: ${x.owner})`)
            .join("\n")
    }\n\n## Demo video storyboard\n1. Show the real application purpose.\n2. Show authorization and the exact requested permissions.\n3. Demonstrate each feature using the requested permissions.\n4. Show disconnect/deletion behavior if applicable.\n\n## Confirm before submission\n- Actual collection, storage, retention and deletion practices\n- Required account and domain ownership\n- Current provider-specific requirements\n\nThis is a preparation draft, not an approval decision or compliance finding.\n\n${g.sources.map((s) => s.url).join("\n")}`;
  }
  return (
    <>
      <Header active="guide" />
      <main className="detail-main readable-page">
        <Link className="back-link" href="/">
          <ArrowLeft size={14} /> Guide library
        </Link>
        <div className="detail-title">
          <AppIcon {...g} />
          <div>
            <div className="eyebrow">
              OAUTH LAUNCH GUIDE ·{" "}
              {g.generated ? "LIVE RESEARCH" : "REFERENCE GUIDE"}
            </div>
            <h1>{g.name}</h1>
          </div>
          <div className="detail-actions">
            <Link
              className="button small primary"
              href={
                "/setup/" +
                g.id +
                "?mode=" +
                scenario.route +
                "&capability=" +
                scenario.capability
              }
            >
              Let LaunchPath help <ArrowRight size={14} />
            </Link>
            <button className="button small outline" onClick={exportGuide}>
              <Download size={14} /> Export
            </button>
            <button className="button small outline" onClick={share}>
              <Copy size={14} /> Share guide
            </button>
          </div>
        </div>
        <p className="detail-description">{g.description}</p>
        <OAuthExplainer />
        {g.generated &&
          g.unknowns.some((x) =>
            /permission.*withheld|predates permission-evidence/i.test(x),
          ) && (
            <div className="notice">
              <strong>Confirm permissions before setup</strong>
              <p>
                This investigation has an unverified permission mapping.
                Permission names appearing in the runbook also need
                confirmation. Read the evidence and open questions before
                configuring access.
              </p>
            </div>
          )}
        {profile.consoleUrl && (
          <a
            className="portal-link"
            href={
              scenario.route === "managed"
                ? "https://dashboard.composio.dev"
                : profile.consoleUrl
            }
            target="_blank"
            rel="noreferrer"
          >
            Open setup console <ExternalLink size={12} />
          </a>
        )}
        {g.generated ? (
          <div className="notice">
            <strong>Investigated use case</strong>
            <p>
              {g.researchContext ||
                "See the route and conditions documented in this guide."}
            </p>
            <Link
              className="text-button"
              href={"/research?app=" + encodeURIComponent(g.name)}
            >
              Research a different scenario <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <>
            {" "}
            <div className="scenario-bar">
              <label>
                Audience
                <select
                  value={scenario.audience}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      audience: e.target.value as Scenario["audience"],
                    })
                  }
                >
                  <option value="internal">Own account / workspace</option>
                  <option value="pilot">Selected pilot customers</option>
                  <option value="public">External customers</option>
                </select>
              </label>
              {!!profile.capabilities?.length && (
                <label>
                  Agent capability
                  <select
                    value={scenario.capability}
                    onChange={(e) =>
                      setScenario({
                        ...scenario,
                        capability: e.target.value as Scenario["capability"],
                      })
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
              <label>
                OAuth identity
                <select
                  value={scenario.route}
                  onChange={(e) =>
                    setScenario({
                      ...scenario,
                      route: e.target.value as Scenario["route"],
                    })
                  }
                >
                  <option value="custom">My own OAuth app</option>
                  <option value="managed" disabled={g.managed !== "Available"}>
                    Composio-managed
                  </option>
                </select>
              </label>
              <span className="scenario-caption">
                <Info size={14} /> This guide follows your assumptions.
              </span>
            </div>
          </>
        )}
        <div className="verdict-box">
          <span className="verdict-icon">
            <GitIcon />
          </span>
          <div>
            <span className="eyebrow">YOUR ROUTE, AT A GLANCE</span>
            <h2>{route.verdict}</h2>
            <div className="verdict-meta">
              <span>
                <Clock3 size={13} /> Setup:{" "}
                {route.isManaged ? "Confirm scope coverage" : g.effort}
              </span>
              <span>
                External wait:{" "}
                {route.isManaged ? "Customer policies may apply" : g.wait}
              </span>
            </div>
            <small>{g.estimateBasis}</small>
          </div>
        </div>
        <div className="detail-tabs">
          {[
            ["runbook", "Setup runbook"],
            ["preflight", "Check my readiness"],
            ["evidence", "Evidence & unknowns"],
            ["handoff", "Preparation packet"],
          ].map(([id, title]) => (
            <button
              className={tab === id ? "selected" : ""}
              key={id}
              onClick={() => setTab(id)}
            >
              {id === "preflight" && <FileCheck2 size={15} />} {title}
            </button>
          ))}
        </div>
        <div className="detail-layout">
          <section className="detail-content">
            {tab === "runbook" && (
              <>
                <div className="content-title">
                  <div>
                    <div className="eyebrow">ONE STEP AT A TIME</div>
                    <h2>Your setup runbook</h2>
                  </div>
                  <span className="muted">
                    {route.steps.filter((x) => completed.includes(x.id)).length}
                    /{route.steps.length} marked done
                  </span>
                </div>
                <p className="subtle-note">
                  Progress is self-reported, saved on this browser, and excluded
                  from shared guides.
                </p>
                {route.steps.map((s, i) => (
                  <article
                    className={
                      "step " +
                      (completed.includes(s.id) ? "step-complete" : "")
                    }
                    key={s.id}
                  >
                    <button
                      aria-label={
                        "Mark " +
                        s.title +
                        (completed.includes(s.id) ? " incomplete" : " complete")
                      }
                      className="step-number"
                      onClick={() => toggle(s.id)}
                    >
                      {completed.includes(s.id) ? (
                        <Check size={17} />
                      ) : (
                        String(i + 1).padStart(2, "0")
                      )}
                    </button>
                    <details
                      className="step-body step-disclosure"
                      open={s.id === nextStep?.id}
                    >
                      <summary className="step-heading">
                        <h3>{s.title}</h3>
                        <span className={"owner " + s.owner.toLowerCase()}>
                          {s.owner}
                        </span>
                      </summary>
                      {s.condition !== "Always" && (
                        <span className="condition">{s.condition}</span>
                      )}
                      <p>{s.detail}</p>
                      <div className="done-when">
                        <Check size={14} />
                        <span>
                          <strong>Done when</strong> {s.done}
                        </span>
                      </div>
                      {cite(s.sourceIds)}
                    </details>
                  </article>
                ))}
                <details className="scopes-box permission-disclosure">
                  <summary>
                    Permissions <span>{route.scopes.length} in this route</span>
                  </summary>
                  {!route.scopes.length && (
                    <p>
                      No verified permission recommendation is available for
                      this investigation. Check the open questions and provider
                      documentation before configuring access.
                    </p>
                  )}
                  {route.scopes.map((s) => (
                    <div key={s.name}>
                      <code>{s.name}</code>
                      <span
                        className={
                          "badge " +
                          (s.classification === "Restricted" ? "amber" : "")
                        }
                      >
                        {s.classification}
                      </span>
                      <p>{s.purpose}</p>
                      {s.evidenceQuote && (
                        <small className="subtle-note">
                          Source phrase: “{s.evidenceQuote}”
                        </small>
                      )}
                      {cite(s.sourceIds)}
                    </div>
                  ))}
                </details>
              </>
            )}
            {tab === "preflight" && (
              <>
                <div className="eyebrow">GO BEYOND THE GUIDE</div>
                <h2>Check your actual app.</h2>
                <p className="section-intro">
                  Inspect public pages and non-secret configuration. Get
                  observations, missing pieces, and your next action.
                </p>
                <form
                  className="preflight-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run();
                  }}
                >
                  <label>
                    Application website
                    <input
                      type="url"
                      placeholder="https://your-app.com"
                      required
                      value={site}
                      onChange={(e) => setSite(e.target.value)}
                    />
                  </label>
                  <label>
                    OAuth redirect URI <span>optional</span>
                    <input
                      type="url"
                      placeholder="https://your-app.com/oauth/callback"
                      value={redirect}
                      onChange={(e) => setRedirect(e.target.value)}
                    />
                  </label>
                  <label>
                    Requested scopes{" "}
                    <span>optional · defaults to the permission map</span>
                    <textarea
                      placeholder="Separate scopes with spaces or commas"
                      value={scopes}
                      onChange={(e) => setScopes(e.target.value)}
                    />
                  </label>
                  <div className="form-actions">
                    <button disabled={busy} className="button primary">
                      {busy ? (
                        <LoaderCircle className="spin" size={16} />
                      ) : (
                        <FileCheck2 size={16} />
                      )}
                      Run readiness check
                    </button>
                    <button
                      disabled={busy}
                      type="button"
                      className="text-button"
                      onClick={() => run(true)}
                    >
                      Try a labeled demo <ArrowRight size={14} />
                    </button>
                  </div>
                  <p className="subtle-note">
                    Your website URL is fetched by this server. Inputs are not
                    saved to your shared guide. Never enter secrets.
                  </p>
                </form>
                {error && (
                  <div role="alert" className="error-box">
                    {error}
                  </div>
                )}
                {report && (
                  <div className="preflight-results">
                    <div className="report-heading">
                      <h3>
                        {report.demo
                          ? "Demonstration fixture"
                          : "Your inspection results"}
                      </h3>
                      <span className="badge">{report.summary}</span>
                    </div>
                    {report.demo && (
                      <div className="notice">
                        This is a clearly labeled static fixture with a missing
                        policy link. No live website was inspected.
                      </div>
                    )}
                    {report.checks.map((c, i) => (
                      <article className={"check-result " + c.status} key={i}>
                        <span>
                          {c.status === "observed" ? (
                            <CircleCheck size={20} />
                          ) : c.status === "action" ? (
                            <AlertTriangle size={20} />
                          ) : (
                            <HelpCircle size={20} />
                          )}
                        </span>
                        <div>
                          <div className="step-heading">
                            <h3>{c.title}</h3>
                            <span className="status-word">
                              {c.status === "observed"
                                ? "Observed"
                                : c.status === "action"
                                  ? "Action needed"
                                  : "Unresolved"}
                            </span>
                          </div>
                          <p>{c.detail}</p>
                          <div className="next-action">
                            <strong>Next:</strong> {c.action}
                          </div>
                          {c.evidence && !report.demo && (
                            <a
                              className="source-link"
                              href={c.evidence}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Inspected URL <ExternalLink size={12} />
                            </a>
                          )}
                          {cite(c.sourceIds)}
                        </div>
                      </article>
                    ))}
                    <p className="notice">{report.limitations}</p>
                    <div className="form-actions">
                      <button
                        className="button outline"
                        onClick={() =>
                          download(
                            g.id + "-preflight.json",
                            JSON.stringify(report, null, 2),
                            "application/json",
                          )
                        }
                      >
                        <Download size={14} />
                        Export private report
                      </button>
                      <button
                        className="button primary"
                        onClick={() => setTab("handoff")}
                      >
                        Prepare my next steps <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
            {tab === "evidence" && (
              <>
                <div className="eyebrow">SHOW YOUR WORK</div>
                <h2>Evidence, with its limits.</h2>
                <div className="notice">
                  <strong>What was tested</strong>
                  <p>{g.tested}</p>
                </div>
                <h3 className="spaced">Sources behind this guide</h3>
                {g.sources.map((s) => (
                  <button
                    className="source-card"
                    key={s.id}
                    onClick={() => setSource(s)}
                  >
                    <ShieldCheck size={19} />
                    <span>
                      <strong>{s.title}</strong>
                      <small>
                        {new URL(s.url).hostname} · Retrieved{" "}
                        {new Date(s.checkedAt).toLocaleDateString("en-GB")}
                      </small>
                    </span>
                    <ChevronRight size={16} />
                  </button>
                ))}
                <h3 className="spaced">What remains uncertain</h3>
                {g.unknowns.map((u) => (
                  <div className="unknown" key={u}>
                    <HelpCircle size={16} />
                    {u}
                  </div>
                ))}
                <p className="subtle-note">
                  Source support and observed setup behavior are separate forms
                  of evidence. Neither implies provider approval.
                </p>
              </>
            )}
            {tab === "handoff" && (
              <>
                <div className="eyebrow">LEAVE WITH SOMETHING USEFUL</div>
                <h2>Your preparation packet.</h2>
                <p className="section-intro">
                  A draft built from this guide and your confirmed facts.
                  Unknown business, privacy and security details remain for you
                  to complete.
                </p>
                <div className="preflight-form">
                  <label>
                    Project name
                    <input
                      value={project}
                      onChange={(e) => setProject(e.target.value)}
                      placeholder="Your application name"
                    />
                  </label>
                  <label>
                    What your app actually does
                    <textarea
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Describe real features only. No secrets or personal data."
                    />
                  </label>
                </div>
                <pre className="packet-preview">{packet()}</pre>
                <div className="form-actions">
                  <button
                    className="button primary"
                    onClick={() => download(g.id + "-preparation.md", packet())}
                  >
                    <Download size={14} />
                    Download preparation packet
                  </button>
                  <button
                    className="button outline"
                    onClick={() =>
                      download(
                        g.id + "-runbook.json",
                        JSON.stringify(
                          {
                            provider: g.name,
                            scenario,
                            steps: route.steps,
                            sources: g.sources,
                            limitations: g.tested,
                          },
                          null,
                          2,
                        ),
                        "application/json",
                      )
                    }
                  >
                    Export agent runbook
                  </button>
                </div>
              </>
            )}
          </section>
          <aside className="guide-aside">
            <div className="aside-card">
              <div className="eyebrow">YOUR NEXT MOVE</div>
              <h3>
                {route.steps.find((s) => !completed.includes(s.id))?.title ||
                  "Review the evidence and test results"}
              </h3>
              <p>
                {route.steps.find((s) => !completed.includes(s.id))?.done ||
                  "Checklist completion is self-reported. Confirm the actual provider outcomes."}
              </p>
              <button className="text-button" onClick={() => setTab("runbook")}>
                Open runbook <ArrowRight size={14} />
              </button>
            </div>
            <div className="aside-card gate">
              <div className="eyebrow">GATE TO WATCH</div>
              <h3>{route.gate}</h3>
              <p>{route.gateDetail}</p>
              {g.blockers[0] && cite(g.blockers[0].sourceIds)}
            </div>
            <div className="aside-card">
              <div className="eyebrow">WHEN YOU GET STUCK</div>
              {route.blockers.map((b) => (
                <details key={b.title}>
                  <summary>{b.title}</summary>
                  <p>{b.action}</p>
                  <span className="owner">{b.owner}</span>
                  {cite(b.sourceIds)}
                </details>
              ))}
            </div>
            <div className="aside-footnote">
              <ShieldCheck size={16} />
              <p>
                {g.sources.length} sources. Explicit unknowns.
                <br />
                No blanket “verified” badge.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
      {source && (
        <div className="drawer-backdrop" onClick={() => setSource(null)}>
          <aside
            className="source-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Source evidence"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="drawer-close"
              aria-label="Close source"
              onClick={() => setSource(null)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">EVIDENCE RECEIPT · {source.id}</div>
            <ShieldCheck className="drawer-icon" size={30} />
            <h2>{source.title}</h2>
            <span className="badge">Documentation support</span>
            <h4>
              {g.generated
                ? "Retrieved page excerpt"
                : "Relevant source summary"}
            </h4>
            <p className="excerpt">{source.excerpt}</p>
            <p className="subtle-note">
              A paraphrased summary, not a verbatim quotation or proof of an
              executed setup.
            </p>
            <h4>Retrieval method</h4>
            <p>
              {source.retrieval === "search-extraction"
                ? "Full-page content via Tavily extraction; direct retrieval was unavailable."
                : g.generated
                  ? "Direct HTTP retrieval with network safety checks."
                  : "Manual review of official documentation."}
            </p>
            <h4>Retrieved</h4>
            <p>{new Date(source.checkedAt).toLocaleString("en-GB")}</p>
            <a
              className="button primary"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              Open original source <ExternalLink size={15} />
            </a>
            <div className="notice">
              Requirements can change. Recheck consequential claims against the
              original source before submission.
            </div>
          </aside>
        </div>
      )}
      {toast && (
        <div className="toast" role="status">
          <Check size={15} />
          {toast}
        </div>
      )}
    </>
  );
}
function GitIcon() {
  return <ArrowUpRight size={24} />;
}
