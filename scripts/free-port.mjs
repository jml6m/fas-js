import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * @param {number} ms
 */
function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // busy-wait so free-port stays synchronous for server startup
  }
}

/**
 * @param {number} port
 * @returns {number[]}
 */
export function findPidsOnPort(port) {
  const pids = new Set();

  if (process.platform === "win32") {
    try {
      const output = execSync("netstat -ano -p tcp", {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const portPattern = new RegExp(`:${port}\\s`);
      for (const line of output.split(/\r?\n/)) {
        if (!line.includes("LISTENING") || !portPattern.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = Number(parts[parts.length - 1]);
        if (Number.isInteger(pid) && pid > 0) pids.add(pid);
      }
    } catch {
      return [];
    }
    return [...pids];
  }

  try {
    const output = execSync(`lsof -nP -iTCP:${port} -sTCP:LISTEN -t`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    for (const line of output.split(/\r?\n/)) {
      const pid = Number(line.trim());
      if (Number.isInteger(pid) && pid > 0) pids.add(pid);
    }
  } catch {
    return [];
  }

  return [...pids];
}

/**
 * @param {number} pid
 * @returns {boolean}
 */
export function killPid(pid) {
  if (pid === process.pid) return false;

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(pid, "SIGTERM");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Stop processes listening on `port`. Returns PIDs that were signalled.
 * @param {number} port
 * @param {{ waitMs?: number, pollIntervalMs?: number }} [options]
 * @returns {{ port: number, freed: number[], alreadyFree: boolean }}
 */
export function freePort(port, options = {}) {
  const waitMs = options.waitMs ?? 2000;
  const pollIntervalMs = options.pollIntervalMs ?? 100;
  const pids = findPidsOnPort(port);
  if (pids.length === 0) {
    return { port, freed: [], alreadyFree: true };
  }

  const freed = [];
  for (const pid of pids) {
    if (killPid(pid)) freed.push(pid);
  }

  const deadline = Date.now() + waitMs;
  while (Date.now() < deadline) {
    if (findPidsOnPort(port).length === 0) {
      return { port, freed, alreadyFree: false };
    }
    sleep(pollIntervalMs);
  }

  return { port, freed, alreadyFree: freed.length === 0 };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const port = Number(process.argv[2] ?? process.env.DEMO_PORT ?? 3200);
  if (!Number.isInteger(port) || port <= 0) {
    console.error("Usage: node scripts/free-port.mjs <port>");
    process.exit(1);
  }

  const result = freePort(port);
  if (result.freed.length > 0) {
    console.log(`Freed port ${port} (stopped PID ${result.freed.join(", ")})`);
  } else if (result.alreadyFree) {
    console.log(`Port ${port} is already free`);
  } else {
    console.warn(`Port ${port} is in use but could not be freed automatically`);
    process.exit(1);
  }
}
