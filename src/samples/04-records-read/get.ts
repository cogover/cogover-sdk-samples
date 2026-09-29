import { NotFoundError } from "@cogover/sdk";
import type {
    CogoverRecord,
    FieldSelection,
    FileValue,
    GetRecordOptions,
    ObjectClient,
    SelectedFields,
    WorkspaceObjects,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

/** The fields this route reads. `as const` keeps the slugs, so the result type has exactly these fields. */
const ORDER_FIELDS = ["name", "status", "total", "customer", "note", "files"] as const satisfies FieldSelection<OrderFields>;

/** `Pick<OrderFields, "name" | "status" | ...>`: reading a field that was not requested does not compile. */
type OrderView = SelectedFields<OrderFields, typeof ORDER_FIELDS>;

/**
 * Reads one record by ID. `fields` is required: list the fields the route uses, or pass `"*"` (see
 * `fields-all.ts`). A missing or invisible record resolves to `null`; this sample turns that into a 404.
 *
 * The lookup `customer` comes back as `{ id, name: "", objectSlug }` and `system.createdBy.name` is `""`,
 * because the read does not expand lookups; `expand-lookups.ts` shows how to get the names.
 */
export default defineSample({
    id: "records.get",
    method: "GET",
    path: "/records/get/:recordId",
    summary: "records.get(id, { fields }): read the listed fields of one record; null when missing or not visible to the caller.",
    sdk: ["data.object", "records.get", "GetRecordOptions", "FieldSelection", "SelectedFields", "CogoverRecord", "ObjectClient", "FileValue"],
    file: "src/samples/04-records-read/get.ts",
    curl: `curl -s "$BASE/records/get/<recordId>"`,
    handler: async ({ request, data }) => {
        const recordId = request.params.recordId ?? "";
        const orders: ObjectClient<OrderFields> = data.object("sample_order");
        const options: GetRecordOptions<OrderFields, typeof ORDER_FIELDS> = { fields: ORDER_FIELDS };
        const order: CogoverRecord<OrderView> | null = await orders.records.get(recordId, options);
        if (order === null) throw new NotFoundError("sample_order", recordId);

        const files: readonly FileValue[] = order.fields.files ?? [];
        return {
            id: order.id,
            fields: order.fields,
            // Not expanded: `name` is "" here. The ID is enough to read the customer or to filter by it.
            customerId: order.fields.customer?.id ?? null,
            attachments: files.map(file => ({ name: file.name, size: file.size ?? null })),
            system: order.system,
        };
    },
});
