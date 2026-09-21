import type {
    CurrentUser,
    CurrentWorkspace,
    CurrentWorkspaceMembership,
    InvocationContext,
    SystemInvocationContext,
    UserInvocationContext,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * `invocation` is an immutable snapshot of the authenticated identity and workspace of this
 * execution. Reading it makes no data API request. Optional profile fields may be absent.
 */
export default defineSample({
    id: "invocation.snapshot",
    method: "GET",
    path: "/invocation",
    summary: "context.invocation: who is calling (user or system) and which workspace, without a data request.",
    sdk: [
        "context.invocation", "InvocationContext", "UserInvocationContext", "SystemInvocationContext",
        "CurrentWorkspace", "CurrentUser", "CurrentWorkspaceMembership",
    ],
    file: "src/samples/03-invocation/invocation.ts",
    curl: `curl -s "$BASE/invocation"`,
    handler: ({ invocation }) => {
        const snapshot: InvocationContext = invocation;
        const workspace: CurrentWorkspace = snapshot.workspace;
        if (snapshot.identity === "system") {
            const system: SystemInvocationContext = snapshot;
            return { identity: system.identity, workspaceId: workspace.id, user: system.user };
        }
        const user: UserInvocationContext = snapshot;
        const profile: CurrentUser = user.user;
        const membership: CurrentWorkspaceMembership = profile.membership;
        return {
            identity: user.identity,
            workspace: {
                id: workspace.id,
                name: workspace.name ?? null,
                domain: workspace.domain ?? null,
                language: workspace.language ?? null,
                timezone: workspace.timezone ?? null,
            },
            user: {
                accountId: profile.accountId,
                email: profile.email ?? null,
                fullName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || null,
                personnelId: membership.personnelId ?? null,
                language: membership.language ?? profile.language ?? null,
            },
        };
    },
});
