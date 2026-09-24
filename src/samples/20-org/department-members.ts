import type {
    OrgDepartment,
    OrgDepartmentMembersOptions,
    OrgMember,
    OrgPage,
    OrgPageOptions,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * One page of a department's members, managers first by level, with the department's path from the root.
 * `?includeSub=true` adds every sub-department; pass the returned `nextCursor` as `?cursor=` for the next
 * page. With `withDisplay` a page holds at most 200 members.
 */
export default defineSample({
    id: "org.departments.members",
    method: "GET",
    path: "/org/departments/:departmentId/members",
    summary: "org.departments.members and ancestors: a page of members with names, the breadcrumb, and cursor paging.",
    sdk: ["org.departments.members", "org.departments.ancestors", "OrgDepartmentMembersOptions", "OrgPageOptions",
        "OrgPage", "OrgMember", "OrgDepartment"],
    file: "src/samples/20-org/department-members.ts",
    curl: `curl -s "$BASE/org/departments/DEP1/members?includeSub=true&limit=20"`,
    handler: async ({ org, request }) => {
        const departmentId = request.params.departmentId ?? "";
        const paging: OrgPageOptions = {
            includeSubDepartments: request.query.includeSub === "true",
            accountOnly: request.query.accountOnly === "true",
            limit: typeof request.query.limit === "string" ? Number(request.query.limit) : 50,
            ...(typeof request.query.cursor === "string" ? { cursor: request.query.cursor } : {}),
        };
        const options: OrgDepartmentMembersOptions = {
            ...paging,
            ...(typeof request.query.positionId === "string" ? { positionId: request.query.positionId } : {}),
        };
        // An unknown department throws NotFoundError, which the route answers with HTTP 404.
        const page: OrgPage<OrgMember<true>> = await org.departments.members(departmentId, {
            ...options, withDisplay: true,
        });
        const path: readonly OrgDepartment<true>[] = await org.departments.ancestors(departmentId, { withDisplay: true });
        return {
            breadcrumb: path.map(department => department.display?.name ?? department.id).reverse(),
            total: page.total,
            nextCursor: page.nextCursor ?? null,
            members: page.items.map(member => ({
                personnelId: member.personnelId,
                name: member.display?.name ?? member.personnelId,
                department: member.departmentName,
                position: member.positionName,
                level: member.level,
            })),
        };
    },
});
