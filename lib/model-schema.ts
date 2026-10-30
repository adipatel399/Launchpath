/** Restrict model citations to the actual evidence supplied for that pass. */
export function constrainCitations(
  schema: Record<string, unknown>,
  sourceIds: string[],
) {
  const copy = structuredClone(schema);
  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    for (const [key, value] of Object.entries(node)) {
      if (key === "sourceIds" && value && typeof value === "object") {
        (value as { items: Record<string, unknown> }).items.enum = [
          ...sourceIds,
        ];
      } else visit(value);
    }
  }
  visit(copy);
  return copy;
}
