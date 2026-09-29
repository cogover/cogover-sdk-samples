import { NotFoundError } from "@cogover/sdk";
import type { ActionManifest, JsonSchema } from "@cogover/sdk";
import { actionManifests } from "../../actions/index.js";
import { defineSample } from "../../sample.js";

/** The top-level input properties a Process node fills, as the builders read them from the JSON Schema. */
function inputProperties(schema: JsonSchema): string[] {
    const properties = schema.properties;
    return properties !== null && typeof properties === "object" && !Array.isArray(properties) ? Object.keys(properties) : [];
}

/**
 * Returns the normalized configuration of the project's actions, exactly what Cogover stores when the version is
 * published and what Process Builder and AI Agent Builder show: `description` is "" when none was given,
 * `timeoutMs` defaults to 8000, and `inputSchema` / `outputSchema` are the JSON Schemas built by `s`. The labels,
 * descriptions and schemas are visible to every active member of the Workspace, so they never hold secrets.
 */
export default defineSample({
    id: "actions.manifests",
    method: "GET",
    path: "/actions/manifests",
    summary: "The actions export: every ActionDefinition.config (ActionManifest) with its input and output JSON Schema, or one with ?key=.",
    sdk: ["defineAction", "ActionDefinition.config", "ActionManifest", "JsonSchema", "actions export"],
    file: "src/samples/24-actions/manifests.ts",
    curl: `curl -s "$BASE/actions/manifests?key=sample_score_customer"`,
    handler: ({ request }) => {
        const key = request.query.key;
        const selected: readonly ActionManifest[] = typeof key === "string"
            ? actionManifests.filter(manifest => manifest.key === key)
            : actionManifests;
        if (typeof key === "string" && selected.length === 0) throw new NotFoundError("action", key);
        return {
            count: selected.length,
            actions: selected.map(manifest => ({ ...manifest, inputProperties: inputProperties(manifest.inputSchema) })),
        };
    },
});
