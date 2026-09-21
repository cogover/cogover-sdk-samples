import { LockLostError } from "@cogover/sdk";
import type { LockLease } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Manual lease handling. `acquire` returns `null` instead of throwing when the lock is busy.
 * `renew` extends the lease before `expiresAt`; a lost or expired lease throws `LockLostError`.
 * Always `release()` in `finally`; releasing twice is a no-op.
 */
export default defineSample({
    id: "locks.acquire-release",
    method: "POST",
    path: "/locks/acquire/:key",
    summary: "locks.acquire() / lease.renew() / lease.release(): manual lease control, null when busy.",
    sdk: ["locks.acquire", "LockLease", "lease.renew", "lease.release", "LockLostError"],
    file: "src/samples/09-locks/acquire-release.ts",
    curl: `curl -s -X POST "$BASE/locks/acquire/report-monthly"`,
    handler: async ({ request, locks, log }) => {
        const key = request.params.key ?? "";
        const lease: LockLease | null = await locks.acquire(key, { namespace: "samples", waitMs: 0, leaseMs: 5_000 });
        if (lease === null) return { acquired: false, key };

        const firstExpiry = lease.expiresAt;
        try {
            await lease.renew(15_000);
            return {
                acquired: true,
                leaseId: lease.id,
                fencingToken: lease.fencingToken,
                expiresAtBeforeRenew: firstExpiry,
                expiresAtAfterRenew: lease.expiresAt,
            };
        } catch (error) {
            if (error instanceof LockLostError) {
                log.warn("The lease expired before renewal", { key });
                return { acquired: true, lost: true, code: error.code };
            }
            throw error;
        } finally {
            await lease.release();
        }
    },
});
