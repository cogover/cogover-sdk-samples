import type { RecordReference } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * A read does not look up the records that its lookup fields point to unless it asks for them. Without
 * `expandLookups`, `customer` is `{ id, name: "", objectSlug }` and `system.createdBy.name` is `""`.
 *
 * `expandLookups: true` expands every lookup among `fields`, each with every field of the linked record
 * that the project policy grants, and fills in `system.createdBy.name`. The linked records are read with
 * the same identity as the read itself, in the same capability call. A linked record that cannot be read
 * stays `{ id, name: "", objectSlug }` without `fields`. Only one level is expanded, at most 1,000 linked
 * records per call. Expanding costs time: use it only when the names or linked fields are needed, and
 * prefer naming the linked fields (`expand-lookups-fields.ts`).
 */
export default defineSample({
    id: "records.expand-lookups",
    method: "GET",
    path: "/records/expand-lookups",
    summary: "records.list({ fields, expandLookups: true }): orders with their customer's name and fields, and createdBy.name.",
    sdk: ["records.list", "expandLookups: true", "RecordReference", "RecordReference.fields"],
    file: "src/samples/04-records-read/expand-lookups.ts",
    curl: `curl -s "$BASE/records/expand-lookups?limit=5"`,
    handler: async ({ request, data }) => {
        const rawLimit = Number(request.query.limit ?? "5");
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 5;

        const orders = data.object("sample_order");
        const page = await orders.records.list({
            fields: ["name", "total", "customer"],
            expandLookups: true,
            orderBy: [orders.fields.created.desc()],
            limit,
        });
        return {
            total: page.total,
            items: page.items.map(item => {
                const customer: RecordReference<"sample_customer"> | null = item.fields.customer;
                return {
                    id: item.id,
                    name: item.fields.name,
                    total: item.fields.total,
                    // `fields` is present only when the customer could be read; it is typed from `sample_customer`.
                    customer: customer === null ? null : {
                        id: customer.id,
                        name: customer.name,
                        tier: customer.fields?.tier ?? null,
                        email: customer.fields?.email ?? null,
                        expanded: customer.fields !== undefined,
                    },
                    createdBy: item.system.createdBy ?? null,
                };
            }),
        };
    },
});
