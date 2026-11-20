import { createRouter } from "@cogover/sdk";
import { processesGet } from "../samples/25-processes/get.js";
import { processesStart } from "../samples/25-processes/start.js";

/** Samples of `src/samples/25-processes/`, mounted by `src/main.ts` under `/processes`. */
export const processesRoutes = createRouter();
processesRoutes.post("/start", processesStart);
processesRoutes.get("/get/:instanceId", processesGet);
