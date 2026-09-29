import {
    CogoverApiError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    RetryableError,
    ValidationError,
} from "@cogover/sdk";
import type { AgentRecordReference, AgentResultCompletion, AgentsApi, AgentStartOptions, AgentStartResult } from "@cogover/sdk";
import { customerAdviceSchema } from "../../jobs/agent-result.js";
import type { CustomerAdvicePayload } from "../../jobs/agent-result.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const detail = (error: CogoverApiError, key: string): unknown => isRecord(error.details) ? error.details[key] ?? null : null;

interface Input {
    readonly agentId?: unknown;
    readonly customerId?: unknown;
    readonly idempotencyKey?: unknown;
    /** false leaves out onResult, which a local Development Session refuses with NOT_SUPPORTED. */
    readonly onResult?: unknown;
}

/**
 * Asks an AI Agent for advice about a customer. `agents.start` only creates the run: each run is a new
 * conversation that reads the customer record, answers with a result matching `customerAdviceSchema`, and ends
 * by enqueuing the job `sample_agent_result` named in `onResult`. `GET /agents/get/:runId` reads it meanwhile.
 *
 * The identity policy needs an `agents` section that allows the agent (and counts `maxRunsPerDay`); without it
 * every call answers `AGENTS_NOT_ALLOWED`. `runAs: "caller"` runs the agent as the caller, `"agent"` with its own
 * identity; `approvalPolicy: "deny"` refuses tools that need a person's approval, since nobody watches this run.
 * A local Development Session starts real runs but refuses `onResult`: send `"onResult": false`.
 */
export default defineSample<Input>({
    id: "agents.start",
    method: "POST",
    path: "/agents/start",
    summary: "agents.start(agentId, { instruction, variables, records, resultSchema, runAs, approvalPolicy, onResult }): run an AI Agent in the background.",
    sdk: ["context.agents", "AgentsApi", "agents.start", "AgentStartOptions", "AgentStartResult", "AgentRecordReference", "AgentResultCompletion", "s.object"],
    file: "src/samples/26-agents/start.ts",
    curl: `curl -s -X POST "$BASE/agents/start" -H "Content-Type: application/json" --data '{"agentId":"<agentId>","customerId":"<sample_customer id>","idempotencyKey":"advice:<sample_customer id>:2026-10-01"}'`,
    handler: async ({ request, data, agents, invocation }) => {
        const api: AgentsApi = agents;
        const { agentId, customerId, idempotencyKey, onResult } = request.body;
        if (typeof agentId !== "string" || agentId.length === 0) throw new ValidationError("agentId is required");
        if (typeof customerId !== "string" || customerId.length === 0) throw new ValidationError("customerId is required");
        if (idempotencyKey !== undefined && typeof idempotencyKey !== "string") throw new ValidationError("idempotencyKey must be a string");
        if (onResult !== undefined && typeof onResult !== "boolean") throw new ValidationError("onResult must be a boolean");

        const customer = await data.object("sample_customer").records.get(customerId, { fields: ["name", "tier"] });
        if (customer === null) throw new NotFoundError("sample_customer", customerId);

        const context: AgentRecordReference = { objectSlug: "sample_customer", recordId: customer.id, withActivities: true };
        const payload: CustomerAdvicePayload = { customerId: customer.id };
        const completion: AgentResultCompletion = { job: "sample_agent_result", payload };
        const options: AgentStartOptions = {
            instruction: "Review this customer and its recent sample orders, then advise the sales team on the next step.",
            variables: { customerName: customer.fields.name, tier: customer.fields.tier ?? "none" },
            records: [context],
            resultSchema: customerAdviceSchema,
            // An execution without a user (a job, an inbound webhook) must use "agent".
            runAs: invocation.identity === "user" ? "caller" : "agent",
            approvalPolicy: "deny",
            timeoutSeconds: 120,
            ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
            ...(onResult === false ? {} : { onResult: completion }),
        };
        try {
            const started: AgentStartResult = await api.start(agentId, options);
            return { ...started, next: `GET /agents/get/${started.runId}` };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                // AGENTS_NOT_ALLOWED or AGENT_AUTO_APPROVE_NOT_ALLOWED (policy), AGENT_RUN_DENIED (caller), or a read-only execution.
                return { r: 1003, msg: "This project or caller may not run the agent.", reason: detail(error, "reason") };
            }
            if (error instanceof NotFoundError) return { r: 1004, msg: "The agent does not exist.", code: error.code };
            if (error instanceof ValidationError) {
                return { r: 1006, msg: "The agent run could not be started with these values.", detail: error.message, upstreamCode: detail(error, "upstreamCode") };
            }
            // Five starts per execution, maxRunsPerDay of the policy, or a quota of the AI Agent service.
            if (error instanceof RateLimitError) return { r: 1029, msg: "Too many agent runs; try again later.", code: error.code };
            if (error instanceof RetryableError) {
                return { r: 1012, msg: "Temporary failure; retry with the same idempotencyKey.", writesMayHaveCompleted: detail(error, "writesMayHaveCompleted") };
            }
            if (error instanceof CogoverApiError) {
                switch (error.code) {
                    case "NOT_SUPPORTED":
                        return { r: 1014, msg: "onResult runs only in a published version; send \"onResult\": false locally.", code: error.code };
                    case "IDEMPOTENCY_CONFLICT":
                        return { r: 1013, msg: "Another identity already used this idempotencyKey.", code: error.code };
                    case "MAX_HOP_EXCEEDED":
                    case "AGENT_DEPTH_EXCEEDED":
                        return { r: 1015, msg: "The automation budget or the agent depth of this chain is used up.", code: error.code };
                    case "AGENTS_DISABLED":
                        return { r: 1030, msg: "AI Agents are not available in this environment.", code: error.code };
                }
            }
            throw error;
        }
    },
});
