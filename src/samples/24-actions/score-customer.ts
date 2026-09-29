import { ValidationError } from "@cogover/sdk";
import type { CogoverRecordId } from "@cogover/sdk";
import { scoreCustomer } from "../../actions/score-customer.js";
import type { CustomerScore, ScoreCustomerInput } from "../../actions/score-customer.js";
import { defineSample } from "../../sample.js";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Runs the logic of the action `sample_score_customer` over HTTP. The action and this route share one function,
 * so the scoring can be tried with curl, in tests and on the local server before a Process or an AI Agent calls
 * the action. A route gets no schema check from Cogover: it validates the query itself, where the action relies
 * on its `input` schema.
 */
export default defineSample({
    id: "actions.score-customer",
    method: "GET",
    path: "/actions/score-customer/:customerId",
    summary: "Share one function between a route and an action: score a customer over HTTP exactly as sample_score_customer does.",
    sdk: ["defineAction", "ActionHandler", "InferSchema", "records.aggregate"],
    file: "src/samples/24-actions/score-customer.ts",
    curl: `curl -s "$BASE/actions/score-customer/<customerId>?since=2026-01-01&strict=true"`,
    handler: async ({ request, data }) => {
        const { since, strict } = request.query;
        if (since !== undefined && (typeof since !== "string" || !DATE.test(since))) {
            throw new ValidationError("since must be a date in the form YYYY-MM-DD");
        }
        if (strict !== undefined && strict !== "true" && strict !== "false") throw new ValidationError("strict must be true or false");
        const input: ScoreCustomerInput = {
            // Only a string here: scoreCustomer answers found: false for an unknown ID.
            customerId: (request.params.customerId ?? "") as CogoverRecordId,
            ...(since === undefined ? {} : { since }),
            ...(strict === undefined ? {} : { strict: strict === "true" }),
        };
        const result: CustomerScore = await scoreCustomer(data, input);
        return result;
    },
});
