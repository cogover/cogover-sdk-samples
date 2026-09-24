import { CogoverApiError, NotFoundError, PermissionDeniedError, RateLimitError, ValidationError } from "@cogover/sdk";
import type {
    NotificationContentType, NotificationDisplay, NotificationMessage, NotificationResult, NotificationsApi,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly to?: unknown;
    readonly title?: unknown;
    readonly content?: unknown;
    readonly html?: unknown;
    readonly subtitle?: unknown;
    readonly channel?: unknown;
    readonly email?: unknown;
}

/**
 * A notification saved in each recipient's notification list. Depending on the notification channel it
 * is also delivered in-app, by web and mobile push and as an email copy; without `channel` every
 * delivery is enabled. Personnel without a user account are skipped and reported in the result.
 * The Workspace must have notification channels set up, otherwise the call answers `NotFoundError`.
 */
export default defineSample<Input>({
    id: "notifications.send",
    method: "POST",
    path: "/notifications/send",
    summary: "notifications.send(message): notify people in their notification list, with an email copy per channel.",
    sdk: [
        "context.notifications", "NotificationsApi", "notifications.send", "NotificationMessage", "NotificationResult",
        "NotificationContentType", "NotificationDisplay",
    ],
    file: "src/samples/21-notifications/send.ts",
    curl: `curl -s -X POST "$BASE/notifications/send" -H "Content-Type: application/json" --data '{"to":["<personnelId>"],"title":"Order confirmed","content":"Order <b>SO-1</b> was confirmed.","html":true}'`,
    handler: async ({ request, notifications }) => {
        const api: NotificationsApi = notifications;
        const { to, title, content, subtitle, channel } = request.body;
        if (!Array.isArray(to) || !to.every(id => typeof id === "string")) throw new ValidationError("to must be a list of personnel IDs");
        if (typeof title !== "string" || typeof content !== "string") throw new ValidationError("title and content are required");

        const contentType: NotificationContentType = request.body.html === true ? "html" : "text";
        // A subtitle is shown only by the FULL layout, which is also the default when one is given.
        const display: NotificationDisplay = typeof subtitle === "string" ? "FULL" : "SIMPLE";
        const message: NotificationMessage = {
            to,
            exclude: ["actor"],
            title,
            content,
            contentType,
            display,
            ...(typeof subtitle === "string" ? { subtitle } : {}),
            ...(typeof channel === "string" ? { channel } : {}),
            ...(request.body.email === false ? { email: false } : {}),
        };
        try {
            const result: NotificationResult = await api.send(message);
            return {
                ...result,
                note: "Delivery is asynchronous: the result means Cogover accepted the notification.",
            };
        } catch (error) {
            if (error instanceof NotFoundError) {
                // resource: "personnel", "notificationChannel", or "object" when the Workspace has no notification channels.
                const details = isRecord(error.details) ? error.details : {};
                return { r: 1004, msg: "A recipient or the notification channel does not exist.", resource: details.resource ?? null, id: details.resourceId ?? null };
            }
            if (error instanceof PermissionDeniedError) {
                // TRIGGER_READ_ONLY in a before-change trigger; a read-only session refuses every notification.
                return { r: 1003, msg: "Notifications cannot be sent from this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            if (error instanceof RateLimitError) return { r: 1029, msg: "The project reached its hourly notification limit.", code: error.code };
            if (error instanceof CogoverApiError && error.code === "NOTIFICATIONS_DISABLED") {
                return { r: 1030, msg: "Notifications are not enabled for this Workspace.", code: error.code };
            }
            throw error;
        }
    },
});
