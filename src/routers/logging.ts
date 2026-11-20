import { createRouter } from "@cogover/sdk";
import { loggingLevels } from "../samples/12-logging/levels.js";

/** Samples of `src/samples/12-logging/`, mounted by `src/main.ts` under `/log`. */
export const loggingRoutes = createRouter();
loggingRoutes.post("/levels", loggingLevels);
