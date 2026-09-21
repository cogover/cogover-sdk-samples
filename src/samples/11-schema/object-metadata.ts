import { ValidationError } from "@cogover/sdk";
import type { ObjectMetadata, SchemaApi } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

const KNOWN_OBJECTS = ["sample_customer", "sample_order"] as const;
type KnownObject = (typeof KNOWN_OBJECTS)[number];
const isKnownObject = (value: unknown): value is KnownObject => (KNOWN_OBJECTS as readonly unknown[]).includes(value);

/**
 * Read-only Object metadata: fields with type, required/multiple/readOnly flags and choice options.
 * The SDK intentionally has no schema mutation. `schema.object` only accepts slugs declared in
 * `workspace.d.ts`, so a slug from the request is validated with a type guard first.
 */
export default defineSample({
    id: "schema.object-metadata",
    method: "GET",
    path: "/schema/object",
    summary: "schema.object(slug): fields, types, flags and choice options of an Object.",
    sdk: ["context.schema", "SchemaApi", "schema.object", "ObjectMetadata"],
    file: "src/samples/11-schema/object-metadata.ts",
    curl: `curl -s "$BASE/schema/object?slug=sample_order"`,
    handler: async ({ request, schema }) => {
        const slug = request.query.slug ?? "sample_order";
        if (!isKnownObject(slug)) throw new ValidationError(`slug must be one of ${KNOWN_OBJECTS.join(", ")}`);

        const api: SchemaApi = schema;
        const metadata: ObjectMetadata = await api.object(slug);
        return {
            id: metadata.id,
            name: metadata.name,
            slug: metadata.slug,
            fieldCount: metadata.fields.length,
            writableFields: metadata.fields.filter(field => !field.readOnly).map(field => field.slug),
            fields: metadata.fields.map(field => ({
                slug: field.slug,
                name: field.name,
                type: field.fieldType,
                required: field.required,
                multiple: field.multiple,
                readOnly: field.readOnly,
                options: field.options?.map(option => ({ slug: option.slug, value: option.value, isDefault: option.isDefault ?? false })) ?? null,
            })),
        };
    },
});
