import { PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AsUserDataApi, ObjectClient, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

/**
 * Reads as another person. `data.asUser(personnelId)` (a personnel ID, not an account ID) returns a
 * client that applies that person's record permissions. The project's identity policy must approve
 * the caller, the target personnel, the Object and the operation; otherwise the call throws
 * `PermissionDeniedError` with `details.reason === "IDENTITY_NOT_GRANTED"`.
 */
export default defineSample({
    id: "identity.as-user",
    method: "GET",
    path: "/identity/as-user/:personnelId",
    summary: "data.asUser(personnelId): read records with another person's permissions (needs identity approval).",
    sdk: ["data.asUser", "AsUserDataApi", "PermissionDeniedError"],
    file: "src/samples/07-identity/as-user.ts",
    curl: `curl -s "$BASE/identity/as-user/<personnelId>"`,
    handler: async ({ request, data }) => {
        const personnelId = request.params.personnelId ?? "";
        if (personnelId.trim().length === 0) throw new ValidationError("personnelId is required");

        const delegated: AsUserDataApi = data.asUser(personnelId);
        const orders: ObjectClient<WorkspaceObjects["sample_order"]> = delegated.object("sample_order");
        try {
            const page = await orders.records.list({ fields: ["name", "status"], limit: 5 });
            return { personnelId, visibleTotal: page.total, sample: page.items.map(item => ({ id: item.id, ...item.fields })) };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                const reason = isRecord(error.details) ? error.details.reason ?? null : null;
                return { r: 1003, msg: "This project may not act as the requested person.", reason };
            }
            throw error;
        }
    },
});
