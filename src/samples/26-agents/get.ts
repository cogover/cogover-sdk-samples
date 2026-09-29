import { NotFoundError, PermissionDeniedError } from "@cogover/sdk";
import type { AgentRunState } from "@cogover/sdk";
import type { CustomerAdvice } from "../../jobs/agent-result.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
const IN_PROGRESS: ReadonlySet<string> = new Set(["QUEUED", "RUNNING"]);

/**
 * Reads an AI Agent run that this project started. `status` is `QUEUED` or `RUNNING`, then a final status such
 * as `COMPLETED`, `FAILED`, `TIMEOUT` or `CANCELLED`; `text` is the answer, `result` the structured result typed
 * here with `CustomerAdvice`, and `error` a fixed English description of a failure (the model provider's text
 * is never passed on). The type argument is not checked at runtime: Cogover checked the result against the
 * `resultSchema` of the start.
 */
export default defineSample({
    id: "agents.get",
    method: "GET",
    path: "/agents/get/:runId",
    summary: "agents.get<TResult>(runId): status, text answer, structured result and error of an agent run this project started.",
    sdk: ["agents.get", "AgentRunState"],
    file: "src/samples/26-agents/get.ts",
    curl: `curl -s "$BASE/agents/get/<runId>"`,
    handler: async ({ request, agents }) => {
        const runId = request.params.runId ?? "";
        try {
            const run: AgentRunState<CustomerAdvice> = await agents.get<CustomerAdvice>(runId);
            return {
                runId: run.runId,
                status: run.status,
                finished: !IN_PROGRESS.has(run.status),
                nextStep: run.result?.nextStep ?? null,
                result: run.result,
                text: run.text,
                error: run.error,
            };
        } catch (error) {
            if (error instanceof NotFoundError) return { r: 1004, msg: "This project did not start that agent run.", runId };
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "The project policy has no agents section.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
