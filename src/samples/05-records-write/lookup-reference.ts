import { NotFoundError, ValidationError } from "@cogover/sdk";
import type { RecordReference } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly customerId?: unknown;
    readonly name?: unknown;
}

/**
 * Lookup (reference) fields. A write accepts a record ID or a `RecordReference`; only the ID is sent.
 * A read returns a `RecordReference` `{ id, name, objectSlug }` whose `name` is `""` unless the read asks
 * for `expandLookups`; with it, `name` and the chosen fields of the linked record are filled in (see
 * `04-records-read/expand-lookups-fields.ts`). This sample reads the order back both ways.
 */
export default defineSample<Input>({
    id: "records.lookup-reference",
    method: "POST",
    path: "/records/lookup-reference",
    summary: "Write a lookup field with an ID and read it back as a RecordReference, without and with expandLookups.",
    sdk: ["RecordReference", "records.create", "records.get", "expandLookups"],
    file: "src/samples/05-records-write/lookup-reference.ts",
    curl: `curl -s -X POST "$BASE/records/lookup-reference" -H "Content-Type: application/json" --data '{"customerId":"<sample_customer id>","name":"Order for Ada"}'`,
    handler: async ({ request, data }) => {
        const { customerId, name } = request.body;
        if (typeof customerId !== "string" || customerId.trim().length === 0) throw new ValidationError("customerId is required");
        if (typeof name !== "string" || name.trim().length === 0) throw new ValidationError("name is required");

        const customers = data.object("sample_customer");
        const customer = await customers.records.get(customerId, { fields: ["name"] });
        if (customer === null) throw new NotFoundError("sample_customer", customerId);

        const orders = data.object("sample_order");
        // Either form works for a reference field: the plain ID, or a RecordReference such as `customer` below.
        const orderId = await orders.records.create({ name: name.trim(), customer: customerId, status: "new", subtotal: 0, discount: 0, total: 0 });
        const plain = await orders.records.get(orderId, { fields: ["customer"] });
        const expanded = await orders.records.get(orderId, { fields: ["customer"], expandLookups: { customer: ["tier"] } });

        // { id, name: "", objectSlug: "sample_customer" }: the ID is always there, the name is not.
        const reference: RecordReference<"sample_customer"> | null = plain?.fields.customer ?? null;
        // { id, name, objectSlug, fields: { tier } }
        const linked: RecordReference<"sample_customer"> | null = expanded?.fields.customer ?? null;
        return {
            orderId,
            customer: reference,
            customerExpanded: linked,
            sameCustomer: reference?.id === customer.id && linked?.id === customer.id,
            note: "Without expandLookups a lookup has an empty name; with it, the name and the chosen fields are filled in.",
        };
    },
});
