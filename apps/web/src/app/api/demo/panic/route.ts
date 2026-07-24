import { applyPanicAdapters, isAllFake } from "@forge/demo";
import { authorizeDemoRequest, deny, jsonOk } from "../_shared";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/demo/panic — all adapters → fake.
 * Completes synchronously; intended under 1s including RTT.
 */
export function POST(request: Request) {
  const auth = authorizeDemoRequest(request);
  if (!auth.ok) return deny(auth);

  const at = new Date().toISOString();
  const adapters = applyPanicAdapters(at);

  return jsonOk({
    ok: true,
    panicked: true,
    at,
    adapters,
    allFake: isAllFake(adapters),
    // Full process env flip for workers still reading ADAPTER_* requires restart.
    processEnvRestartRequired: true,
    message: "All demo adapters set to fake in the demo runtime.",
  });
}
