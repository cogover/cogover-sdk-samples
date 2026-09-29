import { and, defineAction, s, ValidationError } from "@cogover/sdk";
import type {
    ActionConfig,
    ActionContext,
    ActionHandler,
    ActionSource,
    AgentActionSource,
    DataApi,
    FilterCondition,
    FilterExpression,
    InferSchema,
    ProcessActionRunAs,
    ProcessActionSource,
    WorkspaceObjects,
} from "@cogover/sdk";

type CustomerTier = NonNullable<WorkspaceObjects["sample_customer"]["tier"]>;

/**
 * The input of the action. A Process node fills each property from Process data, an AI Agent generates it
 * from the `describe` texts. Cogover checks it against this schema before the handler runs, so the handler
 * always receives exactly these properties with these types. A property a Process node may leave empty is
 * `.optional()`.
 */
export const scoreCustomerInput = s.object({
    customerId: s.recordId("sample_customer").describe("ID of the sample_customer record to score"),
    since: s.date().optional().describe("Count only orders placed on or after this date (YYYY-MM-DD)"),
    strict: s.boolean().optional().describe("When true, tier A needs a score of 90 instead of 80"),
});

/**
 * The output. A Process reads it as the node result (one child per property), an AI Agent as JSON. An
 * expected case such as an unknown customer is reported with `found: false` instead of an error: the caller
 * would only receive the error code, never the reason.
 */
export const scoreCustomerOutput = s.object({
    found: s.boolean().describe("false when the customer does not exist or is not visible"),
    score: s.integer({ minimum: 0, maximum: 100 }),
    tier: s.enum(["A", "B", "C"]).describe("A: score 80 or more (90 when strict), B: 50 or more, C: below 50"),
    breakdown: s.object({
        customerTier: s.integer({ minimum: 0, maximum: 40 }),
        revenue: s.integer({ minimum: 0, maximum: 40 }),
        activity: s.integer({ minimum: 0, maximum: 20 }),
    }),
    orders: s.integer({ minimum: 0 }),
    revenue: s.number(),
    lastOrderedAt: s.dateTime().optional().describe("When the latest counted order was placed, in Unix milliseconds"),
    reasons: s.array(s.string({ maxLength: 200 }), { maxItems: 10 }),
});

/** `InferSchema` turns a schema into its TypeScript type: the handler's input and return types. */
export type ScoreCustomerInput = InferSchema<typeof scoreCustomerInput>;
export type CustomerScore = InferSchema<typeof scoreCustomerOutput>;

const TIER_POINTS: Readonly<Record<CustomerTier, number>> = { gold: 40, silver: 25, bronze: 10 };
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The scoring itself, shared by the action and by the route `GET /actions/score-customer/:customerId`, so the
 * logic can be tried over HTTP (and through the local server) before a Process or an AI Agent calls it.
 * Reads one customer and aggregates its orders in two capability calls.
 */
export async function scoreCustomer(data: DataApi, input: ScoreCustomerInput): Promise<CustomerScore> {
    const customer = await data.object("sample_customer").records.get(input.customerId, {
        fields: ["name", "tier", "is_active"],
    });
    if (customer === null) {
        return {
            found: false, score: 0, tier: "C", breakdown: { customerTier: 0, revenue: 0, activity: 0 },
            orders: 0, revenue: 0, reasons: ["Customer not found"],
        };
    }

    const orders = data.object("sample_order");
    // A lookup is filtered by the linked record ID with a plain condition; the typed helpers compare lookups
    // with a whole RecordReference.
    const ofCustomer: FilterCondition = { kind: "condition", field: "customer", operator: "=", value: customer.id };
    const where: FilterExpression[] = [ofCustomer, orders.fields.status.neq("cancelled")];
    if (input.since !== undefined) {
        // An s.date() value is a calendar date; this sample reads it as midnight UTC.
        if (!DATE.test(input.since) || Number.isNaN(Date.parse(`${input.since}T00:00:00Z`))) {
            throw new ValidationError("since must be a date in the form YYYY-MM-DD");
        }
        where.push(orders.fields.ordered_at.gte(Date.parse(`${input.since}T00:00:00Z`)));
    }
    const { values } = await orders.records.aggregate({
        where: and(...where),
        metrics: { orders: { count: "id" }, revenue: { sum: "total" }, lastOrderedAt: { max: "ordered_at" } },
    });

    const tier = customer.fields.tier;
    const breakdown = {
        customerTier: tier === null ? 0 : TIER_POINTS[tier],
        revenue: Math.max(0, Math.min(40, Math.floor(values.revenue / 1000) * 4)),
        activity: Math.min(20, values.orders * 4),
    };
    const reasons = [
        `Tier ${tier ?? "none"}: +${breakdown.customerTier}`,
        `Revenue ${values.revenue}: +${breakdown.revenue}`,
        `${values.orders} orders: +${breakdown.activity}`,
    ];
    let score = breakdown.customerTier + breakdown.revenue + breakdown.activity;
    if (customer.fields.is_active === false) {
        score = Math.min(score, 20);
        reasons.push("Inactive customer: score capped at 20");
    }
    const tierA = input.strict === true ? 90 : 80;
    return {
        found: true,
        score,
        tier: score >= tierA ? "A" : score >= 50 ? "B" : "C",
        breakdown,
        orders: values.orders,
        revenue: values.revenue,
        ...(values.lastOrderedAt === null ? {} : { lastOrderedAt: values.lastOrderedAt }),
        reasons,
    };
}

/** Who called the action, for the log. Every property comes from Cogover, not from the input. */
export function describeSource(source: ActionSource): Readonly<Record<string, string | boolean | null>> {
    if (source.type === "process") {
        const process: ProcessActionSource = source;
        // How the node chose the identity; "PERSONNEL" may come from Process data, so it proves nothing about who asked.
        const runAs: ProcessActionRunAs | null = process.runAs;
        return { type: "process", processInfoId: process.processInfoId, instanceId: process.instanceId, nodeId: process.nodeId, runAs };
    }
    const agent: AgentActionSource = source;
    return { type: "agent", agentId: agent.agentId, interactive: agent.interactive, initiatorPersonnelId: agent.initiatorPersonnelId };
}

const handler: ActionHandler<typeof scoreCustomerInput, typeof scoreCustomerOutput> = async (
    { action, invocation, data, log }: ActionContext,
    input,
) => {
    const result = await scoreCustomer(data, input);
    log.info("Customer scored", {
        runId: action.runId,
        identity: invocation.executionIdentity,
        caller: describeSource(invocation.source),
        customerId: input.customerId,
        score: result.score,
    });
    return result;
};

/**
 * A read action. `effect: "read"` runs it read-only: a record write, `jobs.enqueue`, `processes.start` and the
 * other side effects throw `PermissionDeniedError`. Exposed to both builders: Process Builder offers it as a
 * Custom Module Action node, AI Agent Builder as a tool of the Custom Module category, whose AI Agent reads
 * `description` to decide when to call it. The configuration is typed with `ActionConfig` here; the write
 * action in `set-order-status.ts` passes it inline, which infers the same.
 */
const config: ActionConfig<typeof scoreCustomerInput, typeof scoreCustomerOutput> = {
    key: "sample_score_customer",
    label: "Sample: score customer",
    description: "Scores a sample_customer from its tier and its orders that are not cancelled, and returns tier A, B or C with the reasons.",
    exposeTo: ["process", "agent"],
    effect: "read",
    input: scoreCustomerInput,
    output: scoreCustomerOutput,
    timeoutMs: 5000,
    handler,
};

export const scoreCustomerAction = defineAction(config);
