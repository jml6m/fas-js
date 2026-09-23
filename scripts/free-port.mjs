import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Blocking sleep that doesn't busy-wait/peg a CPU core.
 * @param {number} ms
 */
function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/**
 * @param {number} port
 * @returns {number[]}
 */
export function findPidsOnPort(port) {
  const pids = new Set();

  if (process.platform === "win32") {
    // Any failure here (command missing, unexpected error) is surfaced to the caller —
    // netstat has no "no matches" exit code to special-case, unlike lsof below.
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
  } catch (error) {
    // lsof exits 1 to mean "no matches" — that's a real empty result, not a failure.
    // Anything else (command missing, permission denied, ...) propagates to the caller.
    if (error.status === 1) return [];
    throw error;
  }

  return [...pids];
}

/**
 * @param {number} pid
 * @param {boolean} force
 * @returns {boolean}
 */
export function killPid(pid, force) {
  if (pid === process.pid) return false;

  try {
    if (process.platform === "win32") {
      execSync(`taskkill /PID ${pid} /T${force ? " /F" : ""}`, { stdio: "ignore" });
    } else {
      process.kill(pid, force ? "SIGKILL" : "SIGTERM");
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {number} port
 * @param {number} deadline
 * @param {number} pollIntervalMs
 * @returns {boolean} whether the port was observed free before the deadline
 */
function waitUntilFree(port, deadline, pollIntervalMs) {
  while (Date.now() < deadline) {
    if (findPidsOnPort(port).length === 0) return true;
    sleep(pollIntervalMs);
  }
  return findPidsOnPort(port).length === 0;
}

/**
 * Stop processes listening on `port`. Tries a graceful signal first (SIGTERM /
 * `taskkill` without `/F`) and only escalates to a forced kill (SIGKILL / `taskkill /F`)
 * if the port is still bound once `waitMs` has elapsed.
 * @param {number} port
 * @param {{ waitMs?: number, pollIntervalMs?: number }} [options]
 * @returns {{ port: number, freed: number[], alreadyFree: boolean, stillInUse: boolean }}
 */
export function freePort(port, options = {}) {
  const waitMs = options.waitMs ?? 2000;
  const pollIntervalMs = options.pollIntervalMs ?? 100;

  const initialPids = findPidsOnPort(port);
  if (initialPids.length === 0) {
    return { port, freed: [], alreadyFree: true, stillInUse: false };
  }

  const freed = new Set();
  for (const pid of initialPids) {
    if (killPid(pid, false)) freed.add(pid);
  }

  if (waitUntilFree(port, Date.now() + waitMs, pollIntervalMs)) {
    return { port, freed: [...freed], alreadyFree: false, stillInUse: false };
  }

  // Graceful termination didn't finish in time — escalate to a forced kill.
  for (const pid of findPidsOnPort(port)) {
    if (killPid(pid, true)) freed.add(pid);
  }

  const stillInUse = !waitUntilFree(port, Date.now() + waitMs, pollIntervalMs);
  return { port, freed: [...freed], alreadyFree: false, stillInUse };
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (invokedDirectly) {
  const port = Number(process.argv[2] ?? process.env.DEMO_PORT ?? 3200);
  if (!Number.isInteger(port) || port <= 0) {
    console.error("Usage: node scripts/free-port.mjs <port>");
    process.exit(1);
  }

  try {
    const result = freePort(port);
    if (result.stillInUse) {
      console.warn(`Port ${port} is in use but could not be freed automatically`);
      process.exit(1);
    } else if (result.freed.length > 0) {
      console.log(`Freed port ${port} (stopped PID ${result.freed.join(", ")})`);
    } else {
      console.log(`Port ${port} is already free`);
    }
  } catch (error) {
    console.error(`Could not inspect port ${port}: ${error.message}`);
    process.exit(1);
  }
}
