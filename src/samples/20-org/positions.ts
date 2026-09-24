import type { OrgPosition, OrgPositionMembersOptions, OrgPositionsApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * The position catalog, for example for a dropdown, and the holders of one position. A department-only
 * position applies to `departmentIds`; any other position applies everywhere except
 * `excludedDepartmentIds`.
 */
export default defineSample({
    id: "org.positions",
    method: "GET",
    path: "/org/positions",
    summary: "org.positions.list, get and members: the position catalog, where a position applies, and who holds it.",
    sdk: ["org.positions.list", "org.positions.get", "org.positions.members", "OrgPositionsApi", "OrgPosition",
        "OrgPositionMembersOptions"],
    file: "src/samples/20-org/positions.ts",
    curl: `curl -s "$BASE/org/positions?positionId=POS1&departmentId=DEP1"`,
    handler: async ({ org, request, response }) => {
        const positions: OrgPositionsApi = org.positions;
        const positionId = typeof request.query.positionId === "string" ? request.query.positionId : "";
        if (positionId === "") {
            const catalog = await positions.list({ withDisplay: true });
            return catalog.map(position => ({ id: position.id, name: position.display?.name ?? position.id }));
        }
        const position: OrgPosition | null = await positions.get(positionId);
        if (position === null) {
            return response.json({ code: "POSITION_NOT_FOUND", message: `Position ${positionId} does not exist` }, { status: 404 });
        }
        const options: OrgPositionMembersOptions = {
            accountOnly: true,
            ...(typeof request.query.departmentId === "string"
                ? { departmentId: request.query.departmentId, includeSubDepartments: true } : {}),
        };
        const holders = await positions.members(position.id, options);
        return {
            appliesTo: position.departmentOnly
                ? { only: position.departmentIds }
                : { everywhereExcept: position.excludedDepartmentIds },
            holders: holders.items.map(holder => ({ personnelId: holder.personnelId, departmentId: holder.departmentId })),
            total: holders.total,
        };
    },
});
