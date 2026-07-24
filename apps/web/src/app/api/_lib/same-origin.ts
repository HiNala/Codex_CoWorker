/**
 * Same-origin gate for browser mutation proxies.
 * Rejects explicit cross-site; compares Origin host when present.
 * Does not trust or echo secrets.
 */

export function isSameOriginRequest(request: Request): boolean {
  const secFetchSite = (request.headers.get("sec-fetch-site") ?? "").toLowerCase();
  if (secFetchSite === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) {
    // No Origin: allow only when fetch metadata says same-origin / none / missing
    // (same-origin navigations, non-CORS tools). Reject same-site cross-subdomain.
    if (secFetchSite === "same-site") return false;
    return true;
  }

  try {
    const reqUrl = new URL(request.url);
    const originUrl = new URL(origin);
    return originUrl.protocol === reqUrl.protocol && originUrl.host === reqUrl.host;
  } catch {
    return false;
  }
}

export function rejectCrossOrigin(): Response {
  return Response.json(
    {
      ok: false,
      code: "cross_origin",
      message: "Same-origin requests only.",
    },
    { status: 403 },
  );
}
