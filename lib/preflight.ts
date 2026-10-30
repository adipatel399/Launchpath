import { z } from "zod";
import { providerProfile } from "./provider-profile";
import { safeFetch, linksOf, textOf } from "./safe-fetch";
import { Guide } from "./schema";
export const preflightInput = z.object({
  guideId: z.string().max(80),
  website: z.string().url().max(1000),
  redirect: z.string().max(1000).default(""),
  scopes: z.string().max(2000).default(""),
  demo: z.boolean().default(false),
});
export type Check = {
  title: string;
  status: "observed" | "action" | "unknown";
  detail: string;
  action: string;
  evidence?: string;
  sourceIds: string[];
};
export async function inspectWebsite(
  g: Guide,
  input: z.infer<typeof preflightInput>,
) {
  const checks: Check[] = [];
  const scopeSource = g.sources.find((s) => /scope/i.test(s.title))?.id;
  const ids = g.sources.map((s) => s.id);
  const sourceIds = ids.filter((id) => id !== "composio").slice(0, 2);
  let page: { url: string; status: number; html: string };
  if (input.demo) {
    page = {
      url: "https://demo.launchpath.example",
      status: 200,
      html: '<html><body><h1>Relay, an email assistant</h1><p>Draft and send email.</p><a href="/support">Support</a></body></html>',
    };
  } else page = await safeFetch(input.website);
  checks.push({
    title: "Application homepage",
    status: page.status < 400 ? "observed" : "action",
    detail: `HTTP ${page.status} returned from ${page.url}. Reachability is observed; product accuracy and policy compliance require review.`,
    action:
      "Confirm that the page accurately describes the actual application.",
    evidence: page.url,
    sourceIds,
  });
  if (page.status < 400) {
    const links = linksOf(page.html, page.url);
    const privacy = links.find((x) => /privacy/i.test(x.text + " " + x.url));
    if (privacy) {
      try {
        const p = input.demo
          ? { status: 200, html: "privacy" }
          : await safeFetch(privacy.url);
        checks.push({
          title: "Privacy policy link",
          status: p.status < 400 ? "observed" : "action",
          detail: `A privacy link was found and returned HTTP ${p.status}. Its contents have not been evaluated for compliance.`,
          action:
            "Review the actual policy against the provider requirements and your confirmed data practices.",
          evidence: privacy.url,
          sourceIds,
        });
      } catch {
        checks.push({
          title: "Privacy policy link",
          status: "unknown",
          detail: "A link exists, but its destination could not be inspected.",
          action:
            "Open the linked policy and confirm it is publicly accessible.",
          evidence: privacy.url,
          sourceIds,
        });
      }
    } else
      checks.push({
        title: "Privacy policy link",
        status:
          providerProfile(g.domain).policyLinkRequired === false
            ? "unknown"
            : "action",
        detail:
          "No privacy link was detected in the homepage HTML. JavaScript-rendered links may not be visible to this check.",
        action:
          "Check the applicable guide requirement. If required, publish accurate policy information and link it from the homepage.",
        sourceIds,
      });
    checks.push({
      title: "Support contact",
      status: links.some((x) =>
        /support|contact|mailto:/i.test(x.text + " " + x.url),
      )
        ? "observed"
        : "unknown",
      detail:
        "This check looks for contact/support links, not the responsiveness or suitability of the support process.",
      action: "Confirm a usable support channel is available where required.",
      sourceIds,
    });
    checks.push({
      title: "Application description",
      status: textOf(page.html).length > 80 ? "observed" : "unknown",
      detail:
        "Text presence is a heuristic. It cannot establish that the description satisfies provider review.",
      action:
        "Confirm the homepage explains the product and intended integration.",
      sourceIds,
    });
  }
  if (input.redirect) {
    let valid = false;
    try {
      const u = new URL(input.redirect);
      valid = u.protocol === "https:" && !u.username && !u.password && !u.hash;
    } catch {}
    checks.push({
      title: "Redirect URI structure",
      status: valid ? "observed" : "action",
      detail: valid
        ? "An HTTPS URI without credentials or a fragment was supplied. Exact provider matching and actual callback handling remain untested."
        : "The supplied value is not a complete HTTPS redirect URI without credentials/fragments. Provider-specific development exceptions may apply.",
      action:
        "Compare the exact URI with both the provider registration and the integration platform configuration.",
      sourceIds,
    });
  } else
    checks.push({
      title: "Redirect configuration",
      status: "unknown",
      detail: "No redirect URI was supplied. No OAuth request was made.",
      action:
        "Copy the required redirect from your integration configuration and confirm it in the provider console.",
      sourceIds,
    });
  const scopes = input.scopes.split(/[\s,]+/).filter(Boolean);
  checks.push({
    title: "Permission justification",
    status: scopes.length ? "action" : "unknown",
    detail: scopes.length
      ? `${scopes.length} declared scope(s). This static check does not prove they are minimal or that the provider will grant them.`
      : "No scopes supplied; required permissions remain unresolved.",
    action:
      "Map each scope to a real feature and API endpoint. Prepare a justification using confirmed product facts.",
    sourceIds: scopeSource ? [scopeSource] : sourceIds,
  });
  checks.push({
    title: "Account, domain and review status",
    status: "unknown",
    detail:
      "Public website inspection cannot establish account ownership, administrator privileges, domain verification or provider approval.",
    action:
      "Confirm applicable requirements inside the provider console. Record the actual outcome separately.",
    sourceIds,
  });
  return {
    checkedAt: new Date().toISOString(),
    demo: input.demo,
    checks,
    summary: `${checks.filter((c) => c.status === "observed").length} observations · ${checks.filter((c) => c.status === "action").length} actions · ${checks.filter((c) => c.status === "unknown").length} unresolved`,
    limitations:
      "Static public-page inspection and supplied configuration only. No login, authorization exchange, submission, legal assessment or provider approval performed.",
  };
}
