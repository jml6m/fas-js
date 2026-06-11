import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

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
