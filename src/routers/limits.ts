import { createRouter } from "@cogover/sdk";
import { limitsHandOff } from "../samples/23-limits/hand-off.js";
import { limitsUsage } from "../samples/23-limits/usage.js";

/** Samples of `src/samples/23-limits/`, mounted by `src/main.ts` under `/limits`. */
export const limitsRoutes = createRouter();
limitsRoutes.get("/usage", limitsUsage);
limitsRoutes.post("/hand-off", limitsHandOff);
