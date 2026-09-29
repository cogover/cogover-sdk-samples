import { defineJob, s } from "@cogover/sdk";
import type { AgentResultJobPayload, CogoverRecordId, InferSchema, JobDefinition } from "@cogover/sdk";

/**
 * The structured result `POST /agents/start` asks the AI Agent for. The agent must return a value that matches
 * it, otherwise the run fails with `RESULT_SCHEMA_MISMATCH`. The same schema types the result read by this job
 * and by `GET /agents/get/:runId`.
 */
export const customerAdviceSchema = s.object({
    summary: s.string({ maxLength: 2000 }).describe("Two or three sentences about the customer's recent orders"),
    nextStep: s.enum(["call", "email", "offer_discount", "no_action"]).describe("What the sales team should do next"),
    confidence: s.number({ minimum: 0, maximum: 1 }).describe("How sure the agent is, from 0 to 1"),
});

export type CustomerAdvice = InferSchema<typeof customerAdviceSchema>;

/** What `POST /agents/start` hands to this job in `onResult.payload`. */
export interface CustomerAdvicePayload {
    readonly customerId: CogoverRecordId;
}

/**
 * Receives the outcome of an AI Agent run started by `POST /agents/start` with `onResult`. `payload.agentRun`
 * carries `status`, the text answer, the structured `result` (null when the run failed or the result is larger
 * than 16 KiB), a fixed English `error` and the token `usage`. The job stores a summary in project state
 * (`GET /state/get/last-agent-result`) and adds the advice to the customer's note once per run.
 */
export const agentResult: JobDefinition = defineJob<AgentResultJobPayload<CustomerAdvicePayload, CustomerAdvice>>({
    key: "sample_agent_result",
    name: "Sample: save the advice of an AI Agent run",
    maxAttempts: 3,
}, async ({ payload, data, state, log }) => {
    if (payload === null) return;
    const { agentRun } = payload;
    await state.namespace("samples").set("last-agent-result", {
        runId: agentRun.runId,
        status: agentRun.status,
        result: agentRun.result,
        error: agentRun.error,
        usage: agentRun.usage,
    });
    if (agentRun.result === null || payload.payload === null) {
        log.warn("The agent run gave no advice", { runId: agentRun.runId, status: agentRun.status, error: agentRun.error?.code ?? null });
        return;
    }

    const customers = data.object("sample_customer");
    const customer = await customers.records.get(payload.payload.customerId, { fields: ["note"] });
    if (customer === null || customer.fields.note?.includes(agentRun.runId) === true) return;
    const advice = agentRun.result;
    const line = `AI advice (${agentRun.runId}): ${advice.nextStep}, confidence ${advice.confidence}. ${advice.summary}`;
    await customers.records.update(customer.id, {
        note: customer.fields.note === null || customer.fields.note === "" ? line : `${customer.fields.note}\n${line}`,
    });
    log.info("Agent advice saved", { runId: agentRun.runId, nextStep: advice.nextStep });
});
