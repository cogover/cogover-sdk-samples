import { ValidationError } from "@cogover/sdk";
import type {
    AggregateGroup,
    AggregateGroupKey,
    AggregateGroupResult,
    AggregateValues,
    GroupedAggregateOptions,
    WorkspaceObjects,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const GROUP_BY = ["customer"] as const;
const METRICS = {
    orders: { count: "id" },
    revenue: { sum: "total" },
    lastOrderedAt: { max: "ordered_at" },
} as const;

/**
 * `key.customer` is the customer's record ID. `groupBy` takes choice, boolean, lookup, number, `date` and `date_time`
 * fields, not text or reference fields: a lookup groups by record ID, a choice by its option slug and a date by
 * epoch milliseconds.
 */
type CustomerKey = AggregateGroupKey<OrderFields, (typeof GROUP_BY)[number]>;
type CustomerGroup = AggregateGroup<CustomerKey, AggregateValues<typeof METRICS>>;

/**
 * Metrics per customer: `groupBy` takes 1 to 3 fields and returns one `{ key, values }` group for each
 * combination of values, the groups with the most records first. Orders without a customer are in no group.
 *
 * `limit` (1 to 5,000, 1,000 when left out) is the most groups to return; `truncated` is `true` when there
 * were more. The keys are IDs, so the sample reads the customers' names with one `getMany` call.
 *
 * A client from `data.asUser()` cannot group (its type does not accept `groupBy`); group as the caller or
 * through `data.asSystem()`.
 */
export default defineSample({
    id: "records.aggregate-group",
    method: "GET",
    path: "/records/aggregate/by-customer",
    summary: "records.aggregate({ groupBy, metrics, limit }): orders and revenue per customer, with truncated when there are more groups.",
    sdk: ["records.aggregate", "GroupedAggregateOptions", "AggregateGroupResult", "AggregateGroup", "AggregateGroupKey"],
    file: "src/samples/04-records-read/aggregate-group.ts",
    curl: `curl -s "$BASE/records/aggregate/by-customer?limit=5"`,
    handler: async ({ request, data }) => {
        const rawLimit = Number(request.query.limit ?? "5");
        if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 100) {
            throw new ValidationError("limit must be an integer from 1 to 100");
        }
        const orders = data.object("sample_order");
        const options: GroupedAggregateOptions<OrderFields, typeof METRICS, typeof GROUP_BY> = {
            where: orders.fields.status.neq("cancelled"),
            groupBy: GROUP_BY,
            metrics: METRICS,
            limit: rawLimit,
        };
        const result: AggregateGroupResult<CustomerKey, AggregateValues<typeof METRICS>> = await orders.records.aggregate(options);

        const customerIds = result.groups.map(group => group.key.customer);
        const customers = customerIds.length === 0
            ? { records: [], missingIds: [] }
            : await data.object("sample_customer").records.getMany(customerIds, { fields: ["name"] });
        const nameById = new Map(customers.records.map(customer => [customer.id, customer.fields.name]));

        const groups: CustomerGroup[] = result.groups;
        return {
            truncated: result.truncated,
            customers: groups.map(group => ({
                customerId: group.key.customer,
                // null when the caller may not read that customer.
                name: nameById.get(group.key.customer) ?? null,
                ...group.values,
            })),
        };
    },
});
