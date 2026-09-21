import { ValidationError } from "@cogover/sdk";
import type { PushRecipients, ToastLink, ToastMessage, ToastPosition, ToastSize } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly title?: unknown;
    readonly content?: unknown;
    readonly recipients?: unknown;
    readonly recordIds?: unknown;
}

const stringArray = (value: unknown): readonly string[] | undefined =>
    Array.isArray(value) && value.length > 0 && value.every(item => typeof item === "string") ? value : undefined;

/**
 * A toast in the web app. With the default recipients (`"viewers"`), `object` and `recordIds` are
 * required and the toast appears only while one of those records is open. With a list of personnel
 * IDs it reaches those people wherever they are; `object`/`recordIds` are then optional.
 */
export default defineSample<Input>({
    id: "push.toast",
    method: "POST",
    path: "/push/toast",
    summary: "push.toast(message, options): show a notification to record viewers or to specific people.",
    sdk: ["push.toast", "ToastMessage", "ToastLink", "ToastPosition", "ToastSize", "PushRecipients"],
    file: "src/samples/14-push/toast.ts",
    curl: `curl -s -X POST "$BASE/push/toast" -H "Content-Type: application/json" --data '{"title":"Order updated","content":"Totals were recalculated.","recordIds":["<recordId>"]}'`,
    handler: async ({ request, push }) => {
        const { title, content } = request.body;
        if (typeof title !== "string" && typeof content !== "string") throw new ValidationError("title or content is required");
        const recipients: PushRecipients = stringArray(request.body.recipients) ?? "viewers";
        const recordIds = stringArray(request.body.recordIds);
        if (recipients === "viewers" && recordIds === undefined) throw new ValidationError("recordIds are required for viewers");

        const position: ToastPosition = "BOTTOM_RIGHT";
        const size: ToastSize = "MEDIUM";
        const links: readonly ToastLink[] = [{ label: "SDK on npm", url: "https://www.npmjs.com/package/@cogover/sdk" }];
        const message: ToastMessage<"sample_order"> = {
            ...(typeof title === "string" ? { title } : {}),
            ...(typeof content === "string" ? { content } : {}),
            links,
            position,
            size,
            durationSeconds: 8,
            ...(recordIds === undefined ? {} : { object: "sample_order", recordIds }),
        };
        await push.toast(message, { recipients, exclude: ["actor"] });
        return { sent: true, recipients, message };
    },
});
