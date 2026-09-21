import { defineTrigger } from "@cogover/sdk";
import type { TriggerContext, TriggerNewValues, WorkspaceObjects } from "@cogover/sdk";

type OrderFields = WorkspaceObjects["sample_order"];

/**
 * Before-change trigger that adjusts the values being saved. Only fields listed in `writableFields`
 * may be assigned on `record.new`; changing any other field throws `ValidationError` and fails the
 * write. `order: 6000` runs it after the validation trigger (5000) of the same Object, which
 * already rejected bad amounts.
 */
export const computeTotal = defineTrigger({
    key: "sample_order_compute_total",
    name: "Sample: keep total = subtotal - discount",
    object: "sample_order",
    timing: "beforeChange",
    operations: ["create", "update"],
    fields: ["subtotal", "discount", "total"],
    changedFields: ["subtotal", "discount"],
    writableFields: ["total"],
    order: 6000,
}, ({ records }: TriggerContext<"sample_order", "create" | "update">) => {
    for (const record of records) {
        const values: TriggerNewValues<OrderFields> = record.new;
        const subtotal = values.subtotal ?? 0;
        const discount = values.discount ?? 0;
        // Assigned values use the `records.update` input format; `null` would clear the field.
        values.total = Math.max(subtotal - discount, 0);
    }
});
