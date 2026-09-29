import { RateLimitError } from "@cogover/sdk";
import type { RecountPayload } from "../../jobs/recount-orders.js";
import { defineSample } from "../../sample.js";

const PAGE_SIZE = 200;

/**
 * Counts orders page by page inside the route while its budgets allow, then hands the rest to the
 * background job `sample_recount_orders`, whose budgets are larger. A `RateLimitError` whose
 * `details.budget` is set is a budget of this execution: waiting does not help, so it is reported, never
 * retried. Only counting is shown here; a script that just needs the number calls `records.aggregate`.
 */
export default defineSample({
    id: "limits.hand-off",
    method: "POST",
    path: "/limits/hand-off",
    summary: "Page through records while limits.usage() allows, then enqueue a job with the cursor; report a budget RateLimitError.",
    sdk: ["limits", "LimitUsage.recordsRead", "LimitCounter.remaining", "RateLimitError.details.budget", "jobs.enqueue"],
    file: "src/samples/23-limits/hand-off.ts",
    curl: `curl -s -X POST "$BASE/limits/hand-off"`,
    handler: async ({ data, jobs, limits }) => {
        const orders = data.object("sample_order");
        let cursor: string | undefined;
        let counted = 0;
        let page = 0;
        try {
            do {
                const usage = limits.usage();
                // Keep one call for the hand-off and never ask for more records than remain.
                if (usage.recordsRead.remaining < PAGE_SIZE || usage.capabilityCalls.remaining < 2) {
                    const next: RecountPayload = { page: page + 1, counted, ...(cursor === undefined ? {} : { cursor }) };
                    const run = await jobs.enqueue("sample_recount_orders", next);
                    return { counted, complete: false, continuedBy: run.runId };
                }
                const listed = await orders.records.list({
                    fields: ["name"],
                    orderBy: [orders.fields.created.asc()],
                    limit: PAGE_SIZE,
                    ...(cursor === undefined ? {} : { cursor }),
                });
                page += 1;
                counted += listed.items.length;
                cursor = listed.items.length === PAGE_SIZE ? listed.nextCursor : undefined;
            } while (cursor !== undefined);
            return { counted, complete: true, pages: page };
        } catch (error) {
            const details = error instanceof RateLimitError ? error.details as { budget?: string; limit?: number } : undefined;
            if (details?.budget !== undefined) {
                return { counted, complete: false, budgetReached: details.budget, limit: details.limit ?? null };
            }
            throw error;
        }
    },
});
