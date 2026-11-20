import type { ScriptHandler } from "@cogover/sdk";
import { actionSummaries } from "./actions/index.js";
import { jobSummaries } from "./jobs/index.js";
import { samples } from "./samples/index.js";
import { triggerSummaries } from "./triggers/index.js";

/**
 * `GET /`: every sample with its route, the SDK APIs it shows, its source file and a curl, followed by the record
 * triggers, background jobs and Custom Module Actions. Only this route imports the list of every sample, so the
 * other routes, triggers, jobs and actions do not load the whole catalog.
 */
export const catalog: ScriptHandler<unknown, object> = () => ({
    name: "cogover-sdk-samples",
    sampleCount: samples.length,
    samples: samples.map(({ id, method, path, summary, sdk, file, curl }) => ({
        id, method, path, summary, sdk, file, curl,
    })),
    triggers: triggerSummaries(),
    jobs: jobSummaries(),
    actions: actionSummaries(),
});
