import type { OrgManagerChain, OrgManagerOptions, OrgManagerTier, OrgPersonnelChainOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * The approvers of a personnel, nearest first, up to the root department: managers of the personnel's
 * own department above their level, then every manager of each parent department. `accountOnly` skips
 * people without an account, who cannot approve. `vacantDepartmentIds` shows departments with no
 * manager, and `truncated` a chain that stopped at an inactive parent department.
 */
export default defineSample({
    id: "org.managerChain",
    method: "GET",
    path: "/org/personnel/:personnelId/managers",
    summary: "org.personnel.managerChain and departments.managers: approvers nearest first, plus the heads of the start department.",
    sdk: ["org.personnel.managerChain", "org.departments.managers", "OrgPersonnelChainOptions", "OrgManagerOptions",
        "OrgManagerChain", "OrgManagerTier"],
    file: "src/samples/20-org/manager-chain.ts",
    curl: `curl -s "$BASE/org/personnel/PER1/managers?departmentId=DEP1"`,
    handler: async ({ org, request }) => {
        const personnelId = request.params.personnelId ?? "";
        const options: OrgPersonnelChainOptions = {
            accountOnly: true,
            ...(typeof request.query.departmentId === "string" ? { departmentId: request.query.departmentId } : {}),
        };
        // One chain per department of the personnel, primary department first.
        const chains: readonly OrgManagerChain<true>[] = await org.personnel.managerChain(personnelId, {
            ...options, withDisplay: true,
        });
        const first = chains[0];
        if (first === undefined) return { personnelId, chains: [] };

        const headsOptions: OrgManagerOptions = { accountOnly: true };
        const heads: readonly OrgManagerTier[] = await org.departments.managers(first.fromDepartmentId, headsOptions);
        return {
            personnelId,
            departmentHeads: heads.filter(tier => tier.level === 1).flatMap(tier => tier.personnelIds),
            chains: chains.map(chain => ({
                fromDepartmentId: chain.fromDepartmentId,
                personnelLevel: chain.personnelLevel,
                directApprovers: chain.tiers[0]?.personnelIds ?? [],
                approvers: chain.tiers.map(tier => ({
                    department: tier.departmentName ?? tier.departmentId,
                    level: tier.level,
                    names: tier.personnel.map(person => person.display?.name ?? person.id),
                })),
                vacantDepartmentIds: chain.vacantDepartmentIds,
                truncated: chain.truncated,
            })),
        };
    },
});
