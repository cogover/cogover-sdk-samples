import type { ListOptions, RecordPage, RecordsApi, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

/**
 * Lists records with a field projection, sorting and a page size. The page carries `total` and,
 * when more records exist, an opaque `nextCursor` (see `list-paging.ts`).
 */
export default defineSample({
    id: "records.list",
    method: "GET",
    path: "/records/list",
    summary: "records.list({ fields, orderBy, limit, cursor }): one page of records with total and nextCursor.",
    sdk: ["records.list", "ListOptions", "RecordPage", "RecordsApi"],
    file: "src/samples/04-records-read/list.ts",
    curl: `curl -s "$BASE/records/list?limit=5"`,
    handler: async ({ request, data }) => {
        const rawLimit = typeof request.query.limit === "string" ? Number(request.query.limit) : 10;
        const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 10;
        const cursor = typeof request.query.cursor === "string" ? request.query.cursor : undefined;

        const orders = data.object("sample_order");
        const options: ListOptions<OrderFields> = {
            fields: ["name", "status", "total", "ordered_at"],
            orderBy: [orders.fields.created.desc()],
            limit,
            // `exactOptionalPropertyTypes`: only add `cursor` when there is one.
            ...(cursor === undefined ? {} : { cursor }),
        };
        const records: RecordsApi<OrderFields> = orders.records;
        const page: RecordPage<OrderFields> = await records.list(options);
        return {
            total: page.total,
            count: page.items.length,
            nextCursor: page.nextCursor ?? null,
            items: page.items.map(item => ({ id: item.id, ...item.fields, createdAt: item.system.createdAt })),
        };
    },
});
