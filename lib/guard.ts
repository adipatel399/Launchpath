import { NextRequest } from "next/server";
const windows = new Map<string, { at: number; n: number }>();
export function guard(req: NextRequest, kind: string) {
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host"))
    throw Error("Cross-origin requests are not accepted.");
  const token = process.env.LAUNCHPATH_API_TOKEN;
  if (token && req.headers.get("x-launchpath-token") !== token)
    throw Error("This deployment requires an API access token.");
  const key = kind + ":" + (req.headers.get("x-forwarded-for") || "local");
  const now = Date.now();
  for (const [k, v] of windows) if (now - v.at > 3600000) windows.delete(k);
  let w = windows.get(key);
  if (!w || now - w.at > 600000) {
    w = { at: now, n: 0 };
    windows.set(key, w);
  }
  if (++w.n > 12)
    throw Error("Run limit reached. Please wait ten minutes before retrying.");
  if (Number(req.headers.get("content-length") || 0) > 12000)
    throw Error("Request too large.");
}
