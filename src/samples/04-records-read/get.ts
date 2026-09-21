import { NotFoundError } from "@cogover/sdk";
import type { CogoverRecord, FileValue, GetRecordOptions, ObjectClient, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

/**
 * Reads one record by ID. `fields` limits the returned business fields (omit it to read all).
 * A missing or invisible record resolves to `null`; this sample turns that into a 404.
 */
export default defineSample({
    id: "records.get",
    method: "GET",
    path: "/records/get/:recordId",
    summary: "records.get(id, { fields }): read one record; null when missing or not visible to the caller.",
    sdk: ["data.object", "records.get", "GetRecordOptions", "CogoverRecord", "ObjectClient", "FileValue"],
    file: "src/samples/04-records-read/get.ts",
    curl: `curl -s "$BASE/records/get/<recordId>"`,
    handler: async ({ request, data }) => {
        const recordId = request.params.recordId ?? "";
        const orders: ObjectClient<OrderFields> = data.object("sample_order");
        const options: GetRecordOptions<OrderFields> = {
            fields: ["name", "status", "total", "customer", "files"],
        };
        const order: CogoverRecord<OrderFields> | null = await orders.records.get(recordId, options);
        if (order === null) throw new NotFoundError("sample_order", recordId);

        const files: readonly FileValue[] = order.fields.files ?? [];
        return {
            id: order.id,
            fields: order.fields,
            attachments: files.map(file => ({ name: file.name, size: file.size ?? null })),
            system: order.system,
        };
    },
});
