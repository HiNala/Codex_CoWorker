import {
  extractDemoAccessCode,
  gateDemoMutation,
  type DemoAccessDenial,
} from "@forge/demo";

export function demoEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DEMO_MODE: process.env.DEMO_MODE,
    DEMO_ACCESS_CODE: process.env.DEMO_ACCESS_CODE,
  };
}

export function deny(result: DemoAccessDenial): Response {
  return Response.json(
    {
      ok: false,
      code: result.code,
      message: result.message,
    },
    { status: result.status },
  );
}

export function authorizeDemoRequest(request: Request): DemoAccessDenial | { ok: true } {
  const url = new URL(request.url);
  const code = extractDemoAccessCode(request.headers, url.searchParams);
  return gateDemoMutation(demoEnv(), code);
}

export function jsonOk<T extends Record<string, unknown>>(body: T, status = 200): Response {
  return Response.json(body, { status });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): Response {
  return Response.json(
    {
      ok: false,
      code,
      message,
      ...extra,
    },
    { status },
  );
}
