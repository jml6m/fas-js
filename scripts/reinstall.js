import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync, spawn } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("🗑️  Cleaning dependencies...");

const rootDir = path.resolve(__dirname, "..");
const nodeModules = path.join(rootDir, "node_modules");
const lockFile = path.join(rootDir, "package-lock.json");

if (fs.existsSync(nodeModules)) {
  fs.rmSync(nodeModules, { recursive: true, force: true });
}

if (fs.existsSync(lockFile)) {
  fs.rmSync(lockFile, { force: true });
}

console.log("✨ Clean complete. Installing fresh dependencies...");

try {
  execSync("npm install", { stdio: "inherit", cwd: rootDir });
} catch (error) {
  console.error("❌ Install failed:", error.message);
  process.exit(1);
}

console.log("\n▶ Running audit gate...");
const isWin = process.platform === "win32";
const audit = spawn(isWin ? "npm.cmd" : "npm", ["run", "audit:ci"], {
  stdio: "inherit",
  cwd: rootDir,
});
audit.on("error", (err) => {
  console.error(`❌ Audit gate could not start: ${err.message}`);
  process.exit(1);
});
audit.on("close", (code, signal) => {
  if (signal) {
    console.error(`❌ Audit gate killed by signal: ${signal}`);
    process.exit(1);
  }
  process.exit(typeof code === "number" ? code : 1);
});
