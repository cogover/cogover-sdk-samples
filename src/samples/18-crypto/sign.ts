import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { BinaryEncoding, SignatureAlgorithm, SignatureOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly data?: unknown;
    readonly algorithm?: unknown;
    readonly secret?: unknown;
    readonly encoding?: unknown;
    readonly signatureFormat?: unknown;
}

/**
 * Signs data with a private key kept in a project secret (`sample_signing_key` by default, an EC
 * P-256 key for the default `ECDSA-SHA256`; store an RSA key to use `RSA-SHA256` or `RSA-PSS-SHA256`).
 * `{ "encoding": "base64url", "signatureFormat": "ieee-p1363" }` produces a JWT ES256 signature.
 * Check the result with `POST /crypto/verify-public-key`.
 */
export default defineSample<Input>({
    id: "crypto.sign",
    method: "POST",
    path: "/crypto/sign",
    summary: "crypto.sign(algorithm, { secret }, data, options): RSA, RSA-PSS or ECDSA signature with a private key kept in a secret.",
    sdk: ["crypto.sign", "SignatureAlgorithm", "SignatureOptions"],
    file: "src/samples/18-crypto/sign.ts",
    curl: `curl -s -X POST "$BASE/crypto/sign" -H "Content-Type: application/json" --data '{"data":"order:ORD-1","algorithm":"ECDSA-SHA256"}'`,
    handler: async ({ request }) => {
        const { data, algorithm, secret, encoding, signatureFormat } = request.body;
        if (typeof data !== "string") throw new ValidationError("data must be a string");
        const signatureAlgorithm = (algorithm ?? "ECDSA-SHA256") as SignatureAlgorithm;
        const options: SignatureOptions = {
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
            ...(signatureFormat !== undefined ? { signatureFormat: signatureFormat as "der" | "ieee-p1363" } : {}),
        };
        const keySecret = typeof secret === "string" && secret.length > 0 ? secret : "sample_signing_key";
        try {
            const signature = await crypto.sign(signatureAlgorithm, { secret: keySecret }, data, options);
            return { algorithm: signatureAlgorithm, encoding: options.encoding ?? "base64", signature };
        } catch (error) {
            if (error instanceof ValidationError) {
                // For example an EC key with an RSA algorithm, or signatureFormat with RSA.
                return { r: 1006, msg: "This key cannot sign with this algorithm.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
