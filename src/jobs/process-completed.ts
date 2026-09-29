import { defineJob } from "@cogover/sdk";
import type { CogoverRecordId, JobDefinition, ProcessCompletionJobPayload } from "@cogover/sdk";

/** What `POST /processes/start` hands to this job in `onComplete.payload`. */
export interface OrderProcessPayload {
    /** Job payloads are JSON: the ID comes back as the string that was sent. */
    readonly orderId: CogoverRecordId;
    readonly orderName: string;
}

/** Stored under state key `last-process-outcome` (read it with `GET /state/get/last-process-outcome`). */
export interface ProcessOutcome {
    readonly instanceId: string;
    readonly state: ProcessCompletionJobPayload["process"]["state"];
    readonly orderId: string | null;
    readonly approved: boolean | null;
    readonly finishedAt: number | null;
}

/**
 * Receives the outcome of a Process started by `POST /processes/start` with `onComplete`. When the instance
 * ends (COMPLETED, FAILED, CANCELED or DELETED), Cogover enqueues one run of this job with `payload.payload`
 * (the `onComplete.payload`) and `payload.process`, whose `output` holds the Process variables marked as output.
 * The job runs as the user who started the Process and, like every job, at least once: the note it adds names
 * the instance, so a repeated run does not add it twice.
 *
 * This sample reads an output variable named `approved`; rename it to match your Process.
 */
export const processCompleted: JobDefinition = defineJob<ProcessCompletionJobPayload<OrderProcessPayload>>({
    key: "sample_process_completed",
    name: "Sample: record the outcome of an order Process",
    maxAttempts: 3,
}, async ({ payload, data, state, log }) => {
    if (payload === null) return;
    const { process } = payload;
    const approved = process.output === null ? null : process.output.approved === true;
    const outcome: ProcessOutcome = {
        instanceId: process.instanceId,
        state: process.state,
        orderId: payload.payload?.orderId ?? null,
        approved,
        finishedAt: process.finishedAt,
    };
    await state.namespace("samples").set("last-process-outcome", outcome);
    if (payload.payload === null) return;

    const orders = data.object("sample_order");
    const order = await orders.records.get(payload.payload.orderId, { fields: ["status", "note"] });
    if (order === null) {
        log.warn("The order of a finished Process no longer exists", { instanceId: process.instanceId });
        return;
    }
    if (order.fields.note?.includes(process.instanceId) === true) return;
    const line = `Process ${process.instanceId} ended ${process.state}${approved === null ? "" : approved ? " (approved)" : " (not approved)"}`;
    const confirm = process.state === "COMPLETED" && approved === true && order.fields.status === "new";
    await orders.records.update(order.id, {
        ...(confirm ? { status: "confirmed" as const } : {}),
        note: order.fields.note === null || order.fields.note === "" ? line : `${order.fields.note}\n${line}`,
    });
    log.info("Process outcome recorded", { instanceId: process.instanceId, state: process.state, confirmed: confirm });
});
