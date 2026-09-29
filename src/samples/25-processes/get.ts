import { NotFoundError, PermissionDeniedError } from "@cogover/sdk";
import type { ProcessInstanceState } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
const FINISHED: ReadonlySet<string> = new Set(["COMPLETED", "FAILED", "CANCELED", "DELETED"]);

/**
 * Reads the current state of a Process instance that this project started: `NOT_STARTED`, `RUNNING`, `PAUSED`,
 * `COMPLETED`, `FAILED`, `CANCELED` or `DELETED`, with `startedAt` / `finishedAt` in Unix milliseconds (null
 * until then). An instance started elsewhere answers `NotFoundError`. It is also allowed in a read-only
 * execution, but do not poll it inside a route to wait for the end: name a job in `onComplete` instead.
 */
export default defineSample({
    id: "processes.get",
    method: "GET",
    path: "/processes/get/:instanceId",
    summary: "processes.get(instanceId): state, startedAt and finishedAt of a Process instance this project started.",
    sdk: ["processes.get", "ProcessInstanceState"],
    file: "src/samples/25-processes/get.ts",
    curl: `curl -s "$BASE/processes/get/<instanceId>"`,
    handler: async ({ request, processes }) => {
        const instanceId = request.params.instanceId ?? "";
        try {
            const instance: ProcessInstanceState = await processes.get(instanceId);
            return { ...instance, finished: FINISHED.has(instance.state) };
        } catch (error) {
            if (error instanceof NotFoundError) return { r: 1004, msg: "This project did not start that Process instance.", instanceId };
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "The project policy has no processes section.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
