import fs from "node:fs";
import path from "node:path";

const libDir = "lib";
const keep = ".gitkeep";

if (!fs.existsSync(libDir)) {
  fs.mkdirSync(libDir, { recursive: true });
}

for (const entry of fs.readdirSync(libDir)) {
  if (entry !== keep) {
    fs.rmSync(path.join(libDir, entry), { recursive: true, force: true });
  }
}

const gitkeepPath = path.join(libDir, keep);
if (!fs.existsSync(gitkeepPath)) {
  fs.writeFileSync(gitkeepPath, "");
}