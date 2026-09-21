import { CogoverApiError, fetch, RateLimitError, ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * Failures are `CogoverApiError`s with `code` FETCH_DISABLED, FETCH_BLOCKED, FETCH_REQUEST_TOO_LARGE,
 * FETCH_RESPONSE_TOO_LARGE, FETCH_TIMEOUT or FETCH_FAILED; quota failures are `RateLimitError`.
 * Invalid arguments (an `http://` URL, an unknown option) throw `ValidationError` before any request.
 */
const CASES: Readonly<Record<string, () => Promise<unknown>>> = {
    ok: () => fetch("https://httpbin.org/status/204"),
    "http-status": () => fetch("https://httpbin.org/status/503"),
    timeout: () => fetch("https://httpbin.org/delay/5", { timeoutMs: 1_000 }),
    blocked: () => fetch("https://10.0.0.1/internal"),
    "bad-option": () => fetch("https://httpbin.org/get", { credentials: "include" } as never),
};

export default defineSample({
    id: "fetch.error-handling",
    method: "GET",
    path: "/fetch/errors",
    summary: "Catch fetch failures: CogoverApiError codes (FETCH_TIMEOUT, FETCH_BLOCKED, ...), RateLimitError, ValidationError.",
    sdk: ["fetch", "CogoverApiError", "RateLimitError", "ValidationError"],
    file: "src/samples/10-fetch/error-handling.ts",
    curl: `curl -s "$BASE/fetch/errors?case=timeout"`,
    handler: async ({ request }) => {
        const name = typeof request.query.case === "string" ? request.query.case : "ok";
        const run = CASES[name];
        if (run === undefined) throw new ValidationError(`case must be one of ${Object.keys(CASES).join(", ")}`);
        try {
            const response = await run();
            const status = typeof response === "object" && response !== null && "status" in response ? response.status : null;
            return { case: name, outcome: "response", status };
        } catch (error) {
            if (error instanceof RateLimitError) return { case: name, outcome: "rate-limited", code: error.code, r: error.r ?? null };
            if (error instanceof ValidationError) return { case: name, outcome: "invalid-arguments", message: error.message };
            if (error instanceof CogoverApiError) return { case: name, outcome: "fetch-failed", code: error.code, r: error.r ?? null };
            throw error;
        }
    },
});
