import {
    CogoverApiError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    RetryableError,
    ValidationError,
} from "@cogover/sdk";
import type { AgentDeliveryTarget, AgentResultCompletion, AgentStartOptions, AgentStartResult } from "@cogover/sdk";
import type { AgentDeliveryPayload } from "../../jobs/agent-delivery.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const detail = (error: CogoverApiError, key: string): unknown => isRecord(error.details) ? error.details[key] ?? null : null;

/** Start refusals about the recipient of `deliverTo`: no run is created and nothing is sent. */
const RECIPIENT_REFUSALS: Readonly<Record<string, string>> = {
    RECIPIENT_NOT_FOUND: "The recipient is not a personnel of this Workspace.",
    RECIPIENT_ACCESS_DENIED: "The recipient may not use this agent.",
    RECIPIENT_AI_SEAT_REQUIRED: "The recipient has not been assigned an AI Agent seat.",
};
const DEFAULT_TOPIC = "This is a test message from the Cogover SDK samples. No action is needed.";

interface Input {
    readonly agentId?: unknown;
    /** Personnel to message; defaults to the caller, so trying the sample writes to yourself. */
    readonly personnelId?: unknown;
    /** "new" (default) opens a conversation; "latest" continues the latest one of the agent and the recipient. */
    readonly conversation?: unknown;
    /** Name of a conversation the run opens. */
    readonly title?: unknown;
    /** What the agent should tell the recipient. */
    readonly topic?: unknown;
    readonly idempotencyKey?: unknown;
    /** false leaves out onResult, which a local Development Session refuses with NOT_SUPPORTED. */
    readonly onResult?: unknown;
}

/**
 * Lets an AI Agent open a chat with a personnel on its own. With `deliverTo`, the agent may send a chat
 * message to that personnel during the run: it arrives in the AI chat of the agent and the recipient, who can
 * answer there. The agent writes the message and decides whether to send one, so the instruction says what the
 * recipient needs to know. The agent's final answer still comes back only to this project.
 *
 * `agents.start` only creates the run. What happened to the message is its `delivery`, read by
 * `GET /agents/delivery/:runId` and handed to the job `sample_agent_delivery` named in `onResult`.
 * Cogover checks the recipient when the run starts (exists, may use the agent, has an AI Agent seat) and
 * refuses the start with a `RECIPIENT_...` code otherwise; the identity policy needs no entry for recipients.
 *
 * The message is real, also in a local Development Session: it reaches a real person, and Cogover limits how
 * many messages an agent may send to one personnel per run and per day. An `idempotencyKey` names the first
 * run whatever its `deliverTo` was, so include the recipient in the key.
 */
export default defineSample<Input>({
    id: "agents.deliver",
    method: "POST",
    path: "/agents/deliver",
    summary: "agents.start(agentId, { instruction, deliverTo: { personnelId, conversation, title }, onResult }): let an AI Agent send a chat message to a personnel.",
    sdk: ["agents.start", "AgentStartOptions.deliverTo", "AgentDeliveryTarget", "AgentResultCompletion", "CogoverApiError"],
    file: "src/samples/26-agents/deliver.ts",
    curl: `curl -s -X POST "$BASE/agents/deliver" -H "Content-Type: application/json" --data '{"agentId":"<agentId>","conversation":"latest","title":"SDK sample","topic":"Order SO-1024 is waiting for your approval."}'`,
    handler: async ({ request, agents, invocation }) => {
        const { agentId, personnelId, conversation, title, topic, idempotencyKey, onResult } = request.body;
        if (typeof agentId !== "string" || agentId.length === 0) throw new ValidationError("agentId is required");
        if (personnelId !== undefined && (typeof personnelId !== "string" || personnelId.length === 0)) {
            throw new ValidationError("personnelId must be a personnel ID");
        }
        if (conversation !== undefined && conversation !== "new" && conversation !== "latest") {
            throw new ValidationError("conversation must be \"new\" or \"latest\"");
        }
        if (title !== undefined && typeof title !== "string") throw new ValidationError("title must be a string");
        if (topic !== undefined && (typeof topic !== "string" || topic.trim().length === 0 || topic.length > 500)) {
            throw new ValidationError("topic must be a non-empty string of at most 500 characters");
        }
        if (idempotencyKey !== undefined && typeof idempotencyKey !== "string") throw new ValidationError("idempotencyKey must be a string");
        if (onResult !== undefined && typeof onResult !== "boolean") throw new ValidationError("onResult must be a boolean");

        // Without personnelId the caller is the recipient; an execution without a user has no caller to default to.
        const recipient = personnelId ?? invocation.user?.membership.personnelId;
        if (recipient === undefined) throw new ValidationError("personnelId is required when the execution has no user");

        const target: AgentDeliveryTarget = {
            personnelId: recipient,
            ...(conversation === undefined ? {} : { conversation }),
            ...(title === undefined ? {} : { title }),
        };
        const payload: AgentDeliveryPayload = { personnelId: recipient };
        const completion: AgentResultCompletion = { job: "sample_agent_delivery", payload };
        const options: AgentStartOptions = {
            instruction: "Send the recipient exactly one short chat message about the topic below, in your own words. "
                + "Then answer with one sentence that says what you sent.\n"
                + `Topic: ${topic ?? DEFAULT_TOPIC}`,
            // An execution without a user (a job, an inbound webhook) must use "agent".
            runAs: invocation.identity === "user" ? "caller" : "agent",
            approvalPolicy: "deny",
            timeoutSeconds: 120,
            deliverTo: target,
            ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
            ...(onResult === false ? {} : { onResult: completion }),
        };
        try {
            const started: AgentStartResult = await agents.start(agentId, options);
            return { ...started, recipient, conversation: target.conversation ?? "new", next: `GET /agents/delivery/${started.runId}` };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                // About the project or the caller (AGENTS_NOT_ALLOWED, AGENT_RUN_DENIED), never about the recipient.
                return { r: 1003, msg: "This project or caller may not run the agent.", reason: detail(error, "reason") };
            }
            if (error instanceof NotFoundError) return { r: 1004, msg: "The agent does not exist.", code: error.code };
            if (error instanceof ValidationError) {
                return { r: 1006, msg: "The agent run could not be started with these values.", detail: error.message, upstreamCode: detail(error, "upstreamCode") };
            }
            if (error instanceof RateLimitError) return { r: 1029, msg: "Too many agent runs; try again later.", code: error.code };
            if (error instanceof RetryableError) return { r: 1012, msg: "Temporary failure; retry with the same idempotencyKey.", code: error.code };
            if (error instanceof CogoverApiError) {
                const refusal = RECIPIENT_REFUSALS[error.code];
                if (refusal !== undefined) {
                    // Fix it in the Workspace first (add the personnel, share the agent, assign a seat); a retry alone will not help.
                    return { r: 1016, msg: refusal, code: error.code, upstreamCode: detail(error, "upstreamCode"), recipient };
                }
                switch (error.code) {
                    case "DELIVERY_UNAVAILABLE":
                        return { r: 1017, msg: "The recipient could not be checked right now; try again later.", code: error.code, upstreamCode: detail(error, "upstreamCode") };
                    case "NOT_SUPPORTED":
                        return { r: 1014, msg: "onResult runs only in a published version; send \"onResult\": false locally.", code: error.code };
                    case "IDEMPOTENCY_CONFLICT":
                        return { r: 1013, msg: "Another identity already used this idempotencyKey.", code: error.code };
                    case "AGENTS_DISABLED":
                        return { r: 1030, msg: "AI Agents are not available in this environment.", code: error.code };
                }
            }
            throw error;
        }
    },
});
