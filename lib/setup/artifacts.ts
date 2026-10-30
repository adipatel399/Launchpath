import { z } from "zod";
import { providerProfile } from "../provider-profile";
import type { Guide, Scenario } from "../schema";
import { deriveGuide } from "../schema";

const slackManifestSchema = z.object({
  display_information: z.object({
    name: z.string().min(1).max(35),
    description: z.string().min(1).max(140),
  }),
  features: z.object({
    bot_user: z.object({
      display_name: z.string().min(1).max(35),
      always_online: z.boolean(),
    }),
  }),
  oauth_config: z.object({
    redirect_urls: z.array(z.string().url()).min(1),
    scopes: z.object({ bot: z.array(z.string()).min(1) }),
  }),
  settings: z.object({
    org_deploy_enabled: z.boolean(),
    socket_mode_enabled: z.boolean(),
  }),
});
export type SetupArtifact = {
  name: string;
  mime: string;
  content: string;
  validation: string;
  sourceUrls: string[];
};
export function buildSetupArtifacts(
  g: Guide,
  scenario: Scenario,
  appName: string,
  callback: string,
): SetupArtifact[] {
  const route = deriveGuide(g, scenario);
  const safeName = appName.trim() || "My agent";
  const urls = g.sources.map((s) => s.url);
  const artifacts: SetupArtifact[] = [
    {
      name: "registration-worksheet.md",
      mime: "text/markdown",
      content: `# ${g.name}: register your provider app\n\nApplication name: ${safeName}\nAudience: ${scenario.audience}\nRequested capabilities: ${route.scopes.map((s) => s.name).join(", ") || "[CONFIRM DOCUMENTED PERMISSIONS]"}\nCallback URI: ${callback || "[COPY THE EXACT URI FROM YOUR INTEGRATION PLATFORM]"}\n\n${route.steps.map((s, i) => `${i + 1}. ${s.title}\n   Owner: ${s.owner}\n   ${s.detail}\n   Completion check: ${s.done}`).join("\n\n")}\n\n## Unresolved questions\n${g.unknowns.map((x) => "- " + x).join("\n") || "No additional questions recorded; validate this route for your own scenario."}\n\n## Important boundary\nThis worksheet was prepared by LaunchPath. It does not register an app, accept provider terms, grant consent, or obtain approval.\n\n## Sources\n${urls.join("\n")}`,
      validation:
        "Prepared from the selected guide. Developer inputs and provider completion remain unverified.",
      sourceUrls: urls,
    },
  ];
  if (providerProfile(g.domain).manifestTemplate === "slack" && callback) {
    const u = new URL(callback);
    if (u.protocol !== "https:" || u.username || u.password || u.hash)
      throw Error(
        "For this Slack manifest, supply an HTTPS callback URI without credentials or a fragment.",
      );
    const manifest = slackManifestSchema.parse({
      display_information: {
        name: safeName,
        description:
          "Agent integration — confirm this describes your real app before creation.",
      },
      features: { bot_user: { display_name: safeName, always_online: false } },
      oauth_config: {
        redirect_urls: [u.href],
        scopes: { bot: ["chat:write"] },
      },
      settings: { org_deploy_enabled: false, socket_mode_enabled: false },
    });
    artifacts.push({
      name: "slack-app-manifest.json",
      mime: "application/json",
      content: JSON.stringify(manifest, null, 2),
      validation:
        "Locally schema-checked manifest draft for the reference message-posting scenario. Slack has not accepted or installed it.",
      sourceUrls: ["https://docs.slack.dev/app-manifests/"],
    });
  }
  artifacts.push({
    name: "agent-runbook.json",
    mime: "application/json",
    content: JSON.stringify(
      {
        provider: g.name,
        scenario,
        steps: route.steps,
        sources: g.sources,
        humanGates: [
          "Provider login and consent",
          "App-registration attestations and terms",
          "Administrator decisions",
          "Provider approval",
        ],
        executionStatus: "prepared_only",
      },
      null,
      2,
    ),
    validation: "Structured runbook prepared; completion is not implied.",
    sourceUrls: urls,
  });
  return artifacts;
}
