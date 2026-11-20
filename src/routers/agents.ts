import { createRouter } from "@cogover/sdk";
import { agentsDeliver } from "../samples/26-agents/deliver.js";
import { agentsDelivery } from "../samples/26-agents/delivery.js";
import { agentsGet } from "../samples/26-agents/get.js";
import { agentsStart } from "../samples/26-agents/start.js";

/** Samples of `src/samples/26-agents/`, mounted by `src/main.ts` under `/agents`. */
export const agentsRoutes = createRouter();
agentsRoutes.post("/start", agentsStart);
agentsRoutes.get("/get/:runId", agentsGet);
agentsRoutes.post("/deliver", agentsDeliver);
agentsRoutes.get("/delivery/:runId", agentsDelivery);
