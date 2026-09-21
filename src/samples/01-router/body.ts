import { ValidationError } from "@cogover/sdk";
import type { ScriptRequest } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * A typed JSON body. `TInput` only types `request.body` at compile time; it does not validate the
 * request, so check every field before using it. A thrown `ValidationError` becomes HTTP 400.
 */
interface Input {
    readonly name?: unknown;
    readonly quantity?: unknown;
    readonly unitPrice?: unknown;
}

interface Output {
    readonly name: string;
    readonly quantity: number;
    readonly lineTotal: number;
}

export default defineSample<Input, Output>({
    id: "router.body",
    method: "POST",
    path: "/router/body",
    summary: "A typed JSON body via request.body, validated at runtime; invalid input throws ValidationError (HTTP 400).",
    sdk: ["request.body", "ScriptRequest", "ValidationError"],
    file: "src/samples/01-router/body.ts",
    curl: `curl -s -X POST "$BASE/router/body" -H "Content-Type: application/json" --data '{"name":"Laptop","quantity":2,"unitPrice":1500}'`,
    handler: ({ request }) => {
        const typed: ScriptRequest<Input> = request;
        const { name, quantity, unitPrice } = typed.body;
        if (typeof name !== "string" || name.trim().length === 0) {
            throw new ValidationError("name must be a non-empty string");
        }
        if (typeof quantity !== "number" || !Number.isInteger(quantity) || quantity < 1) {
            throw new ValidationError("quantity must be a positive integer");
        }
        if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new ValidationError("unitPrice must be a non-negative number", { field: "unitPrice" });
        }
        return { name: name.trim(), quantity, lineTotal: quantity * unitPrice };
    },
});
