import { and, or } from "@cogover/sdk";
import type { FilterExpression, FilterGroup } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Nested groups. `and(...)`/`or(...)` take one or more expressions and return a `FilterGroup`;
 * groups nest freely. Both throw `ValidationError` when called without expressions.
 */
export default defineSample({
    id: "filters.and-or",
    method: "GET",
    path: "/filters/and-or",
    summary: "and()/or(): combine conditions into nested FilterGroup expressions.",
    sdk: ["and", "or", "FilterGroup", "FilterExpression"],
    file: "src/samples/06-filters/and-or.ts",
    curl: `curl -s "$BASE/filters/and-or?minTotal=500"`,
    handler: async ({ request, data }) => {
        const minTotal = Number(request.query.minTotal ?? "500") || 500;
        const orders = data.object("sample_order");
        const { fields } = orders;

        const openOrders: FilterGroup = or(fields.status.eq("new"), fields.status.eq("confirmed"));
        const where: FilterExpression = and(
            openOrders,
            fields.total.gte(minTotal),
            or(fields.tags.in(["rush"]), fields.customer.notNull()),
        );

        const page = await orders.records.list({ where, fields: ["name", "status", "total", "tags"], limit: 10 });
        return { where, total: page.total, items: page.items.map(item => ({ id: item.id, ...item.fields })) };
    },
});
