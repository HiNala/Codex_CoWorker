export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json({
    status: "live",
    service: "web",
    version: process.env.npm_package_version ?? "0.0.0",
  });
}
