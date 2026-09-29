import type { ListOptions, RecordPage, RecordsApi, SelectedFields, WorkspaceObjects } from "@cogover/sdk";
import { defineSample } from "../../sample.js";

type OrderFields = WorkspaceObjects["sample_order"];

const LIST_FIELDS = ["name", "status", "total", "ordered_at"] as const;
type OrderRow = SelectedFields<OrderFields, typeof LIST_FIELDS>;

/**
 * Lists records with the required `fields`, sorting and a page size. `orderBy` and `where` may use
 * fields that are not in `fields`, such as the system field `created` below. The page carries `total` and an
 * opaque `nextCursor`. Cogover may return a cursor with the last page as well, so a loop stops when
 * `nextCursor` is absent, which can be one empty page later (see `list-paging.ts`).
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
        const options: ListOptions<OrderFields, typeof LIST_FIELDS> = {
            fields: LIST_FIELDS,
            orderBy: [orders.fields.created.desc()],
            limit,
            // `exactOptionalPropertyTypes`: only add `cursor` when there is one.
            ...(cursor === undefined ? {} : { cursor }),
        };
        const records: RecordsApi<OrderFields> = orders.records;
        const page: RecordPage<OrderRow> = await records.list(options);
        return {
            total: page.total,
            count: page.items.length,
            nextCursor: page.nextCursor ?? null,
            items: page.items.map(item => ({ id: item.id, ...item.fields, createdAt: item.system.createdAt })),
        };
    },
});
