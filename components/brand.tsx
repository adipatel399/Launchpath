import Link from "next/link";
import {
  ArrowUpRight,
  Layers3,
  Compass,
  BookOpen,
  FlaskConical,
  ArrowRight,
  House,
  FileCheck2,
  ChevronsUpDown,
  CircleHelp,
  ExternalLink,
} from "lucide-react";
export function Logo() {
  return (
    <Link className="logo" href="/">
      <span className="logo-mark">
        <Layers3 size={23} />
      </span>
      <span className="logo-text">
        launchpath<small>OAUTH, WITH A WAY FORWARD</small>
      </span>
    </Link>
  );
}
export function Header({
  active = "library",
  title,
}: {
  active?: string;
  title?: string;
}) {
  const page =
    title ||
    (active === "research"
      ? "Research an app"
      : active === "evidence"
        ? "Evidence lab"
        : active === "about"
          ? "Getting started"
          : active === "guide"
            ? "OAuth guide"
            : "App library");
  return (
    <>
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <Logo />
        </div>
        <nav aria-label="Main navigation">
          <Link
            className={
              ["library", "guide"].includes(active) ? "side-active" : ""
            }
            href="/"
          >
            <BookOpen size={18} />
            <span className="nav-label">App library</span>
          </Link>
          <Link
            className={active === "research" ? "side-active" : ""}
            href="/research"
          >
            <Compass size={18} />
            <span className="nav-label">Research an app</span>
          </Link>
          <Link
            className={active === "evidence" ? "side-active" : ""}
            href="/evidence"
          >
            <FlaskConical size={18} />
            <span className="nav-label">Evidence lab</span>
          </Link>
          <div className="sidebar-divider" />
          <Link
            className={active === "about" ? "side-active" : ""}
            href="/about"
          >
            <CircleHelp size={18} />
            <span className="nav-label">Getting started</span>
          </Link>
          <a
            href="https://docs.composio.dev/toolkits/managed-auth"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={18} />
            <span className="nav-label">OAuth documentation</span>
            <ExternalLink size={12} className="sidebar-external" />
          </a>
        </nav>
      </aside>
      <header className="dashboard-header">
        <div className="breadcrumbs">
          Pages <span>/</span> <strong>{page}</strong>
        </div>
        <div className="dashboard-page-title">{page}</div>
      </header>
    </>
  );
}
export function Footer() {
  return (
    <footer>
      <span>
        <span className="source-dot" /> Evidence-backed guidance. Human
        decisions, clearly marked.
      </span>
      <div className="footer-links">
        <Link href="/about">How it works</Link>
        <Link href="/evidence">Evidence standard</Link>
        <a href="https://docs.composio.dev" target="_blank" rel="noreferrer">
          Composio docs <ArrowUpRight size={12} />
        </a>
      </div>
    </footer>
  );
}
export function AppIcon({
  id,
  name,
}: {
  id: string;
  name: string;
  color?: string;
  monogram?: string;
}) {
  return (
    <span className="app-icon real-app-icon">
      <img
        src={"/api/logos/" + encodeURIComponent(id)}
        alt={name + " logo"}
        width={32}
        height={32}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
