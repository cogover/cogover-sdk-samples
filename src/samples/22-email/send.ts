import { CogoverApiError, NotFoundError, PermissionDeniedError, RateLimitError, ValidationError } from "@cogover/sdk";
import type { EmailDelivery, EmailMessage, EmailRecipient, EmailSender, EmailSendResult, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    /** A Workspace mailbox ID, or "actor" for the caller's default personal mailbox. */
    readonly from?: unknown;
    /** Addresses, `{ email, name }` objects or `{ personnelId }` objects. */
    readonly to?: unknown;
    readonly subject?: unknown;
    readonly text?: unknown;
    readonly html?: unknown;
    readonly idempotencyKey?: unknown;
}

const recipient = (value: unknown): EmailRecipient => {
    if (typeof value === "string") return value;
    if (isRecord(value) && typeof value.personnelId === "string") return { personnelId: value.personnelId };
    if (isRecord(value) && typeof value.email === "string") {
        return typeof value.name === "string" ? { email: value.email, name: value.name } : { email: value.email };
    }
    throw new ValidationError("Each recipient is an address, { email, name } or { personnelId }");
};

/**
 * Sends an email from a mailbox the Project policy allows, without logging it on a record. The call
 * succeeds when Cogover accepted the email; the mailbox sends it asynchronously and a later delivery
 * failure is not reported back. An `idempotencyKey` makes a retry return the first result instead of
 * sending again.
 */
export default defineSample<Input>({
    id: "email.send",
    method: "POST",
    path: "/email/send",
    summary: "email.send(message): send an email from a granted Workspace or personal mailbox.",
    sdk: ["email.send", "EmailMessage", "EmailSender", "EmailRecipient", "EmailSendResult", "EmailDelivery", "PermissionDeniedError"],
    file: "src/samples/22-email/send.ts",
    curl: `curl -s -X POST "$BASE/email/send" -H "Content-Type: application/json" --data '{"from":"<mailboxId>","to":["someone@example.com"],"subject":"Hello from Cogover","text":"Sent by the SDK samples."}'`,
    handler: async ({ request, email }) => {
        const { from, to, subject, text, html, idempotencyKey } = request.body;
        if (typeof from !== "string") throw new ValidationError("from is a mailbox ID or \"actor\"");
        if (!Array.isArray(to) || to.length === 0) throw new ValidationError("to must list at least one recipient");
        if (typeof subject !== "string") throw new ValidationError("subject is required");

        const sender: EmailSender = from === "actor" ? "actor" : { mailbox: from };
        const body = typeof html === "string" ? { html } : { text: typeof text === "string" ? text : "" };
        // Typed with the Workspace object slugs, like the parameter of email.send in a typed project.
        const message: EmailMessage<keyof WorkspaceObjects> = {
            from: sender,
            to: to.map(recipient),
            subject,
            ...body,
            ...(typeof idempotencyKey === "string" ? { idempotencyKey } : {}),
        };
        try {
            const result: EmailSendResult = await email.send(message);
            const delivery: EmailDelivery = result.delivery;
            return { ...result, note: delivery === "direct" ? "Sent from the mailbox; not logged on a record." : "Logged on a record." };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                // EMAIL_SENDER_NOT_GRANTED: add the mailbox to the email section of the identity policy.
                return { r: 1003, msg: "This mailbox is not allowed for the project.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            if (error instanceof NotFoundError) {
                const details = isRecord(error.details) ? error.details : {};
                return { r: 1004, msg: "The mailbox or a recipient does not exist.", resource: details.resource ?? null, id: details.resourceId ?? null };
            }
            if (error instanceof RateLimitError) return { r: 1029, msg: "The project reached its hourly email limit.", code: error.code };
            if (error instanceof CogoverApiError && error.code === "EMAIL_DISABLED") {
                return { r: 1030, msg: "Email is not enabled for this Workspace.", code: error.code };
            }
            throw error;
        }
    },
});
