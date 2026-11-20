import { createRouter } from "@cogover/sdk";
import { orgApprovalCheck } from "../samples/20-org/approval-check.js";
import { orgDepartmentMembers } from "../samples/20-org/department-members.js";
import { orgDepartmentTree } from "../samples/20-org/department-tree.js";
import { orgManagerChain } from "../samples/20-org/manager-chain.js";
import { orgMe } from "../samples/20-org/me.js";
import { orgPersonnelMany } from "../samples/20-org/personnel-many.js";
import { orgPositions } from "../samples/20-org/positions.js";

/** Samples of `src/samples/20-org/`, mounted by `src/main.ts` under `/org`. */
export const orgRoutes = createRouter();
orgRoutes.get("/me", orgMe);
orgRoutes.get("/personnel", orgPersonnelMany);
orgRoutes.get("/departments/tree", orgDepartmentTree);
orgRoutes.get("/departments/:departmentId/members", orgDepartmentMembers);
orgRoutes.get("/positions", orgPositions);
orgRoutes.get("/personnel/:personnelId/managers", orgManagerChain);
orgRoutes.post("/approval-check", orgApprovalCheck);
