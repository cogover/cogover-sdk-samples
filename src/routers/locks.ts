import { createRouter } from "@cogover/sdk";
import { locksAcquireRelease } from "../samples/09-locks/acquire-release.js";
import { locksWithLock } from "../samples/09-locks/with-lock.js";

/** Samples of `src/samples/09-locks/`, mounted by `src/main.ts` under `/locks`. */
export const locksRoutes = createRouter();
locksRoutes.post("/with-lock/:key", locksWithLock);
locksRoutes.post("/acquire/:key", locksAcquireRelease);
