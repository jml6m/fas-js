import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

function isWithinRoot(root, filePath) {
  const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
  return filePath === root || filePath.startsWith(rootPrefix);
}

/**
 * Resolve a URL path under demoRoot to a file on disk.
 * Rejects `..` segments and absolute paths so user input never escapes the root
 * (CodeQL js/path-injection). Supports directory paths with or without a trailing
 * slash (e.g. /v1.5 → index.html).
 */
export function resolveDemoFilePath(demoRoot, urlPath) {
  const root = path.resolve(demoRoot);
  const raw = (urlPath ?? "/").split("?")[0];

  let decoded;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }
  if (decoded.includes("\0")) {
    return null;
  }

  // Build from root using only path segments — never pass raw user strings to path.resolve.
  const segments = decoded
    .replace(/^\/+/, "")
    .split(/[/\\]+/)
    .filter(seg => seg.length > 0 && seg !== ".");

  if (segments.some(seg => seg === "..")) {
    return null;
  }

  let filePath = root;
  for (const seg of segments) {
    filePath = path.join(filePath, seg);
  }

  if (!isWithinRoot(root, filePath)) {
    return null;
  }

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, "index.html");
  } else if (segments.length === 0 || !path.extname(segments[segments.length - 1] ?? "")) {
    // No extension (or empty path): prefer index.html when the file itself is missing.
    if (!fs.existsSync(filePath)) {
      const indexCandidate = path.join(filePath, "index.html");
      if (fs.existsSync(indexCandidate)) {
        filePath = indexCandidate;
      }
    } else if (decoded.endsWith("/")) {
      filePath = path.join(filePath, "index.html");
    }
  }

  if (!isWithinRoot(root, filePath)) {
    return null;
  }

  return filePath;
}

/**
 * Serves the demo/ tree for local development and automated smoke tests.
 * @param {string} demoRoot Absolute path to the demo/ directory
 * @param {{ port?: number }} [options]
 */
export function startDemoStaticServer(demoRoot, options = {}) {
  const root = path.resolve(demoRoot);
  const requestedPort = options.port ?? 0;

  const server = http.createServer((req, res) => {
    const filePath = resolveDemoFilePath(root, req.url ?? "/");
    if (!filePath) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME_TYPES[ext] ?? "application/octet-stream",
      });
      res.end(data);
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(requestedPort, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to bind demo static server"));
        return;
      }

      resolve({
        server,
        port: address.port,
        baseUrl: `http://127.0.0.1:${address.port}`,
        close() {
          return new Promise((closeResolve, closeReject) => {
            server.closeAllConnections();
            server.close(closeError => {
              if (closeError) closeReject(closeError);
              else closeResolve();
            });
          });
        },
      });
    });
  });
}
