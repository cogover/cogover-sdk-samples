import { ValidationError } from "@cogover/sdk";
import type { FilterCondition, FilterExpression, FilterGroup, FilterOperator } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const OPERATORS: readonly FilterOperator[] = [
    "=", "!=", ">", ">=", "<", "<=", "like", "not like", "startsWith", "endsWith",
    "in", "not in", "is null", "not null", "between",
];
const isOperator = (value: unknown): value is FilterOperator => (OPERATORS as readonly unknown[]).includes(value);
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

interface Input {
    readonly conditions?: unknown;
    readonly match?: unknown;
}

/**
 * Filters built from data instead of code. `FilterCondition` and `FilterGroup` are plain objects
 * (`kind: "condition"` / `kind: "group"`), so a dynamic filter (for example from a UI) can be
 * assembled without the `fields` helpers. Validate the operator before trusting the input.
 */
export default defineSample<Input>({
    id: "filters.raw-expression",
    method: "POST",
    path: "/filters/raw-expression",
    summary: "Build FilterCondition/FilterGroup objects from request data instead of the typed field helpers.",
    sdk: ["FilterCondition", "FilterGroup", "FilterExpression", "FilterOperator"],
    file: "src/samples/06-filters/raw-expression.ts",
    curl: `curl -s -X POST "$BASE/filters/raw-expression" -H "Content-Type: application/json" --data '{"match":"and","conditions":[{"field":"status","operator":"in","value":["new","confirmed"]},{"field":"total","operator":">=","value":100}]}'`,
    handler: async ({ request, data }) => {
        const { conditions, match } = request.body;
        if (!Array.isArray(conditions) || conditions.length === 0) throw new ValidationError("conditions must be a non-empty array");
        if (match !== undefined && match !== "and" && match !== "or") throw new ValidationError("match must be and or or");

        const expressions: FilterCondition[] = conditions.map((entry, index) => {
            if (!isRecord(entry) || typeof entry.field !== "string" || !isOperator(entry.operator)) {
                throw new ValidationError(`conditions[${index}] needs a field and a valid operator`);
            }
            return entry.value === undefined
                ? { kind: "condition", field: entry.field, operator: entry.operator }
                : { kind: "condition", field: entry.field, operator: entry.operator, value: entry.value };
        });
        const where: FilterExpression = expressions.length === 1 && expressions[0] !== undefined
            ? expressions[0]
            : ({ kind: "group", operator: match ?? "and", expressions } satisfies FilterGroup);

        const page = await data.object("sample_order").records.list({ where, fields: ["name", "status", "total"], limit: 10 });
        return { where, total: page.total, items: page.items.map(item => ({ id: item.id, ...item.fields })) };
    },
});
