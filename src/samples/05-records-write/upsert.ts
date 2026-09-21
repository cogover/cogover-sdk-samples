import { ValidationError } from "@cogover/sdk";
import type { UpsertFields, UpsertResult, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type CustomerFields = WorkspaceObjects["sample_customer"];

interface Input {
    readonly email?: unknown;
    readonly name?: unknown;
    readonly tier?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object";

/**
 * Updates the customer whose unique `email` matches, or creates it. The match field must have
 * uniqueness enabled on the Object (see `setup/objects.md`), and the operation needs both create and
 * update permission because the server chooses the branch. A unique-key conflict on another field
 * surfaces as `ValidationError` with `details.reason === "UNIQUE_KEY_VIOLATION"`.
 */
export default defineSample<Input>({
    id: "records.upsert",
    method: "POST",
    path: "/records/upsert",
    summary: "records.upsertByUniqueField(\"email\", fields): update the matching customer or create it.",
    sdk: ["records.upsertByUniqueField", "UpsertFields", "UpsertResult"],
    file: "src/samples/05-records-write/upsert.ts",
    curl: `curl -s -X POST "$BASE/records/upsert" -H "Content-Type: application/json" --data '{"email":"ada@example.com","name":"Ada Lovelace","tier":"gold"}'`,
    handler: async ({ request, data }) => {
        const { email, name, tier } = request.body;
        if (typeof email !== "string" || !email.includes("@")) throw new ValidationError("email must be an email address");
        if (typeof name !== "string" || name.trim().length === 0) throw new ValidationError("name must be a non-empty string");
        if (tier !== undefined && tier !== "bronze" && tier !== "silver" && tier !== "gold") {
            throw new ValidationError("tier must be bronze, silver or gold");
        }

        // `UpsertFields<T, "email">` requires `email` to be present and non-null.
        const fields: UpsertFields<CustomerFields, "email"> = {
            email: email.trim().toLowerCase(),
            name: name.trim(),
            ...(tier === undefined ? {} : { tier }),
        };
        try {
            const result: UpsertResult = await data.object("sample_customer").records.upsertByUniqueField("email", fields);
            return { id: result.id, created: result.created, matchedBy: "email" };
        } catch (error) {
            if (error instanceof ValidationError && isRecord(error.details) && error.details.reason === "UNIQUE_KEY_VIOLATION") {
                // The public error never echoes the rejected business value; answer with your own message.
                return { r: 1001, msg: "Another customer already uses one of these unique values.", fieldSlug: error.details.fieldSlug ?? null };
            }
            throw error;
        }
    },
});
