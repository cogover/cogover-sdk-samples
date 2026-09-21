import type { ResponseHeaderValue, ResponseInit } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * `response.json(body, init)` controls the status and headers of a JSON response. A header value is
 * one string or a readonly array of strings. Hop-by-hop, credential-setting and reserved Cogover
 * headers are rejected.
 */
export default defineSample({
    id: "response.json-status",
    method: "POST",
    path: "/response/json",
    summary: "response.json() with a custom status (201) and response headers.",
    sdk: ["response.json", "ResponseApi", "ResponseInit", "ResponseHeaderValue", "ScriptResponse"],
    file: "src/samples/02-response/json-status.ts",
    curl: `curl -s -i -X POST "$BASE/response/json" -H "Content-Type: application/json" --data '{}'`,
    handler: ({ response }) => {
        const tags: ResponseHeaderValue = ["sample", "json"];
        const init: ResponseInit = {
            status: 201,
            headers: { location: "/response/json/ORD-1", "x-sample-tags": tags },
        };
        return response.json({ id: "ORD-1", created: true }, init);
    },
});
