import { ValidationError } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

interface Input {
    readonly email?: unknown;
    readonly age?: unknown;
}

/** `ValidationError` maps to HTTP 400 with code VALIDATION_ERROR; `details` stays internal. */
export default defineSample<Input>({
    id: "errors.validation",
    method: "POST",
    path: "/errors/validation",
    summary: "Throw ValidationError for bad input: Cogover answers HTTP 400 with code VALIDATION_ERROR.",
    sdk: ["ValidationError"],
    file: "src/samples/13-errors/validation.ts",
    curl: `curl -s -i -X POST "$BASE/errors/validation" -H "Content-Type: application/json" --data '{"email":"not-an-email","age":-1}'`,
    handler: ({ request }) => {
        const { email, age } = request.body;
        const problems: string[] = [];
        if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) problems.push("email must be an email address");
        if (typeof age !== "number" || !Number.isInteger(age) || age < 0 || age > 150) problems.push("age must be an integer from 0 to 150");
        if (problems.length > 0) throw new ValidationError(problems.join("; "), { problems });
        return { accepted: true, email, age };
    },
});
