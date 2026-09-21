import { CogoverApiError, fetch, ValidationError } from "@cogover/sdk";
import type { CogoverFetchInit } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Authenticates an outbound call with a credential stored for the project
 * (`cogover-dev secrets set sample_httpbin --kind BEARER`, allowed host `httpbin.org`). Cogover adds
 * the `Authorization` (or configured) header itself, so project code never handles the value. A
 * credential unknown to the project, not allowed for the host, a request that sets the same header
 * itself, or a Development Session without secret access all fail with `FETCH_BLOCKED`.
 */
export default defineSample({
    id: "fetch.credential",
    method: "GET",
    path: "/fetch/credential",
    summary: "fetch(url, { credential }): let Cogover attach a stored credential; the code never sees the value.",
    sdk: ["fetch", "CogoverFetchInit.credential"],
    file: "src/samples/10-fetch/credential.ts",
    curl: `curl -s "$BASE/fetch/credential?credential=sample_httpbin"`,
    handler: async ({ request }) => {
        const credential = typeof request.query.credential === "string" ? request.query.credential : "sample_httpbin";
        const url = typeof request.query.url === "string" ? request.query.url : "https://httpbin.org/bearer";
        if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(credential)) throw new ValidationError("credential must be a secret name");

        const init: CogoverFetchInit = { method: "GET", credential, headers: { accept: "application/json" }, timeoutMs: 5_000 };
        try {
            const response = await fetch(url, init);
            // httpbin.org/bearer answers 200 with the token it received when the Authorization header was present.
            return { url, credential, status: response.status, ok: response.ok, body: response.ok ? await response.json() : await response.text() };
        } catch (error) {
            if (error instanceof CogoverApiError && error.code === "FETCH_BLOCKED") {
                return { r: 1007, msg: "The credential is unknown, not allowed for this host, or not available in this context.", code: error.code };
            }
            throw error;
        }
    },
});
