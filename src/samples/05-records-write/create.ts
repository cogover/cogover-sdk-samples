import { ValidationError } from "@cogover/sdk";
import type { CogoverRecordId, CreateFields, RecordWritesApi, WorkspaceObjects, WriteObjectClient } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

interface Input {
    readonly name?: unknown;
    readonly subtotal?: unknown;
}

/**
 * Creates one record and returns its ID. `CreateFields<T>` is a partial map of the Object's fields:
 * choice fields take option slugs, multi-choice fields take arrays, date-time fields take Unix
 * milliseconds. Cogover validates required, unique and type rules before saving.
 */
export default defineSample<Input>({
    id: "records.create",
    method: "POST",
    path: "/records/create",
    summary: "records.create(fields): create one record and get its CogoverRecordId.",
    sdk: ["records.create", "CreateFields", "CogoverRecordId", "WriteObjectClient", "RecordWritesApi"],
    file: "src/samples/05-records-write/create.ts",
    curl: `curl -s -X POST "$BASE/records/create" -H "Content-Type: application/json" --data '{"name":"Laptop order","subtotal":1500}'`,
    handler: async ({ request, data, log }) => {
        const { name, subtotal } = request.body;
        if (typeof name !== "string" || name.trim().length === 0) {
            throw new ValidationError("name must be a non-empty string");
        }
        if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
            throw new ValidationError("subtotal must be a non-negative number");
        }

        const fields: CreateFields<OrderFields> = {
            name: name.trim(),
            status: "new",
            subtotal,
            discount: 0,
            total: subtotal,
            ordered_at: Date.now(),
            tags: ["rush"],
        };
        // `WriteObjectClient`/`RecordWritesApi` are the write-only views of an Object client.
        const orders: WriteObjectClient<OrderFields> = data.object("sample_order");
        const writes: RecordWritesApi<OrderFields> = orders.records;
        const id: CogoverRecordId = await writes.create(fields);
        log.info("Sample order created", { id });
        return { id, fields };
    },
});
