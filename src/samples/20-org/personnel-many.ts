import type { OrgGetManyResult, OrgPersonnel, OrgPersonnelApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Up to 200 personnel in one call. Unknown IDs, and people who left the workspace, are reported in
 * `missingIds` instead of failing the call. Prefer this to `org.personnel.get` in a loop.
 */
export default defineSample({
    id: "org.personnel.getMany",
    method: "GET",
    path: "/org/personnel",
    summary: "org.personnel.getMany: names and departments of up to 200 personnel, with the IDs that are not active personnel.",
    sdk: ["org.personnel.getMany", "OrgPersonnelApi", "OrgGetManyResult"],
    file: "src/samples/20-org/personnel-many.ts",
    curl: `curl -s "$BASE/org/personnel?ids=PER1,PER2,PER-UNKNOWN"`,
    handler: async ({ org, request, response }) => {
        const ids = typeof request.query.ids === "string"
            ? request.query.ids.split(",").map(id => id.trim()).filter(id => id !== "")
            : [];
        if (ids.length === 0) {
            return response.json({ code: "IDS_REQUIRED", message: "Pass personnel IDs as ?ids=PER1,PER2" }, { status: 400 });
        }
        const personnel: OrgPersonnelApi = org.personnel;
        const result: OrgGetManyResult<OrgPersonnel<true>> = await personnel.getMany(ids, { withDisplay: true });
        return {
            items: result.items.map(person => ({
                id: person.id,
                name: person.display?.name ?? person.id,
                departments: person.memberships.map(membership => membership.departmentName ?? membership.departmentId),
            })),
            missingIds: result.missingIds,
        };
    },
});
