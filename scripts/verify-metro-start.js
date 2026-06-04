const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const filesToCheck = [
  {
    label: "@expo/cli createFileMap fork",
    path: path.join(
      projectRoot,
      "node_modules",
      "@expo",
      "cli",
      "build",
      "src",
      "start",
      "server",
      "metro",
      "createFileMap-fork.js",
    ),
    mustContain: [
      "return {\n        fileMap,\n        hasteMap,\n        dependencyPlugin\n    };",
    ],
  },
  {
    label: "Metro DependencyGraph guard",
    path: path.join(
      projectRoot,
      "node_modules",
      "metro",
      "src",
      "node-haste",
      "DependencyGraph.js",
    ),
    mustContain: [
      "this._hasteMap?.getModule(name, platform, true) ?? null",
      "this._hasteMap?.getPackage(name, platform, true) ?? null",
    ],
  },
];

let hasErrors = false;

for (const entry of filesToCheck) {
  if (!fs.existsSync(entry.path)) {
    console.error(`[verify-metro] Missing file: ${entry.label}`);
    hasErrors = true;
    continue;
  }

  const content = fs.readFileSync(entry.path, "utf8");
  for (const snippet of entry.mustContain) {
    if (!content.includes(snippet)) {
      console.error(`[verify-metro] Missing expected patch in ${entry.label}`);
      console.error(`  Expected snippet: ${snippet}`);
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log("[verify-metro] Metro patches look good.");
