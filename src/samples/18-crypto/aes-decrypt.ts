import { CogoverApiError, crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AesDecryptOptions, AesKey, AesMode, BinaryEncoding, DecryptOutput } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly ciphertext?: unknown;
    readonly iv?: unknown;
    readonly tag?: unknown;
    readonly aad?: unknown;
    readonly key?: unknown;
    readonly secret?: unknown;
    readonly mode?: unknown;
    readonly encoding?: unknown;
    readonly output?: unknown;
}

/**
 * AES decryption of what `POST /crypto/aes/encrypt` returned. A wrong key, IV, tag or `aad`, or a
 * modified ciphertext, throws `CogoverApiError` with code `DECRYPTION_FAILED` — one error for every
 * cause, so the answer reveals nothing about the key or the plaintext. `output` selects UTF-8 text
 * (default), `"bytes"` (a `Uint8Array`) or an encoding of the plaintext bytes.
 */
export default defineSample<Input>({
    id: "crypto.aes-decrypt",
    method: "POST",
    path: "/crypto/aes/decrypt",
    summary: "crypto.aesDecrypt(key | { secret }, ciphertext, { iv, tag?, aad?, output? }): decrypt and authenticate.",
    sdk: ["crypto.aesDecrypt", "AesDecryptOptions", "DecryptOutput"],
    file: "src/samples/18-crypto/aes-decrypt.ts",
    curl: `curl -s -X POST "$BASE/crypto/aes/decrypt" -H "Content-Type: application/json" --data '{"ciphertext":"<from /crypto/aes/encrypt>","iv":"<iv>","aad":"order:ORD-1","key":"0123456789abcdef0123456789abcdef"}'`,
    handler: async ({ request }) => {
        const { ciphertext, iv, tag, aad, key, secret, mode, encoding, output } = request.body;
        if (typeof ciphertext !== "string" || typeof iv !== "string") {
            throw new ValidationError("ciphertext and iv must be strings");
        }
        let aesKey: AesKey;
        if (typeof secret === "string" && secret.length > 0) aesKey = { secret, encoding: "base64" };
        else if (typeof key === "string" && key.length > 0) aesKey = key;
        else throw new ValidationError("Provide the key or the secret name used for encryption");

        const decryptOutput = (output ?? "utf8") as DecryptOutput;
        const options: AesDecryptOptions = {
            iv,
            ...(typeof tag === "string" ? { tag } : {}),
            ...(typeof aad === "string" ? { aad } : {}),
            ...(mode !== undefined ? { mode: mode as AesMode } : {}),
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
            output: decryptOutput,
        };
        try {
            const plaintext = await crypto.aesDecrypt(aesKey, ciphertext, options);
            // `output: "bytes"` returns a Uint8Array; every other output is a string.
            return plaintext instanceof Uint8Array
                ? { output: decryptOutput, byteLength: plaintext.length }
                : { output: decryptOutput, plaintext };
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
