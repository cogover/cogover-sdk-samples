import { and } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

/**
 * The system fields `id`, `created`, `updated` and `created_by` are available on `object.fields`
 * next to the workspace fields. Timestamps are Unix milliseconds.
 */
export default defineSample({
    id: "filters.system-fields",
    method: "GET",
    path: "/filters/system-fields",
    summary: "Filter by the system fields id, created, updated and created_by.",
    sdk: ["FieldReferences (id, created, updated, created_by)"],
    file: "src/samples/06-filters/system-fields.ts",
    curl: `curl -s "$BASE/filters/system-fields?days=7"`,
    handler: async ({ request, data }) => {
        const days = Math.min(Math.max(Number(request.query.days ?? "7") || 7, 1), 365);
        const since = Date.now() - days * 24 * 60 * 60 * 1000;
        const orders = data.object("sample_order");
        const { fields } = orders;

        const page = await orders.records.list({
            where: and(fields.created.gte(since), fields.created_by.notNull()),
            orderBy: [fields.created.desc()],
            fields: ["name"],
            limit: 10,
        });
        const ids = page.items.map(item => item.id);
        // `id.in([...])` re-reads exactly those records; useful after collecting IDs elsewhere.
        const same = ids.length === 0 ? null : await orders.records.list({ where: fields.id.in(ids), fields: ["name"] });
        return {
            since,
            recent: page.items.map(item => ({ id: item.id, name: item.fields.name, createdAt: item.system.createdAt, createdBy: item.system.createdBy ?? null })),
            reReadByIds: same?.total ?? 0,
        };
    },
});
