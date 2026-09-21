import { NotFoundError, ValidationError } from "@cogover/sdk";
import type { RecordReference } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly customerId?: unknown;
    readonly name?: unknown;
}

/**
 * Lookup (reference) fields. A write accepts a record ID or a `RecordReference`; only the ID is sent.
 * A read returns `{ id, name, objectSlug }` of the referenced record, never its other fields:
 * read those with `records.get`/`records.getMany` on the target Object.
 */
export default defineSample<Input>({
    id: "records.lookup-reference",
    method: "POST",
    path: "/records/lookup-reference",
    summary: "Write a lookup field with an ID and read it back as a RecordReference { id, name, objectSlug }.",
    sdk: ["RecordReference", "records.create", "records.get"],
    file: "src/samples/05-records-write/lookup-reference.ts",
    curl: `curl -s -X POST "$BASE/records/lookup-reference" -H "Content-Type: application/json" --data '{"customerId":"<sample_customer id>","name":"Order for Ada"}'`,
    handler: async ({ request, data }) => {
        const { customerId, name } = request.body;
        if (typeof customerId !== "string" || customerId.trim().length === 0) throw new ValidationError("customerId is required");
        if (typeof name !== "string" || name.trim().length === 0) throw new ValidationError("name is required");

        const customers = data.object("sample_customer");
        const customer = await customers.records.get(customerId, { fields: ["name", "tier"] });
        if (customer === null) throw new NotFoundError("sample_customer", customerId);

        const orders = data.object("sample_order");
        // Either form works for a reference field: the plain ID, or a RecordReference such as `customer` below.
        const orderId = await orders.records.create({ name: name.trim(), customer: customerId, status: "new", subtotal: 0, discount: 0, total: 0 });
        const order = await orders.records.get(orderId, { fields: ["name", "customer"] });

        const reference: RecordReference<"sample_customer"> | null = order?.fields.customer ?? null;
        return {
            orderId,
            customer: reference,
            customerTier: customer.fields.tier,
            note: "A reference exposes id, name and objectSlug only.",
        };
    },
});
