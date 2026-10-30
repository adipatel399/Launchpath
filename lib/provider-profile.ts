import { z } from "zod";
import rawProfiles from "@/data/provider-profiles.json";
const profileSchema = z.object({
  consoleUrl: z.string().url().optional(),
  policyLinkRequired: z.boolean().optional(),
  managedStepIds: z.array(z.string()).optional(),
  manifestTemplate: z.string().optional(),
  adapter: z
    .object({ slug: z.string(), scope: z.string(), purpose: z.string() })
    .optional(),
  adapterOverrides: z
    .record(z.string(), z.object({ scope: z.string(), purpose: z.string() }))
    .optional(),
  capabilities: z
    .array(z.object({ value: z.enum(["read", "send"]), label: z.string() }))
    .optional(),
  rules: z
    .array(
      z.object({
        when: z.record(z.string(), z.string()),
        verdict: z.string().optional(),
        gate: z.string().optional(),
        gateDetail: z.string().optional(),
        excludeStepIds: z.array(z.string()).optional(),
        excludeBlockerTitles: z.array(z.string()).optional(),
        scopeSuffix: z.string().optional(),
      }),
    )
    .optional(),
});
const profiles = z.record(z.string(), profileSchema).parse(rawProfiles);
export type ProviderProfile = z.infer<typeof profileSchema>;
/** Reviewed provider policy and supported adapters are configuration, never model-invented execution instructions. */
export function providerProfile(domain: string): ProviderProfile {
  return profiles[domain.toLowerCase()] || {};
}
