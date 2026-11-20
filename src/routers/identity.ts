import { createRouter } from "@cogover/sdk";
import { identityAsSystem } from "../samples/07-identity/as-system.js";
import { identityAsUser } from "../samples/07-identity/as-user.js";
import { identityAsUserAggregate } from "../samples/07-identity/as-user-aggregate.js";

/** Samples of `src/samples/07-identity/`, mounted by `src/main.ts` under `/identity`. */
export const identityRoutes = createRouter();
identityRoutes.get("/as-user/:personnelId", identityAsUser);
identityRoutes.get("/as-user/:personnelId/aggregate", identityAsUserAggregate);
identityRoutes.get("/as-system", identityAsSystem);
