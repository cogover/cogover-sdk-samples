import type { OrgApi, OrgMembership, OrgPersonnel, OrgPersonnelDisplay, OrgReadOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * The caller's own place in the organization. Without `withDisplay` the answer is structure only (IDs,
 * levels) and costs no record read; `withDisplay: true` adds names in the caller's language, and the
 * TypeScript type then guarantees `display` and `departmentName`.
 */
export default defineSample({
    id: "org.me",
    method: "GET",
    path: "/org/me",
    summary: "org.me: the caller's departments, positions and manager level, with names when ?display=true.",
    sdk: ["org.me", "OrgApi", "OrgPersonnel", "OrgMembership", "OrgPersonnelDisplay", "OrgReadOptions"],
    file: "src/samples/20-org/me.ts",
    curl: `curl -s "$BASE/org/me?display=true&language=en-US"`,
    handler: async ({ org, request }) => {
        if (request.query.display !== "true") {
            const me: OrgPersonnel | null = await org.me();
            if (me === null) return { user: null, reason: "A system or inbound invocation has no personnel" };
            return { id: me.id, hasAccount: me.accountId !== null, memberships: me.memberships.map(describe) };
        }
        return withNames(org, typeof request.query.language === "string" ? { language: request.query.language } : {});
    },
});

async function withNames(org: OrgApi, options: OrgReadOptions) {
    const me = await org.me({ ...options, withDisplay: true });
    if (me === null) return { user: null };
    const display: OrgPersonnelDisplay | null = me.display;
    return {
        id: me.id,
        name: display?.name ?? me.id,
        email: display?.email ?? null,
        avatar: display?.avatar ?? null,
        memberships: me.memberships.map(membership => ({
            ...describe(membership),
            department: membership.departmentName,
            position: membership.positionName,
        })),
    };
}

function describe(membership: OrgMembership) {
    return {
        departmentId: membership.departmentId,
        positionId: membership.positionId,
        primary: membership.primary,
        // 0 is staff; 1 is the highest manager level of the department, 2 the next one, ...
        role: membership.level === 0 ? "staff" : `manager level ${membership.level}`,
    };
}
