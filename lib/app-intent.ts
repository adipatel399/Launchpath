export function appQuery(input: string) {
  return input
    .trim()
    .replace(
      /^(?:(?:i\s+(?:want|need|would like)\s+to\s+)?(?:connect|integrate)\s+)/i,
      "",
    )
    .replace(
      /\s+(?:to|with|for)\s+(?:my|our|an?|the)\s+(?:ai\s+)?(?:agent|app|application|product).*$/i,
      "",
    )
    .replace(/[.!?]+$/, "")
    .trim();
}
export function matchExistingApp<
  T extends { id: string; name: string; domain: string },
>(input: string, guides: T[]) {
  const q = appQuery(input).toLowerCase();
  let hostname = q;
  try {
    hostname = new URL(q).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    /* An app name is also a valid input. */
  }
  return (
    guides.find(
      (g) =>
        g.name.toLowerCase() === q ||
        g.domain.toLowerCase().replace(/^www\./, "") === hostname ||
        g.id === q,
    ) || null
  );
}
