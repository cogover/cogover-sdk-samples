import { crypto, ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const toHex = (bytes: Uint8Array): string => Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");

/**
 * Cryptographically secure randomness: `randomBytes(length)` for 1 to 1024 bytes and
 * `randomUUID()` for a version 4 UUID. Use them for tokens, nonces and idempotency keys instead of
 * `Math.random()`.
 */
export default defineSample({
    id: "crypto.random",
    method: "GET",
    path: "/crypto/random",
    summary: "crypto.randomBytes(length) and crypto.randomUUID(): secure tokens, nonces and IDs.",
    sdk: ["crypto.randomBytes", "crypto.randomUUID"],
    file: "src/samples/18-crypto/random.ts",
    curl: `curl -s "$BASE/crypto/random?bytes=16"`,
    handler: async ({ request }) => {
        const length = Number(request.query.bytes ?? "16");
        if (!Number.isInteger(length) || length < 1 || length > 1024) throw new ValidationError("bytes must be an integer from 1 to 1024");
        const bytes = await crypto.randomBytes(length);
        return { length: bytes.length, hex: toHex(bytes), uuid: await crypto.randomUUID() };
    },
});
