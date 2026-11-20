import { createRouter } from "@cogover/sdk";
import { stateCounter } from "../samples/08-state/counter.js";
import { stateDelete } from "../samples/08-state/delete.js";
import { stateGet } from "../samples/08-state/get.js";
import { stateSet } from "../samples/08-state/set.js";

/** Samples of `src/samples/08-state/`, mounted by `src/main.ts` under `/state`. */
export const stateRoutes = createRouter();
stateRoutes.get("/get/:key", stateGet);
stateRoutes.put("/set/:key", stateSet);
stateRoutes.delete("/delete/:key", stateDelete);
stateRoutes.post("/counter/:key", stateCounter);
