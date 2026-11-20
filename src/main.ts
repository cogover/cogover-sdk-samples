import { createRouter } from "@cogover/sdk";
import type { ScriptRouter } from "@cogover/sdk";
import { actions, actionSummaries } from "./actions/index.js";
import { jobs, jobSummaries } from "./jobs/index.js";
import { customerRouter } from "./routers/customer-router.js";
import { samples } from "./samples/index.js";
import { triggers, triggerSummaries } from "./triggers/index.js";

/**
 * Project entry point. Every file under `src/samples/` registers exactly one route here, so the
 * project URL is a browsable catalog of `@cogover/sdk`:
 *
 *   GET /            -> this catalog (every sample, its route, SDK APIs, source file and a curl)
 *   GET /router/hello, POST /records/create, ... -> one sample each
 *   GET /route-groups/customers/:customerId/...    -> samples of a child router mounted with router.route()
 *
 * Record triggers, background jobs and Custom Module Actions are not routes; they are listed in the
 * named `triggers`, `jobs` and `actions` exports below. On the local server a trigger can be run through
 * `POST /__cogover/triggers/<key>`; jobs run only on Cogover after the project is published, and actions
 * are called by Processes and AI Agents of the Workspace once the version is active.
 */
const router: ScriptRouter = createRouter();
for (const sample of samples) {
    sample.register(router);
}

// A group of routes kept in its own router file (`src/routers/`), mounted under a prefix with a parameter.
// router.route() needs @cogover/sdk 0.18.0 or later and a Workspace whose Runtime supports it; publishing to a
// Workspace that does not support it yet fails.
router.route("/route-groups/customers/:customerId", customerRouter);

router.get("/", () => ({
    name: "cogover-sdk-samples",
    sampleCount: samples.length,
    samples: samples.map(({ id, method, path, summary, sdk, file, curl }) => ({
        id, method, path, summary, sdk, file, curl,
    })),
    triggers: triggerSummaries,
    jobs: jobSummaries,
    actions: actionSummaries,
}));

export default router.toHandler();
export { actions, jobs, triggers };
