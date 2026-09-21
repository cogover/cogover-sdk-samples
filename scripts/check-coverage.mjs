#!/usr/bin/env node
/**
 * Lists every public export of the installed `@cogover/sdk` and the files under `src/` that mention
 * it. Exits with status 1 when an export has no sample, so the check fails after an SDK upgrade
 * until the new APIs have samples. Mentions in comments count: the goal is a lookup index.
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

const files = (await walk(join(root, "src"))).sort();
const contents = new Map(await Promise.all(files.map(async file => [file, await readFile(file, "utf8")])));

const uncovered = [];
console.log(`@cogover/sdk ${sdkPackage.version}: ${exportNames.length} public exports, ${files.length} source files\n`);
for (const name of exportNames) {
    const pattern = new RegExp(`\\b${name}\\b`);
    const hits = files.filter(file => pattern.test(contents.get(file))).map(file => relative(root, file));
    if (hits.length === 0) uncovered.push(name);
    if (!quiet) console.log(`${hits.length === 0 ? "MISSING" : "ok     "} ${name.padEnd(28)} ${hits.length === 0 ? "" : `${hits.length} file(s): ${hits.slice(0, 3).join(", ")}${hits.length > 3 ? ", ..." : ""}`}`);
}

if (uncovered.length > 0) {
    console.error(`\n${uncovered.length} export(s) have no sample: ${uncovered.join(", ")}`);
    console.error("Add a sample under src/samples/ (one file = one route) or reference the type in an existing one.");
    process.exit(1);
}
console.log(`\nEvery public export of @cogover/sdk ${sdkPackage.version} is covered.`);
