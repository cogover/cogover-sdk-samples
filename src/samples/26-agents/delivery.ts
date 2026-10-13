import { NotFoundError, PermissionDeniedError } from "@cogover/sdk";
import type { AgentDelivery, AgentRunState } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";
const IN_PROGRESS: ReadonlySet<string> = new Set(["QUEUED", "RUNNING"]);

/** What a delivery means for the caller. The switch covers every status of `AgentDelivery`. */
function describe(delivery: AgentDelivery): string {
    switch (delivery.status) {
        case "SENT":
            return delivery.newConversation
                ? "The recipient received the message in a new conversation."
                : "The recipient received the message in the latest conversation with the agent.";
        case "NOT_SENT":
            return "The agent sent no message, for example because it found nothing to report.";
        case "BLOCKED":
            return `The agent tried to send and the message was refused: ${delivery.errorCode ?? "DELIVERY_ERROR"}.`;
        case "FAILED":
            return `The agent tried to send and sending failed: ${delivery.errorCode ?? "DELIVERY_ERROR"}.`;
    }
}

/**
 * Reads what happened to the chat message of a run started with `deliverTo` (`POST /agents/deliver`).
 * `delivery` is `null` for a run started without `deliverTo`, and can still be `null` while the run is in
 * progress, so read it once the run has a final status. The run's `status` does not depend on it: a run can be
 * `COMPLETED` while its message was blocked.
 *
 * `delivery.errorCode` is `null` for `SENT` and `NOT_SENT`; otherwise it is a code such as
 * `RECIPIENT_RATE_LIMITED`, `RECIPIENT_AI_SEAT_REQUIRED`, `CHAT_SERVER_ERROR` or `DELIVERY_ERROR`.
 * `chatSessionId` and `conversationId` identify the conversation when a message was sent.
 */
export default defineSample({
    id: "agents.delivery",
    method: "GET",
    path: "/agents/delivery/:runId",
    summary: "agents.get(runId).delivery: whether the chat message of a deliverTo run was SENT, NOT_SENT, BLOCKED or FAILED, and in which conversation.",
    sdk: ["agents.get", "AgentRunState.delivery", "AgentDelivery"],
    file: "src/samples/26-agents/delivery.ts",
    curl: `curl -s "$BASE/agents/delivery/<runId>"`,
    handler: async ({ request, agents }) => {
        const runId = request.params.runId ?? "";
        try {
            const run: AgentRunState = await agents.get(runId);
            const finished = !IN_PROGRESS.has(run.status);
            const delivery: AgentDelivery | null = run.delivery;
            return {
                runId: run.runId,
                status: run.status,
                finished,
                delivery,
                outcome: delivery !== null ? describe(delivery)
                    : finished ? "This run was started without deliverTo."
                        : "The run is still in progress; read delivery once it has a final status.",
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
