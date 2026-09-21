import { crypto, ValidationError } from "@cogover/sdk";
import type { CryptoApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly data?: unknown;
}

/**
 * SHA-256 through Cogover's managed implementation. Import `crypto` from the SDK or read
 * `context.crypto`: both are the same frozen object. A string is hashed as UTF-8, a `Uint8Array`
 * as is; the digest is hex by default or base64. Data is limited to 256 KiB.
 */
export default defineSample<Input>({
    id: "crypto.sha256",
    method: "POST",
    path: "/crypto/sha256",
    summary: "crypto.sha256(data, encoding): SHA-256 of a string or bytes as hex or base64.",
    sdk: ["crypto", "context.crypto", "CryptoApi", "crypto.sha256"],
    file: "src/samples/18-crypto/sha256.ts",
    curl: `curl -s -X POST "$BASE/crypto/sha256" -H "Content-Type: application/json" --data '{"data":"hello"}'`,
    handler: async ({ request, crypto: contextCrypto }) => {
        const api: CryptoApi = contextCrypto;
        const { data } = request.body;
        if (typeof data !== "string") throw new ValidationError("data must be a string");
        const bytes = Uint8Array.from(data, character => character.charCodeAt(0) & 0xff);
        return {
            hex: await crypto.sha256(data),
            base64: await api.sha256(data, "base64"),
            // Bytes hash exactly as given; for ASCII input this equals the string digest.
            bytesHex: await crypto.sha256(bytes),
            sameObject: api === crypto,
        };
    },
});
