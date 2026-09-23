import type {
    CurrentUser,
    CurrentWorkspace,
    CurrentWorkspaceMembership,
    CurrentWorkspaceRole,
    InboundInvocationContext,
    InvocationContext,
    SystemInvocationContext,
    UserInvocationContext,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * `invocation` is an immutable snapshot of the authenticated identity and workspace of this
 * execution. Reading it makes no data API request. Optional profile fields may be absent.
 * `membership.isSuperAdmin` and `membership.roles` describe the caller in this workspace; role
 * permissions are not included (see `role-check.ts` for an authorization rule built on them).
 * `identity` is `"user"` for a signed-in caller, `"system"` for a scheduled job or an
 * administrator's enqueue, and `"inbound"` for a webhook call (see `src/samples/19-inbound/`).
 */
export default defineSample({
    id: "invocation.snapshot",
    method: "GET",
    path: "/invocation",
    summary: "context.invocation: who is calling (user, system or inbound webhook) and which workspace, without a data request.",
    sdk: [
        "context.invocation", "InvocationContext", "UserInvocationContext", "SystemInvocationContext",
        "InboundInvocationContext", "CurrentWorkspace", "CurrentUser", "CurrentWorkspaceMembership",
        "CurrentWorkspaceRole",
    ],
    file: "src/samples/03-invocation/invocation.ts",
    curl: `curl -s "$BASE/invocation"`,
    handler: ({ invocation }) => {
        const snapshot: InvocationContext = invocation;
        const workspace: CurrentWorkspace = snapshot.workspace;
        const workspaceSummary = {
            id: workspace.id,
            name: workspace.name ?? null,
            domain: workspace.domain ?? null,
            language: workspace.language ?? null,
            timezone: workspace.timezone ?? null,
        };
        switch (snapshot.identity) {
            case "system": {
                const system: SystemInvocationContext = snapshot;
                return { identity: system.identity, workspace: workspaceSummary, user: system.user };
            }
            case "inbound": {
                const inbound: InboundInvocationContext = snapshot;
                return { identity: inbound.identity, workspace: workspaceSummary, user: inbound.user, inbound: inbound.inbound };
            }
            case "user": {
                const user: UserInvocationContext = snapshot;
                const profile: CurrentUser = user.user;
                const membership: CurrentWorkspaceMembership = profile.membership;
                const roles: readonly CurrentWorkspaceRole[] = membership.roles;
                return {
                    identity: user.identity,
                    workspace: workspaceSummary,
                    user: {
                        accountId: profile.accountId,
                        email: profile.email ?? null,
                        fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
                        personnelId: membership.personnelId ?? null,
                        language: membership.language ?? profile.language ?? null,
                        isSuperAdmin: membership.isSuperAdmin,
                        roles: roles.map(role => ({ id: role.id, name: role.name })),
                    },
                };
            }
        }
    },
});
