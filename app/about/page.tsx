import Link from "next/link";
import { Header, Footer } from "@/components/brand";
export default function Page() {
  return (
    <>
      <Header active="about" />
      <main className="prose-page readable-page">
        <div className="eyebrow">HOW LAUNCHPATH WORKS</div>
        <h1>A guide you can act on.</h1>
        <p className="large-intro">
          Understand the route, investigate the requirements, and check your own
          preparation.
        </p>
        <h2>One app identity. Many user connections.</h2>
        <p>
          A provider OAuth app identifies your product and its configured
          permissions and redirects. Each user separately authorizes access to
          their account or workspace. Registration, user authorization, provider
          verification, Marketplace listing and customer administrator approval
          are different events.
        </p>
        <h2>Start with the right route.</h2>
        <p>
          Composio may supply a managed OAuth app. Check current toolkit-method
          and scope coverage first. A custom app can provide your own consent
          identity and permission configuration. Managed credentials do not
          establish that all customer policies or desired capabilities are
          satisfied.
        </p>
        <h2>Guides with explicit limits.</h2>
        <p>
          Reference guides are source-reviewed. Live guides use search, document
          retrieval and a separate model support-review pass. Model review can
          miss mistakes. Consequential requirements should be checked against
          official documentation.
        </p>
        <h2>Your actual app, checked.</h2>
        <p>
          Preflight fetches public website HTML and inspects supplied non-secret
          configuration. It distinguishes observed properties, actions and
          unresolved requirements. It cannot establish legal compliance,
          ownership, working OAuth exchanges or approval.
        </p>
        <h2>Sharing and privacy.</h2>
        <p>
          Guide links contain provider guidance and scenario choices. They
          exclude your private progress, website inspection inputs and
          preparation drafts. Research inputs are sent to configured API
          providers; use public provider names and non-sensitive descriptions.
          Do not enter secrets or personal data. Generated guides are accessible
          to anyone with their URL on this deployment.
        </p>
        <Link className="button primary" href="/">
          Explore the guide library →
        </Link>
      </main>
      <Footer />
    </>
  );
}
