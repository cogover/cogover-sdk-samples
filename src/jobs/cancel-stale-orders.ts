import { and, defineJob, LockUnavailableError } from "@cogover/sdk";
import type { JobSchedule } from "@cogover/sdk";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Five cron fields (minute, hour, day-of-month, month, day-of-week) in an IANA time zone. */
const nightly: JobSchedule = { cron: "0 2 * * *", timezone: "Asia/Ho_Chi_Minh" };

/**
 * A scheduled job: Cogover creates one run every night at 02:00 while a version that declares it
 * is active. A scheduled run has no user (`invocation.identity === "system"`), so `data.object()`
 * needs `allowInternalSystem: true` in the project's identity policy. A run is created even when
 * the previous one is still going, so the work is guarded with a lock; `waitMs: 0` makes a second
 * concurrent run give up immediately instead of waiting.
 */
export const cancelStaleOrders = defineJob({
    key: "sample_cancel_stale_orders",
    name: "Sample: cancel new orders older than 7 days",
    schedule: nightly,
    timeoutMs: 30_000,
}, async ({ job, data, locks, log }) => {
    try {
        await locks.withLock(job.key, { namespace: "samples", waitMs: 0 }, async () => {
            const orders = data.object("sample_order");
            const stale = await orders.records.list({
                where: and(orders.fields.status.eq("new"), orders.fields.created.lt(Date.now() - SEVEN_DAYS)),
                fields: ["status"],
                limit: 200,
            });
            if (stale.items.length === 0) {
                log.info("No stale orders", { source: job.source, runAt: job.runAt });
                return;
            }
            const result = await orders.records.batchUpdate(stale.items.map(item => ({ id: item.id, fields: { status: "cancelled" } })));
            log.info("Stale orders cancelled", { source: job.source, cancelled: result.results.filter(row => row.success).length });
        });
    } catch (error) {
        if (error instanceof LockUnavailableError) {
            log.warn("The previous run is still cancelling orders; this run does nothing", { key: job.key });
            return;
        }
        throw error;
    }
});
