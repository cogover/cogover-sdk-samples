import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AsymmetricKey, BinaryEncoding, RsaEncryptOptions, RsaPadding } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly data?: unknown;
    readonly publicKey?: unknown;
    readonly secret?: unknown;
    readonly padding?: unknown;
    readonly encoding?: unknown;
}

/**
 * RSA encryption with a public key: PEM text in the request, or the PEM stored in the project secret
 * `sample_rsa_public_key` by default. OAEP with SHA-256 is the default padding; RSA encrypts at most
 * 190 bytes with a 2048-bit key, so encrypt larger data with AES and only the AES key with RSA.
 * Decrypt with `POST /crypto/rsa/decrypt`.
 */
export default defineSample<Input>({
    id: "crypto.rsa-encrypt",
    method: "POST",
    path: "/crypto/rsa/encrypt",
    summary: "crypto.rsaEncrypt(publicKey, data, { padding? }): encrypt a small value with an RSA public key.",
    sdk: ["crypto.rsaEncrypt", "AsymmetricKey", "RsaEncryptOptions", "RsaPadding"],
    file: "src/samples/18-crypto/rsa-encrypt.ts",
    curl: `curl -s -X POST "$BASE/crypto/rsa/encrypt" -H "Content-Type: application/json" --data '{"data":"4111111111111111"}'   # uses the secret sample_rsa_public_key; or pass "publicKey":"-----BEGIN PUBLIC KEY-----\\n..."`,
    handler: async ({ request }) => {
        const { data, publicKey, secret, padding, encoding } = request.body;
        if (typeof data !== "string") throw new ValidationError("data must be a string");
        const key: AsymmetricKey = typeof publicKey === "string" && publicKey.length > 0
            ? publicKey
            : { secret: typeof secret === "string" && secret.length > 0 ? secret : "sample_rsa_public_key" };
        const options: RsaEncryptOptions = {
            padding: (padding ?? "OAEP-SHA256") as RsaPadding,
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
        };
        try {
            const ciphertext = await crypto.rsaEncrypt(key, data, options);
            return { padding: options.padding, encoding: options.encoding ?? "base64", ciphertext };
        } catch (error) {
            if (error instanceof ValidationError) {
                // A key that is not an RSA public key of 2048 to 4096 bits, or data that is too long.
                return { r: 1006, msg: "This key or data cannot be used for RSA encryption.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
