import { createRouter } from "@cogover/sdk";
import { jobsEnqueue } from "../samples/16-jobs/enqueue.js";
import { jobsEnqueueDelayed } from "../samples/16-jobs/enqueue-delayed.js";

/** Samples of `src/samples/16-jobs/`, mounted by `src/main.ts` under `/jobs`. */
export const jobsRoutes = createRouter();
jobsRoutes.post("/enqueue", jobsEnqueue);
jobsRoutes.post("/enqueue-delayed", jobsEnqueueDelayed);
