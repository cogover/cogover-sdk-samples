import { NotFoundError, ValidationError } from "@cogover/sdk";
import type { EmailAttachment, EmailMessage, EmailRecordLink, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    /** A Workspace mailbox ID, or "actor" for the caller's default personal mailbox. */
    readonly from?: unknown;
    /** Attaches every file of this order's `files` field. */
    readonly orderId?: unknown;
}

/**
 * Emails a customer at the address stored in the customer's `email` field and logs the email on the
 * customer's timeline, where Cogover tracks opens and clicks. Files of an order are attached by
 * reference (object, record, file field): the script never handles file URLs. Records used here
 * must be readable by the caller. A retry with the same order returns the first result.
 */
export default defineSample<Input>({
    id: "email.customerEmail",
    method: "POST",
    path: "/email/customers/:customerId",
    summary: "email.send with record, recordEmailFields and attachments: email a customer and log it on the timeline.",
    sdk: ["email.send", "EmailRecordLink", "EmailAttachment", "recordEmailFields", "appendSignature"],
    file: "src/samples/22-email/customer-email.ts",
    curl: `curl -s -X POST "$BASE/email/customers/<customerId>" -H "Content-Type: application/json" --data '{"from":"actor","orderId":"<orderId>"}'`,
    handler: async ({ request, data, email }) => {
        const customerId = request.params.customerId ?? "";
        const { from, orderId } = request.body;
        if (typeof from !== "string") throw new ValidationError("from is a mailbox ID or \"actor\"");

        const customer = await data.object("sample_customer").records.get(customerId, { fields: ["name", "email"] });
        if (customer === null) throw new NotFoundError("sample_customer", customerId);
        if (customer.fields.email === null) throw new ValidationError("The customer has no email address");

        const record: EmailRecordLink<"sample_customer"> = { object: "sample_customer", recordId: customerId };
        const attachments: EmailAttachment<"sample_order">[] = typeof orderId === "string"
            ? [{ object: "sample_order", recordId: orderId, field: "files" }]
            : [];
        const message: EmailMessage<keyof WorkspaceObjects> = {
            from: from === "actor" ? "actor" : { mailbox: from },
            subject: `Documents for ${customer.fields.name}`,
            html: `<p>Dear ${customer.fields.name},</p><p>Please find your documents attached.</p>`,
            record,
            recordEmailFields: ["email"],
            attachments,
            // The sender's default signature exists only for a personal mailbox.
            appendSignature: from === "actor",
            ...(typeof orderId === "string" ? { idempotencyKey: `customer-docs:${customerId}:${orderId}` } : {}),
        };
        return email.send(message);
    },
});
