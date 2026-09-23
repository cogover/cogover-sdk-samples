import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AsymmetricKey, BinaryEncoding, SignatureAlgorithm, SignatureOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly data?: unknown;
    readonly signature?: unknown;
    readonly algorithm?: unknown;
    readonly publicKey?: unknown;
    readonly secret?: unknown;
    readonly encoding?: unknown;
    readonly signatureFormat?: unknown;
}

/**
 * Verifies an RSA or ECDSA signature with a public key: PEM text or a certificate in the request, or
 * the PEM stored in `sample_signing_public_key` by default. A signature that cannot be decoded or has
 * the wrong length is simply `valid: false`, because it comes from the party being verified.
 */
export default defineSample<Input>({
    id: "crypto.verify-public-key",
    method: "POST",
    path: "/crypto/verify-public-key",
    summary: "crypto.verify(algorithm, publicKey, data, signature, options): check an RSA or ECDSA signature.",
    sdk: ["crypto.verify", "AsymmetricKey", "SignatureAlgorithm", "SignatureOptions"],
    file: "src/samples/18-crypto/verify-public-key.ts",
    curl: `curl -s -X POST "$BASE/crypto/verify-public-key" -H "Content-Type: application/json" --data '{"data":"order:ORD-1","algorithm":"ECDSA-SHA256","signature":"<from /crypto/sign>"}'`,
    handler: async ({ request }) => {
        const { data, signature, algorithm, publicKey, secret, encoding, signatureFormat } = request.body;
        if (typeof data !== "string" || typeof signature !== "string") {
            throw new ValidationError("data and signature must be strings");
        }
        const key: AsymmetricKey = typeof publicKey === "string" && publicKey.length > 0
            ? publicKey
            : { secret: typeof secret === "string" && secret.length > 0 ? secret : "sample_signing_public_key" };
        const signatureAlgorithm = (algorithm ?? "ECDSA-SHA256") as SignatureAlgorithm;
        const options: SignatureOptions = {
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
            ...(signatureFormat !== undefined ? { signatureFormat: signatureFormat as "der" | "ieee-p1363" } : {}),
        };
        try {
            const valid = await crypto.verify(signatureAlgorithm, key, data, signature, options);
            return { algorithm: signatureAlgorithm, valid };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { r: 1006, msg: "This key cannot verify with this algorithm.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
