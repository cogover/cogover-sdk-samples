import type { ScriptQuery } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Query string parameters. A name that appears once is a string; a repeated name becomes a readonly
 * array. Values are strings: convert and validate numbers yourself.
 */
export default defineSample({
    id: "router.query",
    method: "GET",
    path: "/router/query",
    summary: "request.query: single values are strings, repeated names become readonly arrays.",
    sdk: ["request.query", "ScriptQuery"],
    file: "src/samples/01-router/query.ts",
    curl: `curl -s "$BASE/router/query?q=laptop&tag=rush&tag=gift&limit=5"`,
    handler: ({ request }) => {
        const query: ScriptQuery = request.query;
        const tags = query.tag === undefined ? [] : typeof query.tag === "string" ? [query.tag] : [...query.tag];
        const limit = typeof query.limit === "string" ? Number(query.limit) : Number.NaN;
        return {
            q: typeof query.q === "string" ? query.q : null,
            tags,
            limit: Number.isInteger(limit) && limit > 0 ? limit : 20,
            raw: query,
        };
    },
});
