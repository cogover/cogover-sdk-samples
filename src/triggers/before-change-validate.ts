import { defineTrigger } from "@cogover/sdk";
import type { TriggerConfig, TriggerHandler, TriggerInfo, TriggerRecord, WorkspaceObjects } from "@cogover/sdk";

type OrderFields = WorkspaceObjects["sample_order"];
type Operation = "create" | "update";

/**
 * Before-change trigger that validates amounts. It runs before the record is saved, for every
 * source of a write (web app, API, imports, processes, other modules). A rejected record is not
 * saved: the writer receives HTTP 400 with `BEFORE_CHANGE_TRIGGER_REJECTED`, the codes keyed by
 * field in `meta` and the messages keyed by code in `messages`.
 *
 * Before-change handlers are read-only: record writes, fetch, locks, state and push are refused.
 * The configuration and handler are declared separately here to show their types; passing object
 * literals straight to `defineTrigger` (as the other trigger files do) infers the same types.
 */
const config: TriggerConfig<"sample_order", Operation> = {
    key: "sample_order_validate_amounts",
    name: "Sample: validate order amounts",
    object: "sample_order",
    timing: "beforeChange",
    operations: ["create", "update"],
    fields: ["subtotal", "discount", "status"],
    changedFields: ["subtotal", "discount"],
    order: 5000,
    timeoutMs: 1000,
};

const handler: TriggerHandler<"sample_order", Operation> = ({ records, trigger, log }) => {
    const info: TriggerInfo<Operation> = trigger;
    for (const record of records) validate(record);
    log.info("Validated order amounts", { key: info.key, operation: info.operation, changeId: info.changeId, records: records.length });
};

export const validateAmounts = defineTrigger(config, handler);

function validate(record: TriggerRecord<OrderFields, Operation>): void {
    // `record.new` is never null for create/update; `old` is null for a create.
    const subtotal = record.new.subtotal ?? 0;
    const discount = record.new.discount ?? 0;
    if (subtotal < 0) {
        record.addError("subtotal", "NEGATIVE_SUBTOTAL", "The subtotal cannot be negative.");
    }
    if (discount < 0 || discount > subtotal) {
        record.addError("discount", "DISCOUNT_OUT_OF_RANGE", "The discount must be between 0 and the subtotal.");
    }
    if (record.old?.status === "cancelled" && record.changedFields.includes("subtotal")) {
        record.addError(null, "CANCELLED_ORDER_IS_FROZEN", "A cancelled order cannot change its amounts.");
    }
}
