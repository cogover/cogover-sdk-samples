import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly data?: unknown;
    readonly key?: unknown;
    readonly secret?: unknown;
}

/**
 * HMAC-SHA256. The key is a string (UTF-8), bytes, or `{ secret: name }` to sign with a project
 * secret without ever reading its value; the secret form follows the rules of `secrets.get`
 * (not in before-change triggers, only with secret access in a Development Session).
 */
export default defineSample<Input>({
    id: "crypto.hmac",
    method: "POST",
    path: "/crypto/hmac",
    summary: "crypto.hmacSha256(key | { secret }, data): sign data with a key or with a project secret you never read.",
    sdk: ["crypto.hmacSha256"],
    file: "src/samples/18-crypto/hmac.ts",
    curl: `curl -s -X POST "$BASE/crypto/hmac" -H "Content-Type: application/json" --data '{"data":"order:ORD-1","key":"shared-key"}'   # or "secret":"sample_webhook_secret"`,
    handler: async ({ request }) => {
        const { data, key, secret } = request.body;
        if (typeof data !== "string") throw new ValidationError("data must be a string");
        if (typeof key === "string" && key.length > 0) {
            return { keyKind: "string", hex: await crypto.hmacSha256(key, data), base64: await crypto.hmacSha256(key, data, "base64") };
        }
        if (typeof secret === "string" && secret.length > 0) {
            try {
                return { keyKind: "secret", secret, hex: await crypto.hmacSha256({ secret }, data) };
            } catch (error) {
                if (error instanceof ValidationError) return { r: 1006, msg: "This secret cannot be used as a key.", detail: error.message };
                if (error instanceof PermissionDeniedError) {
                    return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
                }
                throw error;
            }
        }
        throw new ValidationError("Provide a non-empty key or a secret name");
    },
});
