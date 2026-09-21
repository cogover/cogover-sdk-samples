import { CogoverApiError, NotFoundError, PermissionDeniedError } from "@cogover/sdk";
import type { CogoverRecordId } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Turns SDK errors into the project's own client response. Check subclasses before the base class.
 * `error.code` is the SDK category, `error.r` the original server result code (undefined for local
 * validation). A returned object is always HTTP 200: the `r`/`msg` convention is yours to define.
 */
export default defineSample({
    id: "errors.catch-api-error",
    method: "GET",
    path: "/errors/catch/:recordId",
    summary: "Catch CogoverApiError (and subclasses) from a data call and return a custom { r, msg } response.",
    sdk: ["CogoverApiError", "CogoverApiError.code", "CogoverApiError.r", "NotFoundError", "PermissionDeniedError"],
    file: "src/samples/13-errors/catch-api-error.ts",
    curl: `curl -s "$BASE/errors/catch/does-not-exist"`,
    handler: async ({ request, data, log }) => {
        const recordId = (request.params.recordId ?? "") as CogoverRecordId;
        try {
            await data.object("sample_order").records.update(recordId, { note: "touched by errors.catch-api-error" });
            return { updated: true, id: recordId };
        } catch (error) {
            if (error instanceof NotFoundError) {
                // Cogover may report a generic resource ("record"/"unknown"); echo the ID this request asked for.
                return { r: 1004, msg: "The order does not exist.", recordId, notFound: { resource: error.resource, resourceId: error.resourceId } };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "You cannot update this order.", code: error.code };
            }
            if (error instanceof CogoverApiError) {
                log.warn("Data call failed", { code: error.code, r: error.r });
                return { r: 1000, msg: "The order could not be updated.", code: error.code, serverResult: error.r ?? null };
            }
            throw error;
        }
    },
});
