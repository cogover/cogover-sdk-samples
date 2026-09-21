import { PermissionDeniedError } from "@cogover/sdk";
import type { DataApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * System access. `data.asSystem()` returns a client that does not apply the caller's record
 * permissions (project restrictions, field validation and runtime limits still apply). It needs
 * approval in the project's identity policy. This sample compares what the caller and the system see.
 */
export default defineSample({
    id: "identity.as-system",
    method: "GET",
    path: "/identity/as-system",
    summary: "data.asSystem(): compare the records visible to the caller with those visible to the system.",
    sdk: ["data.asSystem", "DataApi", "data.object"],
    file: "src/samples/07-identity/as-system.ts",
    curl: `curl -s "$BASE/identity/as-system"`,
    handler: async ({ data, invocation }) => {
        const caller: DataApi = data;
        const system: DataApi = data.asSystem();
        const callerPage = await caller.object("sample_order").records.list({ fields: ["name"], limit: 1 });
        try {
            const systemPage = await system.object("sample_order").records.list({ fields: ["name"], limit: 1 });
            return { identity: invocation.identity, visibleToCaller: callerPage.total, visibleToSystem: systemPage.total };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "System access is not approved for this project version.", visibleToCaller: callerPage.total };
            }
            throw error;
        }
    },
});
