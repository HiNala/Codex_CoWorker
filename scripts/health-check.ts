const baseUrl = (process.argv[2] ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const endpoints = ["/api/health/live", "/api/health/ready"] as const;

for (const endpoint of endpoints) {
  const response = await fetch(`${baseUrl}${endpoint}`, {
    signal: AbortSignal.timeout(5_000),
  });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${endpoint} returned ${response.status}: ${body}`);
  }
  console.log(`${endpoint} ${response.status} ${body}`);
}
