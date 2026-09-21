import { ValidationError } from "@cogover/sdk";
import type { CogoverRecordId, DeleteResult } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly ids?: unknown;
}

/**
 * Deletes records by ID. The result separates `deleted` from `notDeleted` (missing, not visible
 * to the caller, or refused by a before-change trigger such as `src/triggers/before-change-block-delete.ts`).
 */
export default defineSample<Input>({
    id: "records.delete-many",
    method: "DELETE",
    path: "/records/delete-many",
    summary: "records.deleteMany(ids): delete records; the result lists deleted and notDeleted IDs.",
    sdk: ["records.deleteMany", "DeleteResult"],
    file: "src/samples/05-records-write/delete-many.ts",
    curl: `curl -s -X DELETE "$BASE/records/delete-many" -H "Content-Type: application/json" --data '{"ids":["<recordId1>","<recordId2>"]}'`,
    handler: async ({ request, data, log }) => {
        const ids = request.body.ids;
        if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === "string" && id.trim())) {
            throw new ValidationError("ids must be a non-empty array of record IDs");
        }
        const result: DeleteResult = await data.object("sample_order").records.deleteMany(ids as CogoverRecordId[]);
        if (result.notDeleted.length > 0) log.warn("Some sample orders were not deleted", { ids: result.notDeleted });
        return result;
    },
});
