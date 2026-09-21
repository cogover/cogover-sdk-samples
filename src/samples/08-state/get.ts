import type { ProjectState, StateEntry, StateNamespace } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Project state is durable JSON scoped by workspace, project, namespace and key; it survives new
 * project versions. `get` returns `null` for a missing or expired entry.
 */
export default defineSample({
    id: "state.get",
    method: "GET",
    path: "/state/get/:key",
    summary: "state.namespace(name).get(key): read a durable JSON entry (value, version, timestamps) or null.",
    sdk: ["context.state", "ProjectState", "state.namespace", "namespace.get", "StateNamespace", "StateEntry"],
    file: "src/samples/08-state/get.ts",
    curl: `curl -s "$BASE/state/get/greeting"`,
    handler: async ({ request, state }) => {
        const store: ProjectState = state;
        const samples: StateNamespace = store.namespace("samples");
        const key = request.params.key ?? "";
        const entry: StateEntry<unknown> | null = await samples.get(key);
        return { namespace: samples.name, key, entry };
    },
});
