import { createRouter } from "@cogover/sdk";
import { invocationSnapshot } from "../samples/03-invocation/invocation.js";
import { invocationRoleCheck } from "../samples/03-invocation/role-check.js";

/** Samples of `src/samples/03-invocation/`, mounted by `src/main.ts` under `/invocation`. */
export const invocationRoutes = createRouter();
invocationRoutes.get("/", invocationSnapshot);
invocationRoutes.get("/role-check", invocationRoleCheck);
