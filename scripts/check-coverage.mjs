#!/usr/bin/env node
/**
 * Lists every public export of the installed `@cogover/sdk` and the files under `src/` that import
 * it from `@cogover/sdk` (a mention in a comment does not count). Exits with status 1 when an export
 * has no sample, so the check fails after an SDK upgrade until the new APIs have samples.
 * `WorkspaceObjects` counts when a file augments it through `declare module "@cogover/sdk"`.
 *
 * Usage: node scripts/check-coverage.mjs [--quiet]
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const quiet = process.argv.includes("--quiet");

const sdkPackage = JSON.parse(await readFile(join(root, "node_modules/@cogover/sdk/package.json"), "utf8"));
const declaration = await readFile(join(root, "node_modules/@cogover/sdk/dist/index.d.ts"), "utf8");
const exportNames = [...new Set(
    [...declaration.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)]
        .flatMap(match => match[1].split(","))
        .map(entry => entry.trim().split(/\s+as\s+/).pop())
        .filter(name => name && name.length > 0),
)].sort((left, right) => left.localeCompare(right));

async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) files.push(...await walk(path));
        else if (entry.name.endsWith(".ts")) files.push(path);
    }
    return files;
}

const IMPORT_CLAUSE = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"@cogover\/sdk"/g;
const AUGMENTATION = /declare\s+module\s+"@cogover\/sdk"[\s\S]*?interface\s+WorkspaceObjects/;

function importedNames(source) {
    const names = new Set();
    for (const match of source.matchAll(IMPORT_CLAUSE)) {
        for (const entry of match[1].split(",")) {
            const name = entry.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim();
            if (name.length > 0) names.add(name);
        }
    }
    if (AUGMENTATION.test(source)) names.add("WorkspaceObjects");
    return names;
}

const files = (await walk(join(root, "src"))).sort();
const imports = new Map(await Promise.all(files.map(async file => [file, importedNames(await readFile(file, "utf8"))])));

const uncovered = [];
console.log(`@cogover/sdk ${sdkPackage.version}: ${exportNames.length} public exports, ${files.length} source files\n`);
for (const name of exportNames) {
    const hits = files.filter(file => imports.get(file).has(name)).map(file => relative(root, file));
    if (hits.length === 0) uncovered.push(name);
    if (!quiet) console.log(`${hits.length === 0 ? "MISSING" : "ok     "} ${name.padEnd(28)} ${hits.length === 0 ? "" : `${hits.length} file(s): ${hits.slice(0, 3).join(", ")}${hits.length > 3 ? ", ..." : ""}`}`);
}

if (uncovered.length > 0) {
    console.error(`\n${uncovered.length} export(s) have no sample: ${uncovered.join(", ")}`);
    console.error("Add a sample under src/samples/ (one file = one route) that imports it from @cogover/sdk.");
    process.exit(1);
}
console.log(`\nEvery public export of @cogover/sdk ${sdkPackage.version} is covered.`);
