import { defineAction, PermissionDeniedError, s } from "@cogover/sdk";
import type {
    ActionDefinition,
    ActionInfo,
    ActionInvocationContext,
    CogoverRecordId,
    DataApi,
    InferSchema,
    WorkspaceObjects,
} from "@cogover/sdk";

type OrderStatus = NonNullable<WorkspaceObjects["sample_order"]["status"]>;

/** Status changes the action accepts; "new" is where every order starts. */
const TARGET_STATUSES = ["confirmed", "shipped", "cancelled"] as const;
const REPORTED_STATUSES = ["new", "confirmed", "shipped", "cancelled", "none"] as const;
const NEXT: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
    new: ["confirmed", "cancelled"],
    confirmed: ["shipped", "cancelled"],
    shipped: [],
    cancelled: [],
};

const input = s.object({
    orderId: s.recordId("sample_order").describe("ID of the sample_order record to change"),
    status: s.enum(TARGET_STATUSES).describe("New status of the order: confirmed, shipped or cancelled"),
    reason: s.string({ minLength: 1, maxLength: 500 }).optional().describe("Why the status changes; added to the order note"),
});

const output = s.object({
    outcome: s.enum(["updated", "unchanged", "not_found", "not_allowed", "invalid_transition"])
        .describe("updated, or why nothing was written"),
    previousStatus: s.enum(REPORTED_STATUSES),
    status: s.enum(REPORTED_STATUSES).describe("Status after the call; none when the order was not read"),
    changedAt: s.dateTime().optional(),
});

type Output = InferSchema<typeof output>;

const nothing = (outcome: Output["outcome"]): Output => ({ outcome, previousStatus: "none", status: "none" });

/**
 * An AI Agent runs the action with the agent's identity, so every user of the agent would get that identity's
 * access. This action therefore changes an order only when the person chatting with the agent (or who started
 * the agent run) can see it, read through `data.asUser`. The identity policy must allow `asUser` on
 * `sample_order`; when it does not, the check fails closed.
 */
async function initiatorCanSee(data: DataApi, personnelId: string, orderId: CogoverRecordId): Promise<boolean> {
    try {
        const order = await data.asUser(personnelId).object("sample_order").records.get(orderId, { fields: ["name"] });
        return order !== null;
    } catch (error) {
        // Expected when the policy does not approve asUser for this person: refuse instead of failing the call.
        if (error instanceof PermissionDeniedError) return false;
        throw error;
    }
}

/**
 * A write action: `effect: "write"` allows record writes, and an AI Agent tool for it asks a person for approval
 * by default. The handler's `input` and return type are inferred from the two schemas.
 *
 * Process nodes and AI Agents send a call again with the same `action.runId` when they miss the answer, and
 * Cogover returns the stored result without running the handler again. A retry after an interruption can still
 * run it twice, so the handler is idempotent: setting the status it already has answers `unchanged`.
 */
export const setOrderStatusAction: ActionDefinition = defineAction({
    key: "sample_set_order_status",
    label: "Sample: set order status",
    description: "Moves a sample_order from new to confirmed or cancelled, or from confirmed to shipped or cancelled, and notes why.",
    exposeTo: ["process", "agent"],
    effect: "write",
    input,
    output,
    timeoutMs: 6000,
    async handler({ action, invocation, data, log }, request) {
        const info: ActionInfo = action;
        const caller: ActionInvocationContext = invocation;
        if (caller.source.type === "agent") {
            const personnelId = caller.source.initiatorPersonnelId;
            if (personnelId === null || !await initiatorCanSee(data, personnelId, request.orderId)) return nothing("not_allowed");
        }

        const orders = data.object("sample_order");
        const order = await orders.records.get(request.orderId, { fields: ["status", "note"] });
        if (order === null) return nothing("not_found");
        const previous: OrderStatus = order.fields.status ?? "new";
        if (previous === request.status) return { outcome: "unchanged", previousStatus: previous, status: previous };
        if (!NEXT[previous].includes(request.status)) return { outcome: "invalid_transition", previousStatus: previous, status: previous };

        const changedAt = Date.now();
        const by = caller.source.type === "process" ? `process ${caller.source.instanceId}` : `agent ${caller.source.agentId}`;
        const line = `${new Date(changedAt).toISOString()} ${previous} -> ${request.status} by ${by}`
            + `${request.reason === undefined ? "" : `: ${request.reason}`} (run ${info.runId})`;
        await orders.records.update(order.id, {
            status: request.status,
            note: order.fields.note === null || order.fields.note === "" ? line : `${order.fields.note}\n${line}`,
        });
        log.info("Order status set", { runId: info.runId, effect: info.effect, orderId: order.id, previous, status: request.status });
        return { outcome: "updated", previousStatus: previous, status: request.status, changedAt };
    },
});
