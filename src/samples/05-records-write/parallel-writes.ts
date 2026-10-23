import { NotFoundError, ValidationError } from "@cogover/sdk";
import type { BatchUpdateItem, CreateFields, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

interface Input {
    readonly customerId?: unknown;
    readonly orderIds?: unknown;
}

/**
 * Writes efficiently: few calls, started together. Calls started together with `Promise.all` run in
 * parallel, while a call that is awaited before the next one starts runs alone. The route confirms
 * up to 200 `new` orders of one customer and creates a follow-up order for each of them:
 *
 *   1. one `getMany` reads every order and runs in parallel with the read of the customer;
 *   2. one `batchUpdate` confirms the orders, one `batchInsert` creates the follow-ups, and the
 *      customer note is updated, all three in parallel.
 *
 * That is 5 capability calls in 2 waits, whatever the number of orders; reading, confirming and
 * copying the orders one by one would be 2 + 3 × N calls, each waiting for the previous one. Every
 * call still counts towards the budgets of the execution. The writes are not a transaction: when one
 * call throws, the others still run and their writes stay saved, and a batch reports each row, so
 * the response lists the rows that failed. Await the writes before a `push.refreshRecords` that
 * announces them; in the same `Promise.all` it could arrive first. Locally, Cogover Dev CLI runs the
 * calls one after another: same results, only slower.
 */
export default defineSample<Input>({
    id: "records.parallel-writes",
    method: "POST",
    path: "/records/parallel-writes",
    summary: "Parallel calls with Promise.all: records.getMany, records.batchUpdate and records.batchInsert confirm orders and create follow-ups in 5 calls.",
    sdk: ["records.getMany", "records.batchUpdate", "records.batchInsert", "limits.usage"],
    file: "src/samples/05-records-write/parallel-writes.ts",
    curl: `curl -s -X POST "$BASE/records/parallel-writes" -H "Content-Type: application/json" --data '{"customerId":"<sample_customer id>","orderIds":["<new sample_order id of that customer>"]}'`,
    handler: async ({ request, data, limits }) => {
        const { customerId, orderIds } = request.body;
        if (typeof customerId !== "string" || customerId.trim().length === 0) throw new ValidationError("customerId is required");
        if (!Array.isArray(orderIds) || orderIds.length === 0 || orderIds.length > 200
            || !orderIds.every(id => typeof id === "string" && id.trim().length > 0)) {
            throw new ValidationError("orderIds must be an array of 1 to 200 record IDs");
        }

        const customers = data.object("sample_customer");
        const orders = data.object("sample_order");

        // Wait 1: the customer and the orders do not depend on each other, so read them together.
        const [customer, found] = await Promise.all([
            customers.records.get(customerId, { fields: ["name", "is_active"] }),
            orders.records.getMany(orderIds as string[], { fields: ["name", "customer", "status", "subtotal", "discount"] }),
        ]);
        if (customer === null) throw new NotFoundError("sample_customer", customerId);
        if (customer.fields.is_active === false) throw new ValidationError("The customer is not active");
        if (found.missingIds.length > 0) throw new ValidationError(`Orders not found: ${found.missingIds.join(", ")}`);
        const foreign = found.records.filter(order => order.fields.customer?.id !== customer.id || order.fields.status !== "new");
        if (foreign.length > 0) {
            throw new ValidationError(`Only new orders of this customer can be confirmed: ${foreign.map(order => order.id).join(", ")}`);
        }

        const confirmations: BatchUpdateItem<OrderFields>[] = found.records.map(order => ({
            id: order.id,
            fields: { status: "confirmed" },
        }));
        const followUps: CreateFields<OrderFields>[] = found.records.map(order => {
            const subtotal = order.fields.subtotal ?? 0;
            const discount = order.fields.discount ?? 0;
            return {
                name: `Follow-up of ${order.fields.name}`,
                customer: customer.id,
                status: "new",
                subtotal,
                discount,
                total: subtotal - discount,
                ordered_at: Date.now(),
            };
        });

        // Wait 2: three independent writes in parallel; every order is in one batch call.
        const [, confirmed, created] = await Promise.all([
            customers.records.update(customer.id, { note: `Confirmed ${found.records.length} order(s) on ${new Date().toISOString()}` }),
            orders.records.batchUpdate(confirmations),
            orders.records.batchInsert(followUps),
        ]);

        const usage = limits.usage();
        return {
            confirmedIds: confirmed.results.filter(row => row.success).map(row => row.id ?? null),
            confirmFailures: confirmed.results.filter(row => !row.success).map(row => ({ index: row.referenceId, r: row.r, msg: row.msg ?? null })),
            followUpIds: created.results.filter(row => row.success).map(row => row.id ?? null),
            followUpFailures: created.results.filter(row => !row.success).map(row => ({ index: row.referenceId, r: row.r, msg: row.msg ?? null })),
            capabilityCalls: usage.capabilityCalls.used,
            recordsWritten: usage.recordsWritten.used,
        };
    },
});
