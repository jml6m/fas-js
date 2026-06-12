import path from "node:path";
import { fileURLToPath } from "node:url";
import { startDemoStaticServer } from "./demo-static-server.mjs";

const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "demo");
const preferredPort = Number(process.env.DEMO_PORT ?? 3000);

const { port, baseUrl, close } = await startDemoStaticServer(demoRoot, {
  port: preferredPort,
});

console.log(`Demo static server running at ${baseUrl}/v1.5/`);
console.log("Press Ctrl+C to stop.");

const shutdown = async () => {
  await close();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);