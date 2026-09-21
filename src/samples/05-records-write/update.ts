import { ValidationError } from "@cogover/sdk";
import type { CogoverRecordId, UpdateFields, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const STATUSES = ["new", "confirmed", "shipped", "cancelled"] as const;
type Status = (typeof STATUSES)[number];
const isStatus = (value: unknown): value is Status => (STATUSES as readonly unknown[]).includes(value);

interface Input {
    readonly status?: unknown;
    readonly note?: unknown;
}

/**
 * Updates the given fields of one record; other fields are untouched. Assign `null` to clear a
 * field. Record IDs that come from outside the SDK are plain strings: assert the `CogoverRecordId`
 * brand once, at the boundary.
 */
export default defineSample<Input>({
    id: "records.update",
    method: "PATCH",
    path: "/records/update/:recordId",
    summary: "records.update(id, fields): change some fields of one record; null clears a field.",
    sdk: ["records.update", "UpdateFields", "CogoverRecordId"],
    file: "src/samples/05-records-write/update.ts",
    curl: `curl -s -X PATCH "$BASE/records/update/<recordId>" -H "Content-Type: application/json" --data '{"status":"confirmed","note":null}'`,
    handler: async ({ request, data }) => {
        const recordId = (request.params.recordId ?? "") as CogoverRecordId;
        const { status, note } = request.body;

        const fields: UpdateFields<OrderFields> = {};
        if (status !== undefined) {
            if (!isStatus(status)) throw new ValidationError(`status must be one of ${STATUSES.join(", ")}`);
            fields.status = status;
        }
        if (note !== undefined) {
            if (note !== null && typeof note !== "string") throw new ValidationError("note must be a string or null");
            fields.note = note;
        }
        if (Object.keys(fields).length === 0) throw new ValidationError("Provide status and/or note");

        await data.object("sample_order").records.update(recordId, fields);
        return { id: recordId, updated: fields };
    },
});
