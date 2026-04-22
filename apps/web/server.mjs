import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, "dist");
const PUBLIC_DIR = join(__dirname, "public");
const INDEX_FILE = join(DIST_DIR, "index.html");
const HOSTNAME = process.env.HOSTNAME || "0.0.0.0";
const PORT = Number.parseInt(process.env.PORT || process.env.WEB_PORT || "3000", 10);
const API_PORT = process.env.API_PORT || "3001";
const API_TARGET = new URL(process.env.API_URL || `http://127.0.0.1:${API_PORT}`);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".woff2": "font/woff2",
};

function sendFile(res, filePath) {
  const ext = extname(filePath);
  const stat = statSync(filePath);
  const shouldDisableCache =
    filePath.endsWith("index.html") ||
    filePath.endsWith("runtime-config.js") ||
    filePath.endsWith("sw.js") ||
    filePath.endsWith("manifest.webmanifest");
  res.writeHead(200, {
    "Content-Length": stat.size,
    "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
    "Cache-Control": shouldDisableCache
      ? "no-cache"
      : "public, max-age=31536000, immutable",
    ...(filePath.endsWith("sw.js")
      ? {
          "Service-Worker-Allowed": "/",
        }
      : {}),
  });
  createReadStream(filePath).pipe(res);
}

function resolveStaticPath(pathname) {
  const normalizedPath =
    pathname === "/" ? "/index.html" : normalize(decodeURIComponent(pathname));
  const candidates = [
    join(DIST_DIR, normalizedPath),
    join(PUBLIC_DIR, normalizedPath),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function proxyApi(req, res) {
  const transport = API_TARGET.protocol === "https:" ? httpsRequest : httpRequest;
  const upstream = transport(
    {
      protocol: API_TARGET.protocol,
      hostname: API_TARGET.hostname,
      port: API_TARGET.port,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: API_TARGET.host,
      },
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode || 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    console.error("API proxy failed:", error);
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json; charset=utf-8" });
    }
    res.end(JSON.stringify({ error: "Upstream API unavailable" }));
  });

  req.pipe(upstream);
}

const server = createHttpServer((req, res) => {
  if (!req.url) {
    res.writeHead(400);
    res.end("Bad Request");
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (url.pathname.startsWith("/api/")) {
    proxyApi(req, res);
    return;
  }

  const staticPath = resolveStaticPath(url.pathname);
  if (staticPath) {
    sendFile(res, staticPath);
    return;
  }

  sendFile(res, INDEX_FILE);
});

server.listen(PORT, HOSTNAME, () => {
  console.info(`Web UI listening on http://${HOSTNAME}:${PORT}`);
});
