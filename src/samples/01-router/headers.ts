import type { ScriptHeaders } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Request headers. Names are lower-case and only headers allowlisted by Cogover are visible.
 * Credentials such as `authorization` and `cookie` are never exposed to project code.
 */
export default defineSample({
    id: "router.headers",
    method: "GET",
    path: "/router/headers",
    summary: "request.headers: lower-case, allowlisted by Cogover; credentials are never exposed.",
    sdk: ["request.headers", "ScriptHeaders"],
    file: "src/samples/01-router/headers.ts",
    curl: `curl -s "$BASE/router/headers" -H "Accept-Language: vi" -H "Authorization: Bearer hidden"`,
    handler: ({ request }) => {
        const headers: ScriptHeaders = request.headers;
        return {
            acceptLanguage: headers["accept-language"] ?? null,
            contentType: headers["content-type"] ?? null,
            authorization: headers.authorization ?? "(never exposed to project code)",
            headers,
        };
    },
});
