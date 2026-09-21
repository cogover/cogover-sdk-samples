import { crypto, ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly a?: unknown;
    readonly b?: unknown;
}

/**
 * Constant-time comparison. The time depends only on the lengths, never on where the first
 * difference is, so an attacker cannot guess a token or key byte by byte. Strings are compared as
 * UTF-8 bytes; different lengths are simply `false`. This is the one `crypto` operation that runs
 * locally without a capability call.
 */
export default defineSample<Input>({
    id: "crypto.timing-safe-equal",
    method: "POST",
    path: "/crypto/timing-safe-equal",
    summary: "crypto.timingSafeEqual(a, b): compare tokens or signatures in constant time.",
    sdk: ["crypto.timingSafeEqual"],
    file: "src/samples/18-crypto/timing-safe-equal.ts",
    curl: `curl -s -X POST "$BASE/crypto/timing-safe-equal" -H "Content-Type: application/json" --data '{"a":"token-1","b":"token-1"}'`,
    handler: ({ request }) => {
        const { a, b } = request.body;
        if (typeof a !== "string" || typeof b !== "string") throw new ValidationError("a and b must be strings");
        return { equal: crypto.timingSafeEqual(a, b), note: "Never compare secrets with === or ==." };
    },
});
