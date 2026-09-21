import { createRouter } from "@cogover/sdk";
import type { ScriptRouter } from "@cogover/sdk";
import { samples } from "./samples/index.js";
import { triggers, triggerSummaries } from "./triggers/index.js";

/**
 * Project entry point. Every file under `src/samples/` registers exactly one route here, so the
 * project URL is a browsable catalog of `@cogover/sdk`:
 *
 *   GET /            -> this catalog (every sample, its route, SDK APIs, source file and a curl)
 *   GET /router/hello, POST /records/create, ... -> one sample each
 *
 * Record triggers are not routes; they are listed in the named `triggers` export below and, on the
 * local server, can be run through `POST /__cogover/triggers/<key>`.
 */
const router: ScriptRouter = createRouter();
for (const sample of samples) {
    sample.register(router);
}

router.get("/", () => ({
    name: "cogover-sdk-samples",
    sampleCount: samples.length,
    samples: samples.map(({ id, method, path, summary, sdk, file, curl }) => ({
        id, method, path, summary, sdk, file, curl,
    })),
    triggers: triggerSummaries,
}));

export default router.toHandler();
export { triggers };
