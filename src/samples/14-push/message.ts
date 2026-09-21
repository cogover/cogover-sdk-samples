import { ValidationError } from "@cogover/sdk";
import type { BackgroundContentType, BackgroundMessage } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly event?: unknown;
    readonly recordIds?: unknown;
    readonly recipients?: unknown;
}

/**
 * A background message: the web app handles it silently, for example a custom component that
 * listens for events on a record page. `content` is required (up to 16,384 characters).
 */
export default defineSample<Input>({
    id: "push.message",
    method: "POST",
    path: "/push/message",
    summary: "push.message({ content, contentType, object, recordIds }): a silent message for custom components.",
    sdk: ["push.message", "BackgroundMessage", "BackgroundContentType"],
    file: "src/samples/14-push/message.ts",
    curl: `curl -s -X POST "$BASE/push/message" -H "Content-Type: application/json" --data '{"event":"order.escalated","recordIds":["<recordId>"]}'`,
    handler: async ({ request, push }) => {
        const { event, recordIds, recipients } = request.body;
        if (typeof event !== "string" || event.trim().length === 0) throw new ValidationError("event is required");
        const personnel = Array.isArray(recipients) && recipients.every(id => typeof id === "string") && recipients.length > 0 ? recipients : undefined;
        const ids = Array.isArray(recordIds) && recordIds.every(id => typeof id === "string") && recordIds.length > 0 ? recordIds : undefined;
        if (personnel === undefined && ids === undefined) throw new ValidationError("recordIds are required unless recipients are given");

        const contentType: BackgroundContentType = "text";
        const message: BackgroundMessage<"sample_order"> = {
            content: JSON.stringify({ event, at: Date.now() }),
            contentType,
            ...(ids === undefined ? {} : { object: "sample_order", recordIds: ids }),
        };
        await push.message(message, personnel === undefined ? {} : { recipients: personnel });
        return { sent: true, message };
    },
});
