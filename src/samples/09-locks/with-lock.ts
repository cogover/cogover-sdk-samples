import { LockUnavailableError } from "@cogover/sdk";
import type { DistributedLocks, LockOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * `locks.withLock` acquires a distributed lease, runs the callback and releases in `finally`.
 * `waitMs` (0 to 10,000) bounds the wait; failure to acquire throws `LockUnavailableError`.
 * Store `lease.fencingToken` downstream when the protected system can reject stale writers.
 */
export default defineSample({
    id: "locks.with-lock",
    method: "POST",
    path: "/locks/with-lock/:key",
    summary: "locks.withLock(key, options, callback): run a protected section and release automatically.",
    sdk: ["context.locks", "DistributedLocks", "locks.withLock", "LockOptions", "LockUnavailableError"],
    file: "src/samples/09-locks/with-lock.ts",
    curl: `curl -s -X POST "$BASE/locks/with-lock/order-ORD-1"`,
    handler: async ({ request, data, locks }) => {
        const key = request.params.key ?? "";
        const api: DistributedLocks = locks;
        const options: LockOptions = { namespace: "samples", waitMs: 500, leaseMs: 10_000 };
        try {
            return await api.withLock(key, options, async lease => {
                // Protected work: read something while holding the lease.
                const page = await data.object("sample_order").records.list({ fields: ["name"], limit: 1 });
                return {
                    key: lease.key,
                    namespace: lease.namespace,
                    fencingToken: lease.fencingToken,
                    expiresAt: lease.expiresAt,
                    ordersVisible: page.total,
                };
            });
        } catch (error) {
            if (error instanceof LockUnavailableError) {
                return { r: 1010, msg: "Another execution holds this lock; try again shortly.", code: error.code };
            }
            throw error;
        }
    },
});
