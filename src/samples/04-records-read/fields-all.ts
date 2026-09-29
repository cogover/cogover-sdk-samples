import { NotFoundError } from "@cogover/sdk";
import type { CogoverRecord, FieldSelection, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

/** `"*"` is a `FieldSelection` of its own; `["*"]` is not valid and throws `ValidationError`. */
const EVERY_FIELD = "*" satisfies FieldSelection<OrderFields>;

/**
 * `fields: "*"` reads every field that the identity in use may read and that the project's identity policy
 * grants. When the policy grants only some fields, `"*"` means those fields, not every field of the Object, so
 * a declared field can be missing from `fields`: check with `in` before relying on it.
 *
 * Prefer a list of the fields the script uses. `"*"` on an Object with many or long fields can exceed the
 * 1 MiB capability result limit, especially with `getMany` or a `list` page of 200 records. Lookups are still
 * not expanded: `customer.name` is `""`.
 */
export default defineSample({
    id: "records.fields-all",
    method: "GET",
    path: "/records/fields-all/:recordId",
    summary: 'records.get(id, { fields: "*" }): read every field the identity and the project policy may read.',
    sdk: ["records.get", 'fields: "*"', "FieldSelection", "CogoverRecord"],
    file: "src/samples/04-records-read/fields-all.ts",
    curl: `curl -s "$BASE/records/fields-all/<recordId>"`,
    handler: async ({ request, data }) => {
        const recordId = request.params.recordId ?? "";
        const orders = data.object("sample_order");
        // With "*" the result type is every declared field of `sample_order`.
        const order: CogoverRecord<OrderFields> | null = await orders.records.get(recordId, { fields: EVERY_FIELD });
        if (order === null) throw new NotFoundError("sample_order", recordId);

        const returned = Object.keys(order.fields).sort();
        const declared: readonly (keyof OrderFields)[] = [
            "name", "customer", "status", "subtotal", "discount", "total", "ordered_at", "tags", "files", "note",
        ];
        return {
            id: order.id,
            returnedFields: returned,
            // Declared fields that the project policy did not grant, if any.
            notGranted: declared.filter(slug => !(slug in order.fields)),
            fields: order.fields,
            system: order.system,
        };
    },
});
