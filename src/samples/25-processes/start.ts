import {
    CogoverApiError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    RetryableError,
    ValidationError,
} from "@cogover/sdk";
import type { ProcessCompletion, ProcessesApi, ProcessStartOptions, ProcessStartResult } from "@cogover/sdk";
import type { OrderProcessPayload } from "../../jobs/process-completed.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const detail = (error: CogoverApiError, key: string): unknown => isRecord(error.details) ? error.details[key] ?? null : null;

interface Input {
    /** ID of a Normal flow Process (not of a version or a run), as listed in the `processes` section of the policy. */
    readonly processInfoId?: unknown;
    readonly orderId?: unknown;
    /** Values of the Process variables marked as input, by variable name; defaults to `{ order_id: orderId }`. */
    readonly input?: unknown;
    readonly idempotencyKey?: unknown;
    /** false leaves out onComplete, which a local Development Session refuses with NOT_SUPPORTED. */
    readonly onComplete?: unknown;
}

/**
 * Starts a Cogover Process for an order. `processes.start` returns as soon as the instance is created, never
 * after it finishes: the outcome goes to the job `sample_process_completed` named in `onComplete`, and
 * `GET /processes/get/:instanceId` reads the state meanwhile. With an `idempotencyKey`, a repeated start returns
 * the first instance with `duplicate: true`.
 *
 * The identity policy needs a `processes` section that lists the Process; without it every call answers
 * `PROCESSES_NOT_ALLOWED`. The Process starts as the caller, and Cogover still checks that the caller may start
 * it. A local Development Session starts real instances but refuses `onComplete`: send `"onComplete": false`.
 */
export default defineSample<Input>({
    id: "processes.start",
    method: "POST",
    path: "/processes/start",
    summary: "processes.start(processInfoId, { input, instanceName, idempotencyKey, onComplete }): start a Process; the outcome goes to a job.",
    sdk: ["context.processes", "ProcessesApi", "processes.start", "ProcessStartOptions", "ProcessStartResult", "ProcessCompletion"],
    file: "src/samples/25-processes/start.ts",
    curl: `curl -s -X POST "$BASE/processes/start" -H "Content-Type: application/json" --data '{"processInfoId":"<processInfoId>","orderId":"<sample_order id>","idempotencyKey":"order-approval:<sample_order id>"}'`,
    handler: async ({ request, data, processes }) => {
        const api: ProcessesApi = processes;
        const { processInfoId, orderId, input, idempotencyKey, onComplete } = request.body;
        if (typeof processInfoId !== "string" || processInfoId.length === 0) throw new ValidationError("processInfoId is required");
        if (typeof orderId !== "string" || orderId.length === 0) throw new ValidationError("orderId is required");
        if (input !== undefined && !isRecord(input)) throw new ValidationError("input must be an object of Process input variables");
        if (idempotencyKey !== undefined && typeof idempotencyKey !== "string") throw new ValidationError("idempotencyKey must be a string");
        if (onComplete !== undefined && typeof onComplete !== "boolean") throw new ValidationError("onComplete must be a boolean");

        const order = await data.object("sample_order").records.get(orderId, { fields: ["name"] });
        if (order === null) throw new NotFoundError("sample_order", orderId);

        const payload: OrderProcessPayload = { orderId: order.id, orderName: order.fields.name };
        const completion: ProcessCompletion = { job: "sample_process_completed", payload };
        const options: ProcessStartOptions = {
            input: input ?? { order_id: order.id },
            instanceName: `Approve ${order.fields.name}`.slice(0, 255),
            ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
            ...(onComplete === false ? {} : { onComplete: completion }),
        };
        try {
            const started: ProcessStartResult = await api.start(processInfoId, options);
            return { ...started, next: `GET /processes/get/${started.instanceId}` };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                // PROCESSES_NOT_ALLOWED (policy), PROCESS_START_DENIED (the caller may not start it), or a read-only execution.
                return { r: 1003, msg: "This project or caller may not start the Process.", reason: detail(error, "reason") };
            }
            if (error instanceof NotFoundError) return { r: 1004, msg: "The Process does not exist or is not active.", code: error.code };
            if (error instanceof ValidationError) {
                // Also an onComplete job the active version does not declare, or a start the Process service rejected.
                return { r: 1006, msg: "The Process could not be started with these values.", detail: error.message, upstreamCode: detail(error, "upstreamCode") };
            }
            if (error instanceof RateLimitError) return { r: 1029, msg: "Too many Processes were started; try again later.", code: error.code };
            if (error instanceof RetryableError) {
                // true: the instance may exist. Retrying with the same idempotencyKey completes that start instead of a second one.
                return { r: 1012, msg: "Temporary failure; retry with the same idempotencyKey.", writesMayHaveCompleted: detail(error, "writesMayHaveCompleted") };
            }
            if (error instanceof CogoverApiError) {
                switch (error.code) {
                    case "NOT_SUPPORTED":
                        return { r: 1014, msg: "onComplete runs only in a published version; send \"onComplete\": false locally.", code: error.code };
                    case "IDEMPOTENCY_CONFLICT":
                        return { r: 1013, msg: "Another identity already used this idempotencyKey.", code: error.code };
                    case "MAX_HOP_EXCEEDED":
                        return { r: 1015, msg: "The automation budget of this chain is used up.", code: error.code };
                    case "PROCESSES_DISABLED":
                        return { r: 1030, msg: "Processes are not available in this environment.", code: error.code };
                }
            }
            throw error;
        }
    },
});
