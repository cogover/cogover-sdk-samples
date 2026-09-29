import type { JobDefinition, JobManifest, JobSchedule } from "@cogover/sdk";
import { agentResult } from "./agent-result.js";
import { cancelStaleOrders } from "./cancel-stale-orders.js";
import { processCompleted } from "./process-completed.js";
import { recountOrders } from "./recount-orders.js";

/**
 * Background jobs are not HTTP routes. Cogover reads them from the named `jobs` export of
 * `src/main.ts` when a version is published: `jobs.enqueue` accepts only keys declared by the active
 * version, and schedules run only while that version is active. The local server does not run jobs;
 * enqueue from a route (`POST /jobs/enqueue`) or with `cogover-dev jobs enqueue <key>`, and follow
 * runs with `cogover-dev jobs runs`.
 *
 * `sample_process_completed` and `sample_agent_result` are the jobs named by `onComplete` of `processes.start`
 * and `onResult` of `agents.start`: Cogover enqueues them when the Process instance or the agent run ends.
 *
 * Each `JobDefinition` carries `key`, the normalized `config` (`JobManifest`, every default applied:
 * `timeoutMs: 30000`, `maxAttempts: 5`, `schedule.timezone: "UTC"`) and a handler reserved for Cogover.
 */
export const jobs: readonly JobDefinition[] = [recountOrders, cancelStaleOrders, processCompleted, agentResult];

export const jobManifests: readonly JobManifest[] = jobs.map(job => job.config);

/** The part of a manifest shown by the catalog route (`GET /`). */
export interface JobSummary {
    readonly key: string;
    readonly name: string | null;
    readonly timeoutMs: number;
    readonly maxAttempts: number;
    readonly schedule: Required<JobSchedule> | null;
}

export const jobSummaries: readonly JobSummary[] = jobManifests.map(manifest => ({
    key: manifest.key,
    name: manifest.name ?? null,
    timeoutMs: manifest.timeoutMs,
    maxAttempts: manifest.maxAttempts,
    schedule: manifest.schedule ?? null,
}));
