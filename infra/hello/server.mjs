import http from "node:http";

const port = Number(process.env.PORT ?? 3000);
const startedAt = new Date().toISOString();

const server = http.createServer((req, res) => {
  const url = req.url ?? "/";

  if (url === "/api/health/live" || url === "/health" || url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        status: "live",
        service: "hello",
        startedAt,
        version: "0.0.1-hello",
      }),
    );
    return;
  }

  if (url === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>FORGE · deploy path live</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #0b0a12; color: #f4f1ff; margin: 0; min-height: 100vh; display: grid; place-items: center; }
      main { max-width: 40rem; padding: 2rem; border: 1px solid rgba(255,255,255,.12); border-radius: 1rem; background: rgba(255,255,255,.04); }
      h1 { margin: 0 0 .75rem; letter-spacing: -0.04em; }
      p { color: rgba(244,241,255,.72); line-height: 1.5; }
      code { color: #9ad7ff; }
    </style>
  </head>
  <body>
    <main>
      <h1>FORGE deploy path is live</h1>
      <p>Hello-world Railway service. Health: <code>/api/health/live</code>. Started ${startedAt}.</p>
    </main>
  </body>
</html>`);
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ level: "info", msg: "hello listening", port, startedAt }));
});

function shutdown(signal) {
  console.log(JSON.stringify({ level: "info", msg: "shutdown", signal }));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 8_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
