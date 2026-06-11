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

/**
 * Serves the demo/ tree for local development and automated smoke tests.
 * @param {string} demoRoot Absolute path to the demo/ directory
 * @param {{ port?: number }} [options]
 */
export function startDemoStaticServer(demoRoot, options = {}) {
  const root = path.resolve(demoRoot);
  const requestedPort = options.port ?? 0;

  const server = http.createServer((req, res) => {
    let urlPath = (req.url ?? "/").split("?")[0];
    urlPath = urlPath.replace(/^\/+/, "");
    if (urlPath === "" || urlPath.endsWith("/")) {
      urlPath += "index.html";
    }

    const filePath = path.resolve(root, urlPath);
    const rootPrefix = root.endsWith(path.sep) ? root : root + path.sep;
    if (!filePath.startsWith(rootPrefix)) {
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