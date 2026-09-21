import { crypto, ValidationError } from "@cogover/sdk";
import type { RecountPayload } from "../../jobs/recount-orders.js";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface OrderEvent {
    readonly id: string;
    readonly type: string;
    readonly orderId: string;
}

function parseEvent(body: unknown): OrderEvent {
    if (!isRecord(body) || typeof body.id !== "string" || typeof body.type !== "string" || typeof body.orderId !== "string") {
        throw new ValidationError("The event needs string fields id, type and orderId");
    }
    return { id: body.id, type: body.type, orderId: body.orderId };
}

/**
 * A complete webhook receiver: guard the identity, optionally verify the sender's own signature
 * over the raw body with a project secret, then acknowledge quickly and hand the work to a
 * background job. External systems retry until they get a 2xx, so the event ID becomes the
 * idempotency key of the job: a retried delivery finds the existing run (`duplicate: true`).
 */
export default defineSample({
    id: "inbound.hooks-order-events",
    method: "POST",
    path: "/hooks/order-events",
    summary: "Webhook receiver: verify an HMAC signature over request.rawBody with a secret, then enqueue a job keyed by the event ID.",
    sdk: ["invocation.identity", "request.rawBody", "crypto.hmacSha256", "crypto.timingSafeEqual", "jobs.enqueue"],
    file: "src/samples/19-inbound/hooks-order-events.ts",
    curl: `curl -s -i -X POST "$BASE/hooks/order-events" -H "Content-Type: application/json" --data '{"id":"evt-1","type":"order.paid","orderId":"ORD-1"}'   # 403 here; 202 through /hooks/<inboundId>/order-events`,
    handler: async ({ invocation, request, response, jobs, log }) => {
        if (invocation.identity !== "inbound") {
            return response.json({ r: 403, msg: "This route accepts inbound webhook calls only." }, { status: 403 });
        }

        // Optional second factor: the sender signs the raw body and sends the hex HMAC in a header.
        const signature = request.headers["x-sample-signature"];
        if (signature !== undefined) {
            const expected = await crypto.hmacSha256({ secret: "sample_webhook_secret" }, request.rawBody ?? "");
            if (!crypto.timingSafeEqual(expected, signature.trim().toLowerCase())) {
                return response.empty({ status: 401 });
            }
        }

        const event = parseEvent(request.body);
        const payload: RecountPayload = { page: 1, counted: 0 };
        const run = await jobs.enqueue("sample_recount_orders", payload, { idempotencyKey: `order-event:${event.id}` });
        log.info("Order event accepted", { eventId: event.id, type: event.type, runId: run.runId, duplicate: run.duplicate, inbound: invocation.inbound.id });
        // Acknowledge at once; the job does the actual work.
        return response.json({ received: true, eventId: event.id, runId: run.runId, duplicate: run.duplicate }, { status: 202 });
    },
});
