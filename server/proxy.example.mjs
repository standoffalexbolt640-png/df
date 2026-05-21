// Минимальный пример бэкенд-прокси для Xwin AI Pro.
// Запуск: ANTHROPIC_API_KEY=sk-ant-... node server/proxy.example.mjs
// Требует Node 18+ (используется встроенный fetch и Streams API).
//
// Прокси слушает POST /api/chat, добавляет x-api-key к запросу и
// ретранслирует SSE-стрим от Anthropic клиенту 1:1.

import http from "node:http";
import { Readable } from "node:stream";

const PORT = process.env.PORT || 3001;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const UPSTREAM = "https://api.anthropic.com/v1/messages";
// CORS_ORIGIN можно задать в env, чтобы фронтенд с другого домена/порта мог ходить сюда.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";

if (!API_KEY) {
  console.error("ANTHROPIC_API_KEY не задан. Передайте его через env.");
  process.exit(1);
}

const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }
  if (req.method !== "POST" || req.url !== "/api/chat") {
    res.writeHead(404, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  // Собираем тело запроса.
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const bodyRaw = Buffer.concat(chunks).toString("utf8");

  let body;
  try {
    body = JSON.parse(bodyRaw);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }

  // Принудительно ставим stream: true — фронтенд ждёт SSE.
  body.stream = true;

  try {
    const upstream = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      res.writeHead(upstream.status || 500, { "Content-Type": "application/json", ...corsHeaders });
      res.end(text || JSON.stringify({ error: `Upstream ${upstream.status}` }));
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      ...corsHeaders,
    });

    // Ретранслируем SSE-стрим напрямую.
    Readable.fromWeb(upstream.body).pipe(res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json", ...corsHeaders });
    res.end(JSON.stringify({ error: err?.message || "Proxy error" }));
  }
});

server.listen(PORT, () => {
  console.log(`Xwin proxy listening on http://localhost:${PORT}/api/chat`);
});
