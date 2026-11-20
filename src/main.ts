import { createRouter } from "@cogover/sdk";
import type { ScriptRouter } from "@cogover/sdk";
import { actions } from "./actions/index.js";
import { jobs } from "./jobs/index.js";
import { catalogRoutes } from "./routers/catalog.js";
import { actionsRoutes } from "./routers/actions.js";
import { agentsRoutes } from "./routers/agents.js";
import { cryptoRoutes } from "./routers/crypto.js";
import { emailRoutes } from "./routers/email.js";
import { errorsRoutes } from "./routers/errors.js";
import { fetchRoutes } from "./routers/fetch.js";
import { filtersRoutes } from "./routers/filters.js";
import { identityRoutes } from "./routers/identity.js";
import { inboundRoutes } from "./routers/inbound.js";
import { invocationRoutes } from "./routers/invocation.js";
import { jobsRoutes } from "./routers/jobs.js";
import { legacyRoutes } from "./routers/legacy.js";
import { limitsRoutes } from "./routers/limits.js";
import { locksRoutes } from "./routers/locks.js";
import { loggingRoutes } from "./routers/logging.js";
import { notificationsRoutes } from "./routers/notifications.js";
import { orgRoutes } from "./routers/org.js";
import { processesRoutes } from "./routers/processes.js";
import { pushRoutes } from "./routers/push.js";
import { recordsReadRoutes } from "./routers/records-read.js";
import { recordsWriteRoutes } from "./routers/records-write.js";
import { responseRoutes } from "./routers/response.js";
import { routeGroupsRoutes } from "./routers/route-groups.js";
import { routerRoutes } from "./routers/router.js";
import { schemaRoutes } from "./routers/schema.js";
import { secretsRoutes } from "./routers/secrets.js";
import { stateRoutes } from "./routers/state.js";
import { triggers } from "./triggers/index.js";

/**
 * Project entry point. It only imports, collects the triggers, jobs and actions, and mounts one router per group of
 * samples (`src/routers/<area>.ts`, a file with `createRouter()` and its route registrations only). Nothing here runs
 * code that reaches outside this file while the module loads, so Cogover can build a part for every entry point
 * (see "Keep the module fast to load" in the @cogover/sdk usage guide):
 *
 *   GET /            -> the catalog (every sample, its route, SDK APIs, source file and a curl)
 *   GET /router/hello, POST /records/create, ... -> one sample each
 *
 * Record triggers, background jobs and Custom Module Actions are not routes; they are listed in the named
 * `triggers`, `jobs` and `actions` exports below. On the local server a trigger can be run through
 * `POST /__cogover/triggers/<key>`; jobs run only on Cogover after the project is published, and actions are called
 * by Processes and AI Agents of the Workspace once the version is active.
 *
 * router.route() needs @cogover/sdk 0.18.0 or later and a Workspace whose Runtime supports it; publishing to a
 * Workspace that does not support it yet fails.
 */
const router: ScriptRouter = createRouter();
router.route("/router", routerRoutes);
router.route("/response", responseRoutes);
router.route("/invocation", invocationRoutes);
router.route("/records", recordsReadRoutes);
router.route("/records", recordsWriteRoutes);
router.route("/filters", filtersRoutes);
router.route("/identity", identityRoutes);
router.route("/state", stateRoutes);
router.route("/locks", locksRoutes);
router.route("/fetch", fetchRoutes);
router.route("/schema", schemaRoutes);
router.route("/log", loggingRoutes);
router.route("/errors", errorsRoutes);
router.route("/push", pushRoutes);
router.route("/legacy", legacyRoutes);
router.route("/jobs", jobsRoutes);
router.route("/secrets", secretsRoutes);
router.route("/crypto", cryptoRoutes);
router.route("/hooks", inboundRoutes);
router.route("/org", orgRoutes);
router.route("/notifications", notificationsRoutes);
router.route("/email", emailRoutes);
router.route("/limits", limitsRoutes);
router.route("/actions", actionsRoutes);
router.route("/processes", processesRoutes);
router.route("/agents", agentsRoutes);
router.route("/route-groups/customers/:customerId", routeGroupsRoutes);
router.route("/", catalogRoutes);

export default router.toHandler();
export { actions, jobs, triggers };
