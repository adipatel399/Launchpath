"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ArrowRight,
  Search,
  Sparkles,
  LoaderCircle,
  ShieldCheck,
  Check,
  Globe,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Header, Footer } from "./brand";
type Activity = { title: string; detail: string; url?: string };
export default function ResearchView() {
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  const [input, setInput] = useState("");
  const [scenario, setScenario] = useState("");
  const [events, setEvents] = useState<Activity[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [config, setConfig] = useState<{
    model: boolean;
    search: boolean;
  } | null>(null);
  useEffect(() => {
    setInput(new URLSearchParams(location.search).get("app") || "");
    fetch("/api/health")
      .then((r) => r.json())
      .then(setConfig);
  }, []);
  async function run() {
    const controller = new AbortController();
    requestRef.current = controller;
    setBusy(true);
    setError("");
    setEvents([]);
    setResult(null);
    try {
      const r = await fetch("/api/research", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input,
          scenario:
            scenario ||
            "External customers; investigate OAuth setup, testing and approval.",
        }),
      });
      if (!r.ok) {
        const b = await r.json();
        throw Error(b.error);
      }
      const reader = r.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let end;
        while ((end = buffer.indexOf("\n\n")) >= 0) {
          const part = buffer.slice(0, end);
          buffer = buffer.slice(end + 2);
          const name = part.match(/^event: (.+)$/m)?.[1];
          const raw = part.match(/^data: (.+)$/m)?.[1];
          if (!raw) continue;
          const data = JSON.parse(raw);
          if (name === "activity") setEvents((x) => [...x, data]);
          if (name === "error") setError(data.message);
          if (name === "complete") setResult(data.guide);
        }
      }
    } catch (e) {
      if (controller.signal.aborted) {
        setError(
          "Investigation stopped. Partial findings remain below; no completed guide is implied.",
        );
        return;
      }
      setError(
        e instanceof Error
          ? e.message
          : "Research was interrupted. Findings shown below are partial.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Header active="research" />
      <main className="research-main readable-page">
        <div className="eyebrow">
          <span className="live-dot" /> A NEW PATH, BUILT FROM EVIDENCE
        </div>
        <h1>Which app is next?</h1>
        <p className="large-intro">
          Give the agent a provider. Get a practical OAuth launch guide
          <br className="desktop" /> with sources, human handoffs, and honest
          unknowns.
        </p>
        <form
          className="research-form"
          onSubmit={(e) => {
            e.preventDefault();
            run();
          }}
        >
          <label>
            App name or official website
            <div className="research-input">
              <Globe size={20} />
              <input
                required
                minLength={2}
                maxLength={240}
                placeholder="e.g. Notion, Linear, or https://…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
            </div>
          </label>
          <label>
            What are you building? <span>optional, but useful</span>
            <textarea
              placeholder="My agent needs to read project issues for customers outside my organization…"
              maxLength={1000}
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy}>
            {busy ? (
              <LoaderCircle size={17} className="spin" />
            ) : (
              <Sparkles size={17} />
            )}{" "}
            {busy ? "Investigating…" : "Investigate this app"}
            <ArrowUpRight size={16} />
          </button>
          {busy && (
            <button
              className="button secondary"
              type="button"
              onClick={() => requestRef.current?.abort()}
            >
              Stop investigation
            </button>
          )}
        </form>
        {config && (!config.model || !config.search) && (
          <div className="notice config-notice">
            <strong>Connect the research providers</strong>
            <p>
              Add {config.model ? "" : "GEMINI_API_KEY "}
              {!config.model && !config.search ? "and " : ""}
              {config.search ? "" : "TAVILY_API_KEY"} to <code>.env.local</code>
              . Free-tier setup instructions are in the README. The library and
              real website preflight already work without keys.
            </p>
            <small>No simulated research results will be substituted.</small>
          </div>
        )}
        {error && (
          <div className="error-box" role="alert">
            <strong>Investigation needs attention</strong>
            <p>{error}</p>
            <small>
              Retrieved findings remain below. An incomplete investigation does
              not mean OAuth is unsupported.
            </small>
          </div>
        )}
        {(busy || events.length > 0 || result) && (
          <section className="activity-panel">
            <div className="report-heading">
              <h2>Investigation log</h2>
              <span className="badge">
                {busy
                  ? "Running"
                  : result
                    ? "Guide saved"
                    : "Partial investigation"}
              </span>
            </div>
            <p className="subtle-note">
              Actual tool activity. No account login or provider configuration
              is implied.
            </p>
            {events.map((e, i) => (
              <div className="activity" key={i}>
                <span className="activity-check">
                  <Check size={13} />
                </span>
                <div>
                  <strong>{e.title}</strong>
                  <p>{e.detail}</p>
                  {e.url && (
                    <a href={e.url} target="_blank" rel="noreferrer">
                      View source <ExternalLink size={11} />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="activity">
                <LoaderCircle size={17} className="spin" />
                <span>Working through the next research step…</span>
              </div>
            )}
            {result && (
              <Link className="button primary" href={"/guide/" + result.id}>
                Open {result.name} guide <ArrowRight size={16} />
              </Link>
            )}
          </section>
        )}
        <div className="research-explainer">
          {[
            [Search, "Discover", "Find relevant provider documentation."],
            [BookOpen, "Investigate", "Read sources and check requirements."],
            [ShieldCheck, "Support", "Review citations and surface unknowns."],
          ].map(([Icon, title, desc]) => {
            const I = Icon as typeof Search;
            return (
              <div key={String(title)}>
                <I size={21} />
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
              </div>
            );
          })}
        </div>
        <p className="center-note">
          A source-backed starting point. Provider approval always belongs to
          the provider.
        </p>
      </main>
      <Footer />
    </>
  );
}
