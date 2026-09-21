import type { RequestMethod } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * `input` is the whole invocation input, including metadata Cogover adds; `request.body` is the
 * business payload only. Prefer `request.body`. `request.method` and `request.path` come from
 * Cogover, never from body fields.
 */
const keysOf = (value: unknown): string[] =>
    value !== null && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];

export default defineSample({
    id: "router.input-vs-body",
    method: "POST",
    path: "/router/input-vs-body",
    summary: "The difference between context.input (whole invocation input) and request.body (business payload).",
    sdk: ["context.input", "request.method", "request.path", "RequestMethod"],
    file: "src/samples/01-router/input-vs-body.ts",
    curl: `curl -s -X POST "$BASE/router/input-vs-body" -H "Content-Type: application/json" --data '{"orderId":"ORD-1","note":"hello"}'`,
    handler: ({ input, request }) => {
        const method: RequestMethod = request.method;
        return {
            method,
            path: request.path,
            bodyKeys: keysOf(request.body),
            inputKeys: keysOf(input),
            note: "request.body excludes invocation metadata and transport fields; use it for business data.",
        };
    },
});
