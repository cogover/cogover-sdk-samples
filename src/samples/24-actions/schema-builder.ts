import { s, ValidationError } from "@cogover/sdk";
import type { InferSchema, JsonSchema, ObjectSchema, ObjectShape, Schema } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/** One line of a shipment. `satisfies ObjectShape` checks the map without widening the property types. */
const lineShape = {
    sku: s.string({ minLength: 1, maxLength: 64 }),
    quantity: s.integer({ minimum: 1, maximum: 10_000 }),
} satisfies ObjectShape;

/** Every builder of `s` in one schema. Each node is immutable: `.optional()` and `.describe()` return a new node. */
const shipment = s.object({
    code: s.string({ minLength: 3, maxLength: 20 }).describe("Shipment code such as SHP-1024"),
    carrier: s.enum(["dhl", "ups", "local"]),
    weightKg: s.number({ minimum: 0, maximum: 1000 }),
    parcels: s.integer({ minimum: 1 }),
    insured: s.boolean().optional(),
    shipOn: s.date().describe("Calendar date, YYYY-MM-DD"),
    pickedUpAt: s.dateTime().optional().describe("Unix milliseconds, like a date_time field"),
    orderId: s.recordId("sample_order"),
    lines: s.array(s.object(lineShape), { maxItems: 50 }),
});

/**
 * `{ code: string; carrier: "dhl" | "ups" | "local"; ...; insured?: boolean; orderId: CogoverRecordId; lines: {...}[] }`.
 * An action handler receives its input with this type; the example below would not compile with a wrong value.
 */
type Shipment = InferSchema<typeof shipment>;

const CODE = /^SHP-\d{1,16}$/;

/** There is no `pattern` option: check a format in the handler and throw ValidationError when it does not match. */
function checkCode(code: string): void {
    if (!CODE.test(code)) throw new ValidationError("code must look like SHP-1024");
}

/** A builder rejects invalid options with ValidationError when the node is created: at load time for a schema declared at module level. */
function rejected(build: () => unknown): string {
    try {
        build();
        return "accepted";
    } catch (error) {
        return error instanceof ValidationError ? error.message : "unexpected error";
    }
}

/**
 * The schema builder `s` describes a value as a TypeScript type and as JSON Schema at once. Actions declare
 * their `input` and `output` with it, `agents.start` its `resultSchema`. The route returns the JSON Schema of
 * each builder (what Process Builder and AI Agents read), checks a shipment code the way a handler would, and
 * shows the errors of invalid builder options.
 */
export default defineSample({
    id: "actions.schema-builder",
    method: "GET",
    path: "/actions/schema-builder",
    summary: "The s schema builder: JSON Schema of every node type, .optional() and .describe(), InferSchema, and format checks without pattern.",
    sdk: ["s", "Schema", "ObjectSchema", "ObjectShape", "InferSchema", "JsonSchema", "Schema.toJSON"],
    file: "src/samples/24-actions/schema-builder.ts",
    curl: `curl -s "$BASE/actions/schema-builder?code=SHP-1024"`,
    handler: ({ request }) => {
        const code = typeof request.query.code === "string" ? request.query.code : "SHP-1024";
        let codeCheck = "valid";
        try {
            checkCode(code);
        } catch (error) {
            if (!(error instanceof ValidationError)) throw error;
            codeCheck = error.message;
        }

        const text: Schema<string> = s.string();
        const optionalFlag: Schema<boolean, true> = s.boolean().optional();
        const node: ObjectSchema = shipment;
        const jsonSchema: JsonSchema = node.toJSON();
        const example: Shipment = {
            code, carrier: "dhl", weightKg: 2.5, parcels: 1, shipOn: "2026-10-01",
            // An s.recordId() value is typed CogoverRecordId; a real handler gets it from its input or a records call.
            orderId: "ORD1" as Shipment["orderId"], lines: [{ sku: "LAPTOP-14", quantity: 1 }],
        };
        return {
            jsonSchema,
            sameAsStringify: JSON.stringify(shipment) === JSON.stringify(jsonSchema),
            nodes: {
                string: text.toJSON(),
                optionalBoolean: optionalFlag.toJSON(),
                enum: s.enum(["A", "B"]).toJSON(),
                number: s.number({ minimum: 0 }).toJSON(),
                integer: s.integer().toJSON(),
                date: s.date().toJSON(),
                dateTime: s.dateTime().toJSON(),
                recordId: s.recordId("sample_customer").toJSON(),
                array: s.array(s.string(), { maxItems: 3 }).toJSON(),
            },
            example,
            code,
            codeCheck,
            invalidOptions: {
                emptyEnum: rejected(() => s.enum([])),
                maxLengthZero: rejected(() => s.string({ maxLength: 0 })),
                propertyName: rejected(() => s.object({ "order-id": s.string() })),
                handWrittenSchema: rejected(() => s.array({ type: "string" } as unknown as Schema<string>)),
            },
        };
    },
});
