import { CogoverApiError, PermissionDeniedError, RateLimitError, ValidationError } from "@cogover/sdk";
import type { EnqueueOptions, EnqueueResult, JobsApi } from "@cogover/sdk";
import type { RecountPayload } from "../../jobs/recount-orders.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly idempotencyKey?: unknown;
}

/**
 * Enqueues the background job declared in `src/jobs/recount-orders.ts`. Cogover accepts only job keys
 * declared by the active published version, so on the local server or before activation the call
 * throws `ValidationError`; this sample turns the failure paths into explicit answers. With an
 * `idempotencyKey`, a second enqueue while the earlier run is kept returns that run with `duplicate: true`.
 */
export default defineSample<Input>({
    id: "jobs.enqueue",
    method: "POST",
    path: "/jobs/enqueue",
    summary: "jobs.enqueue(key, payload, { idempotencyKey }): start a background job run; duplicate keys return the existing run.",
    sdk: ["context.jobs", "JobsApi", "jobs.enqueue", "EnqueueOptions", "EnqueueResult", "defineJob"],
    file: "src/samples/16-jobs/enqueue.ts",
    curl: `curl -s -X POST "$BASE/jobs/enqueue" -H "Content-Type: application/json" --data '{"idempotencyKey":"recount:manual-1"}'`,
    handler: async ({ request, jobs, log }) => {
        const api: JobsApi = jobs;
        const { idempotencyKey } = request.body;
        if (idempotencyKey !== undefined && typeof idempotencyKey !== "string") throw new ValidationError("idempotencyKey must be a string");

        const payload: RecountPayload = { page: 1, counted: 0 };
        const options: EnqueueOptions = idempotencyKey === undefined ? {} : { idempotencyKey };
        try {
            const result: EnqueueResult = await api.enqueue("sample_recount_orders", payload, options);
            log.info("Recount job enqueued", { runId: result.runId, duplicate: result.duplicate });
            return {
                ...result,
                next: "Follow the run with `cogover-dev jobs run <runId>`; the total is stored under GET /state/get/order-count.",
            };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { r: 1005, msg: "The active project version does not declare this job; publish and activate this project first.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Jobs cannot be enqueued from this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            if (error instanceof RateLimitError) return { r: 1029, msg: "Too many runs are waiting; try again later.", code: error.code };
            if (error instanceof CogoverApiError && error.code === "JOBS_DISABLED") return { r: 1030, msg: "Background jobs are not enabled for this Workspace.", code: error.code };
            throw error;
        }
    },
});
