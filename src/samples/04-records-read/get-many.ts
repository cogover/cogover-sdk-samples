import { ValidationError } from "@cogover/sdk";
import type { CogoverRecord, GetManyOptions, GetManyResult, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

interface Input {
    readonly ids?: unknown;
}

/**
 * Reads up to 200 records by ID with one capability call. `fields` is required. The order of
 * `records` is not guaranteed, so index them by ID; IDs that could not be read are in `missingIds`.
 * Use this instead of calling `records.get` in a loop.
 */
export default defineSample<Input>({
    id: "records.get-many",
    method: "POST",
    path: "/records/get-many",
    summary: "records.getMany(ids, { fields }): read up to 200 records in one call and index them by ID.",
    sdk: ["records.getMany", "GetManyOptions", "GetManyResult"],
    file: "src/samples/04-records-read/get-many.ts",
    curl: `curl -s -X POST "$BASE/records/get-many" -H "Content-Type: application/json" --data '{"ids":["<recordId1>","<recordId2>","missing"]}'`,
    handler: async ({ request, data }) => {
        const ids = request.body.ids;
        if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === "string")) {
            throw new ValidationError("ids must be a non-empty array of record IDs");
        }
        const orders = data.object("sample_order");
        const options: GetManyOptions<OrderFields> = { fields: ["name", "status", "total"] };
        const result: GetManyResult<OrderFields> = await orders.records.getMany(ids, options);

        const byId = new Map<string, CogoverRecord<OrderFields>>(result.records.map(record => [record.id, record]));
        return {
            found: result.records.length,
            missingIds: result.missingIds,
            // The response follows the requested order thanks to the map.
            records: ids.map(id => ({ id, fields: byId.get(id)?.fields ?? null })),
        };
    },
});
