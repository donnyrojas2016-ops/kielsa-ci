// api/supabase/[...path].js
//
// "Puente" (proxy) para saltar el problema de CORS que tiene ahora mismo el
// proyecto Supabase de Kielsa CI (jvithjvoyvxeljlectli). El navegador bloquea
// las llamadas directas a supabase.co porque el servidor no está mandando la
// cabecera Access-Control-Allow-Origin (parte del incidente de Supabase que
// sigue activo). Esta función corre en el SERVIDOR de Vercel, no en el
// navegador, así que la restricción de CORS no le aplica: recibe la petición
// del navegador (que ahora es del mismo origen, kielsa-ci.vercel.app, así que
// tampoco dispara CORS de este lado) y la reenvía tal cual a Supabase.
//
// No cubre Realtime (los cambios en vivo/websocket) — esa parte seguirá sin
// funcionar hasta que Supabase resuelva su incidente. Todo lo demás (leer,
// guardar, login, funciones RPC) debería volver a funcionar normal.

export const config = { runtime: "nodejs" };

const SUPABASE_URL = "https://jvithjvoyvxeljlectli.supabase.co";

// Cabeceras que no se deben reenviar tal cual (las controla el runtime o no
// aplican de un salto al otro).
const HOP_BY_HOP_REQUEST = new Set([
  "host", "connection", "content-length", "accept-encoding",
]);
const HOP_BY_HOP_RESPONSE = new Set([
  "content-encoding", "transfer-encoding", "connection", "content-length",
]);

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.status(204).end();
    return;
  }
  try {
    const { path } = req.query;
    const subpath = Array.isArray(path) ? path.join("/") : (path || "");

    const target = new URL(SUPABASE_URL + "/" + subpath);
    const incoming = new URL(req.url, "http://placeholder");
    for (const [k, v] of incoming.searchParams) {
      if (k === "path") continue;
      target.searchParams.append(k, v);
    }

    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (HOP_BY_HOP_REQUEST.has(k.toLowerCase())) continue;
      if (v != null) headers[k] = Array.isArray(v) ? v.join(", ") : v;
    }

    const init = { method: req.method, headers };
    if (!["GET", "HEAD"].includes(req.method)) {
      if (req.body !== undefined && req.body !== null && req.body !== "") {
        init.body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
        if (!headers["content-type"] && !headers["Content-Type"]) {
          headers["content-type"] = "application/json";
        }
      }
    }

    const upstream = await fetch(target.toString(), init);
    const buf = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (HOP_BY_HOP_RESPONSE.has(key.toLowerCase())) return;
      res.setHeader(key, value);
    });
    // Por si en algún momento se llama desde otro origen (ej. el tablero de
    // cierre regional) en vez de siempre desde el mismo dominio.
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
    res.send(buf);
  } catch (e) {
    res.status(502).json({ error: "Error en el puente hacia Supabase: " + (e && e.message ? e.message : String(e)) });
  }
}
