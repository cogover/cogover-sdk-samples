import type { CurrentWorkspaceMembership, CurrentWorkspaceRole } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Allows an action only for Super Admins of the workspace or for users holding a given role.
 * Compare roles by `id`: a role can be renamed and role IDs differ between workspaces, so keep the
 * ID in configuration (here: the `roleId` query parameter). Cogover still enforces record and field
 * access for the user; use these fields for business rules, not as a replacement for security rules.
 */
export default defineSample({
    id: "invocation.role-check",
    method: "GET",
    path: "/invocation/role-check",
    summary: "membership.isSuperAdmin and membership.roles: allow an action for Super Admins or holders of one role, compared by id.",
    sdk: ["CurrentWorkspaceMembership.isSuperAdmin", "CurrentWorkspaceMembership.roles", "CurrentWorkspaceRole"],
    file: "src/samples/03-invocation/role-check.ts",
    curl: `curl -s "$BASE/invocation/role-check?roleId=RO6P2N1K9X4A"`,
    handler: ({ request, invocation, response }) => {
        const roleId = typeof request.query.roleId === "string" ? request.query.roleId.trim() : "";
        if (roleId === "") {
            return response.json({ code: "ROLE_ID_REQUIRED", message: "Pass the ID of the role to check as ?roleId=" }, { status: 400 });
        }
        // System and inbound invocations have no user, so no workspace role either.
        if (invocation.user === null) {
            return { allowed: false, reason: `A ${invocation.identity} invocation has no user`, roleId };
        }
        const membership: CurrentWorkspaceMembership = invocation.user.membership;
        const matched: CurrentWorkspaceRole | undefined = membership.roles.find(role => role.id === roleId);
        const allowed = membership.isSuperAdmin || matched !== undefined;
        return {
            allowed,
            reason: membership.isSuperAdmin ? "Super Admin" : matched !== undefined ? `Holds role "${matched.name}"` : "Role not held",
            roleId,
            isSuperAdmin: membership.isSuperAdmin,
            roles: membership.roles.map(role => role.id),
        };
    },
});
