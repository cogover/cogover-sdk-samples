import { NotFoundError, ValidationError } from "@cogover/sdk";
import type { NotificationLink, NotificationLinkTarget, NotificationMessage, NotificationSender } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    /** Personnel who should approve the order. */
    readonly approverIds?: unknown;
    /** The order page in your web app: a path such as `/…` or an absolute URL. */
    readonly link?: unknown;
}

const money = (value: number | null | undefined): string =>
    value === null || value === undefined ? "no total" : value.toLocaleString("en-US");

/**
 * Asks approvers to review an order. The notification shows the caller as sender, opens the order page
 * when clicked, and uses an idempotency key derived from the order: calling the route again (a retry,
 * a double click) returns the first result with `duplicate: true` instead of notifying twice.
 */
export default defineSample<Input>({
    id: "notifications.orderApproval",
    method: "POST",
    path: "/notifications/order-approval/:orderId",
    summary: "notifications.send with sender, link and idempotencyKey: ask approvers to review an order exactly once.",
    sdk: ["notifications.send", "NotificationLink", "NotificationLinkTarget", "NotificationSender", "idempotencyKey"],
    file: "src/samples/21-notifications/order-approval.ts",
    curl: `curl -s -X POST "$BASE/notifications/order-approval/<orderId>" -H "Content-Type: application/json" --data '{"approverIds":["<personnelId>"],"link":"https://<workspace>/<order page>"}'`,
    handler: async ({ request, data, notifications, invocation }) => {
        const orderId = request.params.orderId ?? "";
        const { approverIds, link } = request.body;
        if (!Array.isArray(approverIds) || approverIds.length === 0 || !approverIds.every(id => typeof id === "string")) {
            throw new ValidationError("approverIds must list at least one personnel ID");
        }
        const order = await data.object("sample_order").records.get(orderId, { fields: ["name", "total"] });
        if (order === null) throw new NotFoundError("sample_order", orderId);

        // "actor" shows the caller's name and avatar; an invocation without a user sends as the Workspace.
        const sender: NotificationSender = invocation.identity === "user" ? "actor" : "workspace";
        const openIn: NotificationLinkTarget = typeof link === "string" && link.startsWith("/") ? "SAME_TAB" : "NEW_TAB";
        const orderLink: NotificationLink | undefined = typeof link === "string" ? { url: link, openIn } : undefined;
        const message: NotificationMessage = {
            to: approverIds,
            exclude: ["actor"],
            title: `Please approve ${order.fields.name}`,
            subtitle: `Total: ${money(order.fields.total)}`,
            content: `The order ${order.fields.name} is waiting for your approval.`,
            sender,
            ...(orderLink === undefined ? {} : { link: orderLink }),
            idempotencyKey: `order-approval:${orderId}`,
        };
        return notifications.send(message);
    },
});
