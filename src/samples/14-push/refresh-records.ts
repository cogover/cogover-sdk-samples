import { ValidationError } from "@cogover/sdk";
import type { PushApi, PushOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly recordIds?: unknown;
}

/**
 * Asks every web client that currently shows one of these records to reload it. Delivery is
 * best-effort and one call costs one capability call. `exclude: ["actor"]` skips the user whose
 * request started this execution (a system execution has no actor).
 */
export default defineSample<Input>({
    id: "push.refresh-records",
    method: "POST",
    path: "/push/refresh-records",
    summary: "push.refreshRecords(object, recordIds, options): make open record pages reload.",
    sdk: ["context.push", "PushApi", "push.refreshRecords", "PushOptions"],
    file: "src/samples/14-push/refresh-records.ts",
    curl: `curl -s -X POST "$BASE/push/refresh-records" -H "Content-Type: application/json" --data '{"recordIds":["<recordId>"]}'`,
    handler: async ({ request, push }) => {
        const ids = request.body.recordIds;
        if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === "string")) {
            throw new ValidationError("recordIds must be a non-empty array of record IDs");
        }
        const api: PushApi = push;
        const options: PushOptions = { recipients: "viewers", exclude: ["actor"] };
        await api.refreshRecords("sample_order", ids, options);
        return { sent: true, object: "sample_order", recordIds: ids };
    },
});
