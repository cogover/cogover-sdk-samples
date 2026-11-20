import { CogoverApiError, NotFoundError, ValidationError } from "@cogover/sdk";
import type { NotificationMessage, NotificationResult } from "@cogover/sdk";
import type { SampleHandler, SampleInfo } from "../../sample.js";

interface Input {
    /** Category codes such as "process", "sales" or "system", or category record IDs. */
    readonly categories?: unknown;
    readonly title?: unknown;
    readonly idempotencyKey?: unknown;
}

/**
 * Files a notification under notification categories (`@cogover/sdk` 0.17.0 or later), which recipients use to
 * filter their notification list. Each entry is the `code` of a category, the same in every Workspace that has the
 * category, or a category record ID. The SDK checks the list (at most 10 entries of 1 to 64 letters, digits, `_` or
 * `-`; duplicates removed) and answers 400 for an invalid one. Cogover does not check that the categories exist:
 * entries that do not name an active category are ignored, and when none is left the notification is filed under
 * `system`. Categories never change delivery; `channel` decides that (see `send.ts`).
 *
 * To be safe to try, the route notifies only the caller, without an email copy, and derives an `idempotencyKey`
 * from the caller and the categories: the same list notifies the caller once per 7 days unless the body passes
 * another `idempotencyKey`. A key has at most 128 characters, so a long list needs an `idempotencyKey` of its own.
 */
export default {
    id: "notifications.categories",
    method: "POST",
    path: "/notifications/categories",
    summary: "notifications.send({ categories }): file a notification to the caller under category codes such as process or sales.",
    sdk: ["notifications.send", "NotificationMessage.categories", "idempotencyKey"],
    file: "src/samples/21-notifications/categories.ts",
    curl: `curl -s -X POST "$BASE/notifications/categories" -H "Content-Type: application/json" --data '{"categories":["process","sales"]}'`,
} satisfies SampleInfo;

export const notificationsCategories: SampleHandler<Input> = async ({ request, notifications, invocation }) => {
    const { categories, title, idempotencyKey } = request.body;
    // Only the shape is checked here; notifications.send validates the entries themselves.
    if (!Array.isArray(categories) || !categories.every(entry => typeof entry === "string")) {
        throw new ValidationError("categories must be a list of category codes or record IDs");
    }
    if (title !== undefined && typeof title !== "string") throw new ValidationError("title must be a string");
    if (idempotencyKey !== undefined && typeof idempotencyKey !== "string") throw new ValidationError("idempotencyKey must be a string");

    const personnelId = invocation.user?.membership.personnelId;
    if (personnelId === undefined) {
        return { r: 1003, msg: "Call this route as a user: it notifies the caller only." };
    }
    // Sorted and without duplicates, so ["sales", "process"] and ["process", "sales"] use the same key.
    const key = idempotencyKey ?? `notification-categories:${personnelId}:${[...new Set(categories)].sort().join(".")}`;

    const message: NotificationMessage = {
        to: [personnelId],
        title: title ?? `SDK sample: categories ${categories.join(", ") || "(none)"}`,
        content: "This notification was filed under the categories the request named. Filter the notification list by category to find it.",
        categories,
        email: false,
        idempotencyKey: key,
    };
    try {
        const result: NotificationResult = await notifications.send(message);
        return { ...result, categories, idempotencyKey: key };
    } catch (error) {
        if (error instanceof NotFoundError) {
            // The Workspace has no notification channels set up (resource "object", id "notification_channel").
            return { r: 1004, msg: "Notifications are not set up in this Workspace.", resource: error.resource };
        }
        if (error instanceof CogoverApiError && error.code === "NOTIFICATIONS_DISABLED") {
            return { r: 1030, msg: "Notifications are not enabled for this Workspace.", code: error.code };
        }
        throw error;
    }
};
