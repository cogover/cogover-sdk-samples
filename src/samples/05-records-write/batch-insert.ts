import { ValidationError } from "@cogover/sdk";
import type { BatchWriteResponse, BatchWriteRowResult, CreateFields, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

interface Input {
    readonly count?: unknown;
    readonly prefix?: unknown;
}

/**
 * Creates 1 to 200 records with one call. Batch writes are best-effort per row and not a
 * transaction: inspect `success` and every row's `success`, `r` and `msg`. `referenceId` is the
 * zero-based input index as a string.
 */
export default defineSample<Input>({
    id: "records.batch-insert",
    method: "POST",
    path: "/records/batch-insert",
    summary: "records.batchInsert(records): create up to 200 records; inspect the per-row results.",
    sdk: ["records.batchInsert", "BatchWriteResponse", "BatchWriteRowResult"],
    file: "src/samples/05-records-write/batch-insert.ts",
    curl: `curl -s -X POST "$BASE/records/batch-insert" -H "Content-Type: application/json" --data '{"count":3,"prefix":"Batch"}'`,
    handler: async ({ request, data }) => {
        const count = typeof request.body.count === "number" ? request.body.count : 3;
        const prefix = typeof request.body.prefix === "string" && request.body.prefix.trim() ? request.body.prefix.trim() : "Batch";
        if (!Number.isInteger(count) || count < 1 || count > 200) {
            throw new ValidationError("count must be an integer from 1 to 200");
        }

        const records: CreateFields<OrderFields>[] = Array.from({ length: count }, (_, index) => ({
            name: `${prefix} order ${index + 1}`,
            status: "new",
            subtotal: (index + 1) * 100,
            discount: 0,
            total: (index + 1) * 100,
        }));
        const result: BatchWriteResponse = await data.object("sample_order").records.batchInsert(records);
        const rows: readonly BatchWriteRowResult[] = result.results;
        return {
            success: result.success,
            r: result.r,
            createdIds: rows.filter(row => row.success).map(row => row.id),
            failedRows: rows.filter(row => !row.success).map(row => ({ index: row.referenceId, r: row.r, msg: row.msg ?? null })),
        };
    },
});
