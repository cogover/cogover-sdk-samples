import { fetch } from "@cogover/sdk";
import type { CogoverFetchHeaders, CogoverFetchResponse } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface NpmDistTags {
    readonly version?: string;
}

/**
 * Outbound HTTPS through Cogover's managed network layer. Import `fetch` from the SDK so the
 * dependency is explicit and local Node.js never uses its own unrestricted `fetch`. Only absolute
 * public HTTPS URLs on port 443 are accepted; the destination must be allowed for the project.
 */
export default defineSample({
    id: "fetch.get-json",
    method: "GET",
    path: "/fetch/get-json",
    summary: "fetch(url): GET a public HTTPS resource and read the JSON body (latest @cogover/sdk version).",
    sdk: ["fetch", "CogoverFetchResponse", "CogoverFetchHeaders", "response.json"],
    file: "src/samples/10-fetch/get-json.ts",
    curl: `curl -s "$BASE/fetch/get-json"`,
    handler: async ({ request }) => {
        const url = typeof request.query.url === "string" ? request.query.url : "https://registry.npmjs.org/@cogover/sdk/latest";
        const response: CogoverFetchResponse = await fetch(url, {
            method: "GET",
            headers: { accept: "application/json" },
            timeoutMs: 5_000,
        });
        const headers: CogoverFetchHeaders = response.headers;
        const body = response.ok ? await response.json<NpmDistTags>() : await response.text();
        return {
            url: response.url,
            status: response.status,
            ok: response.ok,
            contentType: headers.get("content-type"),
            latestSdkVersion: typeof body === "object" ? body.version ?? null : null,
            body,
        };
    },
});
