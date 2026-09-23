import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AesEncryptOptions, AesEncryptResult, AesKey, AesMode, BinaryEncoding } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly data?: unknown;
    readonly key?: unknown;
    readonly secret?: unknown;
    readonly mode?: unknown;
    readonly aad?: unknown;
    readonly separateTag?: unknown;
    readonly encoding?: unknown;
}

/**
 * AES encryption. GCM (the default) authenticates the ciphertext, so decryption detects any change;
 * CBC exists for systems that require it. No `iv` is passed, so every call uses a new random IV.
 * The key is 16, 24 or 32 bytes: a string (UTF-8) for a quick try, or `{ secret, encoding }` to use
 * a project secret holding a base64 key without ever reading it. Decrypt with `POST /crypto/aes/decrypt`.
 */
export default defineSample<Input>({
    id: "crypto.aes-encrypt",
    method: "POST",
    path: "/crypto/aes/encrypt",
    summary: "crypto.aesEncrypt(key | { secret }, data, options): AES-GCM or AES-CBC with a new random IV.",
    sdk: ["crypto.aesEncrypt", "AesKey", "AesMode", "AesEncryptOptions", "AesEncryptResult", "BinaryEncoding"],
    file: "src/samples/18-crypto/aes-encrypt.ts",
    curl: `curl -s -X POST "$BASE/crypto/aes/encrypt" -H "Content-Type: application/json" --data '{"data":"card:4111","key":"0123456789abcdef0123456789abcdef","aad":"order:ORD-1"}'   # or "secret":"sample_aes_key"`,
    handler: async ({ request }) => {
        const { data, key, secret, mode, aad, separateTag, encoding } = request.body;
        if (typeof data !== "string") throw new ValidationError("data must be a string");
        let aesKey: AesKey;
        if (typeof secret === "string" && secret.length > 0) {
            // `openssl rand -base64 32` creates such a secret value: 32 bytes, AES-256.
            aesKey = { secret, encoding: "base64" };
        } else if (typeof key === "string" && key.length > 0) {
            aesKey = key;
        } else {
            throw new ValidationError("Provide a key of 16, 24 or 32 characters, or a secret name");
        }
        // The SDK validates every option; the casts only carry the request values to it.
        const options: AesEncryptOptions = {
            ...(mode !== undefined ? { mode: mode as AesMode } : {}),
            ...(typeof aad === "string" ? { aad } : {}),
            ...(separateTag === true ? { separateTag: true } : {}),
            ...(encoding !== undefined ? { encoding: encoding as BinaryEncoding } : {}),
        };
        try {
            const sealed: AesEncryptResult = await crypto.aesEncrypt(aesKey, data, options);
            return {
                mode: options.mode ?? "GCM",
                encoding: options.encoding ?? "base64",
                ...sealed,
                note: "Send the IV with the ciphertext; it is not secret. Never reuse an IV with the same GCM key.",
            };
        } catch (error) {
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }
    },
});
