import type { SortExpression } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Sorting. `fields.<slug>.asc()`/`.desc()` return `SortExpression`s; `orderBy` applies them in
 * order. The system fields `created` and `updated` can be sorted as well.
 */
export default defineSample({
    id: "filters.sort",
    method: "GET",
    path: "/filters/sort",
    summary: "orderBy with several SortExpressions (asc/desc), including the system field updated.",
    sdk: ["FieldReference.asc", "FieldReference.desc", "SortExpression", "ListOptions.orderBy"],
    file: "src/samples/06-filters/sort.ts",
    curl: `curl -s "$BASE/filters/sort?direction=desc"`,
    handler: async ({ request, data }) => {
        const descending = request.query.direction === "desc";
        const orders = data.object("sample_order");
        const { fields } = orders;

        const orderBy: readonly SortExpression[] = [
            fields.status.asc(),
            descending ? fields.total.desc() : fields.total.asc(),
            fields.updated.desc(),
        ];
        const page = await orders.records.list({ orderBy, fields: ["name", "status", "total"], limit: 10 });
        return { orderBy, items: page.items.map(item => ({ id: item.id, ...item.fields, updatedAt: item.system.updatedAt })) };
    },
});
