import { StateConflictError } from "@cogover/sdk";
import type { StateEntry } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Compare-and-set. `expectedVersion: 0` creates only when the key is absent; a positive value must
 * match the current version. Concurrent writers get `StateConflictError`, so the increment reads
 * again and retries a few times.
 */
export default defineSample({
    id: "state.counter",
    method: "POST",
    path: "/state/counter/:key",
    summary: "Increment a counter safely with expectedVersion (compare-and-set) and retry on StateConflictError.",
    sdk: ["namespace.get", "namespace.set", "StateWriteOptions.expectedVersion", "StateConflictError"],
    file: "src/samples/08-state/counter.ts",
    curl: `curl -s -X POST "$BASE/state/counter/visits"`,
    handler: async ({ request, state, log }) => {
        const key = request.params.key ?? "";
        const counters = state.namespace("samples-counters");
        for (let attempt = 1; attempt <= 3; attempt++) {
            const current: StateEntry<number> | null = await counters.get<number>(key);
            const next = (current?.value ?? 0) + 1;
            try {
                const saved = await counters.set(key, next, { expectedVersion: current?.version ?? 0 });
                return { key, value: saved.value, version: saved.version, attempts: attempt };
            } catch (error) {
                if (!(error instanceof StateConflictError) || attempt === 3) throw error;
                log.warn("Counter changed concurrently; retrying", { key, attempt });
            }
        }
        throw new StateConflictError("Unreachable: the loop returns or throws");
    },
});
