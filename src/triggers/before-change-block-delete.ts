import { defineTrigger } from "@cogover/sdk";
import type { TriggerOldValues, WorkspaceObjects } from "@cogover/sdk";

type OrderFields = WorkspaceObjects["sample_order"];

/**
 * Before-change trigger on `delete`. A deleted record has no `new` values; `old` holds the last
 * saved values. `addError(null, ...)` reports an error about the whole record (`$record` in `meta`).
 * `writableFields` is not allowed when `delete` is the only operation.
 */
export const blockDeleteShipped = defineTrigger({
    key: "sample_order_block_delete_shipped",
    name: "Sample: shipped orders cannot be deleted",
    object: "sample_order",
    timing: "beforeChange",
    operations: ["delete"],
    fields: ["status"],
}, ({ records }) => {
    for (const record of records) {
        const previous: TriggerOldValues<OrderFields> = record.old;
        if (previous.status === "shipped") {
            record.addError(null, "SHIPPED_ORDER_CANNOT_BE_DELETED", "Shipped orders cannot be deleted.");
        }
    }
});
