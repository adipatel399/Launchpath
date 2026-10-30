type CandidatePermission = {
  name: string;
  purpose: string;
  classification: string;
  sourceIds: string[];
  evidenceSourceId?: string;
  evidenceQuote?: string;
};
type Document = { id: string; text: string; url: string };
const normalize = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/`/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
/** Locate a short supporting phrase; this is a provenance check, not proof of semantic correctness. */
export function screenPermissionEvidence(
  scopes: CandidatePermission[],
  documents: Document[],
  provider: string,
  scenario: string,
) {
  const unknowns: string[] = [];
  const budget = new Map<string, number>();
  const accepted: CandidatePermission[] = [];
  for (const scope of scopes) {
    const doc = documents.find((d) => d.id === scope.evidenceSourceId);
    const quote = scope.evidenceQuote?.trim() || "";
    const count = quote.split(/\s+/).filter(Boolean).length;
    const label = normalize(scope.name);
    const generic =
      label === normalize(provider + " API") ||
      /^(workspace pages and databases|api access|full access to the api)$/i.test(
        scope.name,
      );
    const explicitReadOnly =
      /read.only|only reads?|reads? only|never (?:creates?|modifies?|writes?|sends?)/i.test(
        scenario,
      );
    const writePermission =
      /(?:^|[\s/:._-])(write|admin|modify|send|create|delete|manage|update|insert)(?:$|[\s/:._-])/i.test(
        scope.name,
      );
    if (
      generic ||
      !doc ||
      !scope.sourceIds.includes(doc.id) ||
      !quote ||
      count > 8 ||
      !normalize(doc.text).includes(normalize(quote)) ||
      !normalize(quote).includes(label) ||
      (budget.get(doc.id) || 0) + count > 25 ||
      (explicitReadOnly && writePermission)
    ) {
      unknowns.push(
        `Permission recommendation “${scope.name}” was withheld: its exact meaning, short supporting phrase, or fit for the stated use case needs confirmation against provider documentation.`,
      );
      continue;
    }
    budget.set(doc.id, (budget.get(doc.id) || 0) + count);
    accepted.push(scope);
  }
  return { scopes: accepted, unknowns };
}
