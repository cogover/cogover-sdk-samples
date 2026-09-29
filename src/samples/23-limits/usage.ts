import { limits } from "@cogover/sdk";
import type { LimitCounter, LimitUsage, LimitsApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Reads the budgets of this execution before and after two calls. `limits.usage()` is not a capability
 * call: it reports the counts as of the last Cogover call. A records read counts the records returned,
 * `crypto` counts as a local call, and the context's `limits` is the same object as the package export.
 */
export default defineSample({
    id: "limits.usage",
    method: "GET",
    path: "/limits/usage",
    summary: "Read limits.usage() (capability calls, local calls, records read and written, time) before and after two calls.",
    sdk: ["limits", "LimitsApi", "LimitUsage", "LimitCounter", "ScriptContext.limits"],
    file: "src/samples/23-limits/usage.ts",
    curl: `curl -s "$BASE/limits/usage"`,
    handler: async ({ data, crypto, limits: contextLimits }) => {
        const api: LimitsApi = contextLimits;
        const before: LimitUsage = api.usage();
        const page = await data.object("sample_order").records.list({ fields: ["name"], limit: 5 });
        await crypto.sha256("limits sample");
        const after = limits.usage();
        const counter = (value: LimitCounter) => `${value.used}/${value.limit} (${value.remaining} left)`;
        return {
            sameObject: contextLimits === limits,
            listed: page.items.length,
            before: { capabilityCalls: counter(before.capabilityCalls), recordsRead: counter(before.recordsRead) },
            after: {
                capabilityCalls: counter(after.capabilityCalls),
                localCalls: counter(after.localCalls),
                recordsRead: counter(after.recordsRead),
                recordsWritten: counter(after.recordsWritten),
                elapsedMs: after.elapsedMs,
                timeLimitMs: after.timeLimitMs,
            },
        };
    },
});
