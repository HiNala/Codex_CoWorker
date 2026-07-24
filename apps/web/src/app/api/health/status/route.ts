import { getProviderStatus } from "@/server/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return Response.json(getProviderStatus());
}
