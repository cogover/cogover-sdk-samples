import { ValidationError } from "@cogover/sdk";
import type { StateWriteOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly value?: unknown;
    readonly ttlSeconds?: unknown;
}

/**
 * Stores a JSON value of at most 32 KiB. Without `expectedVersion` the write is an unconditional
 * upsert; `ttlSeconds` (1 second to 365 days) expires the entry automatically.
 */
export default defineSample<Input>({
    id: "state.set",
    method: "PUT",
    path: "/state/set/:key",
    summary: "namespace.set(key, value, { ttlSeconds }): upsert a JSON value with an optional expiry.",
    sdk: ["namespace.set", "StateWriteOptions"],
    file: "src/samples/08-state/set.ts",
    curl: `curl -s -X PUT "$BASE/state/set/greeting" -H "Content-Type: application/json" --data '{"value":{"text":"hello"},"ttlSeconds":3600}'`,
    handler: async ({ request, state }) => {
        const key = request.params.key ?? "";
        const { value, ttlSeconds } = request.body;
        if (value === undefined) throw new ValidationError("value is required");
        if (ttlSeconds !== undefined && (!Number.isInteger(ttlSeconds) || Number(ttlSeconds) < 1)) {
            throw new ValidationError("ttlSeconds must be a positive integer");
        }
        const options: StateWriteOptions = ttlSeconds === undefined ? {} : { ttlSeconds: Number(ttlSeconds) };
        const entry = await state.namespace("samples").set(key, value, options);
        return { key, version: entry.version, expiresAt: entry.expiresAt ?? null, value: entry.value };
    },
});
