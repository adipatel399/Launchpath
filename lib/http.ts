export async function readJSON(
  request: Request,
  maxBytes = 12000,
): Promise<unknown> {
  if (Number(request.headers.get("content-length") || 0) > maxBytes)
    throw Error("Request exceeds the size limit.");
  const reader = request.body?.getReader();
  if (!reader) throw Error("A JSON body is required.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > maxBytes) {
      await reader.cancel();
      throw Error("Request exceeds the size limit.");
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Error("Request body must be valid JSON.");
  }
}
