import { z } from "zod";
import { providerProfile } from "./provider-profile";
export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  excerpt: z.string(),
  checkedAt: z.string(),
  retrieval: z.enum(["direct", "search-extraction"]).optional(),
});
export const stepSchema = z.object({
  id: z.string(),
  title: z.string(),
  detail: z.string(),
  owner: z.enum(["Developer", "Agent", "Admin", "Provider"]),
  done: z.string(),
  sourceIds: z.array(z.string()).min(1),
  condition: z.string().default("Always"),
});
export const guideSchema = z.object({
  id: z.string(),
  name: z.string(),
  domain: z.string(),
  description: z.string(),
  category: z.string(),
  color: z.string(),
  monogram: z.string(),
  verdict: z.string(),
  effort: z.string(),
  wait: z.string(),
  estimateBasis: z.string(),
  managed: z.enum(["Available", "Check availability", "Not established"]),
  scopes: z.array(
    z.object({
      name: z.string(),
      purpose: z.string(),
      classification: z.string(),
      evidenceSourceId: z.string().optional(),
      evidenceQuote: z.string().optional(),
      sourceIds: z.array(z.string()).min(1),
    }),
  ),
  steps: z.array(stepSchema).min(1),
  sources: z.array(sourceSchema).min(1),
  blockers: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      action: z.string(),
      owner: z.string(),
      sourceIds: z.array(z.string()).min(1),
    }),
  ),
  unknowns: z.array(z.string()),
  tested: z.string(),
  generated: z.boolean(),
  createdAt: z.string(),
  researchContext: z.string().optional(),
  permissionsEvidenceChecked: z.boolean().optional(),
});
export type Guide = z.infer<typeof guideSchema>;
export type Source = z.infer<typeof sourceSchema>;
export function validateGuide(value: unknown) {
  const g = guideSchema.parse(value);
  const ids = new Set(g.sources.map((s) => s.id));
  for (const item of [...g.steps, ...g.scopes, ...g.blockers])
    for (const id of item.sourceIds)
      if (!ids.has(id)) throw Error("A claim references an unavailable source");
  for (const s of g.sources)
    if (!["http:", "https:"].includes(new URL(s.url).protocol))
      throw Error("Unsafe source URL");
  return g;
}
export type Scenario = {
  audience: "internal" | "pilot" | "public";
  capability: "send" | "read";
  route: "custom" | "managed";
};
export function deriveGuide(g: Guide, s: Scenario) {
  const profile = providerProfile(g.domain);
  const isManaged = s.route === "managed" && g.managed === "Available";
  let verdict = g.verdict;
  let gate = g.blockers[0]?.title || "Confirm unresolved requirements";
  let gateDetail = g.blockers[0]?.detail;
  let scopes = g.scopes;
  const excluded = new Set<string>();
  const excludedBlockers = new Set<string>();
  for (const rule of profile.rules || []) {
    if (
      !Object.entries(rule.when).every(([k, v]) => s[k as keyof Scenario] === v)
    )
      continue;
    if (rule.verdict) verdict = rule.verdict;
    if (rule.gate) gate = rule.gate;
    if (rule.gateDetail) gateDetail = rule.gateDetail;
    if (rule.scopeSuffix)
      scopes = g.scopes.filter((x) => x.name.endsWith(rule.scopeSuffix!));
    rule.excludeStepIds?.forEach((id) => excluded.add(id));
    rule.excludeBlockerTitles?.forEach((title) => excludedBlockers.add(title));
  }
  if (isManaged) {
    verdict =
      "Consider Composio-managed OAuth first. Confirm its current scopes cover your features and that its consent identity fits your needs.";
    gate = "Confirm managed scopes and customer policies";
    gateDetail =
      "Managed auth does not remove customer installation policies. Confirm the current toolkit method and scopes.";
  }
  const steps = g.steps.filter((x) =>
    isManaged && profile.managedStepIds
      ? profile.managedStepIds.includes(x.id)
      : !excluded.has(x.id),
  );
  return {
    verdict,
    gate,
    gateDetail,
    steps,
    isManaged,
    scopes,
    blockers: g.blockers.filter((b) => !excludedBlockers.has(b.title)),
  };
}
