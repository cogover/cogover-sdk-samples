import { CogoverApiError, crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { BinaryEncoding, DecryptOutput, RsaDecryptOptions, RsaPadding, SecretKeyReference } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly ciphertext?: unknown;
    readonly secret?: unknown;
    readonly padding?: unknown;
    readonly encoding?: unknown;
    readonly output?: unknown;
}

/**
 * RSA decryption with a private key that stays in a project secret (`sample_rsa_private_key` by
 * default): the route never accepts a private key in the request and the key never enters the code.
 * Any failure — wrong key, wrong padding, modified ciphertext — is `DECRYPTION_FAILED`.
 */
export default defineSample<Input>({
    id: "crypto.rsa-decrypt",
    method: "POST",
    path: "/crypto/rsa/decrypt",
    summary: "crypto.rsaDecrypt({ secret }, ciphertext, { padding?, output? }): decrypt with a private key kept in a secret.",
    sdk: ["crypto.rsaDecrypt", "SecretKeyReference", "RsaDecryptOptions", "DecryptOutput"],
    file: "src/samples/18-crypto/rsa-decrypt.ts",
    curl: `curl -s -X POST "$BASE/crypto/rsa/decrypt" -H "Content-Type: application/json" --data '{"ciphertext":"<from /crypto/rsa/encrypt>"}'`,
    handler: async ({ request }) => {
        const { ciphertext, secret, padding, encoding, output } = request.body;
        if (typeof ciphertext !== "string") throw new ValidationError("ciphertext must be a string");
        const privateKey: SecretKeyReference = {
            secret: typeof secret === "string" && secret.length > 0 ? secret : "sample_rsa_private_key",
        };
        const options: RsaDecryptOptions = {
            ...(padding !== undefined ? { padding: padding as RsaPadding } : {}),
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
            output: (output ?? "utf8") as DecryptOutput,
        };
        try {
            const plaintext = await crypto.rsaDecrypt(privateKey, ciphertext, options);
            return plaintext instanceof Uint8Array
                ? { output: options.output, byteLength: plaintext.length }
                : { output: options.output, plaintext };
        } catch (error) {
            if (error instanceof CogoverApiError && error.code === "DECRYPTION_FAILED") {
                return { r: 1011, msg: "The ciphertext could not be decrypted.", code: error.code };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
