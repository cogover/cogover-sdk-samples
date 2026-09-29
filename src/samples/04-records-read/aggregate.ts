import { ValidationError } from "@cogover/sdk";
import type { AggregateMetric, AggregateOptions, AggregateResult, AggregateValues, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];
type OrderStatus = NonNullable<OrderFields["status"]>;

const STATUSES: readonly OrderStatus[] = ["new", "confirmed", "shipped", "cancelled"];
const isStatus = (value: unknown): value is OrderStatus => STATUSES.some(status => status === value);

/**
 * 1 to 20 named metrics. `count: "id"` counts the matching records and `count: field` the records with a value
 * in that field; `countDistinct` is approximate on large sets; neither takes a reference, file or URL field.
 * `sum`/`avg` take a number field and `min`/`max` a number or date field (a date comes back as epoch
 * milliseconds). A client from `data.asUser()` accepts fewer metrics: see `07-identity/as-user-aggregate.ts`.
 */
const METRICS = {
    orders: { count: "id" },
    withCustomer: { count: "customer" },
    customers: { countDistinct: "customer" },
    revenue: { sum: "total" },
    averageOrder: { avg: "total" },
    firstOrderedAt: { min: "ordered_at" },
    lastOrderedAt: { max: "ordered_at" },
} as const satisfies Readonly<Record<string, AggregateMetric<OrderFields>>>;

/**
 * Counts and sums orders in one capability call, without reading the records: use it instead of paging
 * through `records.list` to add numbers up. The result is `{ values }` with one value per metric name:
 * `count`, `countDistinct` and `sum` are numbers, `0` when nothing matches; `avg`, `min` and `max` are `null`
 * when no record has a value.
 *
 * Only the records that the identity in use can see are counted, and every field in `where` and `metrics`
 * must be granted by the project policy. Aggregates are computed from a search index that follows writes
 * after about one second, so an order created just before may not be counted yet.
 */
export default defineSample({
    id: "records.aggregate",
    method: "GET",
    path: "/records/aggregate",
    summary: "records.aggregate({ where, metrics }): count, countDistinct, sum, avg, min and max over the matching orders.",
    sdk: ["records.aggregate", "AggregateOptions", "AggregateMetric", "AggregateResult", "AggregateValues"],
    file: "src/samples/04-records-read/aggregate.ts",
    curl: `curl -s "$BASE/records/aggregate?status=confirmed"`,
    handler: async ({ request, data }) => {
        const status = request.query.status;
        if (status !== undefined && !isStatus(status)) {
            throw new ValidationError(`status must be one of ${STATUSES.join(", ")}`);
        }
        const orders = data.object("sample_order");
        const options: AggregateOptions<OrderFields, typeof METRICS> = {
            metrics: METRICS,
            ...(status === undefined ? {} : { where: orders.fields.status.eq(status) }),
        };
        const result: AggregateResult<AggregateValues<typeof METRICS>> = await orders.records.aggregate(options);

        // Typed from METRICS: `orders` and `revenue` are numbers, `averageOrder` is `number | null`.
        const { orders: count, revenue, averageOrder } = result.values;
        return {
            status: status ?? "all",
            values: result.values,
            summary: count === 0 ? "No matching orders" : `${count} orders, revenue ${revenue}, average ${averageOrder ?? "n/a"}`,
        };
    },
});
