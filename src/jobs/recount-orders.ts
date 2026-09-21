import { defineJob, RateLimitError, RetryableError } from "@cogover/sdk";
import type { JobConfig, JobContext, JobDefinition, JobHandler, JobInfo } from "@cogover/sdk";

/** The JSON value passed to `jobs.enqueue`; treat it like request input, it is not validated. */
export interface RecountPayload {
    readonly page?: number;
    readonly counted?: number;
    readonly cursor?: string;
}

/** What the job stores under state key `order-count` when it finishes. */
export interface OrderCountSummary {
    readonly total: number;
    readonly runId: string;
    readonly finishedAt: number;
}

/**
 * A background job enqueued by code (see `src/samples/16-jobs/enqueue.ts`). Work that needs longer
 * than one attempt is split: this run counts one page of orders and enqueues itself again with the
 * cursor, then the last run stores the total in project state (read it with `GET /state/get/order-count`).
 *
 * Runs execute at least once, so the handler is idempotent: `job.id` stays the same across attempts
 * and is part of the idempotency key of the follow-up enqueue. The configuration and handler are
 * declared separately to show their types; `defineJob({...}, handler)` infers the same.
 */
const PAGE_SIZE = 200;

const config: JobConfig = {
    key: "sample_recount_orders",
    name: "Sample: count orders page by page",
    timeoutMs: 20_000,
    maxAttempts: 3,
};

const handler: JobHandler<RecountPayload> = async ({ job, payload, data, state, jobs, log }: JobContext<RecountPayload>) => {
    const info: JobInfo = job;
    const page = payload?.page ?? 1;
    const counted = payload?.counted ?? 0;
    const orders = data.object("sample_order");

    let listed;
    try {
        listed = await orders.records.list({
            fields: ["name"],
            orderBy: [orders.fields.created.asc()],
            limit: PAGE_SIZE,
            ...(payload?.cursor === undefined ? {} : { cursor: payload.cursor }),
        });
    } catch (error) {
        // A temporary failure: Cogover runs this attempt again later, up to `maxAttempts`.
        if (error instanceof RateLimitError) throw new RetryableError("Rate limited while listing orders", { attempt: info.attempt });
        throw error;
    }

    const total = counted + listed.items.length;
    // Cogover may return a cursor with the last page too, so a short page ends the walk.
    if (listed.nextCursor !== undefined && listed.items.length === PAGE_SIZE) {
        const next: RecountPayload = { page: page + 1, counted: total, cursor: listed.nextCursor };
        // The same run never enqueues the same page twice, even when this attempt is repeated.
        await jobs.enqueue(info.key, next, { idempotencyKey: `${info.id}:page:${page + 1}` });
        log.info("Order page counted; next page enqueued", { runId: info.id, page, counted: total });
        return;
    }

    const summary: OrderCountSummary = { total, runId: info.id, finishedAt: Date.now() };
    await state.namespace("samples").set("order-count", summary);
    log.info("Orders counted", { runId: info.id, source: info.source, attempt: info.attempt, pages: page, total });
};

export const recountOrders: JobDefinition = defineJob<RecountPayload>(config, handler);
