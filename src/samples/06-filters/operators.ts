import { ValidationError } from "@cogover/sdk";
import type { FieldReference, FieldReferences, FilterCondition, FilterOperator, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

/**
 * Every comparison of a `FieldReference`. `orders.fields.<slug>` is typed from `workspace.d.ts`:
 * `status.eq("new")` only accepts option slugs, `total.gt(...)` only numbers. For an array field
 * (`tags`), `in`/`notIn` take the element type. Pick one recipe with `?op=`.
 */
export default defineSample({
    id: "filters.operators",
    method: "GET",
    path: "/filters/operators",
    summary: "All FieldReference operators (eq, neq, gt, gte, lt, lte, like, notLike, startsWith, endsWith, in, notIn, isNull, notNull, between) plus tagsIn on an array field; run one with ?op=.",
    sdk: ["object.fields", "FieldReferences", "FieldReference", "FilterCondition", "FilterOperator", "records.list"],
    file: "src/samples/06-filters/operators.ts",
    curl: `curl -s "$BASE/filters/operators?op=in"`,
    handler: async ({ request, data }) => {
        const orders = data.object("sample_order");
        const fields: FieldReferences<OrderFields> = orders.fields;
        const total: FieldReference<OrderFields["total"]> = fields.total;

        const recipes: Readonly<Record<string, () => FilterCondition>> = {
            eq: () => fields.status.eq("new"),
            neq: () => fields.status.neq("cancelled"),
            gt: () => total.gt(1_000),
            gte: () => total.gte(1_000),
            lt: () => total.lt(10_000),
            lte: () => total.lte(10_000),
            like: () => fields.name.like("order"),
            notLike: () => fields.name.notLike("internal"),
            startsWith: () => fields.name.startsWith("Batch"),
            endsWith: () => fields.name.endsWith("1"),
            in: () => fields.status.in(["new", "confirmed"]),
            notIn: () => fields.status.notIn(["cancelled"]),
            isNull: () => fields.customer.isNull(),
            notNull: () => fields.customer.notNull(),
            between: () => total.between(100, 5_000),
            tagsIn: () => fields.tags.in(["rush", "gift"]),
        };

        const op = typeof request.query.op === "string" ? request.query.op : "eq";
        const build = recipes[op];
        if (build === undefined) throw new ValidationError(`op must be one of ${Object.keys(recipes).join(", ")}`);

        const where = build();
        const operator: FilterOperator = where.operator;
        const page = await orders.records.list({ where, fields: ["name", "status", "total", "tags"], limit: 5 });
        return { op, operator, where, total: page.total, items: page.items.map(item => ({ id: item.id, ...item.fields })) };
    },
});
