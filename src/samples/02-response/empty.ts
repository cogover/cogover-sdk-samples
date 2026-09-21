import { defineSample } from "../../sample.js";

/**
 * `response.empty()` answers with no body and status 204 by default. Returning `null` from a handler
 * is different: it produces a JSON `null` result with status 200.
 */
export default defineSample({
    id: "response.empty",
    method: "DELETE",
    path: "/response/empty",
    summary: "response.empty() (204, no body) versus returning null (200 with a JSON null).",
    sdk: ["response.empty"],
    file: "src/samples/02-response/empty.ts",
    curl: `curl -s -i -X DELETE "$BASE/response/empty"   # add ?mode=null to compare`,
    handler: ({ request, response }) => {
        if (request.query.mode === "null") return null;
        return response.empty({ headers: { "x-sample-deleted": "1" } });
    },
});
