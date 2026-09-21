import {
    CogoverApiError,
    LockLostError,
    LockUnavailableError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
    RetryableError,
    StateConflictError,
    ValidationError,
} from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Every public error class and the HTTP status Cogover answers with when it escapes a handler.
 * `RetryableError` and a plain `CogoverApiError` fall into the generic 422; on Cogover their message
 * stays internal, while the local server echoes it to help debugging.
 */
const ERRORS: Readonly<Record<string, { readonly status: number; readonly raise: () => never }>> = {
    "validation": { status: 400, raise: () => { throw new ValidationError("Sample validation failure"); } },
    "permission-denied": { status: 403, raise: () => { throw new PermissionDeniedError("Sample permission failure"); } },
    "not-found": { status: 404, raise: () => { throw new NotFoundError("sample_order", "ORD-404"); } },
    "state-conflict": { status: 409, raise: () => { throw new StateConflictError("Sample state conflict"); } },
    "lock-unavailable": { status: 409, raise: () => { throw new LockUnavailableError("sample-key"); } },
    "lock-lost": { status: 409, raise: () => { throw new LockLostError("Sample lease was lost"); } },
    "rate-limit": { status: 429, raise: () => { throw new RateLimitError("Sample rate limit"); } },
    "retryable": { status: 422, raise: () => { throw new RetryableError("Only meaningful in an after-change trigger"); } },
    "api-error": { status: 422, raise: () => { throw new CogoverApiError("SAMPLE_FAILURE", "Sample generic failure", { r: 9999 }); } },
};

export default defineSample({
    id: "errors.mapping",
    method: "GET",
    path: "/errors/mapping/:name",
    summary: "Throw each public error class to see its HTTP status; /errors/mapping/list shows the table.",
    sdk: [
        "CogoverApiError", "NotFoundError", "ValidationError", "PermissionDeniedError", "RateLimitError",
        "RetryableError", "StateConflictError", "LockUnavailableError", "LockLostError",
    ],
    file: "src/samples/13-errors/error-mapping.ts",
    curl: `curl -s -i "$BASE/errors/mapping/rate-limit"   # or /errors/mapping/list`,
    handler: ({ request }) => {
        const name = request.params.name ?? "list";
        if (name === "list") {
            return Object.entries(ERRORS).map(([key, entry]) => ({ name: key, httpStatus: entry.status }));
        }
        const entry = ERRORS[name];
        if (entry === undefined) throw new ValidationError(`name must be list or one of ${Object.keys(ERRORS).join(", ")}`);
        return entry.raise();
    },
});
