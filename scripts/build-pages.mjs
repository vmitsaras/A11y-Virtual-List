import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "..");
const examplesRoot = resolve(projectRoot, "examples");
const distRoot = resolve(projectRoot, "dist");
const pagesRoot = resolve(projectRoot, "docs");

const requiredSources = [
  resolve(examplesRoot, "index.html"),
  resolve(projectRoot, ".github", "social-preview.png"),
  resolve(distRoot, "index.js"),
  resolve(distRoot, "index.js.map"),
  resolve(distRoot, "styles.css")
];

for (const source of requiredSources) {
  if (!existsSync(source)) {
    throw new Error(
      `Cannot generate GitHub Pages output: missing ${relative(projectRoot, source)}`
    );
  }
}

const exampleDirectories = readdirSync(examplesRoot, {
  withFileTypes: true
})
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const directory of exampleDirectories) {
  const exampleIndex = resolve(examplesRoot, directory, "index.html");

  if (!existsSync(exampleIndex)) {
    throw new Error(
      `Cannot generate GitHub Pages output: missing examples/${directory}/index.html`
    );
  }
}

rmSync(pagesRoot, { recursive: true, force: true });
mkdirSync(resolve(pagesRoot, "dist"), { recursive: true });

cpSync(resolve(examplesRoot, "index.html"), resolve(pagesRoot, "index.html"));
cpSync(
  resolve(projectRoot, ".github", "social-preview.png"),
  resolve(pagesRoot, "social-preview.png")
);

for (const runtimeFile of ["index.js", "index.js.map", "styles.css"]) {
  cpSync(resolve(distRoot, runtimeFile), resolve(pagesRoot, "dist", runtimeFile));
}

for (const directory of exampleDirectories) {
  const sourceDirectory = resolve(examplesRoot, directory);
  const outputDirectory = resolve(pagesRoot, directory);

  cpSync(sourceDirectory, outputDirectory, {
    recursive: true,
    filter(source) {
      return !source.endsWith("README.md");
    }
  });

  const outputIndex = resolve(outputDirectory, "index.html");
  const html = readFileSync(outputIndex, "utf8").replaceAll(
    "../../dist/",
    "../dist/"
  );

  writeFileSync(outputIndex, html);
}

writeFileSync(resolve(pagesRoot, ".nojekyll"), "");

if (!existsSync(resolve(pagesRoot, "index.html"))) {
  throw new Error("GitHub Pages output does not contain docs/index.html");
}

const generatedHtmlFiles = [
  resolve(pagesRoot, "index.html"),
  ...exampleDirectories.map((directory) =>
    resolve(pagesRoot, directory, "index.html")
  )
];

for (const htmlFile of generatedHtmlFiles) {
  const html = readFileSync(htmlFile, "utf8");
  const relativePath = relative(pagesRoot, htmlFile);

  if (html.includes("../../dist/")) {
    throw new Error(
      `GitHub Pages output contains a stale source-only path in ${relativePath}`
    );
  }

  if (/(?:href|src)=["']\/(?!\/)/u.test(html)) {
    throw new Error(
      `GitHub Pages output contains an absolute-root asset path in ${relativePath}`
    );
  }
}

console.log(
  `Generated GitHub Pages site in docs/ with ${exampleDirectories.length} example route.`
);
