import { createRouter } from "@cogover/sdk";
import { actionsManifests } from "../samples/24-actions/manifests.js";
import { actionsSchemaBuilder } from "../samples/24-actions/schema-builder.js";
import { actionsScoreCustomer } from "../samples/24-actions/score-customer.js";

/** Samples of `src/samples/24-actions/`, mounted by `src/main.ts` under `/actions`. */
export const actionsRoutes = createRouter();
actionsRoutes.get("/manifests", actionsManifests);
actionsRoutes.get("/schema-builder", actionsSchemaBuilder);
actionsRoutes.get("/score-customer/:customerId", actionsScoreCustomer);
