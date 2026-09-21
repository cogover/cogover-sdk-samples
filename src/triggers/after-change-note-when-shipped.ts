import { defineTrigger, RateLimitError, RetryableError } from "@cogover/sdk";
import type { BatchUpdateItem, TriggerFilter, TriggerFilterCondition, TriggerFilterGroup, WorkspaceObjects } from "@cogover/sdk";

type OrderFields = WorkspaceObjects["sample_order"];

/** Plain-object filters: expressions from `and()`/`or()` or field references are rejected here. */
const shipped: TriggerFilterCondition = { op: "=", field: "status", params: "shipped" };
const named: TriggerFilterCondition = { op: "not null", field: "name" };
const group: TriggerFilterGroup = { op: "and", conditions: [shipped, named] };
const when: TriggerFilter = group;

/**
 * After-change trigger. It runs asynchronously after the change was saved, cannot reject or modify
 * that change, but may write records, call `fetch` and push. Delivery is best-effort (a call may
 * run twice or not at all), so the handler is idempotent: the note it writes is derived from
 * `trigger.changeId`. The write touches only `note`, and `changedFields: ["status"]` keeps the
 * trigger from running again because of its own write. `runWhen: "onEnter"` fires once when the
 * order becomes shipped, not on every later save of a shipped order.
 */
export const noteWhenShipped = defineTrigger({
    key: "sample_order_note_when_shipped",
    name: "Sample: note and refresh when an order is shipped",
    object: "sample_order",
    timing: "afterChange",
    operations: ["create", "update"],
    fields: ["status", "note"],
    changedFields: ["status"],
    when,
    runWhen: "onEnter",
    timeoutMs: 3000,
}, async ({ records, trigger, data, push, log }) => {
    const items: BatchUpdateItem<OrderFields>[] = records.flatMap(record => record.id === null ? [] : [{
        id: record.id,
        fields: { note: `Shipped (change ${trigger.changeId})` },
    }]);
    if (items.length === 0) return;

    try {
        const result = await data.object("sample_order").records.batchUpdate(items);
        if (!result.success) log.warn("Some notes were not written", { rows: result.results.filter(row => !row.success) });
    } catch (error) {
        // Temporary failure: ask Cogover to run this call again later (up to 5 more times).
        if (error instanceof RateLimitError) throw new RetryableError("Rate limited while writing notes", { code: error.code });
        throw error;
    }
    // Everyone who has one of these orders open reloads it, including the user whose save started the trigger.
    await push.refreshRecords("sample_order", items.map(item => item.id));
    log.info("Shipped orders annotated", { changeId: trigger.changeId, records: items.length });
});
