import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const expectedPackageFiles = [
  "CHANGELOG.md",
  "LICENSE",
  "README.md",
  "dist/docs.d.ts",
  "dist/docs.d.ts.map",
  "dist/docs.js",
  "dist/docs.js.map",
  "dist/index.d.ts",
  "dist/index.d.ts.map",
  "dist/index.js",
  "dist/index.js.map",
  "dist/styles.css",
  "package.json"
];

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const temporaryRoot = mkdtempSync(join(tmpdir(), "a11y-virtual-list-package-"));
const cacheDirectory = join(temporaryRoot, "npm-cache");

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`${command} ${args.join(" ")} failed.`);
  }

  return result;
}

function listFiles(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();
}

try {
  run(
    npmCommand,
    [
      "pack",
      "--silent",
      "--pack-destination",
      temporaryRoot,
      "--cache",
      cacheDirectory
    ],
    process.cwd()
  );

  const tarballs = readdirSync(temporaryRoot)
    .filter((file) => file.endsWith(".tgz"))
    .map((file) => join(temporaryRoot, file));

  if (tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}.`);
  }

  writeFileSync(
    join(temporaryRoot, "package.json"),
    JSON.stringify({ private: true, type: "module" })
  );

  run(
    npmCommand,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      "--cache",
      cacheDirectory,
      tarballs[0]
    ],
    temporaryRoot
  );

  const installedPackage = join(
    temporaryRoot,
    "node_modules",
    "a11y-virtual-list"
  );
  const installedFiles = listFiles(installedPackage);

  if (JSON.stringify(installedFiles) !== JSON.stringify(expectedPackageFiles)) {
    throw new Error(
      `Unexpected installed package contents:\n${installedFiles.join("\n")}`
    );
  }

  const installedManifest = JSON.parse(
    readFileSync(join(installedPackage, "package.json"), "utf8")
  );

  if (Object.keys(installedManifest.dependencies ?? {}).length !== 0) {
    throw new Error("The installed package has runtime dependencies.");
  }

  writeFileSync(
    join(temporaryRoot, "verify.mjs"),
    `import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  A11yVirtualList,
  createVirtualList,
  initVirtualListAll
} from "a11y-virtual-list";
import { docs } from "a11y-virtual-list/docs";

for (const value of [A11yVirtualList, createVirtualList, initVirtualListAll]) {
  if (typeof value !== "function") {
    throw new TypeError("A package entry point did not expose its expected function.");
  }
}

if (docs.packageName !== "a11y-virtual-list") {
  throw new Error("The docs entry point did not expose the expected metadata.");
}

await access(fileURLToPath(import.meta.resolve("a11y-virtual-list/styles.css")));
`
  );

  run(process.execPath, [join(temporaryRoot, "verify.mjs")], temporaryRoot);
  process.stdout.write("Verified package contents and installed-tarball imports.\n");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
