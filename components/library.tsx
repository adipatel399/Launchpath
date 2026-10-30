"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Search, Clock3, Plus } from "lucide-react";
import type { Guide } from "@/lib/schema";
import { Header, Footer, AppIcon } from "./brand";
import { appQuery, matchExistingApp } from "@/lib/app-intent";
function effortLabel(text: string) {
  const value = text.match(
    /\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(?:minutes?|mins?|hours?|hrs?|days?|weeks?)/i,
  )?.[0];
  return value || text;
}
export default function Library({ guides }: { guides: Guide[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All apps");
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const q = appQuery(query).toLowerCase();
  const exact = matchExistingApp(query, guides);
  const results = guides.filter(
    (g) =>
      ((g.name + " " + g.domain + " " + g.category).toLowerCase().includes(q) ||
        g.id === exact?.id) &&
      (filter === "All apps" ||
        (filter === "Reviewed guides" ? !g.generated : g.generated)),
  );
  function openPath() {
    const known = matchExistingApp(query, guides);
    location.assign(
      known
        ? "/guide/" + known.id
        : "/research?app=" + encodeURIComponent(appQuery(query)),
    );
  }
  return (
    <>
      <Header />
      <main className="library-main dashboard-overview focused-overview">
        <section className="overview-hero focused-hero">
          <div className="landscape-art" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </div>
          <span className="hero-label">FROM APP TO ACTION</span>
          <h1>
            Your next connection,
            <br />
            without the guesswork.
          </h1>
          <p>Find the setup, the approval gates, and your next move.</p>
          <form
            className="path-search"
            onSubmit={(e) => {
              e.preventDefault();
              openPath();
            }}
          >
            <Search size={20} aria-hidden="true" />
            <input
              ref={input}
              aria-label="Which app do you want to connect?"
              placeholder="Which app do you want to connect?"
              required
              minLength={2}
              maxLength={240}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd>⌘ K</kbd>
            <button className="button primary" type="submit">
              Find my path <ArrowRight size={16} />
            </button>
          </form>
          <Link href="/about" className="hero-help">
            New to OAuth? Start here <ArrowUpRight size={12} />
          </Link>
        </section>
        <section
          id="guides"
          className="dashboard-panel app-library focused-library"
        >
          <div className="panel-heading">
            <div>
              <h2>
                Your app library{" "}
                <span className="number-pill">{guides.length}</span>
              </h2>
            </div>
            <Link className="text-button" href="/research">
              <Plus size={15} /> Research an app
            </Link>
          </div>
          <div className="library-toolbar">
            <div className="filter-tabs" aria-label="Filter guides">
              {["All apps", "Reviewed guides", "Live research"].map((value) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  className={filter === value ? "selected" : ""}
                  onClick={() => setFilter(value)}
                >
                  {value}
                </button>
              ))}
            </div>
            <span className="library-count">
              {results.length} {results.length === 1 ? "app" : "apps"}
            </span>
          </div>
          <div className="guide-table-wrap">
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Application</th>
                  <th>Setup effort*</th>
                  <th>Before you launch</th>
                  <th>
                    <span className="sr-only">Open guide</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {results.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <Link className="table-app" href={"/guide/" + g.id}>
                        <AppIcon {...g} />
                        <span>
                          <strong>{g.name}</strong>
                          <small>{g.category}</small>
                        </span>
                      </Link>
                    </td>
                    <td title={g.estimateBasis}>
                      <span className="table-effort">
                        <Clock3 size={13} />
                        {effortLabel(g.effort)}
                      </span>
                    </td>
                    <td>
                      <span
                        className="table-gate"
                        title={g.blockers[0]?.detail}
                      >
                        {g.blockers[0]?.title || g.wait}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="open-guide-button"
                        href={"/guide/" + g.id}
                        aria-label={"Open " + g.name + " guide"}
                      >
                        <ArrowUpRight size={18} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!results.length && (
            <div className="table-empty">
              <Search size={24} />
              <h3>Let’s find a path for {query || "your next app"}.</h3>
              <p>Research it live and save a guide you can share.</p>
              <Link
                className="button primary"
                href={"/research?app=" + encodeURIComponent(appQuery(query))}
              >
                Investigate this app <ArrowRight size={15} />
              </Link>
            </div>
          )}
          <div className="table-footnote">
            <span>
              * Planning estimates. Approval waiting time is separate.
            </span>
            <Link href="/evidence">
              View evidence <ArrowUpRight size={12} />
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
