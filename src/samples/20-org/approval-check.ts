import type { OrgIsInDepartmentOptions, OrgIsManagerOfOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface ApprovalRequest {
    /** Personnel who owns the order. */
    readonly ownerId?: string;
    /** Department the order belongs to. */
    readonly departmentId?: string;
    /** Only the owner's nearest manager may approve. */
    readonly directOnly?: boolean;
}

/**
 * A business rule on the organization structure, answered from memory: the caller may approve an order
 * only when they manage its owner in the order's department, or work in a finance department given by
 * `?financeDepartmentId=` (including its sub-departments).
 */
export default defineSample<ApprovalRequest>({
    id: "org.approvalCheck",
    method: "POST",
    path: "/org/approval-check",
    summary: "org.isManagerOf and org.isInDepartment: allow an approval for the owner's managers or a finance department.",
    sdk: ["org.isManagerOf", "org.isInDepartment", "OrgIsManagerOfOptions", "OrgIsInDepartmentOptions"],
    file: "src/samples/20-org/approval-check.ts",
    curl: `curl -s -X POST "$BASE/org/approval-check?financeDepartmentId=DEP9" -H "content-type: application/json" -d '{"ownerId":"PER2","departmentId":"DEP1"}'`,
    handler: async ({ org, invocation, request, response }) => {
        const { ownerId, departmentId, directOnly } = request.body ?? {};
        if (typeof ownerId !== "string" || ownerId === "") {
            return response.json({ code: "OWNER_REQUIRED", message: "Send ownerId in the body" }, { status: 400 });
        }
        const callerId = invocation.user?.membership.personnelId;
        if (callerId === undefined) return { allowed: false, reason: `A ${invocation.identity} invocation has no user` };

        const managerOptions: OrgIsManagerOfOptions = {
            directOnly: directOnly === true,
            ...(typeof departmentId === "string" ? { departmentId } : {}),
        };
        if (await org.isManagerOf(callerId, ownerId, managerOptions)) return { allowed: true, reason: "Manager of the owner" };

        const financeId = request.query.financeDepartmentId;
        const financeOptions: OrgIsInDepartmentOptions = { includeSubDepartments: true };
        if (typeof financeId === "string" && await org.isInDepartment(callerId, financeId, financeOptions)) {
            return { allowed: true, reason: "Member of the finance department" };
        }
        return { allowed: false, reason: "Only a manager of the owner or finance can approve" };
    },
});
