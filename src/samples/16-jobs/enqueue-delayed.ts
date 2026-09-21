import { ValidationError } from "@cogover/sdk";
import type { EnqueueOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly delayMs?: unknown;
    readonly runAt?: unknown;
}

/**
 * Enqueues the scheduled job `sample_cancel_stale_orders` on demand, later rather than now:
 * `delayMs` (0 to 30 days) or `runAt` (a Unix millisecond time at most 30 days ahead), never both.
 * Delay this way instead of waiting inside a handler. A run enqueued from a route runs as the
 * caller; the same job started by its schedule runs as the system identity.
 */
export default defineSample<Input>({
    id: "jobs.enqueue-delayed",
    method: "POST",
    path: "/jobs/enqueue-delayed",
    summary: "jobs.enqueue(key, null, { delayMs } | { runAt }): run a job later instead of as soon as possible.",
    sdk: ["jobs.enqueue", "EnqueueOptions.delayMs", "EnqueueOptions.runAt", "JobSchedule"],
    file: "src/samples/16-jobs/enqueue-delayed.ts",
    curl: `curl -s -X POST "$BASE/jobs/enqueue-delayed" -H "Content-Type: application/json" --data '{"delayMs":60000}'`,
    handler: async ({ request, jobs }) => {
        const { delayMs, runAt } = request.body;
        if (delayMs !== undefined && runAt !== undefined) throw new ValidationError("Pass delayMs or runAt, not both");
        if (delayMs !== undefined && (!Number.isInteger(delayMs) || Number(delayMs) < 0)) throw new ValidationError("delayMs must be a non-negative integer");
        if (runAt !== undefined && (!Number.isInteger(runAt) || Number(runAt) <= Date.now())) throw new ValidationError("runAt must be a future Unix millisecond time");

        const options: EnqueueOptions = delayMs !== undefined
            ? { delayMs: Number(delayMs) }
            : runAt !== undefined ? { runAt: Number(runAt) } : {};
        try {
            const result = await jobs.enqueue("sample_cancel_stale_orders", null, options);
            return { ...result, options, note: "Check the run with `cogover-dev jobs run <runId>`; its schedule is listed by `cogover-dev jobs schedules`." };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { r: 1005, msg: "The active project version does not declare this job; publish and activate this project first.", detail: error.message };
            }
            throw error;
        }
    },
});
