import { crypto, ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly data?: unknown;
    readonly key?: unknown;
    readonly signature?: unknown;
}

/**
 * Verifies a signature the way a webhook receiver should: recompute the HMAC and compare with
 * `timingSafeEqual`, never with `===`. Get a valid signature from `POST /crypto/hmac` first.
 */
export default defineSample<Input>({
    id: "crypto.verify-signature",
    method: "POST",
    path: "/crypto/verify",
    summary: "Recompute an HMAC and compare it with crypto.timingSafeEqual() to verify a signature.",
    sdk: ["crypto.hmacSha256", "crypto.timingSafeEqual"],
    file: "src/samples/18-crypto/verify-signature.ts",
    curl: `curl -s -X POST "$BASE/crypto/verify" -H "Content-Type: application/json" --data '{"data":"order:ORD-1","key":"shared-key","signature":"<hex from /crypto/hmac>"}'`,
    handler: async ({ request }) => {
        const { data, key, signature } = request.body;
        if (typeof data !== "string" || typeof key !== "string" || key.length === 0 || typeof signature !== "string") {
            throw new ValidationError("data, key and signature must be strings");
        }
        const expected = await crypto.hmacSha256(key, data);
        const valid = crypto.timingSafeEqual(expected, signature.trim().toLowerCase());
        return { valid, algorithm: "HMAC-SHA256", encoding: "hex" };
    },
});
