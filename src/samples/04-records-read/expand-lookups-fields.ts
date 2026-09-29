import type { ExpandLookups, SelectedFields, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const ORDER_FIELDS = ["name", "total", "customer"] as const;

/**
 * Expands only `customer`, and reads only two of its fields. Each key must be a lookup that is also in
 * `fields`; its value is a list of field slugs of the linked Object, or `"*"`. With workspace declarations
 * the slugs are checked against `sample_customer`, so `{ customer: ["tierr"] }` does not compile.
 */
const EXPAND: ExpandLookups<SelectedFields<OrderFields, typeof ORDER_FIELDS>> = { customer: ["tier", "credit_limit"] };

/**
 * Checks open orders against their customer's credit limit with one capability call: the orders and the two
 * customer fields come back together. Every listed linked field must be granted by the project policy,
 * otherwise the read throws `PermissionDeniedError`; a slug that `sample_customer` does not have throws
 * `ValidationError`. A customer that cannot be read has no `fields`.
 */
export default defineSample({
    id: "records.expand-lookups-fields",
    method: "GET",
    path: "/records/expand-lookups/fields",
    summary: "records.list({ fields, expandLookups: { customer: [...] } }): expand one lookup with chosen fields of the linked record.",
    sdk: ["records.list", "expandLookups", "ExpandLookups", "SelectedFields", "RecordReference.fields"],
    file: "src/samples/04-records-read/expand-lookups-fields.ts",
    curl: `curl -s "$BASE/records/expand-lookups/fields?limit=20"`,
    handler: async ({ request, data }) => {
        const rawLimit = Number(request.query.limit ?? "20");
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 20;

        const orders = data.object("sample_order");
        const { fields } = orders;
        const page = await orders.records.list({
            where: fields.status.in(["new", "confirmed"]),
            fields: ORDER_FIELDS,
            expandLookups: EXPAND,
            orderBy: [fields.created.desc()],
            limit,
        });

        const rows = page.items.map(item => {
            const customer = item.fields.customer;
            const creditLimit = customer?.fields?.credit_limit ?? null;
            const total = item.fields.total ?? 0;
            return {
                id: item.id,
                name: item.fields.name,
                total,
                customer: customer === null ? null : customer.name,
                tier: customer?.fields?.tier ?? null,
                creditLimit,
                overLimit: creditLimit !== null && total > creditLimit,
            };
        });
        return { checked: rows.length, overLimit: rows.filter(row => row.overLimit).length, rows };
    },
});
