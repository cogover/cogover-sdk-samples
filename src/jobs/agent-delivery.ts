import { defineJob } from "@cogover/sdk";
import type { AgentDelivery, AgentResultJobPayload, JobDefinition } from "@cogover/sdk";

/** What `POST /agents/deliver` hands to this job in `onResult.payload`. */
export interface AgentDeliveryPayload {
    /** Personnel the agent was allowed to message. */
    readonly personnelId: string;
}

/**
 * Receives the outcome of an AI Agent run started by `POST /agents/deliver` with `deliverTo`.
 * `payload.agentRun.delivery` says what happened to the chat message: `SENT`, `NOT_SENT` (the agent chose not
 * to write), `BLOCKED` or `FAILED` with an `errorCode`; it is `null` for a run started without `deliverTo`.
 * The run itself can be `COMPLETED` while its message was not sent, so the job branches on `delivery`, not on
 * `agentRun.status`. It stores the outcome in project state (`GET /state/get/last-agent-delivery`).
 */
export const agentDelivery: JobDefinition = defineJob<AgentResultJobPayload<AgentDeliveryPayload>>({
    key: "sample_agent_delivery",
    name: "Sample: record what happened to an AI Agent's chat message",
    maxAttempts: 3,
}, async ({ payload, state, log }) => {
    if (payload === null) return;
    const { agentRun } = payload;
    const delivery: AgentDelivery | null = agentRun.delivery;
    await state.namespace("samples").set("last-agent-delivery", {
        runId: agentRun.runId,
        runStatus: agentRun.status,
        recipient: payload.payload?.personnelId ?? null,
        delivery,
        error: agentRun.error,
    });
    if (delivery === null || delivery.status === "NOT_SENT") {
        log.info("The agent sent no message", { runId: agentRun.runId, runStatus: agentRun.status });
        return;
    }
    if (delivery.status === "SENT") {
        log.info("Agent message delivered", {
            runId: agentRun.runId, conversationId: delivery.conversationId, newConversation: delivery.newConversation,
        });
        return;
    }
    // BLOCKED: the recipient may not receive it (seat, permission, rate limit). FAILED: sending itself failed.
    log.warn("Agent message not delivered", { runId: agentRun.runId, status: delivery.status, errorCode: delivery.errorCode });
});
