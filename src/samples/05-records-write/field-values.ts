import { NotFoundError } from "@cogover/sdk";
import type { UrlValue, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type CustomerFields = WorkspaceObjects["sample_customer"];

interface Input {
    readonly keep?: unknown;
}

/**
 * The value format of each field type in writes and reads: text, boolean, single choice (option slug),
 * URL (`UrlValue`), decimal, long text; `null` clears a field. The customer is deleted at the end
 * unless `keep` is true.
 */
export default defineSample<Input>({
    id: "records.field-values",
    method: "POST",
    path: "/records/field-values",
    summary: "Value formats per field type (text, boolean, choice, UrlValue, number) and clearing with null.",
    sdk: ["UrlValue", "CreateFields", "UpdateFields", "records.create", "records.update", "records.get", "records.deleteMany"],
    file: "src/samples/05-records-write/field-values.ts",
    curl: `curl -s -X POST "$BASE/records/field-values" -H "Content-Type: application/json" --data '{"keep":false}'`,
    handler: async ({ request, data }) => {
        const keep = request.body.keep === true;
        const customers = data.object("sample_customer");
        const website: UrlValue = { url: "https://example.com", alias: "Example" };

        const id = await customers.records.create({
            name: `Field values ${Date.now()}`,
            email: `field-values-${Date.now()}@example.com`,
            phone: "+84 900 000 000",
            tier: "silver",
            is_active: true,
            website,
            credit_limit: 2_500_000.5,
            note: "temporary note",
        });
        // `null` clears a field; other fields keep their values.
        await customers.records.update(id, { note: null, tier: "gold" });

        const stored = await customers.records.get(id);
        if (stored === null) throw new NotFoundError("sample_customer", id);
        const fields: CustomerFields = stored.fields;

        if (!keep) await customers.records.deleteMany([id]);
        return { id, kept: keep, fields, createdAt: stored.system.createdAt };
    },
});
