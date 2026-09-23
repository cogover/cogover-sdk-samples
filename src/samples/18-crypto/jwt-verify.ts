import { crypto, PermissionDeniedError, ValidationError } from "@cogover/sdk";
import type { AsymmetricKey, SignatureAlgorithm, SignatureOptions } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

interface Input {
    readonly token?: unknown;
    readonly publicKey?: unknown;
    readonly secret?: unknown;
}

/** JWT `alg` values with a public-key signature, and how `crypto.verify` checks each of them. */
const JWT_ALGORITHMS: Readonly<Record<string, { algorithm: SignatureAlgorithm; options: SignatureOptions }>> = {
    RS256: { algorithm: "RSA-SHA256", options: { encoding: "base64url" } },
    RS384: { algorithm: "RSA-SHA384", options: { encoding: "base64url" } },
    RS512: { algorithm: "RSA-SHA512", options: { encoding: "base64url" } },
    PS256: { algorithm: "RSA-PSS-SHA256", options: { encoding: "base64url" } },
    PS384: { algorithm: "RSA-PSS-SHA384", options: { encoding: "base64url" } },
    PS512: { algorithm: "RSA-PSS-SHA512", options: { encoding: "base64url" } },
    ES256: { algorithm: "ECDSA-SHA256", options: { encoding: "base64url", signatureFormat: "ieee-p1363" } },
    ES384: { algorithm: "ECDSA-SHA384", options: { encoding: "base64url", signatureFormat: "ieee-p1363" } },
    ES512: { algorithm: "ECDSA-SHA512", options: { encoding: "base64url", signatureFormat: "ieee-p1363" } },
};

const BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** Decodes one JWT segment to its JSON value. The sandbox has neither atob, Buffer nor TextDecoder. */
function decodeSegment(segment: string, label: string): unknown {
    let value = 0;
    let bits = 0;
    let percentEncoded = "";
    for (const character of segment) {
        const digit = BASE64URL.indexOf(character);
        if (digit < 0) throw new ValidationError(`The token ${label} is not base64url`);
        value = ((value << 6) | digit) & 0xffffff;
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            percentEncoded += "%" + ((value >> bits) & 0xff).toString(16).padStart(2, "0");
        }
    }
    try {
        // decodeURIComponent turns the percent-encoded bytes back into UTF-8 text.
        return JSON.parse(decodeURIComponent(percentEncoded));
    } catch {
        throw new ValidationError(`The token ${label} is not JSON`);
    }
}

/**
 * Verifies a JWT signed with a public-key algorithm (RS*, PS*, ES*) and then its time claims. The
 * `alg` of the header selects the algorithm, but only from the allowlist above: `none` and HMAC
 * (`HS*`) are refused. A real integration also checks `iss` and `aud` before trusting the claims.
 * The public key is PEM in the request or the secret `sample_signing_public_key` by default; build a
 * token with `POST /crypto/sign` using `"encoding":"base64url","signatureFormat":"ieee-p1363"`.
 */
export default defineSample<Input>({
    id: "crypto.jwt-verify",
    method: "POST",
    path: "/crypto/jwt/verify",
    summary: "Verify an RS256, PS256 or ES256 JWT with crypto.verify() and base64url signatures, then check exp and nbf.",
    sdk: ["crypto.verify", "AsymmetricKey", "SignatureAlgorithm", "SignatureOptions"],
    file: "src/samples/18-crypto/jwt-verify.ts",
    curl: `curl -s -X POST "$BASE/crypto/jwt/verify" -H "Content-Type: application/json" --data '{"token":"<header>.<payload>.<signature>"}'`,
    handler: async ({ request }) => {
        const { token, publicKey, secret } = request.body;
        if (typeof token !== "string") throw new ValidationError("token must be a string");
        const [header, payload, signature, ...rest] = token.split(".");
        if (header === undefined || payload === undefined || signature === undefined || rest.length > 0) {
            throw new ValidationError("token must have three dot-separated parts");
        }
        const headerJson = decodeSegment(header, "header");
        const alg = isRecord(headerJson) && typeof headerJson.alg === "string" ? headerJson.alg : "";
        const scheme = JWT_ALGORITHMS[alg];
        if (scheme === undefined) return { valid: false, reason: "UNSUPPORTED_ALG", alg };

        const key: AsymmetricKey = typeof publicKey === "string" && publicKey.length > 0
            ? publicKey
            : { secret: typeof secret === "string" && secret.length > 0 ? secret : "sample_signing_public_key" };
        try {
            const signed = await crypto.verify(scheme.algorithm, key, `${header}.${payload}`, signature, scheme.options);
            if (!signed) return { valid: false, reason: "BAD_SIGNATURE", alg };
        } catch (error) {
            if (error instanceof ValidationError) {
                return { r: 1006, msg: "This key cannot verify this token.", detail: error.message };
            }
            if (error instanceof PermissionDeniedError) {
                return { r: 1003, msg: "Secrets are not usable in this context.", reason: isRecord(error.details) ? error.details.reason ?? null : null };
            }
            throw error;
        }

        // Only a verified payload is parsed and trusted.
        const claims = decodeSegment(payload, "payload");
        if (!isRecord(claims)) return { valid: false, reason: "BAD_PAYLOAD", alg };
        const now = Math.floor(Date.now() / 1000);
        if (typeof claims.exp === "number" && now >= claims.exp) return { valid: false, reason: "EXPIRED", alg };
        if (typeof claims.nbf === "number" && now < claims.nbf) return { valid: false, reason: "NOT_YET_VALID", alg };
        return { valid: true, alg, algorithm: scheme.algorithm, claims };
    },
});
