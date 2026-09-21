import { StateConflictError } from "@cogover/sdk";
import type { StateDeleteOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Deletes an entry and reports whether it existed. `expectedVersion` makes the delete conditional:
 * a mismatch throws `StateConflictError`.
 */
export default defineSample({
    id: "state.delete",
    method: "DELETE",
    path: "/state/delete/:key",
    summary: "namespace.delete(key, { expectedVersion }): delete an entry, optionally only at a known version.",
    sdk: ["namespace.delete", "StateDeleteOptions", "StateConflictError"],
    file: "src/samples/08-state/delete.ts",
    curl: `curl -s -X DELETE "$BASE/state/delete/greeting?expectedVersion=1"`,
    handler: async ({ request, state }) => {
        const key = request.params.key ?? "";
        const expected = typeof request.query.expectedVersion === "string" ? Number(request.query.expectedVersion) : undefined;
        const options: StateDeleteOptions = expected === undefined ? {} : { expectedVersion: expected };
        try {
            const existed = await state.namespace("samples").delete(key, options);
            return { key, existed };
        } catch (error) {
            if (error instanceof StateConflictError) {
                return { r: 1009, msg: "The entry changed since it was read; reload and try again.", code: error.code };
            }
            throw error;
        }
    },
});
