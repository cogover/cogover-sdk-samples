import { ValidationError } from "@cogover/sdk";
import type { BatchUpdateItem, CogoverRecordId, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const STATUSES = ["new", "confirmed", "shipped", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const isStatus = (value: unknown): value is Status => (STATUSES as readonly unknown[]).includes(value);

interface Input {
    readonly ids?: unknown;
    readonly status?: unknown;
}

/**
 * Updates 1 to 200 records with one call. Each item carries its own `fields`, so different records
 * may receive different values. Like `batchInsert`, the result must be inspected row by row.
 */
export default defineSample<Input>({
    id: "records.batch-update",
    method: "POST",
    path: "/records/batch-update",
    summary: "records.batchUpdate(items): set a status on up to 200 records in one call.",
    sdk: ["records.batchUpdate", "BatchUpdateItem"],
    file: "src/samples/05-records-write/batch-update.ts",
    curl: `curl -s -X POST "$BASE/records/batch-update" -H "Content-Type: application/json" --data '{"ids":["<recordId1>","<recordId2>"],"status":"confirmed"}'`,
    handler: async ({ request, data }) => {
        const { ids, status } = request.body;
        if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === "string")) {
            throw new ValidationError("ids must be a non-empty array of record IDs");
        }
        if (!isStatus(status)) throw new ValidationError(`status must be one of ${STATUSES.join(", ")}`);

        const items: BatchUpdateItem<OrderFields>[] = ids.map(id => ({
            id: id as CogoverRecordId,
            fields: { status },
        }));
        const result = await data.object("sample_order").records.batchUpdate(items);
        return {
            success: result.success,
            rows: result.results.map(row => ({ index: row.referenceId, id: row.id ?? null, success: row.success, r: row.r, msg: row.msg ?? null })),
        };
    },
});
