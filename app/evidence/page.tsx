import { Header, Footer } from "@/components/brand";
import { guides } from "@/lib/guides";
import Link from "next/link";
export default function Page() {
  return (
    <>
      <Header active="evidence" />
      <main className="prose-page evidence-page readable-page">
        <div className="eyebrow">THE EVIDENCE LAB</div>
        <h1>Useful. Inspectable. Honest.</h1>
        <p className="large-intro">
          What we learned, what supports it, and where the evidence ends.
        </p>
        <div className="evidence-grid">
          <div>
            <strong>Documentation</strong>
            <p>
              A requirement supported by a named source. It may still depend on
              your scenario.
            </p>
          </div>
          <div>
            <strong>Observation</strong>
            <p>
              A specific action and result from a real setup or website check.
            </p>
          </div>
          <div>
            <strong>Unresolved</strong>
            <p>
              A question the available evidence does not answer. It remains
              visible.
            </p>
          </div>
        </div>
        <h2>Findings that shaped the product</h2>
        <ol>
          <li>
            <strong>Registration is not always necessary.</strong> Managed OAuth
            can change the starting point, so every reference guide offers an
            identity choice.
          </li>
          <li>
            <strong>Permissions can change the route.</strong> Gmail send and
            inbox-read capabilities select different scope classifications and
            assessment questions.
          </li>
          <li>
            <strong>
              A working installation is not Marketplace eligibility.
            </strong>{" "}
            Slack’s distribution requirements appear before submission
            preparation.
          </li>
          <li>
            <strong>
              Finding a policy link is not evaluating its contents.
            </strong>{" "}
            Preflight reports observation and limits separately.
          </li>
        </ol>
        <h2>Reference-guide evidence ledger</h2>
        <p>
          Sources were reviewed on 29 October 2026. Open each guide for
          claim-linked steps and unresolved questions.
        </p>
        {guides.map((g) => (
          <section className="ledger" key={g.id}>
            <h3>
              <Link href={"/guide/" + g.id}>{g.name} ↗</Link>
            </h3>
            <p>{g.tested}</p>
            {g.sources.map((s) => (
              <div key={s.id}>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.title} ↗
                </a>
                <p>{s.excerpt}</p>
              </div>
            ))}
          </section>
        ))}
        <h2>Setup attempts and limits</h2>
        <p>
          A real Composio-managed GitHub connection completed after the owner
          authorized read:user. The server confirmed ACTIVE and a read-only GET
          /user returned HTTP 200. No profile data or tokens were stored in
          LaunchPath. This verifies one test connection. Custom provider
          registration and provider approval remain uncompleted. Earlier, GitHub
          registration redirected to sign-in. Slack’s creation dialog exposed
          the name/workspace form but could not proceed without workspace
          access. Public-source retrieval and preflight checks are separate
          observations. The repository’s attempt report records actual tool
          results, including blocked or inaccessible surfaces.
        </p>
        <p>
          We do not infer “no approval required” from missing documentation, or
          OAuth absence from a failed search. Live guides retain uncertainty and
          need human review.
        </p>
      </main>
      <Footer />
    </>
  );
}
