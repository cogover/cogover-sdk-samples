import { PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AggregateResult, AggregateValues, AsUserAggregateMetric, AsUserRecordsApi, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

/**
 * What a client from `data.asUser()` can compute: `count` on `"id"` or on a number field, and `sum`, `avg`, `min`
 * and `max` on a number field. `countDistinct`, counting a text or lookup field, and `groupBy` do not compile.
 * `min`/`max` of a `date_time` field compiles, because the field is typed as a number, but like the others it
 * throws `ValidationError`. Compute those as the caller or through `data.asSystem()` (see
 * `04-records-read/aggregate.ts`).
 */
const METRICS = {
    orders: { count: "id" },
    withTotal: { count: "total" },
    revenue: { sum: "total" },
    averageOrder: { avg: "total" },
    smallestOrder: { min: "total" },
    largestOrder: { max: "total" },
} as const satisfies Readonly<Record<string, AsUserAggregateMetric<OrderFields>>>;

/**
 * Order totals as another person sees them: only the orders that this person may read are counted. Like every
 * `asUser()` call, it needs approval in the project's identity policy; otherwise it throws `PermissionDeniedError`.
 * Counts and sums are `0` when nothing matches; `avg`, `min` and `max` are `null` then.
 */
export default defineSample({
    id: "identity.as-user-aggregate",
    method: "GET",
    path: "/identity/as-user/:personnelId/aggregate",
    summary: "data.asUser(personnelId).records.aggregate({ metrics }): order totals visible to another person, with the metrics asUser() allows.",
    sdk: ["data.asUser", "records.aggregate", "AsUserAggregateMetric", "AsUserRecordsApi", "AggregateResult"],
    file: "src/samples/07-identity/as-user-aggregate.ts",
    curl: `curl -s "$BASE/identity/as-user/<personnelId>/aggregate"`,
    handler: async ({ request, data }) => {
        const personnelId = request.params.personnelId ?? "";
        if (personnelId.trim().length === 0) throw new ValidationError("personnelId is required");

        const orders = data.asUser(personnelId).object("sample_order");
        const records: AsUserRecordsApi<OrderFields> = orders.records;
        try {
            const result: AggregateResult<AggregateValues<typeof METRICS>> = await records.aggregate({
                where: orders.fields.status.neq("cancelled"),
                metrics: METRICS,
            });
            // `orders`, `withTotal` and `revenue` are numbers; the other three are `number | null`.
            return { personnelId, ...result.values };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                const reason = isRecord(error.details) ? error.details.reason ?? null : null;
                return { r: 1003, msg: "This project may not act as the requested person.", reason };
            }
            throw error;
        }
    },
});
