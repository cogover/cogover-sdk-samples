import { fetch, ValidationError } from "@cogover/sdk";
import type { CogoverFetchInit } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly payload?: unknown;
}

/**
 * A POST with a JSON body. `body` must be a string (`JSON.stringify` it) and `timeoutMs` is clamped
 * by the platform. When a write times out, the remote server may already have applied it: use the
 * remote API's idempotency mechanism and never retry blindly.
 */
export default defineSample<Input>({
    id: "fetch.post-json",
    method: "POST",
    path: "/fetch/post-json",
    summary: "fetch(url, { method: \"POST\", headers, body, timeoutMs }): send JSON to an external HTTPS API.",
    sdk: ["fetch", "CogoverFetchInit"],
    file: "src/samples/10-fetch/post-json.ts",
    curl: `curl -s -X POST "$BASE/fetch/post-json" -H "Content-Type: application/json" --data '{"payload":{"orderId":"ORD-1"}}'`,
    handler: async ({ request }) => {
        const payload = request.body.payload;
        if (payload === undefined) throw new ValidationError("payload is required");

        const init: CogoverFetchInit = {
            method: "POST",
            headers: {
                "content-type": "application/json",
                "idempotency-key": `sample-${Date.now()}`,
            },
            body: JSON.stringify(payload),
            timeoutMs: 5_000,
        };
        const response = await fetch("https://httpbin.org/post", init);
        const echoed = response.ok ? await response.json<{ json?: unknown }>() : null;
        return { status: response.status, ok: response.ok, echoedJson: echoed?.json ?? null };
    },
});
